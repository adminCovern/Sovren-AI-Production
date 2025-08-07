cmake_minimum_required(VERSION 3.18)

# Detect if CUDA is available
find_package(CUDA QUIET)
if(CUDA_FOUND)
    project(SOVREN_B200_Engine LANGUAGES CXX CUDA)
    set(CUDA_AVAILABLE ON)
    message(STATUS "CUDA found - enabling GPU acceleration")
else()
    project(SOVREN_B200_Engine LANGUAGES CXX)
    set(CUDA_AVAILABLE OFF)
    message(WARNING "CUDA not found - building CPU-only version")
endif()

set(CMAKE_CXX_STANDARD 17)

if(CUDA_AVAILABLE)
    set(CMAKE_CUDA_STANDARD 17)
    set(CMAKE_CUDA_ARCHITECTURES 100)

    # Platform-specific CUDA paths
    if(WIN32)
        # Windows CUDA paths - check multiple versions
        set(CUDA_POSSIBLE_PATHS
            "C:/Program Files/NVIDIA GPU Computing Toolkit/CUDA/v12.6"
            "C:/Program Files/NVIDIA GPU Computing Toolkit/CUDA/v12.5"
            "C:/Program Files/NVIDIA GPU Computing Toolkit/CUDA/v12.4"
            "C:/Program Files/NVIDIA GPU Computing Toolkit/CUDA/v12.3"
            "C:/Program Files/NVIDIA GPU Computing Toolkit/CUDA/v12.2"
            "C:/Program Files/NVIDIA GPU Computing Toolkit/CUDA/v12.1"
            "C:/Program Files/NVIDIA GPU Computing Toolkit/CUDA/v12.0"
        )

        foreach(CUDA_PATH ${CUDA_POSSIBLE_PATHS})
            if(EXISTS "${CUDA_PATH}/bin/nvcc.exe")
                set(CUDA_TOOLKIT_ROOT_DIR ${CUDA_PATH})
                set(CMAKE_CUDA_COMPILER ${CUDA_PATH}/bin/nvcc.exe)
                message(STATUS "Found CUDA at: ${CUDA_PATH}")
                break()
            endif()
        endforeach()

        if(NOT CUDA_TOOLKIT_ROOT_DIR)
            find_program(CUDA_NVCC_EXECUTABLE nvcc)
            if(CUDA_NVCC_EXECUTABLE)
                get_filename_component(CUDA_TOOLKIT_ROOT_DIR ${CUDA_NVCC_EXECUTABLE} DIRECTORY)
                get_filename_component(CUDA_TOOLKIT_ROOT_DIR ${CUDA_TOOLKIT_ROOT_DIR} DIRECTORY)
            endif()
        endif()
    else()
        # Linux CUDA paths - B200 server configuration
        set(CUDA_POSSIBLE_PATHS
            "/usr/local/cuda-12.6"
            "/usr/local/cuda-12.5"
            "/usr/local/cuda-12.4"
            "/usr/local/cuda"
            "/opt/cuda"
        )

        foreach(CUDA_PATH ${CUDA_POSSIBLE_PATHS})
            if(EXISTS "${CUDA_PATH}/bin/nvcc")
                set(CUDA_TOOLKIT_ROOT_DIR ${CUDA_PATH})
                set(CMAKE_CUDA_COMPILER ${CUDA_PATH}/bin/nvcc)
                message(STATUS "Found CUDA at: ${CUDA_PATH}")
                break()
            endif()
        endforeach()

        if(NOT CUDA_TOOLKIT_ROOT_DIR)
            set(CUDA_TOOLKIT_ROOT_DIR /usr/local/cuda)
            set(CMAKE_CUDA_COMPILER /usr/local/cuda/bin/nvcc)
        endif()
    endif()
endif()

# Compiler flags
if(CUDA_AVAILABLE)
    # CUDA compiler flags for B200 Blackwell optimization
    set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -arch=sm_100 -O3 -use_fast_math")
    set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -Xptxas -O3 -Xcompiler -O3")
    set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -DCUDA_ARCH=100 -DCUDA_AVAILABLE=1")

    # Enable FP8 Tensor Core support for B200
    set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -DENABLE_FP8_TENSOR_CORES=1")
    set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -DENABLE_BLACKWELL_OPTIMIZATIONS=1")

    # Advanced B200 optimizations
    set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -maxrregcount=255")
    set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -Xptxas -dlcm=cg")
    set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -Xptxas -dscm=wt")

    # Enable experimental features for B200
    set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -forward-unknown-to-host-compiler")
    set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -extended-lambda")
endif()

# Platform-specific compiler flags
if(WIN32)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /O2")
    if(CUDA_AVAILABLE)
        add_definitions(-DCUDA_AVAILABLE=1)
    else()
        add_definitions(-DCUDA_AVAILABLE=0)
    endif()
else()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -march=native -mtune=native")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fopenmp -ffast-math")
    if(CUDA_AVAILABLE)
        add_definitions(-DCUDA_AVAILABLE=1)
    else()
        add_definitions(-DCUDA_AVAILABLE=0)
    endif()
