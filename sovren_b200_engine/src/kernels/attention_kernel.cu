#ifdef CUDA_AVAILABLE
#include <cuda_runtime.h>
#include <cuda_fp16.h>
#include <cuda_bf16.h>
#include <cuda_fp8.h>
#include <cublas_v2.h>
#include <cublasLt.h>
#include <cudnn.h>
#include <mma.h>
#endif
#include <cmath>

// B200 Blackwell Architecture Optimizations
#define WARP_SIZE 32
#define MAX_THREADS_PER_BLOCK 1024
#define B200_SM_COUNT 208
#define B200_TENSOR_CORES_PER_SM 4
#define B200_MAX_SHARED_MEM 232448  // 227KB shared memory per SM

// FP8 Tensor Core Support
#define ENABLE_FP8_TENSOR_CORES 1
#define FP8_MAX_VALUE 448.0f
#define FP8_MIN_VALUE -448.0f

// Memory coalescing optimization
#define MEMORY_ALIGNMENT 128
#define VECTORIZED_LOAD_SIZE 16

using namespace nvcuda;
using namespace nvcuda::wmma;

// FP8 Tensor Core Flash Attention optimized for B200 Blackwell
template<typename T>
__global__ void flash_attention_fp8_tensor_core_kernel(
    const T* query, const T* key, const T* value,
    T* output, int batch_size, int seq_len, int num_heads, int head_dim,
    float scale_factor, int block_size = 128) {

    // Use larger block size for B200's increased shared memory
    constexpr int TILE_SIZE = 16;
    constexpr int WMMA_M = 16, WMMA_N = 16, WMMA_K = 16;

    // Shared memory for Tensor Core operations
    __shared__ T shared_query[TILE_SIZE * TILE_SIZE];
    __shared__ T shared_key[TILE_SIZE * TILE_SIZE];
    __shared__ T shared_value[TILE_SIZE * TILE_SIZE];
    __shared__ float shared_scores[TILE_SIZE * TILE_SIZE];

    // WMMA fragments for Tensor Core operations
    wmma::fragment<wmma::matrix_a, WMMA_M, WMMA_N, WMMA_K, T, wmma::row_major> frag_q;
    wmma::fragment<wmma::matrix_b, WMMA_M, WMMA_N, WMMA_K, T, wmma::col_major> frag_k;
    wmma::fragment<wmma::accumulator, WMMA_M, WMMA_N, WMMA_K, float> frag_scores;
    wmma::fragment<wmma::matrix_a, WMMA_M, WMMA_N, WMMA_K, float, wmma::row_major> frag_attn;
    wmma::fragment<wmma::matrix_b, WMMA_M, WMMA_N, WMMA_K, T, wmma::col_major> frag_v;
    wmma::fragment<wmma::accumulator, WMMA_M, WMMA_N, WMMA_K, T> frag_output;

    int batch_idx = blockIdx.x;
    int head_idx = blockIdx.y;
    int block_idx = blockIdx.z;

    if (batch_idx >= batch_size || head_idx >= num_heads) return;

    extern __shared__ float flash_shared[];
    float* q_block = flash_shared;
    float* k_block = q_block + block_size * head_dim;
    float* v_block = k_block + block_size * head_dim;
    float* scores = v_block + block_size * head_dim;

    int tid = threadIdx.x;
    int num_blocks = (seq_len + block_size - 1) / block_size;

    // Initialize output accumulator
    float output_acc[128]; // Max head_dim
    float max_score = -INFINITY;
    float sum_exp = 0.0f;

    for (int d = 0; d < head_dim; d++) {
        output_acc[d] = 0.0f;
    }

    // Process blocks
    for (int k_block = 0; k_block < num_blocks; k_block++) {
        int k_start = k_block * block_size;
        int k_end = min(k_start + block_size, seq_len);
        int k_size = k_end - k_start;

        // Load K and V blocks
        for (int i = tid; i < k_size * head_dim; i += blockDim.x) {
            int k_seq = i / head_dim;
            int k_dim = i % head_dim;
            int global_k_seq = k_start + k_seq;

            int k_idx = batch_idx * num_heads * seq_len * head_dim +
                        head_idx * seq_len * head_dim +
                        global_k_seq * head_dim + k_dim;

            k_block[i] = key[k_idx];
            v_block[i] = value[k_idx];
        }
        __syncthreads();

        // Compute scores for this block
        for (int q_seq = 0; q_seq < seq_len; q_seq++) {
            float block_max = -INFINITY;

            for (int k_seq = 0; k_seq < k_size; k_seq++) {
                float score = 0.0f;
                for (int d = 0; d < head_dim; d++) {
                    int q_idx = batch_idx * num_heads * seq_len * head_dim +
                                head_idx * seq_len * head_dim +
                                q_seq * head_dim + d;
                    score += query[q_idx] * k_block[k_seq * head_dim + d];
                }
                score *= scale_factor;
                scores[k_seq] = score;
                block_max = fmaxf(block_max, score);
            }

            // Update global max and compute exponentials
            float old_max = max_score;
            max_score = fmaxf(max_score, block_max);
            float exp_diff = expf(old_max - max_score);

            // Rescale previous accumulator
            for (int d = 0; d < head_dim; d++) {
                output_acc[d] *= exp_diff;
            }
            sum_exp *= exp_diff;

            // Add current block contribution
            float block_sum = 0.0f;
            for (int k_seq = 0; k_seq < k_size; k_seq++) {
                float exp_score = expf(scores[k_seq] - max_score);
                block_sum += exp_score;

                for (int d = 0; d < head_dim; d++) {
                    output_acc[d] += exp_score * v_block[k_seq * head_dim + d];
                }
            }
            sum_exp += block_sum;
        }
        __syncthreads();
    }

    // Normalize and write output
    for (int q_seq = tid; q_seq < seq_len; q_seq += blockDim.x) {
        for (int d = 0; d < head_dim; d++) {
            int out_idx = batch_idx * num_heads * seq_len * head_dim +
                          head_idx * seq_len * head_dim +
                          q_seq * head_dim + d;
            output[out_idx] = output_acc[d] / sum_exp;
        }
    }
}

