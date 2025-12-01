#!/bin/bash

################################################################################
# MotorLink Neukundenformular - Let's Encrypt HTTPS Setup
# 
# Dieses Skript konfiguriert automatisch Let's Encrypt HTTPS für das
# MotorLink Neukundenformular mit vollständiger Fehlerbehandlung.
#
# Verwendung:
#   sudo bash setup-letsencrypt.sh
#
# Autor: MotorLink IT Team
# Version: 1.0.0
# Datum: 1. Dezember 2025
################################################################################

set -e  # Exit bei Fehler

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfiguration
BACKUP_DIR="/etc/nginx/backups"
BACKUP_FILE="${BACKUP_DIR}/default.backup.$(date +%s)"
CERTBOT_EMAIL="admin@motorlink.ch"
DOMAINS=("form.motorlink.ch" "185.229.91.116")
ACME_DIR="/var/www/certbot"

################################################################################
# Funktionen
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Dieses Skript muss als Root ausgeführt werden!"
        exit 1
    fi
}

check_requirements() {
    log_info "Überprüfe Anforderungen..."
    
    # Nginx überprüfen
    if ! command -v nginx &> /dev/null; then
        log_error "Nginx nicht installiert!"
        exit 1
    fi
    log_success "Nginx installiert ($(nginx -v 2>&1))"
    
    # Certbot überprüfen
    if ! command -v certbot &> /dev/null; then
        log_error "Certbot nicht installiert!"
        exit 1
    fi
    log_success "Certbot installiert ($(certbot --version))"
    
    # Ports überprüfen
    if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_success "Port 80 ist verfügbar"
    else
        log_warning "Port 80 wird nicht von Nginx verwendet"
    fi
}

create_backup() {
    log_info "Erstelle Backup der Nginx-Konfiguration..."
    
    mkdir -p "$BACKUP_DIR"
    cp /etc/nginx/sites-available/default "$BACKUP_FILE"
    
    log_success "Backup erstellt: $BACKUP_FILE"
}

setup_acme_directory() {
    log_info "Richte ACME Challenge Verzeichnis ein..."
    
    mkdir -p "$ACME_DIR"
    chown -R www-data:www-data "$ACME_DIR"
    chmod -R 755 "$ACME_DIR"
    
    log_success "ACME Verzeichnis eingerichtet: $ACME_DIR"
}

create_http_config() {
    log_info "Erstelle temporäre HTTP-Konfiguration..."
    
    cat > /etc/nginx/sites-available/default << 'NGINX_HTTP'
# Temporäre HTTP-only Konfiguration für Let's Encrypt ACME Challenge
server {
    listen 80;
    server_name form.motorlink.ch 185.229.91.116;
    
    # ACME Challenge für Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Alle anderen Anfragen zu HTTPS umleiten
    location / {
        return 301 https://$host$request_uri;
    }
}
NGINX_HTTP
    
    log_success "HTTP-Konfiguration erstellt"
}

test_nginx_config() {
    log_info "Teste Nginx-Konfiguration..."
    
    if ! nginx -t 2>&1 | grep -q "successful"; then
        log_error "Nginx-Konfiguration hat Fehler!"
        log_info "Stelle alte Konfiguration wieder her..."
        cp "$BACKUP_FILE" /etc/nginx/sites-available/default
        systemctl restart nginx
        exit 1
    fi
    
    log_success "Nginx-Konfiguration OK"
}

restart_nginx() {
    log_info "Starte Nginx neu..."
    
    if ! systemctl restart nginx; then
        log_error "Nginx konnte nicht neugestartet werden!"
        cp "$BACKUP_FILE" /etc/nginx/sites-available/default
        systemctl restart nginx
        exit 1
    fi
    
    log_success "Nginx neugestartet"
}

