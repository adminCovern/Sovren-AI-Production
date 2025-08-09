# 🚀 SOVREN AI B200 Server Deployment Guide

## Overview

This guide will help you deploy SOVREN AI to your B200 Blackwell GPU servers. The deployment is optimized for maximum performance on NVIDIA B200 infrastructure.

## Prerequisites

### Your B200 Server Requirements
- 8x NVIDIA B200 Blackwell GPUs (1.47TB total VRAM)
- Ubuntu 20.04+ or compatible Linux distribution
- SSH access to your B200 servers
- Root or sudo privileges on the servers

### Local Development Machine
- SSH client configured
- Node.js 20+ installed
- Git repository access

## Quick Start

### 1. Configure Your B200 Server Connection

Set these environment variables on your local machine:

```bash
export B200_SERVER_HOST="your-b200-server-ip-or-domain"
export B200_SERVER_USER="root"  # or your sudo user
export B200_SERVER_PORT="22"
export DEPLOY_PATH="/opt/sovren-ai"
```

### 2. Initial B200 Server Setup

Copy the setup script to your B200 server and run it:

```bash
# Copy setup script to your B200 server
scp b200-setup.sh $B200_SERVER_USER@$B200_SERVER_HOST:/tmp/

# SSH into your B200 server
ssh $B200_SERVER_USER@$B200_SERVER_HOST

# Run the setup script (as root)
sudo bash /tmp/b200-setup.sh
```

This will install:
- Node.js 20
- PostgreSQL database
- Redis cache
- NVIDIA Container Toolkit
- System monitoring tools
- Required directories and permissions

### 3. Configure Environment Variables

Copy the B200 environment template to your server:

```bash
# Copy environment file to your B200 server
scp .env.b200 $B200_SERVER_USER@$B200_SERVER_HOST:/opt/sovren-ai/.env
```

**IMPORTANT**: SSH into your server and update the passwords in `/opt/sovren-ai/.env`:

```bash
ssh $B200_SERVER_USER@$B200_SERVER_HOST
cd /opt/sovren-ai
nano .env

# Update these critical values:
DATABASE_PASSWORD=your_secure_database_password
REDIS_PASSWORD=your_secure_redis_password
JWT_SECRET=your_64_character_jwt_secret
CSRF_SECRET=your_64_character_csrf_secret
ADMIN_PASSWORD=your_secure_admin_password
```

### 4. Deploy SOVREN AI

From your local development machine:

```bash
# Make deployment script executable (Linux/Mac)
chmod +x deploy-b200.sh

# Run deployment
./deploy-b200.sh

# Or use npm script
npm run deploy:b200
```

### 5. Verify Deployment

After deployment completes, verify everything is working:

```bash
# Check service status
ssh $B200_SERVER_USER@$B200_SERVER_HOST "systemctl status sovren-ai"

# Check application health
curl http://your-b200-server:3000/api/health

# Monitor logs
ssh $B200_SERVER_USER@$B200_SERVER_HOST "journalctl -u sovren-ai -f"
```

## Manual Deployment Steps

If you prefer manual deployment:

### 1. Build Application Locally

```bash
npm ci
npm run build
```

### 2. Create Deployment Package

```bash
mkdir deploy-package
cp -r .next deploy-package/
cp -r public deploy-package/
cp package.json package-lock.json next.config.js server.js deploy-package/
cp .env.b200 deploy-package/.env
```

### 3. Upload to B200 Server

```bash
rsync -avz --progress deploy-package/ $B200_SERVER_USER@$B200_SERVER_HOST:/opt/sovren-ai/current/
```

### 4. Install Dependencies on Server

```bash
ssh $B200_SERVER_USER@$B200_SERVER_HOST "
  cd /opt/sovren-ai/current
  npm ci --production
"
```

### 5. Start Services

```bash
ssh $B200_SERVER_USER@$B200_SERVER_HOST "
  systemctl daemon-reload
  systemctl enable sovren-ai
  systemctl start sovren-ai
"
```

## B200 GPU Optimization

### GPU Detection

The server automatically detects your B200 GPUs on startup:

```bash
# Check GPU detection in logs
ssh $B200_SERVER_USER@$B200_SERVER_HOST "journalctl -u sovren-ai | grep GPU"
```

### GPU Memory Configuration