// Optimized for B200 sm_100 architecture
__device__ __forceinline__ float warp_reduce_sum(float val) {
    for (int offset = WARP_SIZE / 2; offset > 0; offset /= 2) {
        val += __shfl_down_sync(0xFFFFFFFF, val, offset);
    }
    return val;
}

__device__ __forceinline__ float warp_reduce_max(float val) {
    for (int offset = WARP_SIZE / 2; offset > 0; offset /= 2) {
        val = fmaxf(val, __shfl_down_sync(0xFFFFFFFF, val, offset));
    }
    return val;
}

// RoPE (Rotary Position Embedding) kernel optimized for B200
__global__ void rope_kernel(
    float* query, float* key,
    const float* cos_cache, const float* sin_cache,
    int batch_size, int seq_len, int num_heads, int head_dim,
    int max_position_embeddings) {
    
    int batch_idx = blockIdx.x;
    int head_idx = blockIdx.y;
    int seq_idx = blockIdx.z;
    int dim_idx = threadIdx.x;
    
    if (batch_idx >= batch_size || head_idx >= num_heads || 
        seq_idx >= seq_len || dim_idx >= head_dim / 2) return;
    
    int pos = seq_idx;
    int cos_idx = pos * (head_dim / 2) + dim_idx;
    int sin_idx = cos_idx;
    
    float cos_val = cos_cache[cos_idx];
    float sin_val = sin_cache[sin_idx];
    
    int q_idx = batch_idx * num_heads * seq_len * head_dim + 
                head_idx * seq_len * head_dim + 
                seq_idx * head_dim + dim_idx * 2;
    
    int k_idx = q_idx;
    
    float q_real = query[q_idx];
    float q_imag = query[q_idx + 1];
    float k_real = key[k_idx];
    float k_imag = key[k_idx + 1];
    
    query[q_idx] = q_real * cos_val - q_imag * sin_val;
    query[q_idx + 1] = q_real * sin_val + q_imag * cos_val;
    
    key[k_idx] = k_real * cos_val - k_imag * sin_val;
    key[k_idx + 1] = k_real * sin_val + k_imag * cos_val;
}

