# Architektur-Dokumentation - MotorLink Neukundenformular

**Technische Architektur und Designentscheidungen**

---

## 📊 Systemarchitektur

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
│                   (Benutzer / Browser)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                    Port 80/443
                         │
        ┌────────────────┴────────────────┐
        │                                 │
    ┌───▼──────────────────────────────┐ │
    │   Nginx Reverse Proxy             │ │
    │  (SSL/TLS Termination)            │ │
    │  - HTTP → HTTPS Redirect          │ │
    │  - ACME Challenge Handler         │ │
    │  - Security Headers               │ │
    │  - Gzip Kompression               │ │
    └───┬──────────────────────────────┘ │
        │                                 │
        │ Port 3001 (HTTP)                │
        │                                 │
    ┌───▼──────────────────────────────┐ │
    │   Backend API                     │ │
    │  (Node.js Express)                │ │
    │  - Neukundenformular Handler      │ │
    │  - PDF-Generierung                │ │
    │  - E-Mail Versand                 │ │
    │  - Datenbankoperationen           │ │
    └───┬──────────────────────────────┘ │
        │                                 │
    ┌───▼──────────────────────────────┐ │
    │   Frontend (SPA)                  │ │
    │  (React / TypeScript)             │ │
    │  - Neukundenformular UI           │ │
    │  - Canvas-Unterschrift            │ │
    │  - Validierung                    │ │
    └───────────────────────────────────┘ │
                                          │
        ┌─────────────────────────────────┘
        │
    ┌───▼──────────────────────────────┐
    │   Let's Encrypt / Certbot         │
    │  - Zertifikat-Verwaltung          │
    │  - Automatische Erneuerung        │
    │  - ACME Challenge                 │
    └───────────────────────────────────┘
```

---

## 🔐 SSL/TLS Architektur

### Zertifikat-Verwaltung

```
┌─────────────────────────────────────────┐
│      Let's Encrypt (ACME)               │
│  - Kostenlos                            │
│  - Automatische Erneuerung              │
│  - 90 Tage Gültigkeitsdauer            │
└────────────┬────────────────────────────┘
             │
             │ certbot
             │
    ┌────────▼────────┐
    │ /etc/letsencrypt│
    │  ├── live/      │
    │  │  └── form... │
    │  │      ├── cert.pem
    │  │      ├── chain.pem
    │  │      ├── fullchain.pem
    │  │      └── privkey.pem
    │  └── renewal/   │
    │      └── form...│
    └────────┬────────┘
             │
    ┌────────▼────────────────┐
    │   Nginx SSL/TLS         │
    │  - TLS 1.2 + 1.3        │
    │  - Strong Ciphers       │
    │  - Session Cache        │
    └────────┬────────────────┘
             │
    ┌────────▼────────────────┐
    │   Browser               │
    │  - Encrypted Connection │
    │  - Certificate Validation│
    └─────────────────────────┘
```

### ACME Challenge Flow

```
1. Browser → Nginx (Port 80)
   ↓
2. Nginx → /.well-known/acme-challenge/
   ↓
