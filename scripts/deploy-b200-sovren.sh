#!/usr/bin/env bash
# Idempotent deployment for Sovren AI on B200 host
# - Standardizes on /data for app, whisper, and FreeSWITCH paths
# - Uses nvm Node at /home/ubuntu/.nvm/versions/node/*/bin/node
# - Builds server with isolated TypeScript toolchain (no dev deps)
# - Creates runtime with production-only deps (no deprecated packages)
# - Creates/updates systemd unit sovren-ai.service
set -euo pipefail

say() { printf "\033[1;32m==> %s\033[0m\n" "$*"; }
err() { printf "\033[1;31mERROR: %s\033[0m\n" "$*" >&2; }

# Detect node path (prefer v20 under nvm)
NODE_BIN="${NODE_BIN:-}"
if [[ -z "${NODE_BIN}" ]]; then
  if [[ -x /home/ubuntu/.nvm/versions/node/v20.19.4/bin/node ]]; then
    NODE_BIN=/home/ubuntu/.nvm/versions/node/v20.19.4/bin/node
  else
    NODE_BIN=$(command -v node || true)
  fi
fi
[[ -x "$NODE_BIN" ]] || { err "Node binary not found. Set NODE_BIN or install Node."; exit 1; }
NPM_BIN="${NODE_BIN%/node}/npm"

say "Using Node: $NODE_BIN"

# Ensure dirs
sudo mkdir -p /data/{sovren-ai,whisper,freesswitch} >/dev/null 2>&1 || true
sudo mkdir -p /data/sovren-ai/{app-build,app-runtime} /data/whisper/{models,src}

# Ensure whisper model path variable in env
if [[ -f /data/sovren-ai/.env ]]; then
  if ! grep -q '^WHISPER_MODEL_PATH=' /data/sovren-ai/.env; then
    echo 'WHISPER_MODEL_PATH=/data/whisper/models/ggml-large-v3.bin' | sudo tee -a /data/sovren-ai/.env >/dev/null
  fi
fi

say "Compiling server with isolated TypeScript toolchain"
sudo rm -rf /data/sovren-ai/tsc-toolchain
sudo mkdir -p /data/sovren-ai/tsc-toolchain
sudo chown -R ubuntu:ubuntu /data/sovren-ai/tsc-toolchain
pushd /data/sovren-ai/tsc-toolchain >/dev/null
sudo -u ubuntu "$NPM_BIN" init -y --silent
NPM_CONFIG_LOGLEVEL=error sudo -u ubuntu "$NPM_BIN" install --no-save --silent typescript@5.2.2 @types/node@20.5.9
popd >/dev/null

# Build server dist
say "Building dist from repo at /data/sovren-ai/app"
[[ -d /data/sovren-ai/app ]] || { err "/data/sovren-ai/app missing. Clone repo there."; exit 1; }
sudo rm -rf /data/sovren-ai/app-build/dist
sudo mkdir -p /data/sovren-ai/app-build/dist
/data/sovren-ai/tsc-toolchain/node_modules/.bin/tsc --project /data/sovren-ai/app/tsconfig.server.json --outDir /data/sovren-ai/app-build/dist

# Prepare runtime with prod deps only
say "Preparing runtime with production-only dependencies"
sudo rm -rf /data/sovren-ai/app-runtime
sudo mkdir -p /data/sovren-ai/app-runtime
sudo rsync -a /data/sovren-ai/app-build/dist/ /data/sovren-ai/app-runtime/dist/
sudo rsync -a /data/sovren-ai/app/package.json /data/sovren-ai/app/package-lock.json /data/sovren-ai/app-runtime/
sudo chown -R ubuntu:ubuntu /data/sovren-ai/app-runtime
pushd /data/sovren-ai/app-runtime >/dev/null
NPM_CONFIG_LOGLEVEL=error sudo -u ubuntu "$NPM_BIN" ci --omit=dev
popd >/dev/null

# Write bootstrap
say "Writing server bootstrap"
sudo tee /data/sovren-ai/app-runtime/server-bootstrap.js >/dev/null <<'EOF'
"use strict";
(async () => {
  try {
    const startup = require("./dist/lib/server/startup");
    if (!startup || typeof startup.initializeServer !== "function") {
      throw new Error("initializeServer not found (dist/lib/server/startup)");
    }
    await startup.initializeServer();
    console.log("SOVREN AI server bootstrap complete. Phone system initialized.");
    setInterval(() => {}, 1 << 30);
  } catch (e) {
    console.error("Server bootstrap failed:", e);
    process.exit(1);
  }
})();
EOF
sudo chown ubuntu:ubuntu /data/sovren-ai/app-runtime/server-bootstrap.js
sudo chmod 0644 /data/sovren-ai/app-runtime/server-bootstrap.js

# Ensure env variables compatibility
say "Ensuring env var compatibility"
if [[ -f /data/sovren-ai/.env ]]; then
  sudo sed -i 's/^SKYETEL_API_URL=.*/SKYETEL_API_URL=https:\/\/api.skyetel.com/' /data/sovren-ai/.env || true
  if ! grep -q '^SKYETEL_BASE_URL=' /data/sovren-ai/.env; then
    echo 'SKYETEL_BASE_URL=https://api.skyetel.com' | sudo tee -a /data/sovren-ai/.env >/dev/null
  fi
  if ! grep -q '^SKYETEL_SIP_DOMAIN=' /data/sovren-ai/.env; then
    echo 'SKYETEL_SIP_DOMAIN=sip.skyetel.com' | sudo tee -a /data/sovren-ai/.env >/dev/null
  fi
fi

# Create/refresh systemd unit
say "Configuring systemd unit"
sudo tee /etc/systemd/system/sovren-ai.service >/dev/null <<EOF
[Unit]
Description=SOVREN AI Server (owns FreeSWITCH via ESL)
After=network.target

[Service]
Type=simple
WorkingDirectory=/data/sovren-ai/app-runtime
EnvironmentFile=/data/sovren-ai/.env
ExecStart=$NODE_BIN /data/sovren-ai/app-runtime/server-bootstrap.js
Restart=always
RestartSec=3
User=ubuntu
Group=ubuntu
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemd-analyze verify /etc/systemd/system/sovren-ai.service
sudo systemctl daemon-reload
sudo systemctl enable --now sovren-ai

say "Deployment complete. Recent logs:"
journalctl -u sovren-ai -n 60 --no-pager || true

