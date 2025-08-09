/**
 * B200 BLACKWELL RESOURCE MANAGER
 * Comprehensive resource allocation and monitoring for 8x NVIDIA B200 GPUs
 * Optimized for FP8 precision, 1.47TB total VRAM, and 8TB/s memory bandwidth
 */

export interface B200GPUMetrics {
  gpu_id: number;
  memory_used_gb: number;
  memory_total_gb: number; // 183GB per B200
  memory_free_gb: number;
  utilization_percent: number;
  temperature_celsius: number;
  power_draw_watts: number; // Up to 1000W per B200
  fp8_tensor_core_utilization: number; // 0-100%
  shared_memory_utilization: number; // 0-100% of 227KB per SM
  nvlink_bandwidth_utilization: number; // 0-100% of 8TB/s
  streaming_multiprocessors: number; // 208 for B200
  active_processes: string[];
}

export interface B200SystemMetrics {
  total_gpus: number; // 8
  total_memory_gb: number; // 1,466GB (8 * 183GB)
  total_power_draw_watts: number; // Up to 8000W
  total_fp8_tensor_cores: number; // 6,656 (8 * 832)
  nvlink_fabric_utilization: number; // 0-100%
  system_temperature_avg: number;
  memory_bandwidth_total_tbs: number; // 64TB/s (8 * 8TB/s)
  active_allocations: number;
  resource_efficiency: number; // 0-100%
}

export interface B200AllocationRequest {
  component_name: string;
  model_type: 'llm_405b' | 'llm_70b' | 'voice_synthesis' | 'embedding';
  quantization: 'fp8' | 'fp16' | 'int8';
  estimated_vram_gb: number;
  required_gpus: number;
  tensor_parallel: boolean;
  context_length: number;
  batch_size: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  max_latency_ms: number;
  power_budget_watts: number;
}

export interface B200Allocation {
  allocation_id: string;
  component_name: string;
  gpu_ids: number[];
  memory_allocated_gb: number;
  fp8_tensor_cores_allocated: number;
  shared_memory_allocated_mb: number;
  nvlink_bandwidth_allocated_tbs: number;
  power_allocated_watts: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  created_at: Date;
  estimated_completion: Date;
  actual_performance: {
    latency_ms: number;
    throughput_tokens_per_second: number;
    memory_efficiency: number;
    power_efficiency: number;
  };
}

export class B200ResourceManager {
  private mcpServerUrl: string;
  private allocations: Map<string, B200Allocation> = new Map();
  private gpuMetrics: Map<number, B200GPUMetrics> = new Map();
  private systemMetrics: B200SystemMetrics;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(mcpServerUrl: string = 'http://localhost:8000') {
    this.mcpServerUrl = mcpServerUrl;
    this.systemMetrics = this.initializeSystemMetrics();
  }

  private initializeSystemMetrics(): B200SystemMetrics {
    return {
      total_gpus: 8,
      total_memory_gb: 8 * 183, // 1,464GB
      total_power_draw_watts: 0,
      total_fp8_tensor_cores: 8 * 832, // 6,656 total
      nvlink_fabric_utilization: 0,
      system_temperature_avg: 0,
      memory_bandwidth_total_tbs: 8 * 8, // 64TB/s
      active_allocations: 0,
      resource_efficiency: 0
    };
  }

  /**
   * Initialize B200 resource monitoring
   */
  public async initialize(): Promise<void> {
    // Skip B200 initialization during build
    if (process.env.NEXT_PHASE === 'build' || process.env.DISABLE_GPU_INIT === 'true') {
      console.log('⚠️ B200 Resource Manager disabled during build');
      return;
    }

    console.log('🚀 Initializing B200 Blackwell Resource Manager...');

    try {
      // Test MCP Server connection
      const response = await fetch(`${this.mcpServerUrl}/health`);
      if (!response.ok) {
        throw new Error('MCP Server not available');
      }

      // Initialize GPU metrics
      for (let gpuId = 0; gpuId < 8; gpuId++) {
        this.gpuMetrics.set(gpuId, await this.getGPUMetrics(gpuId));
      }

      // Start monitoring
      this.startMonitoring();

      console.log('✅ B200 Resource Manager initialized successfully');
      console.log(`📊 Total Resources: ${this.systemMetrics.total_memory_gb}GB VRAM, ${this.systemMetrics.total_fp8_tensor_cores} FP8 Tensor Cores`);

    } catch (error) {
      console.error('❌ Failed to initialize B200 Resource Manager:', error);
      throw error;
    }
  }

