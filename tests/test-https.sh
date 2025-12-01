#!/bin/bash

################################################################################
# MotorLink Neukundenformular - HTTPS Test Script
#
# Dieses Skript testet die HTTPS-Verbindung und Zertifikat-Validität
#
# Verwendung:
#   bash test-https.sh
#
# Autor: MotorLink IT Team
# Version: 1.0.0
################################################################################

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="form.motorlink.ch"
PASSED=0
FAILED=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

test_https_connection() {
    log_info "Teste HTTPS-Verbindung zu $DOMAIN..."
    
    if curl -s -I "https://$DOMAIN" > /dev/null 2>&1; then
        log_success "HTTPS-Verbindung erfolgreich"
    else
        log_error "HTTPS-Verbindung fehlgeschlagen"
    fi
}

test_http_redirect() {
    log_info "Teste HTTP → HTTPS Redirect..."
    
    local redirect=$(curl -s -I "http://$DOMAIN" | grep -i "location" | grep "https" || true)
    if [[ -n "$redirect" ]]; then
        log_success "HTTP → HTTPS Redirect funktioniert"
    else
        log_error "HTTP → HTTPS Redirect funktioniert nicht"
    fi
}

test_certificate_validity() {
    log_info "Teste Zertifikat-Gültigkeit..."
    
    if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        log_success "Zertifikat ist gültig"
    else
        log_error "Zertifikat ist ungültig oder abgelaufen"
    fi
}

test_certificate_expiry() {
    log_info "Überprüfe Zertifikat-Ablaufdatum..."
    
    local expiry_date=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates | grep "notAfter" | cut -d= -f2)
    
    if [[ -n "$expiry_date" ]]; then
        log_success "Zertifikat läuft ab am: $expiry_date"
    else
        log_error "Konnte Ablaufdatum nicht ermitteln"
    fi
}

test_tls_version() {
    log_info "Teste TLS-Versionen..."
    
    # TLS 1.2
    if echo | openssl s_client -tls1_2 -connect "$DOMAIN:443" 2>/dev/null | grep -q "Protocol.*TLSv1.2"; then
        log_success "TLS 1.2 wird unterstützt"
    else
        log_warning "TLS 1.2 wird nicht unterstützt"
    fi
    
    # TLS 1.3
    if echo | openssl s_client -tls1_3 -connect "$DOMAIN:443" 2>/dev/null | grep -q "Protocol.*TLSv1.3"; then
        log_success "TLS 1.3 wird unterstützt"
    else
        log_warning "TLS 1.3 wird nicht unterstützt"
    fi
}

test_security_headers() {
    log_info "Teste Security Headers..."
    
    local headers=$(curl -s -I "https://$DOMAIN")
    
    # HSTS
    if echo "$headers" | grep -q "Strict-Transport-Security"; then
        log_success "HSTS Header vorhanden"
    else
        log_error "HSTS Header fehlt"
    fi
    
    # X-Frame-Options
    if echo "$headers" | grep -q "X-Frame-Options"; then
        log_success "X-Frame-Options Header vorhanden"
    else
        log_error "X-Frame-Options Header fehlt"
    fi
    
    # X-Content-Type-Options
    if echo "$headers" | grep -q "X-Content-Type-Options"; then
        log_success "X-Content-Type-Options Header vorhanden"
    else
        log_error "X-Content-Type-Options Header fehlt"
    fi
}

test_response_time() {
    log_info "Teste Response-Zeit..."
    
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" "https://$DOMAIN")
    
    if (( $(echo "$response_time < 1" | bc -l) )); then
        log_success "Response-Zeit: ${response_time}s (schnell)"
    elif (( $(echo "$response_time < 3" | bc -l) )); then
        log_warning "Response-Zeit: ${response_time}s (akzeptabel)"
    else
        log_error "Response-Zeit: ${response_time}s (langsam)"
    fi
}

test_neukunden_form() {
    log_info "Teste Neukundenformular-Endpunkt..."
    
    if curl -s -I "https://$DOMAIN/neukunden" | grep -q "200\|301\|302"; then
        log_success "Neukundenformular-Endpunkt erreichbar"
    else
        log_error "Neukundenformular-Endpunkt nicht erreichbar"
    fi
}

show_summary() {
    echo ""
    echo "=========================================="
    echo "Test-Zusammenfassung"
    echo "=========================================="
    echo -e "${GREEN}Bestanden: $PASSED${NC}"
    echo -e "${RED}Fehlgeschlagen: $FAILED${NC}"
    echo "=========================================="
    echo ""
    
    if [[ $FAILED -eq 0 ]]; then
        echo -e "${GREEN}✓ Alle Tests bestanden!${NC}"
        exit 0
    else
        echo -e "${RED}✗ Einige Tests sind fehlgeschlagen!${NC}"
        exit 1
    fi
}

main() {
    echo ""
    echo "=========================================="
    echo "MotorLink Neukundenformular - HTTPS Tests"
    echo "Domain: $DOMAIN"
    echo "=========================================="
    echo ""
    
    test_https_connection
    test_http_redirect
    test_certificate_validity
    test_certificate_expiry
    test_tls_version
    test_security_headers
    test_response_time
    test_neukunden_form
    
    show_summary
}

main
