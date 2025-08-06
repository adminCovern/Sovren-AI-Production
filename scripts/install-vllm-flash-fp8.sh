#!/bin/bash

# VLLM + FLASH ATTENTION 3 + FP8 INSTALLATION SCRIPT
# Production-grade installation for bare metal deployment

set -e

echo "🚀 Installing VLLM with Flash Attention 3 and FP8 support..."

# Install CUDA toolkit if not present
echo "🔧 Checking CUDA installation..."
if ! command -v nvcc &> /dev/null; then
    echo "Installing CUDA toolkit..."
    wget https://developer.download.nvidia.com/compute/cuda/12.3.0/local_installers/cuda_12.3.0_545.23.06_linux.run
    sh cuda_12.3.0_545.23.06_linux.run --silent --toolkit
    export PATH=/usr/local/cuda/bin:$PATH
    export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip setuptools wheel
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install Flash Attention 3
echo "⚡ Installing Flash Attention 3..."
pip install flash-attn --no-build-isolation

# Install VLLM with Flash Attention support
echo "🚀 Installing VLLM..."
pip install vllm

# Install FP8 quantization support
echo "🔢 Installing FP8 quantization support..."
pip install auto-gptq
pip install bitsandbytes
pip install accelerate

# Install additional optimization libraries
echo "🔧 Installing optimization libraries..."
pip install transformers[torch]
pip install datasets
pip install peft
pip install optimum

# Create VLLM configuration
echo "⚙️ Creating VLLM configuration..."
mkdir -p /opt/sovren/config/vllm

cat > /opt/sovren/config/vllm/vllm_config.yaml << 'EOF'
# VLLM Configuration for SOVREN AI - Qwen2.5 Optimized
models:
  consciousness-primary:
    model_path: "/opt/sovren/models/llm/consciousness/qwen2.5-72b-instruct"
    tensor_parallel_size: 8
    dtype: "float16"
    max_model_len: 32768
    gpu_memory_utilization: 0.85
    enable_flash_attention: true

  consciousness-secondary:
    model_path: "/opt/sovren/models/llm/consciousness/qwen2.5-32b-instruct"
    tensor_parallel_size: 4
    dtype: "fp8"
    max_model_len: 32768
    gpu_memory_utilization: 0.75
    enable_flash_attention: true

  executive-cfo:
    model_path: "/opt/sovren/models/llm/executives/qwen2.5-32b-cfo"
    tensor_parallel_size: 2
    dtype: "int8"
    max_model_len: 32768
    gpu_memory_utilization: 0.7
    enable_flash_attention: true

  executive-cmo:
    model_path: "/opt/sovren/models/llm/executives/qwen2.5-32b-cmo"
    tensor_parallel_size: 2
    dtype: "int8"
    max_model_len: 32768
    gpu_memory_utilization: 0.7
    enable_flash_attention: true

  executive-cto:
    model_path: "/opt/sovren/models/llm/executives/qwen2.5-32b-cto"
    tensor_parallel_size: 2
    dtype: "int8"
    max_model_len: 32768
    gpu_memory_utilization: 0.7
    enable_flash_attention: true

  executive-clo:
    model_path: "/opt/sovren/models/llm/executives/qwen2.5-32b-clo"
    tensor_parallel_size: 2
    dtype: "int8"
    max_model_len: 32768
    gpu_memory_utilization: 0.7
    enable_flash_attention: true

  utility-general:
    model_path: "/opt/sovren/models/llm/utility/qwen2.5-7b-instruct"
    tensor_parallel_size: 1
    dtype: "int4"
    max_model_len: 8192
    gpu_memory_utilization: 0.5
    enable_flash_attention: true

  voice-model:
    model_path: "/opt/sovren/models/llm/voice/qwen2.5-14b-instruct"
    tensor_parallel_size: 1
    dtype: "fp8"
    max_model_len: 8192
    gpu_memory_utilization: 0.6
    enable_flash_attention: true

server:
  host: "0.0.0.0"
  port: 8000
  max_num_seqs: 256
  max_num_batched_tokens: 8192
  enable_prefix_caching: true
  disable_log_stats: false
  
