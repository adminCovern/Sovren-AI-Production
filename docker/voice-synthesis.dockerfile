# B200 Blackwell GPU-Accelerated Voice Synthesis Container
FROM nvidia/cuda:12.2-devel-ubuntu22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV CUDA_VISIBLE_DEVICES=0
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    cmake \
    git \
    wget \
    curl \
    ffmpeg \
    espeak-ng \
    espeak-ng-data \
    libsndfile1 \
    libsndfile1-dev \
    libasound2-dev \
    portaudio19-dev \
    libportaudio2 \
    libportaudiocpp0 \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app

# Copy requirements
COPY requirements-voice.txt .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements-voice.txt

# Install additional TTS models and dependencies
RUN python3 -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"

# Copy voice synthesis scripts
COPY src/scripts/b200_tts_synthesis.py ./scripts/
COPY src/scripts/install_b200_voice_models.py ./scripts/

# Create directories
RUN mkdir -p /app/models/voice /app/data/voice_output /app/logs

# Set permissions
RUN chmod +x ./scripts/*.py

# Install voice models
RUN python3 ./scripts/install_b200_voice_models.py

# Expose port for voice synthesis API
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python3 -c "import torch; print('CUDA available:', torch.cuda.is_available())" || exit 1

# Default command
CMD ["python3", "./scripts/b200_tts_synthesis.py", "--help"]
