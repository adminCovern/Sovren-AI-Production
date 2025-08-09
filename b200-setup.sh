#!/bin/bash

# SOVREN AI B200 Server Setup Script
# Prepares your B200 infrastructure for SOVREN AI deployment

set -e

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

echo "🚀 SOVREN AI B200 Server Setup"
echo "=============================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Detect B200 GPUs
detect_b200_gpus() {
    print_info "Detecting B200 Blackwell GPUs..."
    
    if command -v nvidia-smi &> /dev/null; then
        GPU_INFO=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits 2>/dev/null || echo "")
        
        if [ -n "$GPU_INFO" ]; then
            GPU_COUNT=$(echo "$GPU_INFO" | wc -l)
            B200_COUNT=$(echo "$GPU_INFO" | grep -i "B200" | wc -l)
            
            print_status "Detected $GPU_COUNT NVIDIA GPUs"
            
            if [ $B200_COUNT -gt 0 ]; then
                print_status "Found $B200_COUNT B200 Blackwell GPUs - Perfect for SOVREN AI!"
                echo "$GPU_INFO" | grep -i "B200" | while read -r gpu; do
                    print_info "  $gpu"
                done
            else
                print_warning "No B200 GPUs detected - SOVREN AI will use available GPUs"
                echo "$GPU_INFO" | while read -r gpu; do
                    print_info "  $gpu"
                done
            fi
        else
            print_warning "Could not detect GPU information"
        fi
    else
        print_warning "nvidia-smi not found - installing NVIDIA drivers may be required"
    fi
}

# Install system dependencies
install_dependencies() {
    print_info "Installing system dependencies..."
    
    # Update package list
    apt-get update
    
    # Install essential packages
    apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        python3 \
        python3-pip \
        postgresql \
        postgresql-contrib \
        redis-server \
        nginx \
        certbot \
        python3-certbot-nginx \
        htop \
        iotop \
        nvtop \
        tmux \
        vim
    
    print_status "System dependencies installed"
}

# Install Node.js
install_nodejs() {
    print_info "Installing Node.js 20..."
    
    # Install Node.js 20
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    
    # Verify installation
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    print_status "Node.js $NODE_VERSION and npm $NPM_VERSION installed"
}

# Setup PostgreSQL
setup_postgresql() {
    print_info "Setting up PostgreSQL database..."
    
    # Start PostgreSQL service
    systemctl start postgresql
    systemctl enable postgresql
    
    # Create database and user
    sudo -u postgres psql << EOF
CREATE DATABASE sovren_ai_production;
CREATE USER sovren_user WITH ENCRYPTED PASSWORD 'CHANGE_ME_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE sovren_ai_production TO sovren_user;
ALTER USER sovren_user CREATEDB;
\q
EOF
    
    print_status "PostgreSQL database configured"
    print_warning "Remember to change the default password in production!"
}

# Setup Redis
setup_redis() {
    print_info "Setting up Redis cache..."
    
    # Configure Redis
    sed -i 's/# requirepass foobared/requirepass CHANGE_ME_SECURE_REDIS_PASSWORD/' /etc/redis/redis.conf
    sed -i 's/bind 127.0.0.1 ::1/bind 127.0.0.1/' /etc/redis/redis.conf
    
    # Start Redis service
    systemctl start redis-server
    systemctl enable redis-server
    
    print_status "Redis cache configured"
    print_warning "Remember to change the default password in production!"
}

# Setup NVIDIA Container Toolkit (for Docker if needed)
setup_nvidia_container() {
    print_info "Setting up NVIDIA Container Toolkit..."
    
    # Add NVIDIA package repository
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | apt-key add -
    curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | tee /etc/apt/sources.list.d/nvidia-docker.list
    
    apt-get update
    apt-get install -y nvidia-container-toolkit
    
    print_status "NVIDIA Container Toolkit installed"
}

# Create application directories
create_directories() {
    print_info "Creating application directories..."
    
    mkdir -p /opt/sovren-ai
    mkdir -p /opt/sovren-ai/models
    mkdir -p /opt/sovren-ai/cache
    mkdir -p /opt/sovren-ai/logs
    mkdir -p /opt/sovren-ai/backups
    mkdir -p /var/log/sovren-ai
    
    # Set permissions
    chown -R root:root /opt/sovren-ai
    chmod -R 755 /opt/sovren-ai
    
    print_status "Application directories created"
}

# Setup firewall
setup_firewall() {
    print_info "Configuring firewall..."
    
    # Install ufw if not present
    apt-get install -y ufw
    
    # Configure firewall rules
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow application port
    ufw allow 3000/tcp
    
    # Enable firewall
    ufw --force enable
    
    print_status "Firewall configured"
}

# Setup monitoring
setup_monitoring() {
    print_info "Setting up system monitoring..."
    
    # Install monitoring tools
    apt-get install -y \
        prometheus-node-exporter \
        nvidia-ml-py3
    
    # Start node exporter
    systemctl start prometheus-node-exporter
    systemctl enable prometheus-node-exporter
    
    print_status "System monitoring configured"
}

# Create deployment user
create_deployment_user() {
    print_info "Creating deployment user..."
    
    # Create sovren user if it doesn't exist
    if ! id "sovren" &>/dev/null; then
        useradd -m -s /bin/bash sovren
        usermod -aG sudo sovren
        
        # Create SSH directory
        mkdir -p /home/sovren/.ssh
        chmod 700 /home/sovren/.ssh
        chown sovren:sovren /home/sovren/.ssh
        
        print_status "Deployment user 'sovren' created"
        print_info "Add your SSH public key to /home/sovren/.ssh/authorized_keys"
    else
        print_info "User 'sovren' already exists"
    fi
}

# Display setup summary
display_summary() {
    echo ""
    print_status "🎉 B200 Server Setup Complete!"
    echo "================================"
    echo ""
    print_info "Next steps:"
    echo "1. Update passwords in .env.b200 file"
    echo "2. Configure your SSH keys for deployment"
    echo "3. Run the deployment script: ./deploy-b200.sh"
    echo ""
    print_info "Server Information:"
    echo "  - Application Directory: /opt/sovren-ai"
    echo "  - Log Directory: /var/log/sovren-ai"
    echo "  - Database: PostgreSQL (sovren_ai_production)"
    echo "  - Cache: Redis"
    echo "  - Web Server: Port 3000"
    echo ""
    
    if command -v nvidia-smi &> /dev/null; then
        print_info "GPU Information:"
        nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits | while read -r gpu; do
            echo "  - $gpu"
        done
    fi
    
    echo ""
    print_warning "Security Reminders:"
    echo "  - Change all default passwords"
    echo "  - Configure SSL certificates"
    echo "  - Review firewall rules"
    echo "  - Set up regular backups"
    echo ""
}

# Main setup process
main() {
    detect_b200_gpus
    install_dependencies
    install_nodejs
    setup_postgresql
    setup_redis
    setup_nvidia_container
    create_directories
    setup_firewall
    setup_monitoring
    create_deployment_user
    display_summary
}

# Run main function
main "$@"
