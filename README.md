# MotorLink Neukundenformular - HTTPS mit Let's Encrypt

**Professionelle Implementierung eines sicheren Neukundenformulars mit Let's Encrypt HTTPS**

[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](https://github.com/Motorlink/neukundenformular)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue)](CHANGELOG.md)

---

## 📋 Projektübersicht

Dieses Projekt implementiert eine sichere HTTPS-Konfiguration für das MotorLink Neukundenformular mit automatischer Let's Encrypt Zertifikat-Verwaltung. Das Projekt folgt IT-Projektmanagement Best-Practices und ist produktionsreif.

### 🎯 Ziele

- ✅ Sichere HTTPS-Verbindung mit Let's Encrypt
- ✅ Automatische Zertifikat-Erneuerung
- ✅ Professionelle Nginx-Konfiguration
- ✅ Vollständige Dokumentation
- ✅ Automatisiertes Deployment
- ✅ Monitoring und Logging

### 📊 Projektdetails

| Aspekt | Details |
|--------|---------|
| **Projektname** | MotorLink Neukundenformular |
| **Status** | Production Ready |
| **Version** | 1.0.0 |
| **Zielumgebung** | Ubuntu 24.04 LTS |
| **Server** | 185.229.91.116 |
| **Domain** | form.motorlink.ch |
| **SSL/TLS** | Let's Encrypt |
| **Webserver** | Nginx 1.24+ |

---

## 🚀 Quick Start

### Voraussetzungen

- Ubuntu 24.04 LTS oder höher
- SSH-Zugriff zum Server
- Nginx installiert
- Certbot installiert
- Root/Sudo-Zugriff

### Installation (5 Minuten)

```bash
# 1. Repository klonen
git clone https://github.com/Motorlink/neukundenformular.git
cd neukundenformular

# 2. Skript ausführbar machen
chmod +x scripts/setup-letsencrypt.sh

# 3. Auf dem Server ausführen
scp scripts/setup-letsencrypt.sh administrator@185.229.91.116:/tmp/
ssh administrator@185.229.91.116 "bash /tmp/setup-letsencrypt.sh"

# 4. Verifizieren
curl -I https://form.motorlink.ch/neukunden
```

---

## 📁 Projektstruktur

```
neukundenformular/
├── README.md                          # Diese Datei
├── LICENSE                            # MIT License
├── CHANGELOG.md                       # Versionshistorie
├── .gitignore                         # Git Ignore Rules
│
├── docs/                              # Dokumentation
│   ├── DEPLOYMENT.md                  # Deployment-Anleitung
│   ├── ARCHITECTURE.md                # Architektur-Dokumentation
│   ├── TROUBLESHOOTING.md             # Fehlerbehebung
│   ├── SECURITY.md                    # Sicherheits-Richtlinien
│   └── API.md                         # API-Dokumentation
│
├── scripts/                           # Deployment-Skripte
│   ├── setup-letsencrypt.sh           # Hauptsetup-Skript
│   ├── renew-certificate.sh           # Manuelle Zertifikat-Erneuerung
│   ├── backup-config.sh               # Konfiguration sichern
│   └── rollback.sh                    # Rollback-Skript
│
├── config/                            # Konfigurationsdateien
│   ├── nginx-http.conf                # HTTP-only Konfiguration
│   ├── nginx-https.conf               # HTTPS-Konfiguration
│   ├── certbot-renewal.conf           # Certbot-Konfiguration
│   └── security-headers.conf          # Sicherheits-Header
│
├── tests/                             # Tests
│   ├── test-https.sh                  # HTTPS-Verbindungstest
│   ├── test-certificate.sh            # Zertifikat-Validierung
│   └── test-security.sh               # Sicherheits-Tests
│
└── .github/
    ├── workflows/                     # GitHub Actions
    │   └── ci-cd.yml                  # CI/CD Pipeline
    └── ISSUE_TEMPLATE/                # Issue Templates
        ├── bug_report.md
        └── feature_request.md
```

---

## 🔧 Komponenten

### 1. **Nginx-Konfiguration**
- HTTP zu HTTPS Redirect
- Let's Encrypt ACME Challenge Support
- Security Headers (HSTS, X-Frame-Options, etc.)
- SSL/TLS Optimierung (TLS 1.2 + 1.3)
- Gzip Kompression

### 2. **Let's Encrypt Integration**
- Automatische Zertifikat-Ausstellung
- Automatische Erneuerung (90 Tage)
- Multi-Domain Support
- Webroot Authentifizierung

### 3. **Deployment-Automation**
- Bash-Skripte für Setup und Wartung
- Backup-Mechanismen
- Rollback-Funktionalität
- Error Handling

### 4. **Monitoring & Logging**
- Nginx Access Logs
- Nginx Error Logs
- Certbot Renewal Logs
- Systemd Journal Integration

---

## 📚 Dokumentation

| Dokument | Inhalt |
|----------|--------|
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Schritt-für-Schritt Deployment-Anleitung |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technische Architektur und Entscheidungen |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Häufige Probleme und Lösungen |
| [SECURITY.md](docs/SECURITY.md) | Sicherheits-Best-Practices |
| [API.md](docs/API.md) | API-Dokumentation |

---

## 🔐 Sicherheitsfeatures

- ✅ **TLS 1.2 & 1.3** - Moderne Verschlüsselung
- ✅ **HSTS** - Erzwingt HTTPS für 1 Jahr
- ✅ **Security Headers** - Schutz vor XSS, Clickjacking, etc.
- ✅ **Let's Encrypt** - Kostenlose, vertrauenswürdige Zertifikate
- ✅ **Automatische Erneuerung** - Kein manueller Aufwand
- ✅ **Backup & Rollback** - Schnelle Wiederherstellung bei Fehlern

---

## 🚀 Deployment

### Automatisches Deployment

```bash
# Auf dem lokalen Rechner
./scripts/setup-letsencrypt.sh
```

### Manuelles Deployment

Siehe [DEPLOYMENT.md](docs/DEPLOYMENT.md) für detaillierte Anweisungen.

---

## 🧪 Testing

```bash
# HTTPS-Verbindung testen
./tests/test-https.sh

# Zertifikat validieren
./tests/test-certificate.sh

# Sicherheits-Tests
./tests/test-security.sh
```

---

## 📊 Status & Monitoring

### Zertifikat-Status
```bash
sudo certbot certificates
```

### Nginx-Status
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Logs
```bash
# Nginx Access Logs
sudo tail -f /var/log/nginx/motorlink_access.log

# Nginx Error Logs
sudo tail -f /var/log/nginx/motorlink_error.log

# Certbot Logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

---

## 🔄 Automatische Erneuerung

Die automatische Zertifikat-Erneuerung ist bereits konfiguriert:

```bash
# Status überprüfen
sudo systemctl status certbot.timer

# Manuelle Erneuerung testen
sudo certbot renew --dry-run

# Logs ansehen
sudo journalctl -u certbot.service -f
```

---

## 📝 Versionsverlauf

Siehe [CHANGELOG.md](CHANGELOG.md) für detaillierte Änderungen.

### Aktuelle Version: 1.0.0
- ✅ Let's Encrypt HTTPS Setup
- ✅ Nginx-Konfiguration
- ✅ Deployment-Skripte
- ✅ Dokumentation
- ✅ Tests

---

## 🤝 Beitragen

Beiträge sind willkommen! Bitte lesen Sie [CONTRIBUTING.md](CONTRIBUTING.md) für Details.

---

## 📞 Support & Kontakt

| Kontakt | Details |
|---------|---------|
| **Issues** | [GitHub Issues](https://github.com/Motorlink/neukundenformular/issues) |
| **Discussions** | [GitHub Discussions](https://github.com/Motorlink/neukundenformular/discussions) |
| **Email** | admin@motorlink.ch |

---

## 📄 Lizenz

Dieses Projekt ist unter der [MIT License](LICENSE) lizenziert.

---

## ✅ Checkliste für Produktionsdeployment

- [ ] Repository geklont
- [ ] Skripte überprüft und angepasst
- [ ] Backup erstellt
- [ ] Setup-Skript ausgeführt
- [ ] HTTPS-Verbindung getestet
- [ ] Zertifikat validiert
- [ ] Logs überprüft
- [ ] Automatische Erneuerung konfiguriert
- [ ] Monitoring aktiviert
- [ ] Team benachrichtigt

---

**Zuletzt aktualisiert:** 1. Dezember 2025  
**Maintainer:** MotorLink IT Team  
**Status:** ✅ Production Ready