endif()

# Include directories
include_directories(src)
if(CUDA_AVAILABLE)
    include_directories(${CUDA_INCLUDE_DIRS})
    if(WIN32)
        # Windows CUDA include paths
        if(CUDA_TOOLKIT_ROOT_DIR)
            include_directories(${CUDA_TOOLKIT_ROOT_DIR}/include)
        endif()
    else()
        # Linux CUDA include paths
        include_directories(/usr/local/cuda-12.9/include)
        include_directories(/usr/include)
    endif()
endif()

# Library directories
if(CUDA_AVAILABLE)
    if(WIN32)
        if(CUDA_TOOLKIT_ROOT_DIR)
            link_directories(${CUDA_TOOLKIT_ROOT_DIR}/lib/x64)
        endif()
    else()
        link_directories(${CUDA_TOOLKIT_ROOT_DIR}/lib64)
        link_directories(/usr/lib/x86_64-linux-gnu)
    endif()
endif()

# Source files
set(CPP_SOURCES
    src/main.cpp
    src/inference_engine.cpp
    src/model_loader.cpp
    src/multi_gpu_manager.cpp
    src/http_server.cpp
    src/memory_manager.cpp
    src/tokenizer.cpp
    src/batch_processor.cpp
)

# CUDA sources (only if CUDA is available)
if(CUDA_AVAILABLE)
    set(CUDA_SOURCES
        src/kernels/attention_kernel.cu
        src/kernels/ffn_kernel.cu
        src/kernels/fp8_tensor_core_kernel.cu
        src/kernels/embedding_kernel.cu
        src/kernels/layernorm_kernel.cu
        src/kernels/rope_kernel.cu
        src/kernels/softmax_kernel.cu
        src/kernels/gemm_kernel.cu
    )
    # Create executable with CUDA sources
    add_executable(sovren_b200_engine ${CPP_SOURCES} ${CUDA_SOURCES})
else()
    # Create executable without CUDA sources
    add_executable(sovren_b200_engine ${CPP_SOURCES})
endif()

# Link libraries
if(CUDA_AVAILABLE)
    # CUDA libraries
    target_link_libraries(sovren_b200_engine
        ${CUDA_LIBRARIES}
        cublas
        cublasLt
        cudnn
        curand
        cusparse
        nccl
    )

    # Platform-specific CUDA library linking
    if(WIN32)
        # Windows CUDA libraries
        if(CUDA_TOOLKIT_ROOT_DIR)
            target_link_libraries(sovren_b200_engine
                ${CUDA_TOOLKIT_ROOT_DIR}/lib/x64/cudart.lib
                ${CUDA_TOOLKIT_ROOT_DIR}/lib/x64/cublas.lib
                ${CUDA_TOOLKIT_ROOT_DIR}/lib/x64/cublasLt.lib
                ${CUDA_TOOLKIT_ROOT_DIR}/lib/x64/cudnn.lib
                ${CUDA_TOOLKIT_ROOT_DIR}/lib/x64/curand.lib
                ${CUDA_TOOLKIT_ROOT_DIR}/lib/x64/cusparse.lib
            )
        endif()
    else()
        # Linux CUDA libraries
        target_link_libraries(sovren_b200_engine
            ${CUDA_TOOLKIT_ROOT_DIR}/lib64/libcudart.so
            ${CUDA_TOOLKIT_ROOT_DIR}/lib64/libcublas.so
            ${CUDA_TOOLKIT_ROOT_DIR}/lib64/libcublasLt.so
            ${CUDA_TOOLKIT_ROOT_DIR}/lib64/libcudnn.so
            ${CUDA_TOOLKIT_ROOT_DIR}/lib64/libcurand.so
            ${CUDA_TOOLKIT_ROOT_DIR}/lib64/libcusparse.so
        )
    endif()
endif()

# System libraries
if(WIN32)
    # Windows system libraries
    target_link_libraries(sovren_b200_engine)
else()
    # Linux system libraries
    target_link_libraries(sovren_b200_engine
        pthread
        dl
        rt
        m
    )
endif()

# HTTP server dependencies
find_package(PkgConfig REQUIRED)
pkg_check_modules(LIBMICROHTTPD REQUIRED libmicrohttpd)
target_link_libraries(sovren_b200_engine ${LIBMICROHTTPD_LIBRARIES})
target_include_directories(sovren_b200_engine PRIVATE ${LIBMICROHTTPD_INCLUDE_DIRS})

# JSON parsing
target_link_libraries(sovren_b200_engine jsoncpp)

# Set properties
set_target_properties(sovren_b200_engine PROPERTIES
    CUDA_SEPARABLE_COMPILATION ON
    CUDA_RESOLVE_DEVICE_SYMBOLS ON
)

# Install target
install(TARGETS sovren_b200_engine DESTINATION bin)

# Build configuration
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    set_target_properties(sovren_b200_engine PROPERTIES
        COMPILE_FLAGS "-DNDEBUG -O3"
    )
endif()
