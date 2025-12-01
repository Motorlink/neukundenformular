#!/bin/bash

################################################################################
# MotorLink Neukundenformular - Rollback Script
#
# Dieses Skript stellt die vorherige Nginx-Konfiguration wieder her
# falls etwas schief geht.
#
# Verwendung:
#   sudo bash rollback.sh [BACKUP_TIMESTAMP]
#
# Beispiel:
#   sudo bash rollback.sh 1701432000
#
# Autor: MotorLink IT Team
# Version: 1.0.0
################################################################################

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

list_backups() {
    log_info "Verfügbare Backups:"
    ls -1t /etc/nginx/backups/default.backup.* 2>/dev/null | head -10 || {
        log_error "Keine Backups gefunden!"
        exit 1
    }
}

rollback() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup-Datei nicht gefunden: $backup_file"
        list_backups
        exit 1
    fi
    
    log_warning "Rollback wird durchgeführt..."
    log_info "Backup-Datei: $backup_file"
    
    # Backup der aktuellen Konfiguration
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.failed.$(date +%s)
    log_success "Aktuelle Konfiguration gesichert"
    
    # Alte Konfiguration wiederherstellen
    cp "$backup_file" /etc/nginx/sites-available/default
    log_success "Alte Konfiguration wiederhergestellt"
    
    # Nginx testen
    if ! nginx -t; then
        log_error "Nginx-Konfiguration hat Fehler!"
        log_info "Stelle fehlgeschlagene Konfiguration wieder her..."
        cp /etc/nginx/sites-available/default.failed.* /etc/nginx/sites-available/default
        exit 1
    fi
    log_success "Nginx-Konfiguration OK"
    
    # Nginx neu starten
    systemctl restart nginx
    log_success "Nginx neugestartet"
    
    log_success "Rollback abgeschlossen!"
}

main() {
    echo ""
    echo "=========================================="
    echo "MotorLink Neukundenformular - Rollback"
    echo "=========================================="
    echo ""
    
    check_root
    
    if [[ -z "$1" ]]; then
        log_warning "Keine Backup-Datei angegeben"
        list_backups
        exit 1
    fi
    
    local backup_file="/etc/nginx/backups/default.backup.$1"
    rollback "$backup_file"
}

trap 'log_error "Skript abgebrochen"; exit 1' INT TERM

main "$@"
