#!/bin/bash

# SOVREN AI PRODUCTION LAUNCH SCRIPT
# Final deployment and go-live procedures

set -e

# Configuration
DOMAIN="sovren.ai"
APP_DIR="/var/www/sovren-ai"
BACKUP_DIR="/var/backups/sovren-ai"
LOG_DIR="/var/log/sovren-ai"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Logging
log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"; exit 1; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"; }
info() { echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO: $1${NC}"; }
success() { echo -e "${PURPLE}[$(date +'%H:%M:%S')] SUCCESS: $1${NC}"; }

# Pre-launch checks
pre_launch_checks() {
    log "🔍 Running pre-launch checks..."
    
    # Check if application is built
    if [[ ! -d "$APP_DIR/.next" ]]; then
        error "Application not built. Run build process first."
    fi
    
    # Check if PM2 is configured
    if ! pm2 list | grep -q "sovren-ai-production"; then
        error "PM2 processes not configured. Run deployment script first."
    fi
    
    # Check if Nginx is configured
    if [[ ! -f "/etc/nginx/sites-enabled/sovren-ai" ]]; then
        error "Nginx not configured. Run deployment script first."
    fi
    
    # Check SSL certificates
    if [[ ! -f "/etc/ssl/certs/$DOMAIN.crt" ]]; then
        warn "SSL certificate not found. HTTPS will not work."
    fi
    
    # Check database connection
    if ! sudo -u postgres psql -d sovren_ai_prod -c "SELECT 1;" &>/dev/null; then
        error "Database connection failed."
    fi
    
    success "Pre-launch checks completed"
}

# DNS verification
verify_dns() {
    log "🌐 Verifying DNS configuration..."
    
    local server_ip=$(curl -s ifconfig.me)
    local dns_ip=$(dig +short $DOMAIN)
    
    if [[ "$server_ip" == "$dns_ip" ]]; then
        success "DNS correctly points to this server ($server_ip)"
    else
        warn "DNS mismatch: Server IP ($server_ip) != DNS IP ($dns_ip)"
        warn "Update DNS records to point to $server_ip"
    fi
}

# SSL certificate setup
setup_ssl() {
    log "🔒 Setting up SSL certificates..."
    
    if [[ -f "/etc/ssl/certs/$DOMAIN.crt" ]]; then
        info "SSL certificate already exists"
        
        # Check expiration
        local expiry=$(openssl x509 -enddate -noout -in "/etc/ssl/certs/$DOMAIN.crt" | cut -d= -f2)
        info "Certificate expires: $expiry"
    else
        info "Setting up Let's Encrypt SSL certificate..."
        
        # Install certbot if not present
        if ! command -v certbot &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y certbot python3-certbot-nginx
        fi
        
        # Get certificate
        sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
        
        # Setup auto-renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
        
        success "SSL certificate configured"
    fi
}

# Final system optimization
optimize_system() {
    log "⚡ Applying final system optimizations..."
    
    # Optimize kernel parameters
    sudo tee /etc/sysctl.d/99-sovren-ai.conf > /dev/null << EOF
# SOVREN AI Production Optimizations
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_max_tw_buckets = 1440000
vm.swappiness = 10
fs.file-max = 2097152
EOF
    
    sudo sysctl -p /etc/sysctl.d/99-sovren-ai.conf
    
    # Set ulimits
    sudo tee /etc/security/limits.d/99-sovren-ai.conf > /dev/null << EOF
sovren soft nofile 65535
sovren hard nofile 65535
www-data soft nofile 65535
www-data hard nofile 65535
EOF
    
    success "System optimizations applied"
}

# Start all services
start_services() {
    log "🚀 Starting all production services..."
    
    # Start PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Start Redis (if available)
    if systemctl list-unit-files | grep -q redis; then
        sudo systemctl start redis
        sudo systemctl enable redis
    fi
    
    # Start PM2 processes
    cd $APP_DIR
    pm2 restart ecosystem.config.js --env production
    pm2 save
    
    # Start Nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    # Verify services
    sleep 5
    
    if pm2 list | grep -q "online"; then
        success "PM2 processes running"
    else
        error "PM2 processes failed to start"
    fi
    
    if sudo systemctl is-active nginx &>/dev/null; then
        success "Nginx running"
    else
        error "Nginx failed to start"
    fi
    
    success "All services started"
}

# Setup monitoring
setup_monitoring() {
    log "📊 Setting up production monitoring..."
    
    # Create monitoring dashboard script
    cat > /usr/local/bin/sovren-dashboard.sh << 'EOF'
#!/bin/bash

clear
echo "======================================"
echo "    SOVREN AI PRODUCTION DASHBOARD    "
echo "======================================"
echo ""

# System info
echo "🖥️  SYSTEM STATUS"
echo "Uptime: $(uptime -p)"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
echo "Memory: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"
echo ""

# PM2 status
echo "🔄 PM2 PROCESSES"
pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status) (CPU: \(.monit.cpu)%, Memory: \(.monit.memory/1024/1024 | floor)MB)"'
echo ""

# Nginx status
echo "🌐 NGINX STATUS"
if systemctl is-active nginx &>/dev/null; then
    echo "Status: ✅ Running"
    echo "Connections: $(ss -tuln | grep :443 | wc -l) HTTPS, $(ss -tuln | grep :80 | wc -l) HTTP"
else
    echo "Status: ❌ Stopped"
fi
echo ""

# Recent logs
echo "📝 RECENT LOGS (Last 5 lines)"
tail -n 5 /var/log/sovren-ai/combined.log
echo ""

echo "Press Ctrl+C to exit, or wait 30s for refresh..."
sleep 30
exec $0
EOF
    
    chmod +x /usr/local/bin/sovren-dashboard.sh
    
    # Create log rotation
    sudo tee /etc/logrotate.d/sovren-ai > /dev/null << EOF
/var/log/sovren-ai/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 sovren sovren
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
    
    success "Monitoring setup completed"
}

