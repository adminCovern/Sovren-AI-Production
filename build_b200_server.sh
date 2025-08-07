#!/bin/bash
# SOVREN B200 Blackwell Build Script for Linux Server
# Optimized for NVIDIA B200 GPU Server

echo "========================================"
echo "SOVREN B200 Blackwell Build Script"
echo "========================================"

# Check for CUDA installation
CUDA_FOUND=0
CUDA_PATHS=(
    "/usr/local/cuda-12.6"
    "/usr/local/cuda-12.5"
    "/usr/local/cuda-12.4"
    "/usr/local/cuda"
    "/opt/cuda"
)

for CUDA_PATH in "${CUDA_PATHS[@]}"; do
    if [ -f "$CUDA_PATH/bin/nvcc" ]; then
        CUDA_TOOLKIT_ROOT_DIR="$CUDA_PATH"
        CUDA_VERSION=$(basename "$CUDA_PATH" | sed 's/cuda-//')
        CUDA_FOUND=1
        echo "Found CUDA $CUDA_VERSION at: $CUDA_PATH"
        break
    fi
done

if [ $CUDA_FOUND -eq 0 ]; then
    echo "ERROR: CUDA Toolkit not found!"
    echo "Please install CUDA 12.0 or later for B200 support"
    echo "Download from: https://developer.nvidia.com/cuda-downloads"
    exit 1
fi

echo "Using CUDA at: $CUDA_TOOLKIT_ROOT_DIR"

# Set environment variables
export CMAKE_CUDA_COMPILER="$CUDA_TOOLKIT_ROOT_DIR/bin/nvcc"
export CUDA_TOOLKIT_ROOT_DIR="$CUDA_TOOLKIT_ROOT_DIR"

# Create build directory
mkdir -p build
cd build

echo "========================================"
echo "Configuring CMake for B200 Blackwell"
echo "========================================"

# Configure with CMake
cmake .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DCUDA_TOOLKIT_ROOT_DIR="$CUDA_TOOLKIT_ROOT_DIR" \
    -DCMAKE_CUDA_COMPILER="$CUDA_TOOLKIT_ROOT_DIR/bin/nvcc" \
    -DCMAKE_CUDA_ARCHITECTURES=100 \
    -DENABLE_FP8_TENSOR_CORES=ON \
    -DENABLE_BLACKWELL_OPTIMIZATIONS=ON

if [ $? -ne 0 ]; then
    echo "ERROR: CMake configuration failed!"
    exit 1
fi

echo "========================================"
echo "Building SOVREN B200 Engine"
echo "========================================"

# Build the project
make -j$(nproc)

if [ $? -ne 0 ]; then
    echo "ERROR: Build failed!"
    exit 1
fi

echo "========================================"
echo "Build completed successfully!"
echo "========================================"
echo ""
echo "Executable location: build/sovren_b200_engine"
echo ""
echo "B200 Blackwell optimizations enabled:"
echo "- FP8 Tensor Core support"
echo "- sm_100 architecture targeting"
echo "- Advanced memory coalescing"
echo "- Blackwell-specific kernel optimizations"
echo ""
