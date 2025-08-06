#!/bin/bash

# WHISPER.CPP INSTALLATION SCRIPT
# Production-grade installation for bare metal deployment

set -e

echo "🎤 Installing Whisper.cpp for SOVREN AI..."

# Create directories
mkdir -p /opt/sovren/whisper
mkdir -p /opt/sovren/models/whisper
cd /opt/sovren/whisper

# Install dependencies
echo "📦 Installing dependencies..."
apt-get update
apt-get install -y build-essential cmake git wget curl

# Clone whisper.cpp
echo "📥 Cloning whisper.cpp..."
git clone https://github.com/ggerganov/whisper.cpp.git .

# Build with optimizations
echo "🔨 Building whisper.cpp with optimizations..."
make clean
make -j$(nproc) WHISPER_CUBLAS=1 WHISPER_OPENBLAS=1

# Download models
echo "📥 Downloading Whisper models..."
cd models

# Download large-v3 model (best quality)
wget -O ggml-large-v3.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin

# Download medium model (balanced)
wget -O ggml-medium.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin

# Download base model (fast)
wget -O ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin

# Copy models to expected location
cp *.bin /opt/sovren/models/whisper/

# Create symlinks for easy access
cd /usr/local/bin
ln -sf /opt/sovren/whisper/main whisper
ln -sf /opt/sovren/whisper/stream whisper-stream

# Set permissions
chmod +x /opt/sovren/whisper/main
chmod +x /opt/sovren/whisper/stream
chown -R sovren:sovren /opt/sovren/whisper
chown -R sovren:sovren /opt/sovren/models/whisper

# Test installation
echo "🧪 Testing Whisper installation..."
echo "Testing whisper installation" | /opt/sovren/whisper/main -m /opt/sovren/models/whisper/ggml-base.bin -f -

echo "✅ Whisper.cpp installation complete!"
echo "📍 Models location: /opt/sovren/models/whisper/"
echo "📍 Binary location: /opt/sovren/whisper/"
