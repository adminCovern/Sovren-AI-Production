# SOVREN AI - Production Deployment Guide

## 🚀 Comprehensive Deployment Documentation

This guide provides step-by-step instructions for deploying SOVREN AI in production environments, including bare metal, Docker, and cloud deployments.

## 📋 Prerequisites

### System Requirements
- **Operating System**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **CPU**: 4+ cores (8+ recommended)
- **Memory**: 8GB+ RAM (16GB+ recommended)
- **Storage**: 50GB+ SSD (100GB+ recommended)
- **Network**: 1Gbps+ connection

### Software Dependencies
- **Node.js**: 18.x or 20.x LTS
- **Redis**: 6.x or 7.x
- **PostgreSQL**: 14.x or 15.x (optional, uses in-memory by default)
- **Nginx**: 1.20+ (for reverse proxy)
- **PM2**: Latest (for process management)

---

## 🔧 Bare Metal Deployment

### Step 1: System Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Redis
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install PostgreSQL (optional)
sudo apt install postgresql postgresql-contrib -y
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Install Nginx
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx

# Install PM2 globally
sudo npm install -g pm2
```

### Step 2: Application Setup

```bash
# Create application user
sudo useradd -m -s /bin/bash sovren
sudo usermod -aG sudo sovren

# Switch to application user
sudo su - sovren

# Clone repository
git clone https://github.com/sovren-ai/production.git sovren-ai
cd sovren-ai

# Install dependencies
npm ci --production

# Build application
npm run build
```

### Step 3: Environment Configuration

```bash
# Create production environment file
cp .env.example .env.production

# Edit environment configuration
nano .env.production
```

**Production Environment Variables:**
```bash
# Core Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security Configuration
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
BCRYPT_ROUNDS=12

# Database Configuration (optional)
DATABASE_URL=postgresql://sovren:password@localhost:5432/sovren_production

# Redis Configuration
REDIS_URL=redis://localhost:6379
RATE_LIMIT_REDIS_URL=redis://localhost:6379

# TTS Configuration
TTS_MODELS_PATH=/opt/sovren/models/styletts2
TTS_OUTPUT_PATH=/opt/sovren/public/audio/generated
PYTHON_PATH=/usr/bin/python3

# Performance Configuration
ENABLE_PERFORMANCE_OPTIMIZATION=true
CACHE_MAX_SIZE=1000
MAX_CONCURRENT_REQUESTS=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=/var/log/sovren/application.log

# Security Headers
ENABLE_SECURITY_HEADERS=true
ENABLE_RATE_LIMITING=true
```

### Step 4: Database Setup (if using PostgreSQL)

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE sovren_production;
CREATE USER sovren WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE sovren_production TO sovren;
\q
EOF

# Run database migrations
npm run db:migrate:prod
```

### Step 5: Directory Structure Setup

```bash
# Create required directories
sudo mkdir -p /opt/sovren/{models,public/audio/generated,logs}
sudo mkdir -p /var/log/sovren

# Set permissions
sudo chown -R sovren:sovren /opt/sovren
sudo chown -R sovren:sovren /var/log/sovren

# Create symbolic links
ln -s /opt/sovren/models ./models
ln -s /opt/sovren/public/audio/generated ./public/audio/generated
```

### Step 6: PM2 Process Management

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'sovren-ai',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/sovren/error.log',
    out_file: '/var/log/sovren/out.log',
    log_file: '/var/log/sovren/combined.log',
    time: true,
    max_memory_restart: '2G',
    node_args: '--max-old-space-size=4096',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'public/audio/generated'],
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by PM2
```

### Step 7: Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/sovren-ai << 'EOF'
upstream sovren_backend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    # Add more servers for load balancing
    # server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/sovren-ai.crt;
    ssl_certificate_key /etc/ssl/private/sovren-ai.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

    # Main application
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://sovren_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Authentication endpoints with stricter rate limiting
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        
        proxy_pass http://sovren_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static audio files
    location /audio/generated/ {
        alias /opt/sovren/public/audio/generated/;
        expires 1h;
        add_header Cache-Control "public, immutable";
        
        # Security for audio files
        add_header X-Content-Type-Options nosniff;
        add_header Content-Security-Policy "default-src 'none'";
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://sovren_backend;
        access_log off;
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Logging
    access_log /var/log/nginx/sovren-ai.access.log;
    error_log /var/log/nginx/sovren-ai.error.log;
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/sovren-ai /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 8: SSL Certificate Setup

```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### Step 9: Monitoring and Logging