3. Certbot → ACME Server (Let's Encrypt)
   ↓
4. ACME Server → HTTP Validation
   ↓
5. Zertifikat ausgestellt
   ↓
6. Nginx → SSL/TLS konfiguriert
   ↓
7. HTTPS aktiviert
```

---

## 🔄 Deployment-Architektur

### Setup-Prozess

```
Phase 1: Vorbereitung
├── Systemvorbereitung
├── Backup erstellen
├── ACME-Verzeichnis einrichten
└── Nginx neu starten

Phase 2: Zertifikat-Ausstellung
├── HTTP-only Konfiguration
├── Nginx testen
├── Nginx neu starten
├── ACME Challenge durchführen
└── Zertifikat erhalten

Phase 3: HTTPS-Aktivierung
├── HTTPS-Konfiguration erstellen
├── Nginx testen
├── Nginx neu starten
└── Automatische Erneuerung aktivieren

Phase 4: Verifizierung
├── HTTPS-Verbindung testen
├── Zertifikat validieren
├── Logs überprüfen
└── Monitoring einrichten
```

---

## 📁 Dateistruktur

### Nginx-Konfiguration

```
/etc/nginx/
├── sites-available/
│   └── default                    # Hauptkonfiguration
├── sites-enabled/
│   └── default → sites-available/default
├── nginx.conf                     # Globale Konfiguration
└── conf.d/
    └── ssl-params.conf            # SSL-Parameter
```

### Let's Encrypt

```
/etc/letsencrypt/
├── live/
│   └── form.motorlink.ch/
│       ├── cert.pem               # Zertifikat
│       ├── chain.pem              # Chain
│       ├── fullchain.pem          # Zertifikat + Chain
│       └── privkey.pem            # Privater Schlüssel
├── archive/
│   └── form.motorlink.ch/         # Archivierte Versionen
└── renewal/
    └── form.motorlink.ch.conf     # Renewal-Konfiguration
```

### Logs

```
/var/log/
├── nginx/
│   ├── motorlink_access.log       # HTTP-Zugriffe
│   └── motorlink_error.log        # HTTP-Fehler
└── letsencrypt/
    └── letsencrypt.log            # Certbot-Logs
```

---

## 🔧 Komponenten-Details

### 1. Nginx Reverse Proxy

**Funktion:** HTTP/HTTPS Terminierung, Request Routing

**Konfiguration:**
- Port 80: HTTP-Redirect zu HTTPS + ACME Challenge
- Port 443: HTTPS mit SSL/TLS
- Proxy zu Backend (Port 3001)

**Security Features:**
- HSTS Header (Strict-Transport-Security)
- X-Frame-Options (Clickjacking-Schutz)
- X-Content-Type-Options (MIME-Sniffing-Schutz)
- X-XSS-Protection (XSS-Schutz)
- Referrer-Policy
- TLS 1.2 + 1.3

### 2. Let's Encrypt / Certbot

**Funktion:** Automatische Zertifikat-Verwaltung

**Prozess:**
1. Certbot sendet ACME-Request
2. Let's Encrypt validiert Domain-Besitz
3. HTTP Challenge: Datei in /.well-known/acme-challenge/
4. Zertifikat wird ausgestellt
5. Automatische Erneuerung alle 90 Tage

**Vorteile:**
- Kostenlos
- Automatische Erneuerung
- Vertrauenswürdig (alle Browser)
- Schnelle Ausstellung

### 3. Backend API

**Funktion:** Neukundenformular-Verarbeitung

**Endpoints:**
- `POST /api/neukunden` - Formular einreichen
- `GET /api/status` - Status überprüfen
- `POST /api/pdf` - PDF generieren

**Prozess:**
1. Frontend sendet Formulardaten
2. Backend validiert Daten
3. PDF wird generiert
4. E-Mail wird versendet
5. Antwort an Frontend

### 4. Frontend (SPA)

**Funktion:** Benutzerinterface für Neukundenformular

**Features:**
- Multi-Step Formular
- Canvas-Unterschrift
- Client-seitige Validierung
- Responsive Design

---

## 🔄 Datenfluss

### Neukundenformular Submission

```
1. Benutzer füllt Formular aus
   ↓
2. Frontend validiert Daten (Client-side)
   ↓
3. Frontend sendet POST zu /api/neukunden
   ↓
4. Nginx leitet zu Backend weiter (Port 3001)
   ↓
5. Backend validiert Daten (Server-side)
   ↓
6. Backend generiert PDF
   ↓
7. Backend versendet E-Mail
   ↓
8. Backend speichert Daten
   ↓
9. Backend sendet Success-Response
   ↓
10. Frontend zeigt Erfolgs-Meldung
```

---

## 🔐 Sicherheitsarchitektur

### Schichten

```
┌─────────────────────────────────────┐
│   Layer 1: Transport Security       │
│   - TLS 1.2 + 1.3                   │
│   - Strong Ciphers                  │
│   - Certificate Pinning (optional)  │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   Layer 2: HTTP Security Headers    │
│   - HSTS                            │
│   - X-Frame-Options                 │
│   - X-Content-Type-Options          │
│   - CSP (Content-Security-Policy)   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   Layer 3: Application Security     │
│   - Input Validation                │
│   - SQL Injection Prevention         │
│   - CSRF Protection                 │
│   - Rate Limiting                   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   Layer 4: Data Security            │
│   - Encryption at Rest              │
│   - Secure Logging                  │
│   - Access Control                  │
└─────────────────────────────────────┘
```

---

## 📊 Performance-Optimierung

### Nginx-Optimierungen

```
- Gzip Kompression: 70% Größenreduktion
- SSL Session Cache: Schnellere Handshakes
- HTTP/2: Multiplexing, Header Compression
- Keepalive: Verbindungswiederverwendung
```

### Caching-Strategie

```
Frontend (SPA):
- Cache-Control: no-cache
- Verhindert veraltete Versionen

API Responses:
- Cache-Control: private, max-age=300
- 5 Minuten Cache für Daten

Static Assets:
- Cache-Control: public, max-age=31536000
- 1 Jahr Cache für unveränderliche Dateien
```

---

## 🔄 Automatische Erneuerung

### Certbot Timer

```
/etc/systemd/system/certbot.timer
├── OnCalendar: *-*-* 02:00:00
├── Accuracy: 1m
└── Persistent: yes

/etc/systemd/system/certbot.service
├── ExecStart: certbot renew --quiet
└── OnSuccess: systemctl reload nginx
```

### Renewal-Prozess

```
1. Certbot Timer startet täglich um 02:00
2. Überprüft Zertifikat-Ablaufdatum
3. Wenn < 30 Tage: Erneuerung starten
4. ACME Challenge durchführen
5. Neues Zertifikat erhalten
6. Nginx neu laden
7. Logs schreiben
```

---

## 🧪 Testing-Architektur

### Test-Ebenen

```
Unit Tests:
- Nginx-Konfiguration Syntax
- Zertifikat-Validität
- SSL-Parameter

Integration Tests:
- HTTPS-Verbindung
- ACME Challenge
- Redirect-Verhalten

End-to-End Tests:
- Formular-Submission
- PDF-Generierung
- E-Mail-Versand
```

---

## 📈 Skalierbarkeit

### Horizontale Skalierung

```
Load Balancer (Nginx)
├── Backend Server 1 (Port 3001)
├── Backend Server 2 (Port 3001)
└── Backend Server 3 (Port 3001)

Shared Let's Encrypt Zertifikat
Shared Database
```

### Vertikale Skalierung

```
Erhöhte Ressourcen:
- CPU: Schnellere Request-Verarbeitung
- RAM: Besseres Caching
- Disk: Mehr Logs und Backups
```

---

## 🔍 Monitoring & Observability

### Metriken

```
- Nginx Request Rate
- Response Time
- Error Rate (4xx, 5xx)
- SSL/TLS Handshake Time
- Certificate Expiration Days
```

### Logs

```
- Access Logs: Alle HTTP-Requests
- Error Logs: Fehler und Warnungen
- Certbot Logs: Zertifikat-Operationen
- Systemd Logs: Service-Events
```

---

## 🚀 Deployment-Strategien

### Blue-Green Deployment

```
Blue (Aktuell):
- form.motorlink.ch → Backend 1

Green (Neu):
- form-new.motorlink.ch → Backend 2

Switch:
- DNS-Umleitung
- Oder Nginx-Konfiguration
```

### Canary Deployment

```
90% Traffic → Alte Version
10% Traffic → Neue Version

Monitoring:
- Fehlerrate
- Response Time
- User Feedback

Rollout:
- Schrittweise erhöhen
- Bei Problemen: Rollback
```

---

**Zuletzt aktualisiert:** 1. Dezember 2025  
**Version:** 1.0.0
