#!/bin/bash

# SOVREN AI PRODUCTION DEPLOYMENT SCRIPT
# Complete bare metal deployment with all systems

set -e

echo "🚀 SOVREN AI Production Deployment"
echo "=================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root"
   exit 1
fi

# Create sovren user if doesn't exist
if ! id "sovren" &>/dev/null; then
    echo "👤 Creating sovren user..."
    useradd -m -s /bin/bash sovren
    usermod -aG sudo sovren
fi

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p /opt/sovren/{models,config,scripts,logs,temp}
mkdir -p /opt/sovren/models/{whisper,llm}
mkdir -p /opt/sovren/config/{vllm,whisper,nginx}
chown -R sovren:sovren /opt/sovren

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install system dependencies
echo "📦 Installing system dependencies..."
apt-get install -y \
    build-essential \
    cmake \
    git \
    wget \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    nginx \
    redis-server \
    postgresql \
    postgresql-contrib \
    htop \
    nvtop \
    tmux \
    screen

# Install NVIDIA drivers and CUDA if not present
echo "🔧 Checking NVIDIA/CUDA installation..."
if ! command -v nvidia-smi &> /dev/null; then
    echo "Installing NVIDIA drivers..."
    apt-get install -y nvidia-driver-535
fi

if ! command -v nvcc &> /dev/null; then
    echo "Installing CUDA toolkit..."
    wget https://developer.download.nvidia.com/compute/cuda/12.3.0/local_installers/cuda_12.3.0_545.23.06_linux.run
    sh cuda_12.3.0_545.23.06_linux.run --silent --toolkit
fi

# Set environment variables
echo "🌍 Setting environment variables..."
cat >> /etc/environment << 'EOF'
CUDA_HOME=/usr/local/cuda
PATH="/usr/local/cuda/bin:$PATH"
LD_LIBRARY_PATH="/usr/local/cuda/lib64:$LD_LIBRARY_PATH"
SOVREN_HOME=/opt/sovren
SOVREN_ENV=production
EOF

source /etc/environment

# Create Python virtual environment
echo "🐍 Creating Python virtual environment..."
cd /opt/sovren
python3 -m venv venv
source venv/bin/activate

# Upgrade pip and install base packages
pip install --upgrade pip setuptools wheel

# Run installation scripts
echo "🎤 Installing Whisper.cpp..."
bash /opt/sovren/scripts/install-whisper.sh

echo "🧠 Downloading LLM models..."
bash /opt/sovren/scripts/download-llm-models.sh

echo "🚀 Installing VLLM + Flash Attention 3 + FP8..."
bash /opt/sovren/scripts/install-vllm-flash-fp8.sh

echo "🔢 Quantizing models..."
python /opt/sovren/scripts/quantize-models.py

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cd /opt/sovren/Sovren-AI-Production
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Setup database
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres createdb sovren_ai
sudo -u postgres psql -c "CREATE USER sovren WITH PASSWORD 'sovren_secure_2024';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sovren_ai TO sovren;"

# Setup Redis
echo "🔴 Configuring Redis..."
systemctl enable redis-server
systemctl start redis-server

# Create systemd services
echo "⚙️ Creating systemd services..."

# VLLM Service
cat > /etc/systemd/system/sovren-vllm.service << 'EOF'
[Unit]
Description=SOVREN AI VLLM Server
After=network.target

[Service]
Type=simple
User=sovren
Group=sovren
WorkingDirectory=/opt/sovren
Environment=CUDA_VISIBLE_DEVICES=0,1,2,3,4,5,6,7
Environment=PATH=/opt/sovren/venv/bin:/usr/local/cuda/bin:/usr/local/bin:/usr/bin:/bin
Environment=LD_LIBRARY_PATH=/usr/local/cuda/lib64
ExecStart=/opt/sovren/venv/bin/python -m vllm.entrypoints.openai.api_server --model /opt/sovren/models/llm/consciousness/qwen2.5-72b-instruct --tensor-parallel-size 8 --dtype float16 --max-model-len 32768 --gpu-memory-utilization 0.85 --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# SOVREN AI Main Service
cat > /etc/systemd/system/sovren-ai.service << 'EOF'
[Unit]
Description=SOVREN AI Main Application
After=network.target sovren-vllm.service
Requires=sovren-vllm.service

