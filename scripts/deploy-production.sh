#!/bin/bash

# SOVREN AI BARE METAL PRODUCTION DEPLOYMENT SCRIPT
# Direct server deployment without containers

set -e

# Configuration
APP_NAME="sovren-ai"
APP_DIR="/var/www/sovren-ai"
USER="sovren"
GROUP="www-data"
NODE_VERSION="20"
BACKUP_DIR="/var/backups/sovren-ai"
LOG_DIR="/var/log/sovren-ai"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js $NODE_VERSION"
    fi
    
    NODE_VER=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VER -lt $NODE_VERSION ]]; then
        error "Node.js version $NODE_VERSION or higher is required. Current: $(node --version)"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        warn "PM2 is not installed. Installing PM2..."
        npm install -g pm2
    fi
    
    # Check Nginx
    if ! command -v nginx &> /dev/null; then
        error "Nginx is not installed. Please install Nginx"
    fi
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        warn "PostgreSQL client is not installed"
    fi
    
    # Check Python for TTS backend
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is not installed. Required for TTS backend"
    fi
    
    log "System requirements check completed"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    sudo mkdir -p $APP_DIR
    sudo mkdir -p $LOG_DIR
    sudo mkdir -p $BACKUP_DIR
    sudo mkdir -p /var/lib/sovren-ai/models
    sudo mkdir -p /var/cache/sovren-ai/tts
    sudo mkdir -p /etc/sovren-ai
    
    # Set ownership
    sudo chown -R $USER:$GROUP $APP_DIR
    sudo chown -R $USER:$GROUP $LOG_DIR
    sudo chown -R $USER:$GROUP /var/lib/sovren-ai
    sudo chown -R $USER:$GROUP /var/cache/sovren-ai
    
    # Set permissions
    sudo chmod 755 $APP_DIR
    sudo chmod 755 $LOG_DIR
    sudo chmod 750 /var/lib/sovren-ai
    sudo chmod 750 /var/cache/sovren-ai
    
    log "Directories created successfully"
}

# Install dependencies
install_dependencies() {
    log "Installing production dependencies..."
    
    cd $APP_DIR
    
    # Install Node.js dependencies
    npm ci --production --silent
    
    # Install PM2 if not already installed
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    
    log "Dependencies installed successfully"
}

# Build application
build_application() {
    log "Building SOVREN AI application..."
    
    cd $APP_DIR
    
    # Set production environment
    export NODE_ENV=production
    
    # Build Next.js application
    npm run build
    
    # Verify build
    if [[ ! -d ".next" ]]; then
        error "Build failed - .next directory not found"
    fi
    
    log "Application built successfully"
}

# Configure environment
configure_environment() {
    log "Configuring production environment..."
    
    # Create environment file if it doesn't exist
    if [[ ! -f "/etc/sovren-ai/.env.production" ]]; then
        warn "Production environment file not found. Creating template..."
        
        cat > /tmp/env.production << EOF
# SOVREN AI Production Environment
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sovren_ai_prod
DB_USER=sovren_user
DB_PASSWORD=CHANGE_THIS_PASSWORD

# Security
JWT_SECRET=CHANGE_THIS_SECRET
ENCRYPTION_KEY=CHANGE_THIS_KEY

# TTS Backend
TTS_MODELS_PATH=/var/lib/sovren-ai/models
TTS_OUTPUT_PATH=/var/www/sovren-ai/public/audio/generated
PYTHON_PATH=/usr/bin/python3
STYLETTS2_PATH=/opt/styletts2

# Monitoring
ENABLE_MONITORING=true
LOG_LEVEL=info
EOF
        
        sudo mv /tmp/env.production /etc/sovren-ai/.env.production
        sudo chown $USER:$GROUP /etc/sovren-ai/.env.production
        sudo chmod 600 /etc/sovren-ai/.env.production
        
        warn "Please edit /etc/sovren-ai/.env.production with your actual values"
    fi
    
    # Link environment file
    ln -sf /etc/sovren-ai/.env.production $APP_DIR/.env.production
    
    log "Environment configured"
}