Optimize GPU memory usage in your `.env` file:

```bash
# B200 GPU Settings
B200_GPU_COUNT=8
TOTAL_VRAM_GB=1464
CUDA_VISIBLE_DEVICES=0,1,2,3,4,5,6,7

# VLLM Configuration
VLLM_GPU_MEMORY_UTILIZATION=0.9
VLLM_TENSOR_PARALLEL_SIZE=8
```

## Monitoring and Maintenance

### Real-time Monitoring

```bash
# Monitor application logs
npm run monitor:b200

# Monitor GPU usage
ssh $B200_SERVER_USER@$B200_SERVER_HOST "nvtop"

# Monitor system resources
ssh $B200_SERVER_USER@$B200_SERVER_HOST "htop"
```

### Service Management

```bash
# Restart service
ssh $B200_SERVER_USER@$B200_SERVER_HOST "systemctl restart sovren-ai"

# Stop service
ssh $B200_SERVER_USER@$B200_SERVER_HOST "systemctl stop sovren-ai"

# Check service status
ssh $B200_SERVER_USER@$B200_SERVER_HOST "systemctl status sovren-ai"
```

### Log Management

```bash
# View recent logs
ssh $B200_SERVER_USER@$B200_SERVER_HOST "journalctl -u sovren-ai -n 100"

# Follow logs in real-time
ssh $B200_SERVER_USER@$B200_SERVER_HOST "journalctl -u sovren-ai -f"

# View logs from specific time
ssh $B200_SERVER_USER@$B200_SERVER_HOST "journalctl -u sovren-ai --since '1 hour ago'"
```

## Accessing SOVREN AI

Once deployed, access your SOVREN AI instance:

- **Main Application**: `http://your-b200-server:3000`
- **Admin Dashboard**: `http://your-b200-server:3000/dashboard/b200`
- **Health Check**: `http://your-b200-server:3000/api/health`
- **Shadow Board API**: `http://your-b200-server:3000/api/shadowboard`

### Default Login Credentials

- **Super Admin**: `admin@sovrenai.app` / `SOVRENAdmin2024!`
- **Demo SMB**: `demo@company.com` / `SecureDemo123!`
- **Demo Enterprise**: `admin@enterprise.com` / `EnterpriseSecure456!`

**IMPORTANT**: Change these passwords immediately after first login!

## SSL/HTTPS Setup (Recommended)

### Using Let's Encrypt

```bash
ssh $B200_SERVER_USER@$B200_SERVER_HOST

# Install SSL certificate
certbot --nginx -d your-domain.com

# Configure nginx proxy
nano /etc/nginx/sites-available/sovren-ai
```

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Common Issues

1. **Service won't start**
   ```bash
   # Check logs for errors
   journalctl -u sovren-ai --no-pager -n 50
   
   # Check if port is in use
   netstat -tlnp | grep :3000
   ```

2. **GPU not detected**
   ```bash
   # Check NVIDIA drivers
   nvidia-smi
   
   # Check CUDA installation
   nvcc --version
   ```

3. **Database connection issues**
   ```bash
   # Check PostgreSQL status
   systemctl status postgresql
   
   # Test database connection
   sudo -u postgres psql -c "SELECT version();"
   ```

4. **Redis connection issues**
   ```bash
   # Check Redis status
   systemctl status redis-server
   
   # Test Redis connection
   redis-cli ping
   ```

### Performance Optimization

1. **Increase file limits**
   ```bash
   echo "* soft nofile 65536" >> /etc/security/limits.conf
   echo "* hard nofile 65536" >> /etc/security/limits.conf
   ```

2. **Optimize PostgreSQL**
   ```bash
   # Edit PostgreSQL configuration
   nano /etc/postgresql/*/main/postgresql.conf
   
   # Increase shared_buffers, effective_cache_size, etc.
   ```

3. **Monitor GPU memory**
   ```bash
   # Watch GPU memory usage
   watch -n 1 nvidia-smi
   ```

## Support

For deployment issues or questions:

1. Check the application logs first
2. Verify all environment variables are set correctly
3. Ensure all services (PostgreSQL, Redis) are running
4. Check firewall settings
5. Verify GPU drivers and CUDA installation

Your SOVREN AI Shadow Board is now ready to dominate with B200 Blackwell power! 🚀