issue_certificate() {
    log_info "Stelle Let's Encrypt Zertifikat aus..."
    log_info "Domains: ${DOMAINS[*]}"
    
    # Domains als Parameter vorbereiten
    local domain_args=""
    for domain in "${DOMAINS[@]}"; do
        domain_args="$domain_args -d $domain"
    done
    
    if ! certbot certonly --webroot -w "$ACME_DIR" \
        $domain_args \
        --agree-tos \
        --non-interactive \
        --email "$CERTBOT_EMAIL" \
        --preferred-challenges http; then
        
        log_error "Let's Encrypt Zertifikat-Ausstellung fehlgeschlagen!"
        log_info "Stelle alte Nginx-Konfiguration wieder her..."
        cp "$BACKUP_FILE" /etc/nginx/sites-available/default
        systemctl restart nginx
        exit 1
    fi
    
    log_success "Let's Encrypt Zertifikat erfolgreich ausgestellt"
}

create_https_config() {
    log_info "Erstelle finale HTTPS-Konfiguration..."
    
    cat > /etc/nginx/sites-available/default << 'NGINX_HTTPS'
# HTTP Server - Redirect zu HTTPS und ACME Challenge
server {
    listen 80;
    server_name form.motorlink.ch 185.229.91.116;
    
    # ACME Challenge für Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Alle anderen Anfragen zu HTTPS umleiten
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server mit Let's Encrypt
server {
    listen 443 ssl http2;
    server_name form.motorlink.ch 185.229.91.116;
    
    # Let's Encrypt Zertifikate
    ssl_certificate /etc/letsencrypt/live/form.motorlink.ch/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/form.motorlink.ch/privkey.pem;
    
    # SSL/TLS Konfiguration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Logging
    access_log /var/log/nginx/motorlink_access.log;
    error_log /var/log/nginx/motorlink_error.log;
    
    # Frontend - Statische Dateien
    location / {
        root /home/administrator/motorlink-backend/dist/public;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
    
    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "upgrade";
        proxy_set_header Upgrade $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }
}
NGINX_HTTPS
    
    log_success "HTTPS-Konfiguration erstellt"
}

enable_auto_renewal() {
    log_info "Aktiviere automatische Zertifikat-Erneuerung..."
    
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    log_success "Automatische Erneuerung aktiviert"
}

show_certificate_info() {
    log_info "Zertifikat-Informationen:"
    certbot certificates
}

show_summary() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}✓ Let's Encrypt HTTPS Setup abgeschlossen!${NC}"
    echo "=========================================="
    echo ""
    echo "Wichtige Informationen:"
    echo "  Domain: form.motorlink.ch"
    echo "  Zertifikat: /etc/letsencrypt/live/form.motorlink.ch/"
    echo "  Nginx Config: /etc/nginx/sites-available/default"
    echo "  Backup: $BACKUP_FILE"
    echo ""
    echo "Nächste Schritte:"
    echo "  1. HTTPS-Verbindung testen:"
    echo "     curl -I https://form.motorlink.ch"
    echo ""
    echo "  2. Zertifikat-Status überprüfen:"
    echo "     sudo certbot certificates"
    echo ""
    echo "  3. Automatische Erneuerung überprüfen:"
    echo "     sudo systemctl status certbot.timer"
    echo ""
    echo "=========================================="
}

################################################################################
# Hauptprogramm
################################################################################

main() {
    echo ""
    echo "=========================================="
    echo "MotorLink Neukundenformular"
    echo "Let's Encrypt HTTPS Setup"
    echo "=========================================="
    echo ""
    
    check_root
    check_requirements
    create_backup
    setup_acme_directory
    create_http_config
    test_nginx_config
    restart_nginx
    issue_certificate
    create_https_config
    test_nginx_config
    restart_nginx
    enable_auto_renewal
    show_certificate_info
    show_summary
}

# Fehlerbehandlung
trap 'log_error "Skript abgebrochen"; exit 1' INT TERM

# Starte Hauptprogramm
main
