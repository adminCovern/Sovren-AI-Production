#include "inference_engine.h"
#include <iostream>
#include <vector>
#include <string>
#include <chrono>

void print_banner() {
    std::cout << R"(
╔═══════════════════════════════════════════════════════════════╗
║                    SOVREN B200 ENGINE                        ║
║              Next-Generation AI Inference Engine             ║
║                                                               ║
║  🚀 Optimized for NVIDIA B200 Architecture                   ║
║  ⚡ Multi-GPU Tensor Parallelism                             ║
║  🧠 Advanced Memory Management                               ║
║  🔥 Ultra-Low Latency Inference                              ║
╚═══════════════════════════════════════════════════════════════╝
)" << std::endl;
}

void print_system_info() {
    std::cout << "\n=== System Information ===" << std::endl;
    
#if CUDA_AVAILABLE
    std::cout << "✅ CUDA Support: ENABLED" << std::endl;
    std::cout << "🎯 Target Architecture: B200 (sm_100)" << std::endl;
    std::cout << "🔧 Optimization Level: Maximum Performance" << std::endl;
#else
    std::cout << "⚠️  CUDA Support: DISABLED (CPU-only mode)" << std::endl;
    std::cout << "💻 Running in CPU fallback mode" << std::endl;
#endif
    
    std::cout << "🏗️  Build Configuration: " << 
#ifdef NDEBUG
        "Release"
#else
        "Debug"
#endif
        << std::endl;
}

int main(int argc, char* argv[]) {
    print_banner();
    print_system_info();
    
    try {
        // Initialize the inference engine
        std::cout << "\n🚀 Initializing SOVREN B200 Inference Engine..." << std::endl;
        
        int num_gpus = 8; // Default for B200 setup
        if (argc > 1) {
            num_gpus = std::stoi(argv[1]);
        }
        
        SOVRENInferenceEngine engine(num_gpus);
        
        // Initialize the engine
        auto start_time = std::chrono::high_resolution_clock::now();
        
        if (!engine.initialize()) {
            std::cerr << "❌ Failed to initialize inference engine!" << std::endl;
            return -1;
        }
        
        auto init_time = std::chrono::high_resolution_clock::now();
        auto init_duration = std::chrono::duration_cast<std::chrono::milliseconds>(
            init_time - start_time).count();
        
        std::cout << "✅ Engine initialized successfully in " << init_duration << "ms" << std::endl;
        
        // Load model (placeholder path)
        std::string model_path = "models/sovren_b200_model";
        if (argc > 2) {
            model_path = argv[2];
        }
        
        std::cout << "\n📦 Loading model from: " << model_path << std::endl;
        if (!engine.load_model(model_path)) {
            std::cerr << "❌ Failed to load model!" << std::endl;
            return -1;
        }
        
        // Setup multi-GPU if available
        if (num_gpus > 1) {
            std::cout << "\n🔗 Setting up multi-GPU configuration..." << std::endl;
            if (!engine.setup_multi_gpu()) {
                std::cerr << "⚠️  Multi-GPU setup failed, continuing with single GPU" << std::endl;
            }
        }
        
        // Warmup kernels
        std::cout << "\n🔥 Warming up inference kernels..." << std::endl;
        engine.warmup_kernels();
        
        // Optimize for performance
        std::cout << "\n⚡ Optimizing for maximum throughput..." << std::endl;
        engine.optimize_for_throughput();
        
        // Test inference with sample input
        std::cout << "\n🧪 Running test inference..." << std::endl;
        std::vector<int> test_tokens = {1, 2, 3, 4, 5}; // Sample tokens
        std::vector<int> output_tokens;
        
        auto inference_start = std::chrono::high_resolution_clock::now();
        
        bool success = engine.generate_tokens(
            test_tokens, 
            output_tokens, 
            10,    // max_new_tokens
            0.7f,  // temperature
            0.9f   // top_p
        );
        
        auto inference_end = std::chrono::high_resolution_clock::now();
        auto inference_duration = std::chrono::duration_cast<std::chrono::microseconds>(
            inference_end - inference_start).count();
        
        if (success) {
            std::cout << "✅ Test inference completed successfully!" << std::endl;
            std::cout << "⏱️  Inference time: " << inference_duration << " microseconds" << std::endl;
            std::cout << "🎯 Tokens per second: " << 
                (output_tokens.size() * 1000000.0 / inference_duration) << std::endl;
        } else {
            std::cerr << "❌ Test inference failed!" << std::endl;
        }
        
        // Print performance statistics
        std::cout << "\n" << std::endl;
        engine.print_performance_stats();
        
        // Validate model integrity
        std::cout << "\n🔍 Validating model integrity..." << std::endl;
        if (engine.validate_model_integrity()) {
            std::cout << "✅ Model validation passed!" << std::endl;
        } else {
            std::cerr << "⚠️  Model validation warnings detected" << std::endl;
        }
        
        std::cout << "\n🎉 SOVREN B200 Engine ready for production!" << std::endl;
        std::cout << "💡 Use this engine for ultra-fast AI inference at scale" << std::endl;
        
        // Keep running for server mode (placeholder)
        std::cout << "\n⏸️  Press Ctrl+C to shutdown..." << std::endl;
        
        // In a real implementation, this would start the HTTP server
        // and handle inference requests
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "💥 Fatal error: " << e.what() << std::endl;
        return -1;
    } catch (...) {
        std::cerr << "💥 Unknown fatal error occurred!" << std::endl;
        return -1;
    }
}
