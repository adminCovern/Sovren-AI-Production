#!/bin/bash

# SOVREN AI B200 Server Deployment Script
# Deploys the production build to your B200 infrastructure

set -e

echo "🚀 SOVREN AI B200 Server Deployment"
echo "===================================="

# Configuration
B200_SERVER_USER=${B200_SERVER_USER:-"root"}
B200_SERVER_HOST=${B200_SERVER_HOST:-"your-b200-server.com"}
B200_SERVER_PORT=${B200_SERVER_PORT:-"22"}
DEPLOY_PATH=${DEPLOY_PATH:-"/opt/sovren-ai"}
SERVICE_NAME="sovren-ai"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if SSH connection works
check_ssh_connection() {
    print_info "Checking SSH connection to B200 server..."
    if ssh -p $B200_SERVER_PORT -o ConnectTimeout=10 $B200_SERVER_USER@$B200_SERVER_HOST "echo 'SSH connection successful'" > /dev/null 2>&1; then
        print_status "SSH connection to B200 server established"
    else
        print_error "Cannot connect to B200 server via SSH"
        print_info "Please ensure:"
        print_info "  - B200_SERVER_HOST is set correctly"
        print_info "  - B200_SERVER_USER has SSH access"
        print_info "  - SSH keys are properly configured"
        exit 1
    fi
}

# Build the application
build_application() {
    print_info "Building SOVREN AI application..."
    
    # Clean previous builds
    rm -rf .next
    rm -rf out
    
    # Install dependencies
    print_info "Installing dependencies..."
    npm ci --production=false
    
    # Build the application
    print_info "Creating production build..."
    npm run build
    
    # Create deployment package
    print_info "Creating deployment package..."
    mkdir -p deploy-package
    
    # Copy essential files
    cp -r .next deploy-package/
    cp -r public deploy-package/
    cp package.json deploy-package/
    cp package-lock.json deploy-package/
    cp next.config.js deploy-package/
    cp .env.production deploy-package/.env
    
    # Copy source files needed for runtime
    mkdir -p deploy-package/src
    cp -r src/lib deploy-package/src/
    cp -r src/middleware deploy-package/src/
    
    print_status "Application built and packaged successfully"
}

# Deploy to B200 server
deploy_to_server() {
    print_info "Deploying to B200 server..."
    
    # Create deployment directory on server
    ssh -p $B200_SERVER_PORT $B200_SERVER_USER@$B200_SERVER_HOST "mkdir -p $DEPLOY_PATH"
    
    # Stop existing service
    print_info "Stopping existing SOVREN AI service..."
    ssh -p $B200_SERVER_PORT $B200_SERVER_USER@$B200_SERVER_HOST "systemctl stop $SERVICE_NAME || true"
    
    # Backup current deployment
    print_info "Creating backup of current deployment..."
    ssh -p $B200_SERVER_PORT $B200_SERVER_USER@$B200_SERVER_HOST "
        if [ -d $DEPLOY_PATH/current ]; then
            mv $DEPLOY_PATH/current $DEPLOY_PATH/backup-\$(date +%Y%m%d-%H%M%S) || true
        fi
    "
    
    # Upload new deployment
    print_info "Uploading new deployment..."
    rsync -avz --progress -e "ssh -p $B200_SERVER_PORT" deploy-package/ $B200_SERVER_USER@$B200_SERVER_HOST:$DEPLOY_PATH/current/
    
    # Install dependencies on server
    print_info "Installing dependencies on B200 server..."
    ssh -p $B200_SERVER_PORT $B200_SERVER_USER@$B200_SERVER_HOST "
        cd $DEPLOY_PATH/current
        npm ci --production
    "
    
    print_status "Deployment uploaded successfully"
}

# Configure B200 services
configure_b200_services() {
    print_info "Configuring B200 GPU services..."
    
    # Create systemd service file
    ssh -p $B200_SERVER_PORT $B200_SERVER_USER@$B200_SERVER_HOST "cat > /etc/systemd/system/$SERVICE_NAME.service << 'EOF'
[Unit]
Description=SOVREN AI Shadow Board Application
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$DEPLOY_PATH/current
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$SERVICE_NAME

# B200 GPU Access
Environment=CUDA_VISIBLE_DEVICES=0,1,2,3,4,5,6,7
Environment=NVIDIA_VISIBLE_DEVICES=all

[Install]
WantedBy=multi-user.target
EOF"

    # Reload systemd and enable service
    ssh -p $B200_SERVER_PORT $B200_SERVER_USER@$B200_SERVER_HOST "
        systemctl daemon-reload
        systemctl enable $SERVICE_NAME
    "
    
    print_status "B200 services configured"
}

# Start services
start_services() {
    print_info "Starting SOVREN AI services..."
    
    # Start the main application
    ssh -p $B200_SERVER_PORT $B200_SERVER_USER@$B200_SERVER_HOST "systemctl start $SERVICE_NAME"
    
    # Wait for service to start
    sleep 5
    
    # Check service status
    if ssh -p $B200_SERVER_PORT $B200_SERVER_USER@$B200_SERVER_HOST "systemctl is-active --quiet $SERVICE_NAME"; then
        print_status "SOVREN AI service started successfully"
    else
        print_error "Failed to start SOVREN AI service"
        print_info "Checking service logs..."
        ssh -p $B200_SERVER_PORT $B200_SERVER_USER@$B200_SERVER_HOST "journalctl -u $SERVICE_NAME --no-pager -n 20"
        exit 1
    fi
}

# Verify deployment
verify_deployment() {
    print_info "Verifying deployment..."
    
    # Check if application is responding
    sleep 10
    if ssh -p $B200_SERVER_PORT $B200_SERVER_USER@$B200_SERVER_HOST "curl -f http://localhost:3000/api/health > /dev/null 2>&1"; then
        print_status "Application health check passed"
    else
        print_warning "Application health check failed - checking logs..."
        ssh -p $B200_SERVER_PORT $B200_SERVER_USER@$B200_SERVER_HOST "journalctl -u $SERVICE_NAME --no-pager -n 10"
    fi
    
    # Display service status
    print_info "Service status:"
    ssh -p $B200_SERVER_PORT $B200_SERVER_USER@$B200_SERVER_HOST "systemctl status $SERVICE_NAME --no-pager -l"
}

# Cleanup
cleanup() {
    print_info "Cleaning up deployment files..."
    rm -rf deploy-package
    print_status "Cleanup completed"
}

# Main deployment process
main() {
    echo "Starting deployment to B200 servers..."
    echo "Server: $B200_SERVER_USER@$B200_SERVER_HOST:$B200_SERVER_PORT"
    echo "Deploy Path: $DEPLOY_PATH"
    echo ""
    
    check_ssh_connection
    build_application
    deploy_to_server
    configure_b200_services
    start_services
    verify_deployment
    cleanup
    
    echo ""
    print_status "🎉 SOVREN AI successfully deployed to B200 servers!"
    print_info "Application URL: http://$B200_SERVER_HOST:3000"
    print_info "Admin Dashboard: http://$B200_SERVER_HOST:3000/dashboard/b200"
    print_info "Health Check: http://$B200_SERVER_HOST:3000/api/health"
    echo ""
    print_info "To monitor the application:"
    print_info "  ssh $B200_SERVER_USER@$B200_SERVER_HOST 'journalctl -u $SERVICE_NAME -f'"
    echo ""
}

# Run main function
main "$@"