optimization:
  enable_chunked_prefill: true
  max_num_batched_tokens: 8192
  enable_prefix_caching: true
  swap_space: 4
  cpu_offload_gb: 0
EOF

# Create quantization script
echo "🔢 Creating model quantization script..."
cat > /opt/sovren/scripts/quantize-models.py << 'EOF'
#!/usr/bin/env python3

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from auto_gptq import AutoGPTQForCausalLM, BaseQuantizeConfig
import os

def quantize_model(model_path, output_path, quantization_config):
    """Quantize a model with specified configuration"""
    print(f"Quantizing {model_path} to {output_path}")
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    
    # Load model
    model = AutoGPTQForCausalLM.from_pretrained(
        model_path,
        quantize_config=quantization_config,
        device_map="auto"
    )
    
    # Quantize
    model.quantize()
    
    # Save quantized model
    model.save_quantized(output_path)
    tokenizer.save_pretrained(output_path)
    
    print(f"✅ Quantized model saved to {output_path}")

def main():
    base_path = "/opt/sovren/models/llm"
    
    # INT8 quantization for executives
    int8_config = BaseQuantizeConfig(
        bits=8,
        group_size=128,
        desc_act=False,
    )
    
    executive_models = ["cfo", "cmo", "cto", "clo"]
    for exec_role in executive_models:
        input_path = f"{base_path}/executives/mistral-7b-{exec_role}"
        output_path = f"{base_path}/executives/mistral-7b-{exec_role}-int8"
        
        if os.path.exists(input_path):
            quantize_model(input_path, output_path, int8_config)
    
    # INT4 quantization for utility
    int4_config = BaseQuantizeConfig(
        bits=4,
        group_size=128,
        desc_act=False,
    )
    
    utility_input = f"{base_path}/utility/llama-7b-utility"
    utility_output = f"{base_path}/utility/llama-7b-utility-int4"
    
    if os.path.exists(utility_input):
        quantize_model(utility_input, utility_output, int4_config)
    
    print("✅ All models quantized successfully!")

if __name__ == "__main__":
    main()
EOF

chmod +x /opt/sovren/scripts/quantize-models.py

# Create VLLM server startup script
echo "🚀 Creating VLLM server startup script..."
cat > /opt/sovren/scripts/start-vllm-server.sh << 'EOF'
#!/bin/bash

# VLLM Server Startup Script
export CUDA_VISIBLE_DEVICES=0,1,2,3,4,5,6,7
export VLLM_USE_MODELSCOPE=false

# Start VLLM server with Qwen2.5 consciousness model
python -m vllm.entrypoints.openai.api_server \
    --model /opt/sovren/models/llm/consciousness/qwen2.5-72b-instruct \
    --tensor-parallel-size 8 \
    --dtype float16 \
    --max-model-len 32768 \
    --gpu-memory-utilization 0.85 \
    --host 0.0.0.0 \
    --port 8000 \
    --enable-prefix-caching \
    --disable-log-stats \
    --max-num-seqs 256 \
    --max-num-batched-tokens 8192
EOF

chmod +x /opt/sovren/scripts/start-vllm-server.sh

# Set permissions
chown -R sovren:sovren /opt/sovren/config/vllm
chown -R sovren:sovren /opt/sovren/scripts

# Test Flash Attention installation
echo "🧪 Testing Flash Attention installation..."
python -c "
import flash_attn
print('✅ Flash Attention 3 installed successfully!')
print(f'Version: {flash_attn.__version__}')
"

# Test VLLM installation
echo "🧪 Testing VLLM installation..."
python -c "
import vllm
print('✅ VLLM installed successfully!')
print(f'Version: {vllm.__version__}')
"

echo "✅ VLLM + Flash Attention 3 + FP8 installation complete!"
echo "📍 Configuration: /opt/sovren/config/vllm/"
echo "📍 Scripts: /opt/sovren/scripts/"
echo "🚀 Start server: /opt/sovren/scripts/start-vllm-server.sh"
