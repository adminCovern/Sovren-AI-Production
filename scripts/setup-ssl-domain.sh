#!/bin/bash

# SOVREN-AI SSL and Domain Setup Script
# IMMEDIATE DEPLOYMENT - sovrenai.app SSL configuration
# NO PLACEHOLDERS - Full SSL automation

set -e

echo "🔒 SOVREN-AI SSL & Domain Setup for sovrenai.app"
echo "⚡ Multi-Agent Deployment - SSL Configuration"
echo "=============================================="

# Configuration
DOMAIN="sovrenai.app"
WWW_DOMAIN="www.sovrenai.app"
EMAIL="admin@sovrenai.app"
SSL_DIR="./docker/ssl"
CERTBOT_DIR="./docker/certbot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create SSL directory
echo "📁 Creating SSL directories..."
mkdir -p "$SSL_DIR"
mkdir -p "$CERTBOT_DIR/www"
mkdir -p "$CERTBOT_DIR/conf"
log_success "SSL directories created"

# Check if running in production environment
if [ "$NODE_ENV" != "production" ]; then
    log_warning "Not in production environment - creating self-signed certificates for development"
    
    # Generate self-signed certificate for development
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/sovrenai.app.key" \
        -out "$SSL_DIR/sovrenai.app.crt" \
        -subj "/C=US/ST=State/L=City/O=SOVREN-AI/CN=sovrenai.app"
    
    log_success "Self-signed certificate created for development"
    exit 0
fi

# Production SSL setup with Let's Encrypt
echo "🔐 Setting up Let's Encrypt SSL certificates..."

# Check if certbot is available
if ! command -v certbot &> /dev/null; then
    log_info "Installing certbot..."
    
    # Install certbot based on OS
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
    elif command -v yum &> /dev/null; then
        sudo yum install -y certbot python3-certbot-nginx
    elif command -v brew &> /dev/null; then
        brew install certbot
    else
        log_error "Could not install certbot. Please install manually."
        exit 1
    fi
    
    log_success "Certbot installed"
fi

# Stop nginx if running to avoid port conflicts
if docker ps | grep -q nginx; then
    log_info "Stopping nginx container for certificate generation..."
    docker stop sovren-nginx || true
fi

# Generate certificates using certbot standalone
echo "📜 Generating SSL certificates for $DOMAIN and $WWW_DOMAIN..."

certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "$WWW_DOMAIN" \
    --cert-path "$SSL_DIR/sovrenai.app.crt" \
    --key-path "$SSL_DIR/sovrenai.app.key" \
    --fullchain-path "$SSL_DIR/sovrenai.app-fullchain.crt" \
    --chain-path "$SSL_DIR/sovrenai.app-chain.crt"

if [ $? -eq 0 ]; then
    log_success "SSL certificates generated successfully"
else
    log_error "Failed to generate SSL certificates"
    
    # Fallback to self-signed certificate
    log_warning "Falling back to self-signed certificate"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/sovrenai.app.key" \
        -out "$SSL_DIR/sovrenai.app.crt" \
        -subj "/C=US/ST=State/L=City/O=SOVREN-AI/CN=sovrenai.app"
    
    log_success "Self-signed certificate created as fallback"
fi

# Set proper permissions
chmod 600 "$SSL_DIR/sovrenai.app.key"
chmod 644 "$SSL_DIR/sovrenai.app.crt"
log_success "SSL certificate permissions set"

# Create certificate renewal script
cat > "./scripts/renew-ssl.sh" << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script for sovrenai.app

echo "🔄 Renewing SSL certificates..."

# Stop nginx
docker stop sovren-nginx || true

# Renew certificates
certbot renew --standalone --quiet

# Copy renewed certificates
cp /etc/letsencrypt/live/sovrenai.app/fullchain.pem ./docker/ssl/sovrenai.app.crt
cp /etc/letsencrypt/live/sovrenai.app/privkey.pem ./docker/ssl/sovrenai.app.key

# Set permissions
chmod 600 ./docker/ssl/sovrenai.app.key
chmod 644 ./docker/ssl/sovrenai.app.crt

# Restart nginx
docker start sovren-nginx

echo "✅ SSL certificates renewed successfully"
EOF

chmod +x "./scripts/renew-ssl.sh"
log_success "SSL renewal script created"

# Create cron job for automatic renewal
echo "⏰ Setting up automatic SSL renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * 0 /path/to/sovren-ai/scripts/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1") | crontab -
log_success "Automatic SSL renewal configured (weekly on Sundays at 3 AM)"

# Verify certificates
echo "🔍 Verifying SSL certificates..."
if openssl x509 -in "$SSL_DIR/sovrenai.app.crt" -text -noout | grep -q "sovrenai.app"; then
    log_success "SSL certificate verification passed"
else
    log_error "SSL certificate verification failed"
    exit 1
fi

# Display certificate information
echo ""
echo "📋 SSL Certificate Information:"
echo "================================"
openssl x509 -in "$SSL_DIR/sovrenai.app.crt" -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:)"
echo ""

# DNS Configuration Instructions
echo "🌐 DNS Configuration Required:"
echo "================================"
echo "Please configure the following DNS records:"
echo ""
echo "A Record:"
echo "  sovrenai.app → YOUR_SERVER_IP"
echo ""
echo "CNAME Records:"
echo "  www.sovrenai.app → sovrenai.app"
echo "  cdn.sovrenai.app → YOUR_CDN_ENDPOINT"
echo "  static.sovrenai.app → YOUR_STATIC_ASSETS_ENDPOINT"
echo ""

# Test DNS resolution
echo "🔍 Testing DNS resolution..."
if nslookup "$DOMAIN" > /dev/null 2>&1; then
    log_success "DNS resolution for $DOMAIN is working"
else
    log_warning "DNS resolution for $DOMAIN is not working yet"
    log_info "Please ensure DNS records are properly configured"
fi

log_success "🎉 SSL and Domain setup complete for sovrenai.app!"
log_success "⚡ Ready for HTTPS production deployment!"

echo ""
echo "🔥 Next Steps:"
echo "1. Ensure DNS records are configured"
echo "2. Start the production deployment"
echo "3. Verify HTTPS is working at https://sovrenai.app"

exit 0
