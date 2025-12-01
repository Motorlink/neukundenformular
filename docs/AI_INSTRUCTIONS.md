# 🤖 KI-Handlungsanweisungen - MotorLink Neukundenformular

**Ziel:** Dieses Dokument gibt anderen KIs klare Anweisungen, wie sie mit diesem Projekt interagieren, es weiterentwickeln und warten können.

---

## 🎯 Projekt-Zusammenfassung

- **Projekt:** MotorLink Neukundenformular
- **Zweck:** Digitalisierung des Kundenakquise-Prozesses
- **Technologie:** Node.js, Express, React, TypeScript, Nginx, Let's Encrypt
- **Status:** Infrastruktur fertig, Anwendung teilweise fertig
- **Repository:** `https://github.com/Motorlink/neukundenformular`

---

## ✅ Aktueller Status (1. Dezember 2025)

### Was ist FERTIG

- ✅ **Infrastruktur & DevOps (100%)**
  - Let's Encrypt HTTPS Setup
  - Nginx Reverse Proxy
  - Automatische Zertifikat-Erneuerung
  - Backup & Rollback-Skripte
  - Umfassende Dokumentation

- ✅ **Anwendung (60%)**
  - Backend mit Node.js/Express
  - Frontend mit React/TypeScript
  - PDF-Generierung & E-Mail-Versand
  - Canvas-Unterschrift

### Was ist NICHT FERTIG

- ❌ Datenbankintegration (MySQL/TiDB)
- ❌ Vollständige Formular-Validierung
- ❌ Error Handling & Logging
- ❌ Unit Tests & Integration Tests
- ❌ CI/CD Pipeline

---

## 🚀 Roadmap & Nächste Schritte

### Priorität 1: Backend fertigstellen

**Ziel:** Voll funktionsfähiges Backend mit Datenbank

1. **Datenbank einrichten:**
   - MySQL/TiDB aufsetzen
   - Drizzle ORM integrieren
   - Datenbank-Schema erstellen

2. **API erweitern:**
   - `POST /api/neukunden` mit Datenbank-Speicherung
   - `GET /api/kunden` (Liste aller Kunden)
   - `GET /api/kunden/:id` (Einzelner Kunde)

3. **Sicherheit & Stabilität:**
   - Input-Validierung mit Zod vervollständigen
   - Error Handling & Logging implementieren
   - Rate Limiting gegen Brute-Force

### Priorität 2: Frontend fertigstellen

**Ziel:** Benutzerfreundliche und robuste UI

1. **Formular-Validierung:**
   - Client-seitige Validierung verbessern
   - Server-Fehler anzeigen

2. **User Experience:**
   - Loading States & Animationen
   - Responsive Design für Mobile optimieren
   - Accessibility (a11y) verbessern

3. **Error Handling:**
   - Fehlermeldungen für Benutzer
   - Sentry für Error-Tracking integrieren

### Priorität 3: Testing & CI/CD

**Ziel:** Automatisierte Qualitätssicherung

1. **Unit Tests:**
   - Jest/Vitest für Backend & Frontend
   - Code-Coverage > 80%

2. **Integration Tests:**
   - API-Endpunkte testen
   - Datenbank-Interaktionen testen

3. **E2E Tests:**
   - Cypress/Playwright für User-Flows
   - Neukundenformular ausfüllen & absenden

4. **CI/CD Pipeline:**
   - GitHub Actions einrichten
   - Automatisierte Tests bei jedem Push
   - Automatisches Deployment zu Staging/Production

---

## 🔧 Wie man mit diesem Projekt arbeitet

### 1. Setup der Entwicklungsumgebung

```bash
# 1. Repository klonen
git clone https://github.com/Motorlink/neukundenformular.git
cd neukundenformular

# 2. Dependencies installieren
pnpm install

# 3. .env Datei erstellen
cp .env.example .env

# 4. Development-Server starten
pnpm dev
```

### 2. Wichtige Befehle

- `pnpm dev`: Startet Frontend & Backend Dev-Server
- `pnpm build`: Erstellt Production-Build
- `pnpm test`: Führt Tests aus
- `pnpm lint`: Überprüft Code-Qualität

### 3. Einen neuen Branch erstellen

```bash
# 1. Neueste Version holen
git checkout main
git pull origin main

# 2. Neuen Branch erstellen
git checkout -b feature/neues-feature

# 3. Änderungen machen...

# 4. Commit & Push
git add .
git commit -m "feat: Neues Feature hinzugefügt"
git push origin feature/neues-feature

# 5. Pull Request erstellen
```

### 4. Deployment durchführen

**Wichtig:** Das Deployment ist bereits erfolgt. Nur bei Änderungen an der Infrastruktur erneut ausführen.

```bash
# 1. Zum Server verbinden
ssh administrator@185.229.91.116

# 2. Repository aktualisieren
cd neukundenformular
git pull origin main

# 3. Backend neu starten
sudo systemctl restart motorlink-backend

# 4. Nginx neu laden (falls Konfiguration geändert)
sudo systemctl reload nginx
```

---

## 💡 Wichtige Hinweise für KIs

- **Lies die Dokumentation:**
  - `README.md`: Projekt-Überblick
  - `docs/DEPLOYMENT.md`: Deployment-Anleitung
  - `docs/ARCHITECTURE.md`: Technische Architektur

- **Verwende die Skripte:**
  - `scripts/setup-letsencrypt.sh`: Für Neuinstallation
  - `scripts/rollback.sh`: Für Wiederherstellung
  - `tests/test-https.sh`: Für HTTPS-Tests

- **Folge der Roadmap:**
  - Konzentriere dich auf die Prioritäten
  - Arbeite schrittweise
  - Dokumentiere deine Änderungen

- **Sei vorsichtig auf dem Production-Server:**
  - Mache immer zuerst ein Backup
  - Teste Änderungen in einer lokalen Umgebung
  - Führe keine destruktiven Befehle aus

- **Kommuniziere klar:**
  - Beschreibe, was du tust
  - Frage nach, wenn etwas unklar ist
  - Melde Probleme und Erfolge

---

## ❓ Häufige Fragen

**Frage:** Wo finde ich die Nginx-Konfiguration?
**Antwort:** `config/nginx-https.conf`

**Frage:** Wie teste ich die HTTPS-Verbindung?
**Antwort:** `bash tests/test-https.sh`

**Frage:** Wo ist der Backend-Code?
**Antsantwort:** `motorlink-website/server` (im ursprünglichen Repository)

**Frage:** Wo ist der Frontend-Code?
**Antwort:** `motorlink-website/client` (im ursprünglichen Repository)

---

**Zuletzt aktualisiert:** 1. Dezember 2025
