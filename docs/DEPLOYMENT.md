# Deployment-Dokumentation - MotorLink Neukundenformular

**Schritt-für-Schritt Anleitung zum Deployment von Let's Encrypt HTTPS**

---

## 📋 Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
2. [Pre-Deployment Checkliste](#pre-deployment-checkliste)
3. [Automatisches Deployment](#automatisches-deployment)
4. [Manuelles Deployment](#manuelles-deployment)
5. [Post-Deployment Verifizierung](#post-deployment-verifizierung)
6. [Rollback](#rollback)
7. [Troubleshooting](#troubleshooting)

---

## 📦 Voraussetzungen

### System-Anforderungen

- **OS:** Ubuntu 24.04 LTS oder höher
- **Nginx:** Version 1.18+
- **Certbot:** Version 2.0+
- **Speicher:** Mindestens 512 MB RAM
- **Festplatte:** Mindestens 1 GB verfügbar

### Netzwerk-Anforderungen

- **Port 80 (HTTP):** Offen für ACME Challenge
- **Port 443 (HTTPS):** Offen für HTTPS-Verkehr
- **DNS:** Domain muss auf Server IP zeigen
- **Internetverbindung:** Stabil und zuverlässig

### Zugangsanforderungen

- SSH-Zugriff zum Server
- Sudo/Root-Zugriff
- Git installiert (für Repository)

---

## ✅ Pre-Deployment Checkliste

### 1. Systemvorbereitung

```bash
# System aktualisieren
sudo apt-get update
sudo apt-get upgrade -y

# Erforderliche Pakete installieren
sudo apt-get install -y nginx certbot python3-certbot-nginx curl wget

# Nginx-Status überprüfen
sudo systemctl status nginx

# Certbot-Version überprüfen
certbot --version
```

### 2. Backup erstellen

```bash
# Backup der aktuellen Nginx-Konfiguration
sudo cp -r /etc/nginx /etc/nginx.backup.$(date +%s)

# Backup der Letsencrypt-Verzeichnisse (falls vorhanden)
sudo cp -r /etc/letsencrypt /etc/letsencrypt.backup.$(date +%s) 2>/dev/null || true

# Backup des Webroot-Verzeichnisses
sudo cp -r /var/www /var/www.backup.$(date +%s)
```

### 3. Domain-Überprüfung

```bash
# DNS-Auflösung testen
nslookup form.motorlink.ch
dig form.motorlink.ch

# Ping zum Server
ping -c 1 form.motorlink.ch

# HTTP-Zugriff testen
curl -I http://form.motorlink.ch
```

### 4. Port-Verfügbarkeit

```bash
# Port 80 überprüfen
sudo lsof -i :80

# Port 443 überprüfen
sudo lsof -i :443

# Firewall-Regeln überprüfen
sudo ufw status
sudo iptables -L -n
```

---

## 🚀 Automatisches Deployment

### Option 1: Mit Setup-Skript (EMPFOHLEN)

```bash
# 1. Repository klonen
git clone https://github.com/Motorlink/neukundenformular.git
cd neukundenformular

# 2. Skript ausführbar machen
chmod +x scripts/setup-letsencrypt.sh

# 3. Skript ausführen
sudo bash scripts/setup-letsencrypt.sh
```

### Option 2: Remote Deployment

```bash
# 1. Skript zum Server kopieren
scp scripts/setup-letsencrypt.sh administrator@185.229.91.116:/tmp/

# 2. Per SSH ausführen
ssh administrator@185.229.91.116 "sudo bash /tmp/setup-letsencrypt.sh"

# 3. Logs überprüfen
ssh administrator@185.229.91.116 "sudo tail -f /var/log/letsencrypt/letsencrypt.log"
```

---

## 🔧 Manuelles Deployment

Falls das automatische Skript nicht funktioniert, folgen Sie diesen Schritten:

### Schritt 1: ACME Challenge Verzeichnis erstellen

```bash
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot
sudo chmod -R 755 /var/www/certbot
```

### Schritt 2: Temporäre HTTP-Konfiguration

```bash
# Backup erstellen
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Neue HTTP-only Konfiguration
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80;
    server_name form.motorlink.ch 185.229.91.116;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}
EOF

# Konfiguration testen
sudo nginx -t

# Nginx neu starten
sudo systemctl restart nginx
```

### Schritt 3: Let's Encrypt Zertifikat ausstellen

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d form.motorlink.ch \
  -d 185.229.91.116 \
  --agree-tos \
  --non-interactive \
  --email admin@motorlink.ch \
  --preferred-challenges http
```

### Schritt 4: HTTPS-Konfiguration

```bash
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
# HTTP Server - Redirect zu HTTPS
server {
    listen 80;
    server_name form.motorlink.ch 185.229.91.116;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name form.motorlink.ch 185.229.91.116;
    
    ssl_certificate /etc/letsencrypt/live/form.motorlink.ch/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/form.motorlink.ch/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    location / {
        root /home/administrator/motorlink-backend/dist/public;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Konfiguration testen
sudo nginx -t

# Nginx neu starten
sudo systemctl restart nginx
```

### Schritt 5: Automatische Erneuerung konfigurieren

```bash
# Certbot Timer aktivieren
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Status überprüfen
sudo systemctl status certbot.timer

# Trockenlauf testen
sudo certbot renew --dry-run
```

---

## ✅ Post-Deployment Verifizierung

### 1. HTTPS-Verbindung testen

```bash
# Einfacher Test
curl -I https://form.motorlink.ch

# Mit Zertifikat-Details
curl -vI https://form.motorlink.ch

# Mit OpenSSL
openssl s_client -connect form.motorlink.ch:443 -servername form.motorlink.ch
```

### 2. Zertifikat validieren

```bash
# Zertifikat-Informationen
sudo certbot certificates

# Zertifikat-Details
sudo openssl x509 -in /etc/letsencrypt/live/form.motorlink.ch/cert.pem -text -noout

# Ablaufdatum
sudo certbot certificates | grep "Expiry Date"
```

### 3. Nginx-Status überprüfen

```bash
# Nginx-Status
sudo systemctl status nginx

# Konfiguration validieren
sudo nginx -t

# Prozesse überprüfen
sudo ps aux | grep nginx
```

### 4. Logs überprüfen

```bash
# Nginx Error Logs
sudo tail -n 50 /var/log/nginx/error.log

# Certbot Logs
sudo tail -n 50 /var/log/letsencrypt/letsencrypt.log

# Systemd Logs
sudo journalctl -u nginx -n 50
sudo journalctl -u certbot.service -n 50
```

### 5. SSL-Test durchführen

```bash
# Mit SSL Labs (online)
# https://www.ssllabs.com/ssltest/analyze.html?d=form.motorlink.ch

# Mit testssl.sh (lokal)
./testssl.sh https://form.motorlink.ch
```

---

## 🔄 Rollback

Falls etwas schief geht, können Sie die vorherige Konfiguration wiederherstellen:

### Schneller Rollback

```bash
# Nginx-Konfiguration wiederherstellen
sudo cp /etc/nginx/sites-available/default.backup /etc/nginx/sites-available/default

# Nginx neu starten
sudo systemctl restart nginx

# Status überprüfen
sudo systemctl status nginx
```

### Vollständiger Rollback

```bash
# Alle Backups auflisten
ls -la /etc/nginx.backup.*
ls -la /etc/letsencrypt.backup.*

# Nginx wiederherstellen
sudo rm -rf /etc/nginx
sudo cp -r /etc/nginx.backup.TIMESTAMP /etc/nginx

# Let's Encrypt wiederherstellen (optional)
sudo rm -rf /etc/letsencrypt
sudo cp -r /etc/letsencrypt.backup.TIMESTAMP /etc/letsencrypt

# Nginx neu starten
sudo systemctl restart nginx
```

---

## 🐛 Troubleshooting

### Problem: "Connection refused" auf Port 80

```bash
# Überprüfen, was auf Port 80 läuft
sudo lsof -i :80

# Nginx neu starten
sudo systemctl restart nginx

# Firewall überprüfen
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Problem: "Certificate not found"

```bash
# Zertifikat-Verzeichnis überprüfen
ls -la /etc/letsencrypt/live/form.motorlink.ch/

# Certbot Logs überprüfen
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Manuelle Ausstellung versuchen
sudo certbot certonly --standalone -d form.motorlink.ch
```

### Problem: "Nginx configuration error"

```bash
# Konfiguration validieren
sudo nginx -t

# Fehler-Details anzeigen
sudo nginx -T

# Logs überprüfen
sudo tail -f /var/log/nginx/error.log
```

### Problem: "ACME challenge failed"

```bash
# Port 80 überprüfen
sudo lsof -i :80

# ACME-Verzeichnis überprüfen
ls -la /var/www/certbot/

# Berechtigungen überprüfen
sudo chown -R www-data:www-data /var/www/certbot
sudo chmod -R 755 /var/www/certbot

# Nginx neu starten
sudo systemctl restart nginx

# Erneut versuchen
sudo certbot certonly --webroot -w /var/www/certbot -d form.motorlink.ch
```

---

## 📊 Monitoring nach Deployment

### Automatische Überwachung einrichten

```bash
# Cron-Job für tägliche Überprüfung
sudo crontab -e

# Hinzufügen:
0 2 * * * /usr/bin/certbot renew --quiet
0 3 * * * /usr/bin/curl -f https://form.motorlink.ch/health || mail -s "MotorLink HTTPS Check Failed" admin@motorlink.ch
```

### Manuelle Überwachung

```bash
# Tägliche Überprüfung
sudo certbot certificates
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log
```

---

## 📝 Deployment-Checkliste

- [ ] Voraussetzungen überprüft
- [ ] Backups erstellt
- [ ] Domain-Auflösung getestet
- [ ] Ports verfügbar
- [ ] Setup-Skript ausgeführt
- [ ] HTTPS-Verbindung getestet
- [ ] Zertifikat validiert
- [ ] Nginx-Status überprüft
- [ ] Logs überprüft
- [ ] Automatische Erneuerung konfiguriert
- [ ] Monitoring eingerichtet
- [ ] Team benachrichtigt

---

**Zuletzt aktualisiert:** 1. Dezember 2025  
**Version:** 1.0.0


---

## 🚀 **Deployment am 1. Dezember 2025**

**Status:** ✅ **ERFOLGREICH**

Das Let's Encrypt Zertifikat wurde erfolgreich ausgestellt und die HTTPS-Konfiguration ist aktiv. Die Website ist jetzt unter `https://form.motorlink.ch` sicher erreichbar.

**Wichtige Hinweise:**
- Das Setup-Skript muss nicht erneut ausgeführt werden.
- Die automatische Zertifikat-Erneuerung ist aktiv.
- Ein vollständiges Backup wurde vor dem Deployment erstellt.
