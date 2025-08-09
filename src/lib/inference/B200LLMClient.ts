/**
 * B200 LLM CLIENT - PRODUCTION INFERENCE CLIENT
 * Connects Shadow Board executives to B200-accelerated VLLM inference server
 * Replaces all placeholder implementations with real AI processing
 */

export interface B200InferenceRequest {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repetition_penalty?: number;
  stop_sequences?: string[];
  stream?: boolean;
  executive_role: string;
  request_id?: string;
}

export interface B200InferenceResponse {
  text: string;
  request_id: string;
  executive_role: string;
  tokens_generated: number;
  inference_time_ms: number;
  tokens_per_second: number;
  gpu_utilization: Record<string, number>;
  memory_usage_gb: number;
}

export interface B200ModelInfo {
  id: string;
  config: {
    tensor_parallel_size: number;
    quantization: string;
    max_model_len: number;
    gpu_memory_utilization: number;
  };
  gpu_allocation: number[];
  status: string;
}

export interface B200InferenceStats {
  request_stats: Record<string, {
    total_requests: number;
    total_tokens: number;
    avg_latency_ms: number;
    avg_tokens_per_second: number;
  }>;
  active_requests: number;
  models_loaded: number;
  gpu_allocations: Record<string, number[]>;
}

export class B200LLMClient {
  private vllmServerUrl: string;
  private isConnected: boolean = false;
  private connectionRetries: number = 0;
  private maxRetries: number = 5;
  private retryDelay: number = 2000; // 2 seconds

  constructor(vllmServerUrl: string = 'http://localhost:8001') {
    this.vllmServerUrl = vllmServerUrl;
  }

  /**
   * Initialize connection to VLLM server
   */
  public async initialize(): Promise<void> {
    console.log('🚀 Initializing B200 LLM Client...');
    
    try {
      await this.waitForServer();
      await this.validateModels();
      
      this.isConnected = true;
      console.log('✅ B200 LLM Client connected to VLLM server');
      
    } catch (error) {
      console.error('❌ Failed to initialize B200 LLM Client:', error);
      throw error;
    }
  }

  /**
   * Generate text completion using B200-accelerated inference
   */
  public async generateCompletion(request: B200InferenceRequest): Promise<B200InferenceResponse> {
    if (!this.isConnected) {
      throw new Error('B200 LLM Client not connected');
    }

    const startTime = Date.now();
    
    try {
      console.log(`🧠 Generating completion for ${request.executive_role}...`);
      
      const response = await fetch(`${this.vllmServerUrl}/v1/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.prompt,
          max_tokens: request.max_tokens || 1024,
          temperature: request.temperature || 0.7,
          top_p: request.top_p || 0.9,
          top_k: request.top_k || 50,
          repetition_penalty: request.repetition_penalty || 1.1,
          stop_sequences: request.stop_sequences || [],
          stream: request.stream || false,
          executive_role: request.executive_role,
          request_id: request.request_id
        })
      });

      if (!response.ok) {
        throw new Error(`VLLM server error: ${response.status} ${response.statusText}`);
      }

      const result: B200InferenceResponse = await response.json();
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ ${request.executive_role} completion: ${result.tokens_generated} tokens in ${totalTime}ms (${result.tokens_per_second.toFixed(1)} tok/s)`);
      
      return result;

    } catch (error) {
      console.error(`❌ Inference failed for ${request.executive_role}:`, error);
      throw error;
    }
  }

  /**
   * Generate financial analysis using CFO-optimized prompts
   */
  public async generateFinancialAnalysis(
    analysisType: 'investment' | 'risk' | 'valuation' | 'cash_flow',
    data: any,
    context?: string
  ): Promise<string> {
    const prompt = this.buildFinancialAnalysisPrompt(analysisType, data, context);
    
    const request: B200InferenceRequest = {
      prompt,
      max_tokens: 2048,
      temperature: 0.3, // Lower temperature for financial analysis
      executive_role: 'CFO',
      request_id: `cfo_${analysisType}_${Date.now()}`
    };

    const response = await this.generateCompletion(request);
    return response.text;
  }

  /**
   * Generate marketing strategy using CMO-optimized prompts
   */
  public async generateMarketingStrategy(
    strategyType: 'campaign' | 'positioning' | 'competitive' | 'growth',
    data: any,
    context?: string
  ): Promise<string> {
    const prompt = this.buildMarketingStrategyPrompt(strategyType, data, context);
    
    const request: B200InferenceRequest = {
      prompt,
      max_tokens: 2048,
      temperature: 0.6, // Moderate temperature for creative marketing
      executive_role: 'CMO',
      request_id: `cmo_${strategyType}_${Date.now()}`
    };

    const response = await this.generateCompletion(request);
    return response.text;
  }

