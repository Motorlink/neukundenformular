import { publicProcedure, router } from "./_core/trpc";
import { generateNeukundenPDF } from "./pdf/neukundenPDF";
import { sendNeukundenEmail } from "./email/neukundenEmail";
import { generateCSRFToken, validateCSRFToken } from "./utils/csrf";
import { checkRateLimit, getResetTime } from "./utils/rateLimit";
import { anonymizeIP, generatePrivacyNotice, generateConsentCheckbox } from "./utils/dsgCompliance";
import { saveSignatureFile, getSignatureFilePath } from "./utils/signatureFile";
import { neukundenFormSchema } from "./schemas/neukundenFormSchema";
import { createNeukundenanfrage } from "./db/queries";
// import { createAbiscoKunde, getAbiscoKundenummer } from "./lib/abiscoClient";
// import { updateAbiscoData } from "./db/queries";


export const neukundenRouter = router({
  // Endpoint zum Abrufen der Datenschutzerklärung
  getPrivacyNotice: publicProcedure
    .query(() => {
      return {
        notice: generatePrivacyNotice(),
        consentCheckbox: generateConsentCheckbox(),
      };
    }),
  
  // Endpoint zum Abrufen eines CSRF-Tokens
  getCSRFToken: publicProcedure
    .query(() => {
      return {
        token: generateCSRFToken(),
      };
    }),
  
  submit: publicProcedure
    .input(neukundenFormSchema)
    .mutation(async ({ input, ctx }) => {
      let dbRecord: any = null; // Definiere außerhalb des try-catch
      try {
        // Detailliertes Logging für Debugging
        console.log('[Neukunden Submit] Anfrage erhalten:', {
          email: input.email,
          firmenname: input.firmenname,
          anfrageTyp: input.anfrageTyp,
        });
        
        // Get IP address from request
        const rawIpAddress = 
          (ctx.req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
          ctx.req.headers['x-real-ip'] as string ||
          ctx.req.socket?.remoteAddress ||
          'Unknown';
        
        // Anonymisiere IP-Adresse gemäss DSG
        const ipAddress = anonymizeIP(rawIpAddress);
        
        // Überprüfe Rate Limit (5 Anfragen pro 15 Minuten pro IP)
        if (!checkRateLimit(ipAddress, 5, 15 * 60 * 1000)) {
          const resetTime = getResetTime(ipAddress);
          throw new Error(`Rate Limit überschritten. Bitte versuchen Sie es in ${Math.ceil(resetTime / 1000)} Sekunden erneut.`);
        }
        
        // Validiere CSRF-Token
        if (!validateCSRFToken(input.csrfToken)) {
          throw new Error('Ungültiger oder abgelaufener CSRF-Token. Bitte laden Sie die Seite neu.');
        }
        
        // Get user agent
        const userAgent = ctx.req.headers['user-agent'] || 'Unknown';
        
        // Current timestamp (Schweizer Zeit)
        const timestamp = new Date().toLocaleString('de-CH', {
          timeZone: 'Europe/Zurich',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        
        // Add metadata to form data (ohne CSRF-Token)
        const formDataWithMetadata = {
          ...input,
          csrfToken: undefined,
          ipAddress,
          userAgent,
          timestamp,
        };
        
        // Logging für Audit-Trail (DSG-konform)
        console.log('[DSG Audit] Neukundenformular eingereicht', {
          email: input.email,
          firmenname: input.firmenname,
          anonymizedIP: ipAddress,
          timestamp,
          anfrageTyp: input.anfrageTyp,
        });
        
        // Speichere Unterschrift als Datei
        let signatureFilename: string | undefined;
        if (input.unterschrift) {
          try {
            signatureFilename = saveSignatureFile(input.unterschrift);
          } catch (sigError) {
            console.error('[Signature] Fehler beim Speichern:', sigError);
          }
        }
        
        // Speichere in Datenbank
        try {
          // Baue Datenbank-Objekt nur mit Werten auf (nicht undefined)
          const dbData: any = {
            anfrageTyp: input.anfrageTyp,
            firmenname: input.firmenname,
            vorname: input.vorname,
            nachname: input.nachname,
            strasse: input.strasse,
            hausnummer: input.hausnummer,
            plz: input.plz,
            ort: input.ort,
            email: input.email,
            telefon: input.telefon,
            agbAkzeptiert: input.agbAkzeptiert,
            ipAddress,
            userAgent,
          };
          
          // Nur optionale Felder hinzufuegen wenn sie einen Wert haben
          if (input.additionalName) dbData.additionalName = input.additionalName;
          if (input.invoiceEmail) dbData.invoiceEmail = input.invoiceEmail;
          if (input.url) dbData.url = input.url;
          if (input.remarks) dbData.remarks = input.remarks;
          if (input.newsletter !== undefined) dbData.newsletter = input.newsletter;
          if (signatureFilename) dbData.unterschriftDatei = signatureFilename;
          
          dbRecord = await createNeukundenanfrage(dbData);
          console.log('[Database] Neukundenanfrage gespeichert - ID:', dbRecord?.id);
        } catch (dbError) {
          console.error('[Database] Fehler beim Speichern:', dbError);
          // Nicht kritisch - E-Mail wird trotzdem versendet
        }
        
        // Füge Unterschrift-Datei zu formDataWithMetadata hinzu für PDF-Generierung
        const formDataForPDF = {
          ...formDataWithMetadata,
          unterschriftDatei: signatureFilename,
        };
        
        // Generate PDF
        const pdfBuffer = await generateNeukundenPDF(formDataForPDF);
        
        console.log('[PDF] Generiert für:', input.email, '- Größe:', pdfBuffer.length, 'bytes');
        
        // Send email to MotorLink (info and sales)
        await sendNeukundenEmail({
          to: 'info@motorlink.ch',
          formData: formDataWithMetadata,
          pdfBuffer,
        });
        
        console.log('[Email] Versendet an MotorLink (info@motorlink.ch)');
        
        // Send email to sales
        await sendNeukundenEmail({
          to: 'sales@motorlink.ch',
          formData: formDataWithMetadata,
          pdfBuffer,
        });
        
        console.log('[Email] Versendet an MotorLink (sales@motorlink.ch)');
        console.log('[Email] E-Mail-Versand abgeschlossen');
        
        // ========== ABISCO-INTEGRATION AUF EIS ==========
        // Send customer data to Abisco (createkunde)
        // console.log('[Abisco] Starte Kundenanlage in Abisco...');
        // const abiscoResult = await createAbiscoKunde(
        //   input.firmenname,
        //   input.vorname,
        //   input.nachname,
        //   input.strasse,
        //   input.hausnummer,
        //   input.plz,
        //   input.ort,
        //   input.email,
        //   input.telefon,
        //   input.additionalName
        // );
        // 
        // let abiscoKundennummer: number | null = null;
        // let abiscoStatus = 'error';
        // 
        // if (abiscoResult.success) {
        //   console.log('[Abisco] Kunde erfolgreich erstellt:', abiscoResult.message);
        //   
        //   // Hole Kundennummer nach kurzer Verzögerung
        //   await new Promise(resolve => setTimeout(resolve, 500));
        //   
        //   // Extrahiere Login aus abiscoResult oder generiere neu
        //   const loginMatch = abiscoResult.message?.match(/Login: (\w+)/);
        //   const login = loginMatch ? loginMatch[1] : `user${Date.now().toString().slice(-8)}`;
        //   
        //   console.log('[Abisco] Suche Kundennummer für login:', login);
        //   abiscoKundennummer = await getAbiscoKundenummer(login);
        //   
        //   if (abiscoKundennummer) {
        //     abiscoStatus = 'success';
        //     console.log('[Abisco] Kundennummer erfolgreich abgerufen:', abiscoKundennummer);
        //     
        //     // Speichere Abisco-Daten in PostgreSQL
        //     try {
        //       await updateAbiscoData(dbRecord?.id || '', {
        //         kundennummer: abiscoKundennummer,
        //         login,
        //         status: abiscoStatus,
        //         createdAt: new Date(),
        //       });
        //       console.log('[Database] Abisco-Daten gespeichert');
        //     } catch (updateError) {
        //       console.warn('[Database] Fehler beim Speichern von Abisco-Daten:', updateError);
        //     }
        //   } else {
        //     abiscoStatus = 'pending';
        //     console.warn('[Abisco] Kundennummer konnte nicht abgerufen werden');
        //   }
        // } else {
        //   console.warn('[Abisco] Fehler bei Kundenanlage:', abiscoResult.message);
        //   abiscoStatus = 'error';
        //   // Nicht kritisch - Formular wurde trotzdem verarbeitet
        // }
        // ========== ENDE ABISCO-INTEGRATION ==========
        
        console.log('[Zeitstempel] Anfrage abgeschlossen um:', timestamp);
        
        // Return success response
        return {
          success: true,
          message: 'Anfrage erfolgreich gesendet. Sie erhalten eine Kopie per E-Mail.',
          timestamp,
        };
      } catch (error) {
        console.error('[Neukunden Form] Error:', error);
        if (error instanceof Error && (error.message.includes('CSRF') || error.message.includes('Rate Limit'))) {
          throw error;
        }
        throw new Error('Fehler beim Senden der Anfrage');
      }
    }),
});