```bash
# Setup log rotation
sudo tee /etc/logrotate.d/sovren-ai << 'EOF'
/var/log/sovren/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 sovren sovren
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Setup system monitoring
sudo tee /etc/systemd/system/sovren-monitor.service << 'EOF'
[Unit]
Description=SOVREN AI System Monitor
After=network.target

[Service]
Type=simple
User=sovren
WorkingDirectory=/home/sovren/sovren-ai
ExecStart=/usr/bin/node scripts/monitor.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable sovren-monitor
sudo systemctl start sovren-monitor
```

---

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

RUN addgroup -g 1001 -S sovren && \
    adduser -S sovren -u 1001

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /app/public/audio/generated && \
    chown -R sovren:sovren /app

USER sovren

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "dist/server.js"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  sovren-ai:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://sovren:password@postgres:5432/sovren
    depends_on:
      - redis
      - postgres
    volumes:
      - audio_data:/app/public/audio/generated
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
          cpus: '1'

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=sovren
      - POSTGRES_USER=sovren
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - sovren-ai
    restart: unless-stopped

volumes:
  redis_data:
  postgres_data:
  audio_data:
```

---

## ☁️ Cloud Deployment

### AWS Deployment with ECS

```yaml
# ecs-task-definition.json
{
  "family": "sovren-ai",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "sovren-ai",
      "image": "your-account.dkr.ecr.region.amazonaws.com/sovren-ai:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://sovren-redis.cache.amazonaws.com:6379"
        }
      ],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:sovren/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/sovren-ai",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "node healthcheck.js"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

---

## 🔍 Health Checks and Monitoring

### Health Check Script
```javascript
// healthcheck.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/health',
  method: 'GET',
  timeout: 3000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
```

### Monitoring Endpoints
- `GET /api/health` - Overall system health
- `GET /api/health/database` - Database connectivity
- `GET /api/health/redis` - Redis connectivity
- `GET /api/health/tts` - TTS service status
- `GET /api/metrics` - Performance metrics

---

## 🔒 Security Checklist

### Pre-Deployment Security
- [ ] Change all default passwords
- [ ] Generate secure JWT secret (32+ characters)
- [ ] Configure proper SSL certificates
- [ ] Enable firewall with minimal open ports
- [ ] Set up fail2ban for intrusion prevention
- [ ] Configure secure Redis (password, bind to localhost)
- [ ] Enable database SSL connections
- [ ] Set proper file permissions (644 for files, 755 for directories)
- [ ] Disable unnecessary services
- [ ] Configure log rotation and monitoring

### Post-Deployment Security
- [ ] Monitor authentication failures
- [ ] Set up security alerts
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] Access log monitoring
- [ ] Rate limiting verification
- [ ] SSL certificate monitoring

---

## 📊 Performance Tuning

### Node.js Optimization
```bash
# PM2 with optimized settings
pm2 start ecosystem.config.js --node-args="--max-old-space-size=4096 --optimize-for-size"
```

### Redis Optimization
```bash
# Redis configuration optimizations
echo "maxmemory 2gb" >> /etc/redis/redis.conf
echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf
echo "save 900 1" >> /etc/redis/redis.conf
```

### PostgreSQL Optimization
```sql
-- PostgreSQL performance tuning
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
SELECT pg_reload_conf();
```

---

## 🚨 Troubleshooting

### Common Issues

**Application won't start:**
```bash
# Check logs
pm2 logs sovren-ai
tail -f /var/log/sovren/error.log

# Check port availability
sudo netstat -tlnp | grep :3000

# Check environment variables
pm2 env 0
```

**High memory usage:**
```bash
# Monitor memory
pm2 monit

# Restart application
pm2 restart sovren-ai

# Check for memory leaks
node --inspect dist/server.js
```

**Database connection issues:**
```bash
# Test database connection
psql -h localhost -U sovren -d sovren_production

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

**Redis connection issues:**
```bash
# Test Redis connection
redis-cli ping

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

This comprehensive deployment guide ensures a secure, scalable, and maintainable production deployment of SOVREN AI.
