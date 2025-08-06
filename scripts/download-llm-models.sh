#!/bin/bash

# LLM MODEL DOWNLOAD AND SETUP SCRIPT
# Downloads and configures models for SOVREN AI

set -e

echo "🧠 Downloading LLM models for SOVREN AI..."

# Create model directories
mkdir -p /opt/sovren/models/llm/consciousness
mkdir -p /opt/sovren/models/llm/executives
mkdir -p /opt/sovren/models/llm/utility
mkdir -p /opt/sovren/models/llm/voice

# Install huggingface-hub for downloading
pip install huggingface-hub[cli] torch transformers

echo "📥 Downloading Consciousness Models (FP16)..."

# Primary consciousness model - Qwen2.5 72B
cd /opt/sovren/models/llm/consciousness
huggingface-cli download Qwen/Qwen2.5-72B-Instruct --local-dir qwen2.5-72b-instruct --local-dir-use-symlinks False

# Secondary consciousness model - Qwen2.5 32B
huggingface-cli download Qwen/Qwen2.5-32B-Instruct --local-dir qwen2.5-32b-instruct --local-dir-use-symlinks False

echo "📥 Downloading Executive Models (INT8)..."

# Executive models - Qwen2.5 32B for each role
cd /opt/sovren/models/llm/executives
huggingface-cli download Qwen/Qwen2.5-32B-Instruct --local-dir qwen2.5-32b-base --local-dir-use-symlinks False

# Create role-specific copies
cp -r qwen2.5-32b-base qwen2.5-32b-cfo
cp -r qwen2.5-32b-base qwen2.5-32b-cmo
cp -r qwen2.5-32b-base qwen2.5-32b-cto
cp -r qwen2.5-32b-base qwen2.5-32b-clo

echo "📥 Downloading Utility Models (INT4)..."

# Utility model - Qwen2.5 7B
cd /opt/sovren/models/llm/utility
huggingface-cli download Qwen/Qwen2.5-7B-Instruct --local-dir qwen2.5-7b-instruct --local-dir-use-symlinks False

echo "📥 Downloading Voice Models (FP8)..."

# Voice model - Qwen2.5 14B
cd /opt/sovren/models/llm/voice
huggingface-cli download Qwen/Qwen2.5-14B-Instruct --local-dir qwen2.5-14b-instruct --local-dir-use-symlinks False

# Set ownership
chown -R sovren:sovren /opt/sovren/models/llm

echo "✅ Qwen2.5 LLM models downloaded successfully!"
echo "📍 Consciousness models: /opt/sovren/models/llm/consciousness/"
echo "  - qwen2.5-72b-instruct (Primary consciousness)"
echo "  - qwen2.5-32b-instruct (Secondary consciousness)"
echo "📍 Executive models: /opt/sovren/models/llm/executives/"
echo "  - qwen2.5-32b-cfo (Chief Financial Officer)"
echo "  - qwen2.5-32b-cmo (Chief Marketing Officer)"
echo "  - qwen2.5-32b-cto (Chief Technology Officer)"
echo "  - qwen2.5-32b-clo (Chief Legal Officer)"
echo "📍 Utility models: /opt/sovren/models/llm/utility/"
echo "  - qwen2.5-7b-instruct (Background tasks)"
echo "📍 Voice models: /opt/sovren/models/llm/voice/"
echo "  - qwen2.5-14b-instruct (Real-time voice processing)"
