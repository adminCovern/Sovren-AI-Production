#!/bin/bash

# B200 VLLM DEPLOYMENT SCRIPT
# Deploys VLLM inference server with FP8 optimization for B200 Blackwell GPUs

set -e

echo "🚀 Deploying B200 VLLM Inference Server..."

# Check if running on system with B200 GPUs
echo "📊 Checking GPU configuration..."
nvidia-smi --query-gpu=name,memory.total,compute_cap --format=csv,noheader,nounits

# Set environment variables for B200 optimization
export CUDA_VISIBLE_DEVICES=0,1,2,3,4,5,6,7
export VLLM_USE_MODELSCOPE=false
export VLLM_WORKER_MULTIPROC_METHOD=spawn
export VLLM_ENGINE_ITERATION_TIMEOUT_S=1800
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512

# Check if dependencies are installed
if [ ! -d "venv-b200" ]; then
    echo "❌ B200 dependencies not installed!"
    echo "🔧 Please run 'scripts/install-b200-dependencies.sh' first"
    exit 1
fi

# Activate virtual environment
echo "🔄 Activating B200 environment..."
source venv-b200/bin/activate

# Verify VLLM is available
echo "🔍 Verifying VLLM installation..."
python -c "
import vllm
from vllm import AsyncLLMEngine, AsyncEngineArgs, SamplingParams
print('✅ VLLM verified successfully')
print(f'   Version: {vllm.__version__}')
" || {
    echo "❌ VLLM verification failed!"
    echo "🔧 Please run 'scripts/install-b200-dependencies.sh' to install dependencies"
    exit 1
}

# Download models if not present
echo "📥 Checking model availability..."

# Create models directory
mkdir -p models

# Check if Qwen2.5-70B is available
if [ ! -d "models/Qwen2.5-70B-Instruct" ]; then
    echo "📥 Downloading Qwen2.5-70B-Instruct..."
    cd models
    git lfs install
    git clone https://huggingface.co/Qwen/Qwen2.5-70B-Instruct
    cd ..
fi

# Check if Qwen2.5-405B is available (optional for full deployment)
if [ ! -d "models/Qwen2.5-405B-Instruct" ]; then
    echo "⚠️  Qwen2.5-405B-Instruct not found. This is optional but recommended for SOVREN-AI."
    echo "   To download: git clone https://huggingface.co/Qwen/Qwen2.5-405B-Instruct models/Qwen2.5-405B-Instruct"
fi

# Start MCP Server first
echo "🔧 Starting MCP Server..."
cd src/mcp
python SOVRENMCPServer.py &
MCP_PID=$!
cd ../..

# Wait for MCP Server to be ready
echo "⏳ Waiting for MCP Server to initialize..."
sleep 10

# Test MCP Server
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ MCP Server is running"
else
    echo "❌ MCP Server failed to start"
    kill $MCP_PID 2>/dev/null || true
    exit 1
fi

# Start VLLM Inference Server
echo "🚀 Starting B200 VLLM Inference Server..."
cd src/lib/inference
python VLLMInferenceServer.py &
VLLM_PID=$!
cd ../../..

# Wait for VLLM Server to load models
echo "⏳ Waiting for VLLM server to load models (this may take several minutes)..."
sleep 30

# Test VLLM Server
MAX_RETRIES=20
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:8001/health > /dev/null 2>&1; then
        echo "✅ VLLM Server is running"
        break
    else
        echo "⏳ VLLM Server still loading... (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
        sleep 15
        RETRY_COUNT=$((RETRY_COUNT + 1))
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ VLLM Server failed to start within timeout"
    kill $VLLM_PID 2>/dev/null || true
    kill $MCP_PID 2>/dev/null || true
    exit 1
fi

# Test inference
echo "🧠 Testing B200 inference..."
curl -X POST http://localhost:8001/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "As a CFO, analyze the following investment opportunity:",
    "max_tokens": 100,
    "temperature": 0.7,
    "executive_role": "CFO"
  }' | jq .

if [ $? -eq 0 ]; then
    echo "✅ B200 inference test successful!"
else
    echo "❌ B200 inference test failed"
fi

# Display system status
echo ""
echo "🎯 B200 VLLM Deployment Complete!"
echo ""
echo "📊 System Status:"
echo "   MCP Server:  http://localhost:8000 (PID: $MCP_PID)"
echo "   VLLM Server: http://localhost:8001 (PID: $VLLM_PID)"
echo ""
echo "🔧 Available Endpoints:"
echo "   Health Check: curl http://localhost:8001/health"
echo "   Models List:  curl http://localhost:8001/v1/models"
echo "   Inference:    curl -X POST http://localhost:8001/v1/completions"
echo "   Statistics:   curl http://localhost:8001/v1/stats"
echo ""
echo "📈 GPU Utilization:"
nvidia-smi --query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw --format=csv

# Save PIDs for cleanup
echo $MCP_PID > .mcp_pid
echo $VLLM_PID > .vllm_pid

echo ""
echo "🎉 B200 VLLM system is ready for production inference!"
echo "   Use 'scripts/stop-b200-vllm.sh' to stop the servers"
echo ""

# Keep script running to monitor
echo "📊 Monitoring system (Ctrl+C to stop)..."
while true; do
    sleep 60
    echo "$(date): System running - MCP: $MCP_PID, VLLM: $VLLM_PID"
    
    # Check if processes are still running
    if ! kill -0 $MCP_PID 2>/dev/null; then
        echo "❌ MCP Server stopped unexpectedly"
        break
    fi
    
    if ! kill -0 $VLLM_PID 2>/dev/null; then
        echo "❌ VLLM Server stopped unexpectedly"
        break
    fi
done
