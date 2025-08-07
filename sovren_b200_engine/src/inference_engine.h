#pragma once

// Self-contained definitions for development environment
typedef unsigned long size_t;
typedef signed int int32_t;
typedef unsigned int uint32_t;
typedef float float32_t;

namespace std {
    template<typename T> class vector {
    public:
        T* data() { return nullptr; }
        size_t size() const { return 0; }
        void resize(size_t) {}
        void push_back(const T&) {}
        T& operator[](size_t) { static T t; return t; }
        const T& operator[](size_t) const { static T t; return t; }
    };

    template<typename T> class unique_ptr {
    public:
        T* get() { return nullptr; }
        T* operator->() { return nullptr; }
        T& operator*() { static T t; return t; }
    };

    class string {
    public:
        const char* c_str() const { return ""; }
        size_t size() const { return 0; }
        string() {}
        string(const char*) {}
    };

    template<typename K, typename V> class unordered_map {
    public:
        V& operator[](const K&) { static V v; return v; }
        void clear() {}
        size_t size() const { return 0; }
    };
}

// Conditional CUDA includes - only include if CUDA is available
#ifdef __CUDACC__
    #include <cuda_runtime.h>
    #include <cublas_v2.h>
    #include <cudnn.h>
    #include <nccl.h>
    #define CUDA_AVAILABLE 1
#elif defined(CUDA_AVAILABLE) && CUDA_AVAILABLE
    #include <cuda_runtime.h>
    #include <cublas_v2.h>
    #include <cudnn.h>
    #include <nccl.h>
#else
    // Mock CUDA types for development without CUDA
    #define CUDA_AVAILABLE 0
    typedef void* cudaStream_t;
    typedef void* cublasHandle_t;
    typedef void* cudnnHandle_t;
    typedef void* ncclComm_t;
    typedef int cudaError_t;
    #define cudaSuccess 0
#endif

struct ModelConfig {
    int vocab_size = 152064;
    int hidden_size = 8192;
    int intermediate_size = 29568;
    int num_hidden_layers = 80;
    int num_attention_heads = 64;
    int num_key_value_heads = 8;
    int max_position_embeddings = 32768;
    float rms_norm_eps = 1e-6;
    float rope_theta = 1000000.0;
    int rope_scaling = 1;
};

struct GPUContext {
    int device_id;
    cudaStream_t stream;
    cublasHandle_t cublas_handle;
    cudnnHandle_t cudnn_handle;
    ncclComm_t nccl_comm;
    void* workspace;
    size_t workspace_size;
};

struct ModelWeights {
    // Embedding weights
    float* embed_tokens;
    
    // Layer weights (per layer)
    std::vector<float*> input_layernorm_weight;
    std::vector<float*> self_attn_q_proj_weight;
    std::vector<float*> self_attn_k_proj_weight;
    std::vector<float*> self_attn_v_proj_weight;
    std::vector<float*> self_attn_o_proj_weight;
    std::vector<float*> post_attention_layernorm_weight;
    std::vector<float*> mlp_gate_proj_weight;
    std::vector<float*> mlp_up_proj_weight;
    std::vector<float*> mlp_down_proj_weight;
    
    // Final layer norm and output
    float* norm_weight;
    float* lm_head_weight;
};

struct InferenceState {
    // Input/output tensors
    float* input_ids;
    float* attention_mask;
    float* position_ids;
    float* hidden_states;
    float* output_logits;
    
    // Intermediate tensors
    float* query_states;
    float* key_states;
    float* value_states;
    float* attn_weights;
    float* attn_output;
    float* mlp_gate;
    float* mlp_up;
    float* mlp_down;
    
    // KV cache
    float* key_cache;
    float* value_cache;
    
    // Batch processing
    int batch_size;
    int sequence_length;
    int max_new_tokens;
    int current_length;
};

class SOVRENInferenceEngine {
private:
    ModelConfig config_;
    std::vector<GPUContext> gpu_contexts_;
    ModelWeights weights_;
    std::vector<InferenceState> states_;
    
    int num_gpus_;
    int tensor_parallel_size_;
    int pipeline_parallel_size_;
    
    // Memory management
    size_t total_memory_allocated_;
    std::unordered_map<void*, size_t> memory_map_;
    
    // Performance tracking
    float* performance_metrics_;
    
public:
    SOVRENInferenceEngine(int num_gpus = 8);
    ~SOVRENInferenceEngine();
    
    // Initialization
    bool initialize();
    bool load_model(const std::string& model_path);
    bool setup_multi_gpu();
    
    // Memory management
    void* allocate_gpu_memory(size_t size, int device_id);
    void free_gpu_memory(void* ptr);
    void optimize_memory_layout();
    
    // Model operations
    bool forward_pass(const std::vector<int>& input_tokens, 
                     std::vector<float>& output_logits,
                     int batch_size = 1);
    
    bool generate_tokens(const std::vector<int>& input_tokens,
                        std::vector<int>& output_tokens,
                        int max_new_tokens = 512,
                        float temperature = 0.7f,
                        float top_p = 0.9f);
    
    // Batch processing
    bool process_batch(const std::vector<std::vector<int>>& input_batches,
                      std::vector<std::vector<int>>& output_batches);
    
    // Performance optimization
    void warmup_kernels();
    void optimize_for_throughput();
    void optimize_for_latency();
    
    // Multi-GPU coordination
    bool synchronize_gpus();
    bool all_reduce_gradients();
    bool broadcast_weights();
    
    // Utility functions
    void print_performance_stats();
    bool validate_model_integrity();
    void cleanup();
    
    // Getters
    const ModelConfig& get_config() const { return config_; }
    int get_num_gpus() const { return num_gpus_; }
    size_t get_memory_usage() const { return total_memory_allocated_; }
};