[Service]
Type=simple
User=sovren
Group=sovren
WorkingDirectory=/opt/sovren/Sovren-AI-Production
Environment=NODE_ENV=production
Environment=SOVREN_ENV=production
Environment=DATABASE_URL=postgresql://sovren:sovren_secure_2024@localhost:5432/sovren_ai
Environment=REDIS_URL=redis://localhost:6379
Environment=VLLM_API_URL=http://localhost:8000
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Nginx configuration
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/sovren-ai << 'EOF'
server {
    listen 80;
    server_name _;

    # Main application
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

    # VLLM API
    location /api/llm/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /opt/sovren/Sovren-AI-Production/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf /etc/nginx/sites-available/sovren-ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Enable and start services
echo "🔄 Enabling and starting services..."
systemctl daemon-reload
systemctl enable sovren-vllm
systemctl enable sovren-ai
systemctl enable nginx

systemctl start sovren-vllm
sleep 30  # Wait for VLLM to start
systemctl start sovren-ai
systemctl start nginx

# Create monitoring script
echo "📊 Creating monitoring script..."
cat > /opt/sovren/scripts/monitor-system.sh << 'EOF'
#!/bin/bash

echo "🖥️ SOVREN AI System Status"
echo "========================="

echo "📊 GPU Status:"
nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu --format=csv,noheader

echo ""
echo "🔄 Service Status:"
systemctl is-active sovren-vllm && echo "✅ VLLM: Running" || echo "❌ VLLM: Stopped"
systemctl is-active sovren-ai && echo "✅ SOVREN AI: Running" || echo "❌ SOVREN AI: Stopped"
systemctl is-active nginx && echo "✅ Nginx: Running" || echo "❌ Nginx: Stopped"
systemctl is-active redis-server && echo "✅ Redis: Running" || echo "❌ Redis: Stopped"
systemctl is-active postgresql && echo "✅ PostgreSQL: Running" || echo "❌ PostgreSQL: Stopped"

echo ""
echo "🌐 Network Status:"
curl -s http://localhost:8000/health > /dev/null && echo "✅ VLLM API: Responding" || echo "❌ VLLM API: Not responding"
curl -s http://localhost:3000/health > /dev/null && echo "✅ SOVREN AI API: Responding" || echo "❌ SOVREN AI API: Not responding"

echo ""
echo "💾 Disk Usage:"
df -h /opt/sovren

echo ""
echo "🧠 Memory Usage:"
free -h
EOF

chmod +x /opt/sovren/scripts/monitor-system.sh

# Set final permissions
chown -R sovren:sovren /opt/sovren

# Create startup verification
echo "🧪 Running startup verification..."
sleep 10

# Check services
if systemctl is-active --quiet sovren-vllm; then
    echo "✅ VLLM service is running"
else
    echo "❌ VLLM service failed to start"
    systemctl status sovren-vllm
fi

if systemctl is-active --quiet sovren-ai; then
    echo "✅ SOVREN AI service is running"
else
    echo "❌ SOVREN AI service failed to start"
    systemctl status sovren-ai
fi

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx service is running"
else
    echo "❌ Nginx service failed to start"
    systemctl status nginx
fi

echo ""
echo "🎉 SOVREN AI Production Deployment Complete!"
echo "============================================="
echo ""
echo "📍 Access Points:"
echo "  🌐 Web Interface: http://$(hostname -I | awk '{print $1}')"
echo "  🤖 VLLM API: http://$(hostname -I | awk '{print $1}'):8000"
echo "  📊 System Monitor: /opt/sovren/scripts/monitor-system.sh"
echo ""
echo "📋 Service Management:"
echo "  systemctl status sovren-vllm"
echo "  systemctl status sovren-ai"
echo "  systemctl logs -f sovren-ai"
echo ""
echo "🔧 Configuration:"
echo "  📁 SOVREN Home: /opt/sovren"
echo "  🧠 Models: /opt/sovren/models"
echo "  ⚙️ Config: /opt/sovren/config"
echo "  📝 Logs: /opt/sovren/logs"