# Health check
final_health_check() {
    log "🏥 Running final health check..."
    
    local health_url="https://$DOMAIN/health"
    local max_attempts=10
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        info "Health check attempt $attempt/$max_attempts..."
        
        if curl -s -f "$health_url" &>/dev/null; then
            success "Health check passed!"
            break
        else
            if [[ $attempt -eq $max_attempts ]]; then
                error "Health check failed after $max_attempts attempts"
            fi
            sleep 10
            ((attempt++))
        fi
    done
    
    # Test key endpoints
    local endpoints=(
        "https://$DOMAIN"
        "https://$DOMAIN/api/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
        if [[ "$status" == "200" ]]; then
            success "✅ $endpoint: $status"
        else
            warn "⚠️  $endpoint: $status"
        fi
    done
}

# Create launch report
create_launch_report() {
    local report_file="$BACKUP_DIR/launch-report-$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
SOVREN AI PRODUCTION LAUNCH REPORT
==================================
Launch Date: $(date)
Domain: $DOMAIN
Server IP: $(curl -s ifconfig.me)

SYSTEM INFORMATION:
- OS: $(lsb_release -d | cut -f2)
- Kernel: $(uname -r)
- CPU: $(nproc) cores
- Memory: $(free -h | awk 'NR==2{print $2}')
- Disk: $(df -h / | awk 'NR==2{print $2}')

SERVICES STATUS:
- PM2 Processes: $(pm2 list | grep -c online) online
- Nginx: $(systemctl is-active nginx)
- PostgreSQL: $(systemctl is-active postgresql)
- SSL Certificate: $(if [[ -f "/etc/ssl/certs/$DOMAIN.crt" ]]; then echo "Installed"; else echo "Not found"; fi)

PERFORMANCE METRICS:
- Load Average: $(uptime | awk -F'load average:' '{print $2}')
- Memory Usage: $(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
- Disk Usage: $(df / | awk 'NR==2{print $5}')

ENDPOINTS TESTED:
$(for endpoint in "https://$DOMAIN" "https://$DOMAIN/api/health"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "FAIL")
    echo "- $endpoint: $status"
done)

NEXT STEPS:
1. Monitor system performance
2. Set up external monitoring
3. Configure backup verification
4. Plan scaling strategy
5. User acceptance testing

Launch completed successfully at $(date)
EOF
    
    success "Launch report created: $report_file"
}

# Main launch function
main() {
    echo ""
    log "🚀 SOVREN AI PRODUCTION LAUNCH INITIATED"
    log "Domain: $DOMAIN"
    log "Timestamp: $(date)"
    echo ""
    
    pre_launch_checks
    verify_dns
    setup_ssl
    optimize_system
    start_services
    setup_monitoring
    final_health_check
    create_launch_report
    
    echo ""
    echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
    success "SOVREN AI PRODUCTION LAUNCH COMPLETED!"
    echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
    echo ""
    success "🌐 Application URL: https://$DOMAIN"
    success "📊 Dashboard: /usr/local/bin/sovren-dashboard.sh"
    success "📝 Logs: pm2 logs"
    success "🔧 Management: pm2 monit"
    echo ""
    info "SOVREN AI is now LIVE and ready for users!"
    echo ""
}

# Execute launch
main "$@"