  /**
   * Allocate B200 resources for a component
   */
  public async allocateResources(request: B200AllocationRequest): Promise<B200Allocation> {
    console.log(`🎯 Allocating B200 resources for ${request.component_name}`);
    
    // Validate request
    this.validateAllocationRequest(request);
    
    // Find optimal GPU allocation
    const optimalGPUs = await this.findOptimalGPUAllocation(request);
    
    // Create allocation
    const allocation: B200Allocation = {
      allocation_id: `b200_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      component_name: request.component_name,
      gpu_ids: optimalGPUs,
      memory_allocated_gb: request.estimated_vram_gb,
      fp8_tensor_cores_allocated: this.calculateTensorCoreAllocation(request),
      shared_memory_allocated_mb: this.calculateSharedMemoryAllocation(request),
      nvlink_bandwidth_allocated_tbs: this.calculateNVLinkAllocation(request),
      power_allocated_watts: request.power_budget_watts,
      status: 'pending',
      created_at: new Date(),
      estimated_completion: new Date(Date.now() + 60000), // 1 minute estimate
      actual_performance: {
        latency_ms: 0,
        throughput_tokens_per_second: 0,
        memory_efficiency: 0,
        power_efficiency: 0
      }
    };

    // Send allocation request to MCP Server
    try {
      const mcpResponse = await fetch(`${this.mcpServerUrl}/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component: request.component_name,
          gpu_ids: optimalGPUs,
          memory_gb: request.estimated_vram_gb,
          priority: request.priority,
          model_type: request.model_type,
          quantization: request.quantization,
          context_length: request.context_length,
          batch_size: request.batch_size,
          power_budget_watts: request.power_budget_watts
        })
      });

      if (!mcpResponse.ok) {
        throw new Error(`MCP allocation failed: ${mcpResponse.statusText}`);
      }

      allocation.status = 'active';
      this.allocations.set(allocation.allocation_id, allocation);
      this.systemMetrics.active_allocations++;

      console.log(`✅ B200 resources allocated: ${allocation.allocation_id}`);
      console.log(`📊 GPUs: ${optimalGPUs.join(',')}, VRAM: ${request.estimated_vram_gb}GB, Power: ${request.power_budget_watts}W`);

      return allocation;

    } catch (error) {
      allocation.status = 'failed';
      console.error(`❌ Failed to allocate B200 resources:`, error);
      throw error;
    }
  }

  /**
   * Get current system metrics
   */
  public getSystemMetrics(): B200SystemMetrics {
    return { ...this.systemMetrics };
  }

  /**
   * Get GPU metrics for specific GPU
   */
  public async getGPUMetrics(gpuId: number): Promise<B200GPUMetrics> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/gpu/${gpuId}/status`);
      if (!response.ok) {
        throw new Error(`Failed to get GPU ${gpuId} metrics`);
      }
      
      const data = await response.json();
      
      return {
        gpu_id: gpuId,
        memory_used_gb: data.memory_used / 1024, // Convert MB to GB
        memory_total_gb: 183, // B200 has 183GB
        memory_free_gb: (data.memory_total - data.memory_used) / 1024,
        utilization_percent: data.utilization,
        temperature_celsius: data.temperature,
        power_draw_watts: data.power_draw,
        fp8_tensor_core_utilization: data.fp8_utilization || 0,
        shared_memory_utilization: data.shared_memory_utilization || 0,
        nvlink_bandwidth_utilization: data.nvlink_utilization || 0,
        streaming_multiprocessors: 208, // B200 has 208 SMs
        active_processes: data.processes?.map((p: any) => p.name) || []
      };
      
    } catch (error) {
      console.error(`Failed to get GPU ${gpuId} metrics:`, error);
      // Return default metrics
      return {
        gpu_id: gpuId,
        memory_used_gb: 0,
        memory_total_gb: 183,
        memory_free_gb: 183,
        utilization_percent: 0,
        temperature_celsius: 25,
        power_draw_watts: 140,
        fp8_tensor_core_utilization: 0,
        shared_memory_utilization: 0,
        nvlink_bandwidth_utilization: 0,
        streaming_multiprocessors: 208,
        active_processes: []
      };
    }
  }

  private validateAllocationRequest(request: B200AllocationRequest): void {
    if (request.estimated_vram_gb > 183 * request.required_gpus) {
      throw new Error(`Requested VRAM (${request.estimated_vram_gb}GB) exceeds available capacity`);
    }
    
    if (request.power_budget_watts > 1000 * request.required_gpus) {
      throw new Error(`Requested power (${request.power_budget_watts}W) exceeds B200 capacity`);
    }
    
    if (request.required_gpus > 8) {
      throw new Error(`Requested GPUs (${request.required_gpus}) exceeds system capacity (8)`);
    }
  }

  private async findOptimalGPUAllocation(request: B200AllocationRequest): Promise<number[]> {
    const availableGPUs: number[] = [];
    
    // Find GPUs with sufficient free memory
    for (let gpuId = 0; gpuId < 8; gpuId++) {
      const metrics = await this.getGPUMetrics(gpuId);
      if (metrics.memory_free_gb >= request.estimated_vram_gb / request.required_gpus) {
        availableGPUs.push(gpuId);
      }
    }
    
    if (availableGPUs.length < request.required_gpus) {
      throw new Error(`Insufficient GPU resources: need ${request.required_gpus}, available ${availableGPUs.length}`);
    }
    
    // Return the first N available GPUs (could be optimized further)
    const selectedGPUs = availableGPUs.slice(0, request.required_gpus);
    if (selectedGPUs.length < request.required_gpus) {
      throw new Error(`Could not allocate ${request.required_gpus} GPUs`);
    }
    return selectedGPUs;
  }

  private calculateTensorCoreAllocation(request: B200AllocationRequest): number {
    // Each B200 has 832 FP8 Tensor Cores (208 SMs * 4 Tensor Cores)
    const tensorCoresPerGPU = 832;
    return request.required_gpus * tensorCoresPerGPU;
  }

  private calculateSharedMemoryAllocation(request: B200AllocationRequest): number {
    // Each B200 SM has 227KB shared memory
    const sharedMemoryPerSM = 227; // KB
    const smsPerGPU = 208;
    return request.required_gpus * smsPerGPU * sharedMemoryPerSM / 1024; // Convert to MB
  }

  private calculateNVLinkAllocation(request: B200AllocationRequest): number {
    // Each B200 has 8TB/s memory bandwidth
    const bandwidthPerGPU = 8; // TB/s
    return request.required_gpus * bandwidthPerGPU;
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.updateSystemMetrics();
    }, 5000); // Update every 5 seconds
  }

  private async updateSystemMetrics(): Promise<void> {
    try {
      let totalPowerDraw = 0;
      let totalTemperature = 0;
      let totalUtilization = 0;

      for (let gpuId = 0; gpuId < 8; gpuId++) {
        const metrics = await this.getGPUMetrics(gpuId);
        this.gpuMetrics.set(gpuId, metrics);
        
        totalPowerDraw += metrics.power_draw_watts;
        totalTemperature += metrics.temperature_celsius;
        totalUtilization += metrics.utilization_percent;
      }

      this.systemMetrics.total_power_draw_watts = totalPowerDraw;
      this.systemMetrics.system_temperature_avg = totalTemperature / 8;
      this.systemMetrics.resource_efficiency = totalUtilization / 8;

    } catch (error) {
      console.error('Failed to update system metrics:', error);
    }
  }

  /**
   * Deallocate B200 resources
   */
  public async deallocateResources(allocationId: string): Promise<void> {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) {
      throw new Error(`Allocation not found: ${allocationId}`);
    }

    try {
      // Send deallocation request to MCP Server
      const response = await fetch(`${this.mcpServerUrl}/deallocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocation_id: allocationId })
      });

      if (!response.ok) {
        throw new Error(`MCP deallocation failed: ${response.statusText}`);
      }

      allocation.status = 'completed';
      this.allocations.delete(allocationId);
      this.systemMetrics.active_allocations--;

      console.log(`✅ B200 resources deallocated: ${allocationId}`);

    } catch (error) {
      console.error(`❌ Failed to deallocate B200 resources:`, error);
      throw error;
    }
  }

  /**
   * Get resource status
   */
  public async getResourceStatus(): Promise<any> {
    return {
      total_gpus: this.systemMetrics.total_gpus,
      available_gpus: 8 - this.systemMetrics.active_allocations,
      total_memory_gb: this.systemMetrics.total_memory_gb,
      used_memory_gb: Array.from(this.gpuMetrics.values())
        .reduce((sum, gpu) => sum + gpu.memory_used_gb, 0),
      total_power_budget_watts: 8000,
      current_power_watts: this.systemMetrics.total_power_draw_watts
    };
  }

  /**
   * Get current metrics
   */
  public async getCurrentMetrics(): Promise<any> {
    const totalUtilization = Array.from(this.gpuMetrics.values())
      .reduce((sum, gpu) => sum + gpu.utilization_percent, 0) / 8;

    const totalMemoryUsed = Array.from(this.gpuMetrics.values())
      .reduce((sum, gpu) => sum + gpu.memory_used_gb, 0);

    return {
      gpu_utilization: totalUtilization,
      memory_usage_gb: totalMemoryUsed,
      power_consumption_watts: this.systemMetrics.total_power_draw_watts,
      tensor_core_utilization: Array.from(this.gpuMetrics.values())
        .reduce((sum, gpu) => sum + gpu.fp8_tensor_core_utilization, 0) / 8,
      fp8_utilization: Array.from(this.gpuMetrics.values())
        .reduce((sum, gpu) => sum + gpu.fp8_tensor_core_utilization, 0) / 8,
      average_latency_ms: 150 // Placeholder - would be calculated from actual requests
    };
  }

  /**
   * Get active allocations
   */
  public async getActiveAllocations(): Promise<B200Allocation[]> {
    return Array.from(this.allocations.values());
  }

  /**
   * Expand cluster by adding GPUs (for auto-scaling)
   */
  public async expandCluster(additionalGPUs: number): Promise<void> {
    console.log(`📈 Expanding cluster by ${additionalGPUs} GPUs`);

    // Update system metrics
    this.systemMetrics.total_gpus += additionalGPUs;
    this.systemMetrics.total_memory_gb += additionalGPUs * 183;
    this.systemMetrics.total_fp8_tensor_cores += additionalGPUs * 832;
    this.systemMetrics.memory_bandwidth_total_tbs += additionalGPUs * 8;

    // Initialize new GPU metrics
    for (let i = 0; i < additionalGPUs; i++) {
      const newGpuId = this.systemMetrics.total_gpus - additionalGPUs + i;
      this.gpuMetrics.set(newGpuId, {
        gpu_id: newGpuId,
        memory_used_gb: 0,
        memory_total_gb: 183,
        memory_free_gb: 183,
        utilization_percent: 0,
        temperature_celsius: 25,
        power_draw_watts: 140,
        fp8_tensor_core_utilization: 0,
        shared_memory_utilization: 0,
        nvlink_bandwidth_utilization: 0,
        streaming_multiprocessors: 208,
        active_processes: []
      });
    }

    console.log(`✅ Cluster expanded to ${this.systemMetrics.total_gpus} GPUs`);
  }

  /**
   * Shrink cluster by removing GPUs (for auto-scaling)
   */
  public async shrinkCluster(gpusToRemove: number): Promise<void> {
    console.log(`📉 Shrinking cluster by ${gpusToRemove} GPUs`);

    if (gpusToRemove >= this.systemMetrics.total_gpus) {
      throw new Error('Cannot remove all GPUs from cluster');
    }

    // Remove GPUs from the end
    for (let i = 0; i < gpusToRemove; i++) {
      const gpuId = this.systemMetrics.total_gpus - 1 - i;
      this.gpuMetrics.delete(gpuId);
    }

    // Update system metrics
    this.systemMetrics.total_gpus -= gpusToRemove;
    this.systemMetrics.total_memory_gb -= gpusToRemove * 183;
    this.systemMetrics.total_fp8_tensor_cores -= gpusToRemove * 832;
    this.systemMetrics.memory_bandwidth_total_tbs -= gpusToRemove * 8;

    console.log(`✅ Cluster shrunk to ${this.systemMetrics.total_gpus} GPUs`);
  }

  /**
   * Migrate allocation to different GPUs (for auto-scaling)
   */
  public async migrateAllocation(allocationId: string, excludeGPUs: number[]): Promise<void> {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) {
      throw new Error(`Allocation not found: ${allocationId}`);
    }

    console.log(`🔄 Migrating allocation ${allocationId}`);

    // Find new GPUs (simplified - would be more complex in production)
    const newGPUs: any[] = [];
    const requiredGPUs = allocation.gpu_ids.length; // Use current GPU count
    for (let gpuId = 0; gpuId < this.systemMetrics.total_gpus; gpuId++) {
      if (!excludeGPUs.includes(gpuId) && newGPUs.length < requiredGPUs) {
        newGPUs.push(gpuId);
      }
    }

    if (newGPUs.length < requiredGPUs) {
      throw new Error(`Insufficient GPUs for migration`);
    }

    // Update allocation
    allocation.gpu_ids = newGPUs;
    console.log(`✅ Allocation ${allocationId} migrated to GPUs: ${newGPUs.join(', ')}`);
  }

  public async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🔄 B200 Resource Manager shutdown complete');
  }
}