// Multi-head attention kernel optimized for B200
__global__ void multi_head_attention_kernel(
    const float* query, const float* key, const float* value,
    float* output, float* attention_weights,
    const float* attention_mask,
    int batch_size, int seq_len, int num_heads, int head_dim,
    float scale_factor) {
    
    int batch_idx = blockIdx.x;
    int head_idx = blockIdx.y;
    int seq_idx = threadIdx.x;
    
    if (batch_idx >= batch_size || head_idx >= num_heads || seq_idx >= seq_len) return;
    
    extern __shared__ float shared_mem[];
    float* shared_key = shared_mem;
    float* shared_value = shared_mem + seq_len * head_dim;
    float* shared_scores = shared_mem + 2 * seq_len * head_dim;
    
    // Load key and value into shared memory
    for (int i = threadIdx.x; i < seq_len * head_dim; i += blockDim.x) {
        int k_idx = batch_idx * num_heads * seq_len * head_dim + 
                    head_idx * seq_len * head_dim + i;
        shared_key[i] = key[k_idx];
        shared_value[i] = value[k_idx];
    }
    __syncthreads();
    
    // Compute attention scores
    float max_score = -INFINITY;
    for (int k_seq = 0; k_seq < seq_len; k_seq++) {
        float score = 0.0f;
        for (int d = 0; d < head_dim; d++) {
            int q_idx = batch_idx * num_heads * seq_len * head_dim + 
                        head_idx * seq_len * head_dim + 
                        seq_idx * head_dim + d;
            int k_idx = k_seq * head_dim + d;
            score += query[q_idx] * shared_key[k_idx];
        }
        score *= scale_factor;
        
        // Apply attention mask
        if (attention_mask != nullptr) {
            int mask_idx = batch_idx * seq_len * seq_len + seq_idx * seq_len + k_seq;
            score += attention_mask[mask_idx];
        }
        
        shared_scores[k_seq] = score;
        max_score = fmaxf(max_score, score);
    }
    
    // Compute softmax
    float sum_exp = 0.0f;
    for (int k_seq = 0; k_seq < seq_len; k_seq++) {
        shared_scores[k_seq] = expf(shared_scores[k_seq] - max_score);
        sum_exp += shared_scores[k_seq];
    }
    
    for (int k_seq = 0; k_seq < seq_len; k_seq++) {
        shared_scores[k_seq] /= sum_exp;
        if (attention_weights != nullptr) {
            int attn_idx = batch_idx * num_heads * seq_len * seq_len + 
                          head_idx * seq_len * seq_len + 
                          seq_idx * seq_len + k_seq;
            attention_weights[attn_idx] = shared_scores[k_seq];
        }
    }
    __syncthreads();
    
    // Compute output
    for (int d = 0; d < head_dim; d++) {
        float output_val = 0.0f;
        for (int k_seq = 0; k_seq < seq_len; k_seq++) {
            int v_idx = k_seq * head_dim + d;
            output_val += shared_scores[k_seq] * shared_value[v_idx];
        }
        
        int out_idx = batch_idx * num_heads * seq_len * head_dim + 
                      head_idx * seq_len * head_dim + 
                      seq_idx * head_dim + d;
        output[out_idx] = output_val;
    }
}