  /**
   * Generate response using B200-accelerated LLM inference
   * Universal method for all LLM generation needs
   */
  public async generateResponse(
    prompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      topK?: number;
      repetitionPenalty?: number;
      stopSequences?: string[];
      executiveRole?: string;
    } = {}
  ): Promise<string> {
    const {
      maxTokens = 1024,
      temperature = 0.7,
      topP = 0.9,
      topK = 50,
      repetitionPenalty = 1.1,
      stopSequences = [],
      executiveRole = 'SOVREN-AI'
    } = options;

    const request: B200InferenceRequest = {
      prompt,
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      top_k: topK,
      repetition_penalty: repetitionPenalty,
      stop_sequences: stopSequences,
      executive_role: executiveRole,
      request_id: `${executiveRole.toLowerCase()}_${Date.now()}`
    };

    const response = await this.generateCompletion(request);
    return response.text;
  }

  /**
   * Generate strategic analysis using SOVREN-AI optimized prompts
   */
  public async generateStrategicAnalysis(
    analysisType: 'strategic' | 'operational' | 'financial' | 'market' | 'competitive' | 'comprehensive' | 'coordination',
    data: any,
    context?: string
  ): Promise<string> {
    const prompt = this.buildStrategicAnalysisPrompt(analysisType, data, context);

    try {
      const response = await this.generateResponse(prompt, {
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        executiveRole: 'SOVREN-AI'
      });

      return response;
    } catch (error) {
      console.error('Strategic analysis generation failed:', error);
      throw new Error('Failed to generate strategic analysis');
    }
  }

  /**
   * Generate technical analysis using CTO-optimized prompts
   */
  public async generateTechnicalAnalysis(
    analysisType: 'architecture' | 'security' | 'performance' | 'scalability',
    data: any,
    context?: string
  ): Promise<string> {
    const prompt = this.buildTechnicalAnalysisPrompt(analysisType, data, context);
    
    const request: B200InferenceRequest = {
      prompt,
      max_tokens: 2048,
      temperature: 0.2, // Low temperature for technical precision
      executive_role: 'CTO',
      request_id: `cto_${analysisType}_${Date.now()}`
    };

    const response = await this.generateCompletion(request);
    return response.text;
  }

  /**
   * Generate legal analysis using Legal-optimized prompts
   */
  public async generateLegalAnalysis(
    analysisType: 'contract' | 'compliance' | 'risk' | 'ip',
    data: any,
    context?: string
  ): Promise<string> {
    const prompt = this.buildLegalAnalysisPrompt(analysisType, data, context);
    
    const request: B200InferenceRequest = {
      prompt,
      max_tokens: 2048,
      temperature: 0.1, // Very low temperature for legal precision
      executive_role: 'Legal',
      request_id: `legal_${analysisType}_${Date.now()}`
    };

    const response = await this.generateCompletion(request);
    return response.text;
  }

  /**
   * Get available models from VLLM server
   */
  public async getAvailableModels(): Promise<B200ModelInfo[]> {
    try {
      const response = await fetch(`${this.vllmServerUrl}/v1/models`);
      if (!response.ok) {
        throw new Error(`Failed to get models: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.models;
      
    } catch (error) {
      console.error('Failed to get available models:', error);
      throw error;
    }
  }

  /**
   * Get inference statistics
   */
  public async getInferenceStats(): Promise<B200InferenceStats> {
    try {
      const response = await fetch(`${this.vllmServerUrl}/v1/stats`);
      if (!response.ok) {
        throw new Error(`Failed to get stats: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Failed to get inference stats:', error);
      throw error;
    }
  }

  /**
   * Wait for VLLM server to be ready
   */
  private async waitForServer(): Promise<void> {
    while (this.connectionRetries < this.maxRetries) {
      try {
        const response = await fetch(`${this.vllmServerUrl}/health`);
        if (response.ok) {
          const health = await response.json();
          if (health.status === 'healthy') {
            console.log('✅ VLLM server is healthy');
            return;
          }
        }
      } catch (error) {
        // Server not ready yet
      }

      this.connectionRetries++;
      console.log(`⏳ Waiting for VLLM server... (attempt ${this.connectionRetries}/${this.maxRetries})`);
      
      if (this.connectionRetries >= this.maxRetries) {
        throw new Error('VLLM server not available after maximum retries');
      }
      
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
    }
  }

  /**
   * Validate that required models are loaded
   */
  private async validateModels(): Promise<void> {
    const models = await this.getAvailableModels();
    const loadedModels = models.filter(m => m.status === 'loaded');
    
    if (loadedModels.length === 0) {
      throw new Error('No models loaded on VLLM server');
    }
    
    console.log(`📊 Available models: ${loadedModels.map(m => m.id).join(', ')}`);
  }

  private buildFinancialAnalysisPrompt(type: string, data: any, context?: string): string {
    const basePrompt = `You are a PhD-level Chief Financial Officer with expertise in financial modeling, investment analysis, and risk assessment. `;
    
    switch (type) {
      case 'investment':
        return `${basePrompt}Analyze this investment opportunity and provide detailed financial analysis:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nProvide analysis including NPV, IRR, risk assessment, and recommendation:`;
      
      case 'risk':
        return `${basePrompt}Conduct comprehensive risk assessment for:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nAnalyze financial risks, market risks, operational risks, and mitigation strategies:`;
      
      case 'valuation':
        return `${basePrompt}Perform detailed valuation analysis for:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nUse DCF, comparable company analysis, and precedent transactions:`;
      
      case 'cash_flow':
        return `${basePrompt}Analyze cash flow patterns and projections:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nProvide cash flow analysis, working capital requirements, and liquidity assessment:`;
      
      default:
        return `${basePrompt}Provide financial analysis for:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}`;
    }
  }

  /**
   * Build strategic analysis prompt for SOVREN-AI
   */
  private buildStrategicAnalysisPrompt(
    analysisType: string,
    data: any,
    context?: string
  ): string {
    const basePrompt = `You are SOVREN-AI, a 405B parameter strategic analysis AI with comprehensive business intelligence capabilities. `;

    const analysisPrompts = {
      strategic: 'Provide strategic analysis focusing on long-term implications, competitive positioning, and market opportunities.',
      operational: 'Analyze operational efficiency, process optimization, and resource allocation strategies.',
      financial: 'Examine financial performance, risk factors, and investment opportunities with quantitative insights.',
      market: 'Assess market conditions, trends, competitive landscape, and growth opportunities.',
      competitive: 'Evaluate competitive threats, advantages, and strategic responses with actionable recommendations.',
      comprehensive: 'Provide holistic analysis covering strategic, operational, financial, and market factors.',
      coordination: 'Develop executive coordination strategy with clear roles, timelines, and expected outcomes.'
    };

    const specificPrompt = analysisPrompts[analysisType as keyof typeof analysisPrompts] ?? 'Provide detailed strategic analysis.';
    const contextPrompt = context ? `\n\nContext: ${context}` : '';
    const dataPrompt = `\n\nData to analyze: ${JSON.stringify(data, null, 2)}`;

    return `${basePrompt}${specificPrompt}${contextPrompt}${dataPrompt}\n\nProvide actionable insights, recommendations, and confidence levels.`;
  }

  private buildMarketingStrategyPrompt(type: string, data: any, context?: string): string {
    const basePrompt = `You are a PhD-level Chief Marketing Officer with expertise in brand strategy, growth hacking, and competitive intelligence. `;
    
    switch (type) {
      case 'campaign':
        return `${basePrompt}Develop comprehensive marketing campaign strategy:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nInclude target audience, messaging, channels, budget allocation, and success metrics:`;
      
      case 'positioning':
        return `${basePrompt}Create market positioning strategy:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nAnalyze competitive landscape, unique value proposition, and positioning framework:`;
      
      case 'competitive':
        return `${basePrompt}Conduct competitive intelligence analysis:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nAnalyze competitor strategies, market share, strengths/weaknesses, and counter-strategies:`;
      
      case 'growth':
        return `${basePrompt}Develop growth strategy and tactics:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nInclude growth channels, viral mechanisms, customer acquisition, and retention strategies:`;
      
      default:
        return `${basePrompt}Provide marketing strategy for:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}`;
    }
  }

  private buildTechnicalAnalysisPrompt(type: string, data: any, context?: string): string {
    const basePrompt = `You are a PhD-level Chief Technology Officer with expertise in system architecture, security, and scalable technology solutions. `;
    
    switch (type) {
      case 'architecture':
        return `${basePrompt}Design system architecture for:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nProvide detailed architecture, technology stack, scalability considerations, and implementation plan:`;
      
      case 'security':
        return `${basePrompt}Conduct security analysis and recommendations:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nAnalyze security vulnerabilities, threat models, and comprehensive security strategy:`;
      
      case 'performance':
        return `${basePrompt}Analyze performance optimization opportunities:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nProvide performance analysis, bottlenecks, optimization strategies, and benchmarks:`;
      
      case 'scalability':
        return `${basePrompt}Design scalability strategy:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nAnalyze scalability requirements, infrastructure needs, and scaling architecture:`;
      
      default:
        return `${basePrompt}Provide technical analysis for:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}`;
    }
  }

  private buildLegalAnalysisPrompt(type: string, data: any, context?: string): string {
    const basePrompt = `You are a PhD-level General Counsel with expertise in corporate law, contract analysis, and regulatory compliance. `;
    
    switch (type) {
      case 'contract':
        return `${basePrompt}Analyze contract terms and risks:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nProvide detailed contract analysis, risk assessment, and recommended modifications:`;
      
      case 'compliance':
        return `${basePrompt}Conduct regulatory compliance analysis:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nAnalyze compliance requirements, gaps, and implementation strategy:`;
      
      case 'risk':
        return `${basePrompt}Assess legal risks and mitigation strategies:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nProvide comprehensive legal risk analysis and mitigation recommendations:`;
      
      case 'ip':
        return `${basePrompt}Analyze intellectual property strategy:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}\n\nProvide IP analysis, protection strategy, and enforcement recommendations:`;
      
      default:
        return `${basePrompt}Provide legal analysis for:\n\n${JSON.stringify(data, null, 2)}\n\nContext: ${context || 'None'}`;
    }
  }
}

// Global B200 LLM Client instance
export const b200LLMClient = new B200LLMClient();
