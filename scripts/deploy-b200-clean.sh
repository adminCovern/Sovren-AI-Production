#!/usr/bin/env bash
# Clean B200 deployment script - no bullshit, just works
# Deploys Sovren AI server + optional Next.js client on B200 host
set -euo pipefail

say() { printf "\033[1;32m==> %s\033[0m\n" "$*"; }
err() { printf "\033[1;31mERROR: %s\033[0m\n" "$*" >&2; exit 1; }

# Configuration
DEPLOY_FULL="${DEPLOY_FULL:-0}"
DEPLOY_NGINX="${DEPLOY_NGINX:-0}"
NEXT_PORT="${NEXT_PORT:-3000}"

# Detect Node.js
NODE_BIN=""
if [[ -x /home/ubuntu/.nvm/versions/node/v20.19.4/bin/node ]]; then
  NODE_BIN="/home/ubuntu/.nvm/versions/node/v20.19.4/bin/node"
elif command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
else
  err "Node.js not found. Install Node 18+ or set NODE_BIN environment variable."
fi
NPM_BIN="${NODE_BIN%/node}/npm"

say "Using Node: $NODE_BIN"

# Ensure we're in the repo
[[ -f package.json ]] || err "Run this script from the Sovren AI repo root"

# Create deployment directories
sudo mkdir -p /data/sovren-ai/{server,client} /data/whisper/{models,bin}

# Build server (TypeScript compilation only)
say "Building server"
rm -rf dist
"$NPM_BIN" ci --omit=dev --omit=optional --silent
"$NPM_BIN" run build:server

# Deploy server runtime
say "Deploying server runtime"
sudo rm -rf /data/sovren-ai/server/*
sudo cp -r dist package.json package-lock.json /data/sovren-ai/server/
sudo chown -R ubuntu:ubuntu /data/sovren-ai/server

# Install production dependencies for server
pushd /data/sovren-ai/server >/dev/null
sudo -u ubuntu "$NPM_BIN" ci --omit=dev --omit=optional --silent
popd >/dev/null

# Create server bootstrap
sudo tee /data/sovren-ai/server/start.js >/dev/null <<'EOF'
"use strict";
(async () => {
  try {
    const { initializeServer } = require("./lib/server/startup");
    await initializeServer();
    console.log("SOVREN AI server started successfully");
    process.on('SIGTERM', () => process.exit(0));
    process.on('SIGINT', () => process.exit(0));
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
})();
EOF
sudo chown ubuntu:ubuntu /data/sovren-ai/server/start.js

# Build and deploy client if requested
if [[ "$DEPLOY_FULL" == "1" ]]; then
  say "Building Next.js client"
  
  # Create clean next.config.js
  tee next.config.js >/dev/null <<'NEXTCONFIG'
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
  
  experimental: {
    serverExternalPackages: ['three'],
  },
};

module.exports = nextConfig;
NEXTCONFIG

  # Build client
  rm -rf .next
  "$NPM_BIN" run build:client
  
  # Deploy client
  say "Deploying Next.js client"
  sudo rm -rf /data/sovren-ai/client/*
  sudo cp -r .next package.json next.config.js /data/sovren-ai/client/
  sudo mkdir -p /data/sovren-ai/client/src
  sudo cp -r src/app src/components src/lib /data/sovren-ai/client/src/
  sudo chown -R ubuntu:ubuntu /data/sovren-ai/client
  
  # Install client dependencies
  pushd /data/sovren-ai/client >/dev/null
  sudo -u ubuntu "$NPM_BIN" ci --omit=dev --omit=optional --silent
  popd >/dev/null
fi

# Ensure environment file exists
if [[ ! -f /data/sovren-ai/.env ]]; then
  say "Creating default environment file"
  sudo tee /data/sovren-ai/.env >/dev/null <<'ENVFILE'
NODE_ENV=production

# FreeSWITCH Configuration
FREESWITCH_HOST=127.0.0.1
FREESWITCH_PORT=5060
FREESWITCH_ESL_PORT=8021
FREESWITCH_ESL_PASSWORD=rPgd2XtjjeVLKy12MqSCcrvqzp9ejsI+IUFJSdMi+3M=
FREESWITCH_SIP_DOMAIN=sovrenai.app

# FreeSWITCH Paths
FREESWITCH_DIALPLAN_DIR=/data/freeswitch/conf/dialplan/public
FREESWITCH_SCRIPTS_DIR=/data/freeswitch/scripts
FREESWITCH_RECORDINGS_DIR=/data/freeswitch/recordings

# Skyetel API
SKYETEL_API_KEY=0smspNmsv9KJ5Ltk3IpRTG4jxWlNiDC1
SKYETEL_API_SECRET=7Rrjq2YTOvBf8qtZU1KaUi2MbbcGC9UW
SKYETEL_API_URL=https://api.skyetel.com
SKYETEL_BASE_URL=https://api.skyetel.com
SKYETEL_SIP_DOMAIN=sip.skyetel.com
SIP_DOMAIN=sip.skyetel.com

# Whisper Configuration
WHISPER_MODEL_PATH=/data/whisper/models/ggml-large-v3.bin
ENVFILE
fi

# Create systemd service for server
say "Creating systemd service"
sudo tee /etc/systemd/system/sovren-ai.service >/dev/null <<EOF
[Unit]
Description=SOVREN AI Server
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/data/sovren-ai/server
EnvironmentFile=/data/sovren-ai/.env
ExecStart=$NODE_BIN /data/sovren-ai/server/start.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create systemd service for client if deployed
if [[ "$DEPLOY_FULL" == "1" ]]; then
  say "Creating Next.js systemd service"
  sudo tee /etc/systemd/system/sovren-client.service >/dev/null <<EOF
[Unit]
Description=SOVREN AI Client
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/data/sovren-ai/client
Environment=NODE_ENV=production
Environment=PORT=$NEXT_PORT
ExecStart=$NODE_BIN node_modules/.bin/next start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
fi

# Configure NGINX if requested
if [[ "$DEPLOY_FULL" == "1" && "$DEPLOY_NGINX" == "1" ]]; then
  say "Configuring NGINX"
  sudo tee /etc/nginx/sites-available/sovren-ai >/dev/null <<NGINX
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://127.0.0.1:$NEXT_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX
  
  sudo ln -sf /etc/nginx/sites-available/sovren-ai /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx
fi

# Start services
say "Starting services"
sudo systemctl daemon-reload
sudo systemctl enable --now sovren-ai

if [[ "$DEPLOY_FULL" == "1" ]]; then
  sudo systemctl enable --now sovren-client
fi

# Show status
say "Deployment complete!"
echo
echo "Services:"
sudo systemctl status sovren-ai --no-pager -l | head -10

if [[ "$DEPLOY_FULL" == "1" ]]; then
  echo
  sudo systemctl status sovren-client --no-pager -l | head -10
fi

echo
echo "Recent logs:"
journalctl -u sovren-ai -n 20 --no-pager

say "Deployment finished successfully"
