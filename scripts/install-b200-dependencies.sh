#!/bin/bash

# B200 DEPENDENCY INSTALLATION SCRIPT
# Installs VLLM and all required dependencies for B200 Blackwell inference

set -e

echo "🚀 Installing B200 Blackwell Dependencies..."

# Check if we're on a system with NVIDIA GPUs
echo "📊 Checking GPU configuration..."
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi --query-gpu=name,memory.total,compute_cap --format=csv,noheader,nounits
    echo "✅ NVIDIA GPUs detected"
else
    echo "❌ No NVIDIA GPUs detected. This system requires NVIDIA GPUs for B200 inference."
    exit 1
fi

# Check CUDA version
echo "🔍 Checking CUDA version..."
if command -v nvcc &> /dev/null; then
    CUDA_VERSION=$(nvcc --version | grep "release" | sed 's/.*release \([0-9]\+\.[0-9]\+\).*/\1/')
    echo "✅ CUDA version: $CUDA_VERSION"
    
    if [[ $(echo "$CUDA_VERSION >= 12.1" | bc -l) -eq 1 ]]; then
        echo "✅ CUDA version is compatible with B200"
    else
        echo "⚠️  CUDA version $CUDA_VERSION may not be optimal for B200. Recommend CUDA 12.1+"
    fi
else
    echo "❌ CUDA not found. Please install CUDA 12.1+ for B200 support."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv-b200" ]; then
    echo "🔧 Creating Python virtual environment..."
    python3 -m venv venv-b200
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv-b200/bin/activate

# Upgrade pip and essential tools
echo "📦 Upgrading pip and build tools..."
pip install --upgrade pip setuptools wheel

# Install PyTorch with CUDA 12.1 support first
echo "🔧 Installing PyTorch with CUDA 12.1 support..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Verify PyTorch CUDA support
echo "🔍 Verifying PyTorch CUDA support..."
python -c "
import torch
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'CUDA version: {torch.version.cuda}')
    print(f'GPU count: {torch.cuda.device_count()}')
    for i in range(torch.cuda.device_count()):
        print(f'GPU {i}: {torch.cuda.get_device_name(i)}')
else:
    print('❌ CUDA not available in PyTorch')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ PyTorch CUDA verification failed"
    exit 1
fi

# Install VLLM with all optimizations
echo "🚀 Installing VLLM with B200 optimizations..."
pip install vllm

# Install additional ML libraries
echo "📦 Installing additional ML dependencies..."
pip install transformers>=4.36.0
pip install accelerate>=0.24.0
pip install tokenizers>=0.15.0

# Install web server dependencies
echo "🌐 Installing web server dependencies..."
pip install fastapi>=0.104.0
pip install uvicorn[standard]>=0.24.0
pip install pydantic>=2.5.0

# Install monitoring and utilities
echo "📊 Installing monitoring dependencies..."
pip install nvidia-ml-py3>=7.352.0
pip install psutil>=5.9.0
pip install aiofiles>=23.2.1

# Install development tools
echo "🔧 Installing development tools..."
pip install pytest>=7.4.0
pip install pytest-asyncio>=0.21.0

# Verify VLLM installation
echo "🔍 Verifying VLLM installation..."
python -c "
try:
    import vllm
    print(f'✅ VLLM version: {vllm.__version__}')
    
    # Test basic VLLM functionality
    from vllm import AsyncLLMEngine, AsyncEngineArgs, SamplingParams
    print('✅ VLLM core components imported successfully')
    
    # Check for FP8 support
    try:
        from vllm.model_executor.layers.quantization import QUANTIZATION_METHODS
        if 'fp8' in QUANTIZATION_METHODS:
            print('✅ FP8 quantization support available')
        else:
            print('⚠️  FP8 quantization may not be available')
    except:
        print('⚠️  Could not verify FP8 support')
        
except ImportError as e:
    print(f'❌ VLLM import failed: {e}')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ VLLM verification failed"
    exit 1
fi

# Test GPU memory and compute capability
echo "🧪 Testing GPU capabilities..."
python -c "
import torch
import subprocess

# Check GPU memory
for i in range(torch.cuda.device_count()):
    props = torch.cuda.get_device_properties(i)
    memory_gb = props.total_memory / (1024**3)
    print(f'GPU {i}: {props.name}')
    print(f'  Memory: {memory_gb:.1f} GB')
    print(f'  Compute Capability: {props.major}.{props.minor}')
    
    # Check if it's a B200 (compute capability 10.0)
    if props.major == 10 and props.minor == 0:
        print(f'  ✅ B200 Blackwell GPU detected!')
    elif memory_gb > 80:
        print(f'  ✅ High-memory GPU suitable for large models')
    else:
        print(f'  ⚠️  May not be optimal for 70B+ models')
"

# Create model cache directory
echo "📁 Creating model cache directory..."
mkdir -p ~/.cache/huggingface/transformers
mkdir -p models

# Save environment info
echo "💾 Saving environment information..."
cat > b200-env-info.txt << EOF
B200 Environment Information
Generated: $(date)

Python Version: $(python --version)
PyTorch Version: $(python -c "import torch; print(torch.__version__)")
VLLM Version: $(python -c "import vllm; print(vllm.__version__)")
CUDA Version: $(python -c "import torch; print(torch.version.cuda)")

GPU Information:
$(nvidia-smi --query-gpu=index,name,memory.total,compute_cap --format=csv)

Installed Packages:
$(pip list | grep -E "(torch|vllm|transformers|fastapi|uvicorn)")
EOF

echo ""
echo "🎉 B200 Dependencies Installation Complete!"
echo ""
echo "📊 Summary:"
echo "   ✅ PyTorch with CUDA 12.1 support"
echo "   ✅ VLLM with B200 optimizations"
echo "   ✅ FastAPI web server"
echo "   ✅ Monitoring tools"
echo "   ✅ Development utilities"
echo ""
echo "📁 Environment saved to: b200-env-info.txt"
echo "🔄 Virtual environment: venv-b200"
echo ""
echo "🚀 Ready to deploy B200 VLLM inference server!"
echo "   Next: Run 'scripts/deploy-b200-vllm.sh' to start the server"
echo ""

# Deactivate virtual environment
deactivate