# Setup database
setup_database() {
    log "Setting up production database..."
    
    # Check if database exists
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw sovren_ai_prod; then
        info "Database already exists"
    else
        info "Creating production database..."
        sudo -u postgres createdb sovren_ai_prod
        sudo -u postgres psql -c "CREATE USER sovren_user WITH PASSWORD 'CHANGE_THIS_PASSWORD';"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sovren_ai_prod TO sovren_user;"
    fi
    
    log "Database setup completed"
}

# Configure Nginx
configure_nginx() {
    log "Configuring Nginx..."
    
    # Backup existing configuration
    if [[ -f "/etc/nginx/sites-available/sovren-ai" ]]; then
        sudo cp /etc/nginx/sites-available/sovren-ai /etc/nginx/sites-available/sovren-ai.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Copy Nginx configuration
    sudo cp nginx.conf /etc/nginx/sites-available/sovren-ai
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/sovren-ai /etc/nginx/sites-enabled/
    
    # Remove default site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    sudo nginx -t || error "Nginx configuration test failed"
    
    log "Nginx configured successfully"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    # Check if certificates exist
    if [[ -f "/etc/ssl/certs/sovren.ai.crt" ]] && [[ -f "/etc/ssl/private/sovren.ai.key" ]]; then
        info "SSL certificates already exist"
    else
        warn "SSL certificates not found. Please install SSL certificates:"
        warn "  - Certificate: /etc/ssl/certs/sovren.ai.crt"
        warn "  - Private key: /etc/ssl/private/sovren.ai.key"
        warn "  - Consider using Let's Encrypt: certbot --nginx -d sovren.ai -d www.sovren.ai"
    fi
    
    log "SSL setup completed"
}

# Start services
start_services() {
    log "Starting SOVREN AI services..."
    
    cd $APP_DIR
    
    # Stop existing PM2 processes
    pm2 delete all 2>/dev/null || true
    
    # Start application with PM2
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup systemd -u $USER --hp /home/$USER
    
    # Restart Nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    # Check service status
    pm2 status
    sudo systemctl status nginx --no-pager
    
    log "Services started successfully"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create monitoring script
    cat > /usr/local/bin/sovren-monitor.js << 'EOF'
#!/usr/bin/env node

const http = require('http');
const fs = require('fs');

const MONITOR_INTERVAL = process.env.MONITOR_INTERVAL || 30000;
const METRICS_PORT = process.env.METRICS_PORT || 9090;

// Health check function
async function healthCheck() {
    try {
        const response = await fetch('http://localhost:3000/health');
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Start monitoring
setInterval(async () => {
    const isHealthy = await healthCheck();
    const timestamp = new Date().toISOString();
    
    console.log(`${timestamp} - Health: ${isHealthy ? 'OK' : 'FAIL'}`);
    
    if (!isHealthy) {
        console.error(`${timestamp} - Application health check failed`);
    }
}, MONITOR_INTERVAL);

console.log('SOVREN AI monitoring started');
EOF
    
    sudo chmod +x /usr/local/bin/sovren-monitor.js
    
    log "Monitoring setup completed"
}

# Create backup script
create_backup_script() {
    log "Creating backup script..."
    
    cat > /usr/local/bin/sovren-backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR=${BACKUP_DIR:-/var/backups/sovren-ai}
DB_NAME=${DB_NAME:-sovren_ai_prod}
RETENTION_DAYS=${RETENTION_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump $DB_NAME | gzip > $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz

# Application backup
tar -czf $BACKUP_DIR/app_backup_$TIMESTAMP.tar.gz -C /var/www sovren-ai

# Clean old backups
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $TIMESTAMP"
EOF
    
    sudo chmod +x /usr/local/bin/sovren-backup.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/sovren-backup.sh") | crontab -
    
    log "Backup script created"
}

# Main deployment function
main() {
    log "Starting SOVREN AI bare metal production deployment..."
    
    check_root
    check_requirements
    create_directories
    install_dependencies
    build_application
    configure_environment
    setup_database
    configure_nginx
    setup_ssl
    start_services
    setup_monitoring
    create_backup_script
    
    log "🎉 SOVREN AI production deployment completed successfully!"
    info "Application URL: https://sovren.ai"
    info "Monitoring: pm2 monit"
    info "Logs: pm2 logs"
    info "Status: pm2 status"
}

# Run main function
main "$@"