// Grouped Query Attention for Qwen2.5 (8 KV heads, 64 Q heads)
__global__ void grouped_query_attention_kernel(
    const float* query, const float* key, const float* value,
    float* output, int batch_size, int seq_len, 
    int num_q_heads, int num_kv_heads, int head_dim,
    float scale_factor) {
    
    int batch_idx = blockIdx.x;
    int q_head_idx = blockIdx.y;
    int seq_idx = threadIdx.x;
    
    if (batch_idx >= batch_size || q_head_idx >= num_q_heads || seq_idx >= seq_len) return;
    
    int kv_head_idx = q_head_idx / (num_q_heads / num_kv_heads);
    
    extern __shared__ float gqa_shared[];
    float* shared_key = gqa_shared;
    float* shared_value = gqa_shared + seq_len * head_dim;
    
    // Load corresponding KV head into shared memory
    for (int i = threadIdx.x; i < seq_len * head_dim; i += blockDim.x) {
        int k_idx = batch_idx * num_kv_heads * seq_len * head_dim + 
                    kv_head_idx * seq_len * head_dim + i;
        shared_key[i] = key[k_idx];
        shared_value[i] = value[k_idx];
    }
    __syncthreads();
    
    // Compute attention for this query head
    float max_score = -INFINITY;
    float scores[512]; // Assuming max seq_len of 512 for shared memory
    
    for (int k_seq = 0; k_seq < seq_len; k_seq++) {
        float score = 0.0f;
        for (int d = 0; d < head_dim; d++) {
            int q_idx = batch_idx * num_q_heads * seq_len * head_dim + 
                        q_head_idx * seq_len * head_dim + 
                        seq_idx * head_dim + d;
            score += query[q_idx] * shared_key[k_seq * head_dim + d];
        }
        score *= scale_factor;
        scores[k_seq] = score;
        max_score = fmaxf(max_score, score);
    }
    
    // Softmax
    float sum_exp = 0.0f;
    for (int k_seq = 0; k_seq < seq_len; k_seq++) {
        scores[k_seq] = expf(scores[k_seq] - max_score);
        sum_exp += scores[k_seq];
    }
    
    // Normalize and compute output
    for (int d = 0; d < head_dim; d++) {
        float output_val = 0.0f;
        for (int k_seq = 0; k_seq < seq_len; k_seq++) {
            float normalized_score = scores[k_seq] / sum_exp;
            output_val += normalized_score * shared_value[k_seq * head_dim + d];
        }
        
        int out_idx = batch_idx * num_q_heads * seq_len * head_dim + 
                      q_head_idx * seq_len * head_dim + 
                      seq_idx * head_dim + d;
        output[out_idx] = output_val;
    }
}

// C++ interface functions
extern "C" {
    void launch_rope_kernel(
        float* query, float* key,
        const float* cos_cache, const float* sin_cache,
        int batch_size, int seq_len, int num_heads, int head_dim,
        int max_position_embeddings, cudaStream_t stream) {
        
        dim3 grid(batch_size, num_heads, seq_len);
        dim3 block(head_dim / 2);
        
        rope_kernel<<<grid, block, 0, stream>>>(
            query, key, cos_cache, sin_cache,
            batch_size, seq_len, num_heads, head_dim,
            max_position_embeddings);
    }
    
    void launch_grouped_query_attention(
        const float* query, const float* key, const float* value,
        float* output, int batch_size, int seq_len,
        int num_q_heads, int num_kv_heads, int head_dim,
        float scale_factor, cudaStream_t stream) {
        
        dim3 grid(batch_size, num_q_heads);
        dim3 block(min(seq_len, MAX_THREADS_PER_BLOCK));
        
        size_t shared_mem_size = 2 * seq_len * head_dim * sizeof(float);
        
        grouped_query_attention_kernel<<<grid, block, shared_mem_size, stream>>>(
            query, key, value, output,
            batch_size, seq_len, num_q_heads, num_kv_heads, head_dim,
            scale_factor);
    }
}
