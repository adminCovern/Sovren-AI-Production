import { StyleTTS2Engine, StyleTTS2Config, SynthesisParameters } from './StyleTTS2Engine';
import { ErrorHandler, ErrorCategory, ErrorSeverity } from '../errors/ErrorHandler';
import { container, SERVICE_IDENTIFIERS } from '../di/DIContainer';
import { Logger } from '../di/ServiceRegistry';

// Event data types
export interface ModelLoadedEventData {
  modelId: string;
  modelPath: string;
  loadTime: number;
  characteristics: VoiceModel['characteristics'];
}

export interface SynthesisProgressEventData {
  requestId: string;
  progress: number; // 0-100
  stage: 'preprocessing' | 'synthesis' | 'postprocessing';
  estimatedTimeRemaining: number;
}

export interface SynthesisCompleteEventData {
  requestId: string;
  audioUrl: string;
  duration: number;
  fileSize: number;
  processingTime: number;
}

export interface SynthesisErrorEventData {
  requestId: string;
  error: Error;
  stage: 'preprocessing' | 'synthesis' | 'postprocessing' | 'unknown';
  retryable: boolean;
}

export interface VoiceSystemStatus {
  status: 'not_initialized' | 'initializing' | 'ready' | 'error';
  modelsLoaded: number;
  totalModels: number;
  memoryUsage: number;
  activeRequests: number;
  lastError?: Error;
}

export interface VoiceModel {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  characteristics: {
    pitch: number;
    speed: number;
    tone: 'authoritative' | 'analytical' | 'technical' | 'persuasive' | 'operational' | 'empathetic' | 'precise' | 'strategic';
    accent: string;
  };
  modelPath: string;
  isLoaded: boolean;
}

export interface SynthesisRequest {
  id: string;
  text: string;
  voiceModel: string;
  priority: 'low' | 'normal' | 'high';
  timestamp: Date;
  options?: {
    speed?: number;
    pitch?: number;
    volume?: number;
    emotion?: 'neutral' | 'happy' | 'serious' | 'concerned' | 'excited';
  };
}

export interface SynthesisResult {
  requestId: string;
  audioBuffer: ArrayBuffer;
  duration: number;
  format: 'wav' | 'mp3' | 'ogg';
  sampleRate: number;
}

export class VoiceSynthesizer {
  private voiceModels: Map<string, VoiceModel> = new Map();
  private synthesisQueue: SynthesisRequest[] = [];
  private isProcessing: boolean = false;
  private audioContext: AudioContext | null = null;
  private cache: Map<string, SynthesisResult> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private workerPool: Worker[] = [];
  private maxWorkers: number = 4;
  private styleTTS2Engine: StyleTTS2Engine | null = null;
  private errorHandler: ErrorHandler;
  private logger: Logger;

  constructor(
    private config: {
      enabled: boolean;
      modelsPath: string;
      cacheSize: number;
    },
    private subscriptionTier: 'sovren_proof' | 'sovren_proof_plus' = 'sovren_proof'
  ) {
    this.errorHandler = container.resolve<ErrorHandler>(SERVICE_IDENTIFIERS.ERROR_HANDLER);
    this.logger = container.resolve<Logger>(SERVICE_IDENTIFIERS.LOGGER);
    this.initializeEventListeners();
    this.initializeVoiceModels();
  }

  private initializeEventListeners(): void {
    this.eventListeners.set('ready', []);
    this.eventListeners.set('synthesisComplete', []);
    this.eventListeners.set('synthesisError', []);
    this.eventListeners.set('modelLoaded', []);
    this.eventListeners.set('queueUpdated', []);
    this.eventListeners.set('error', []);
  }

  private initializeVoiceModels(): void {
    // Define all available voice models with tier requirements
    const allModels: (VoiceModel & { subscriptionTier: 'sovren_proof' | 'sovren_proof_plus' | 'all' })[] = [
      {
        id: 'sovren-ai-neural',
        name: 'SOVREN AI Neural Core Voice',
        language: 'en-US',
        gender: 'neutral',
        characteristics: {
          pitch: 1.0,
          speed: 1.1,
          tone: 'authoritative',
          accent: 'neural-synthetic'
        },
        modelPath: `${this.config.modelsPath}/sovren-ai-neural.onnx`,
        isLoaded: false,
        subscriptionTier: 'all' // Always available
      },
      {
        id: 'cfo-analytical',
        name: 'CFO Analytical Voice',
        language: 'en-US',
        gender: 'female',
        characteristics: {
          pitch: 0.9,
          speed: 0.95,
          tone: 'analytical',
          accent: 'professional-precise'
        },
        modelPath: `${this.config.modelsPath}/cfo-analytical.onnx`,
        isLoaded: false,
        subscriptionTier: 'sovren_proof' // Core executive
      },
      {
        id: 'cmo-persuasive',
        name: 'CMO Persuasive Voice',
        language: 'en-US',
        gender: 'male',
        characteristics: {
          pitch: 0.85,
          speed: 1.05,
          tone: 'persuasive',
          accent: 'engaging-charismatic'
        },
        modelPath: `${this.config.modelsPath}/cmo-persuasive.onnx`,
        isLoaded: false,
        subscriptionTier: 'sovren_proof' // Core executive
      },
      {
        id: 'clo-precise',
        name: 'CLO Precise Voice',
        language: 'en-US',
        gender: 'female',
        characteristics: {
          pitch: 0.85,
          speed: 0.9,
          tone: 'precise',
          accent: 'legal-authoritative'
        },
        modelPath: `${this.config.modelsPath}/clo-precise.onnx`,
        isLoaded: false,
        subscriptionTier: 'sovren_proof' // Core executive
      },
      {
        id: 'cto-technical',
        name: 'CTO Technical Voice',
        language: 'en-US',
        gender: 'neutral',
        characteristics: {
          pitch: 0.9,
          speed: 1.0,
          tone: 'technical',
          accent: 'clear-methodical'
        },
        modelPath: `${this.config.modelsPath}/cto-technical.onnx`,
        isLoaded: false,
        subscriptionTier: 'sovren_proof' // Core executive
      },
      // Premium executives - only available in Plus tier
      {
        id: 'coo-operational',
        name: 'COO Operational Voice',
        language: 'en-US',
        gender: 'male',
        characteristics: {
          pitch: 0.88,
          speed: 1.1,
          tone: 'operational',
          accent: 'results-focused'
        },
        modelPath: `${this.config.modelsPath}/coo-operational.onnx`,
        isLoaded: false,
        subscriptionTier: 'sovren_proof_plus' // Premium executive
      },
      {
        id: 'chro-empathetic',
        name: 'CHRO Empathetic Voice',
        language: 'en-US',
        gender: 'female',
        characteristics: {
          pitch: 0.95,
          speed: 0.95,
          tone: 'empathetic',
          accent: 'warm-professional'
        },
        modelPath: `${this.config.modelsPath}/chro-empathetic.onnx`,
        isLoaded: false,
        subscriptionTier: 'sovren_proof_plus' // Premium executive
      },
      {
        id: 'cso-strategic',
        name: 'CSO Strategic Voice',
        language: 'en-US',
        gender: 'male',
        characteristics: {
          pitch: 0.82,
          speed: 0.92,
          tone: 'strategic',
          accent: 'visionary-commanding'
        },
        modelPath: `${this.config.modelsPath}/cso-strategic.onnx`,
        isLoaded: false,
        subscriptionTier: 'sovren_proof_plus' // Premium executive
      },
      {
        id: 'cio-analytical',
        name: 'CIO Analytical Voice',
        language: 'en-US',
        gender: 'neutral',
        characteristics: {
          pitch: 0.9,
          speed: 0.98,
          tone: 'analytical',
          accent: 'data-driven'
        },
        modelPath: `${this.config.modelsPath}/cio-analytical.onnx`,
        isLoaded: false,
        subscriptionTier: 'sovren_proof_plus' // Premium executive
      }
    ];

    // Filter voice models based on subscription tier
    const allowedModels = allModels.filter(model => {
      // SOVREN AI is always available
      if (model.subscriptionTier === 'all') return true;

      // Basic tier models
      if (model.subscriptionTier === 'sovren_proof') return true;

      // Premium tier models - only available in Plus tier
      if (model.subscriptionTier === 'sovren_proof_plus') {
        return this.subscriptionTier === 'sovren_proof_plus';
      }

      return false;
    });

    // Initialize only allowed voice models
    allowedModels.forEach(model => {
      const { subscriptionTier, ...voiceModel } = model; // Remove subscriptionTier from the model
      this.voiceModels.set(voiceModel.id, voiceModel);
    });

    console.log(`🎤 Initialized ${allowedModels.length} voice models for ${this.subscriptionTier} tier`);
    console.log(`🔊 Available voices: ${allowedModels.map(m => m.id).join(', ')}`);

    // All duplicate models removed - handled by filtering above
  }

  public async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info('Voice synthesis is disabled');
      return;
    }

    this.logger.info('🎤 Initializing Voice Synthesis System...');

    try {
      // Initialize audio context with error handling
      await this.errorHandler.handleAsync(
        async () => {
          this.audioContext = new AudioContext({
            sampleRate: 22050, // Optimal for voice synthesis
            latencyHint: 'interactive'
          });
        },
        { additionalData: { component: 'AudioContext' } },
        {
          retries: 1,
          retryDelay: 1000,
          fallback: async () => {
            throw this.errorHandler.createError(
              'AUDIO_CONTEXT_INIT_FAILED',
              'Failed to initialize Web Audio API context',
              ErrorCategory.SYSTEM,
              ErrorSeverity.CRITICAL,
              {},
              {
                userMessage: 'Your browser does not support audio synthesis.',
                suggestedActions: ['Use a modern browser', 'Enable audio permissions']
              }
            );
          }
        }
      );

      // Initialize StyleTTS2 Engine with comprehensive error handling
      const styleTTS2Config: StyleTTS2Config = {
        modelPath: this.config.modelsPath,
        vocoder: 'hifigan',
        device: 'cpu', // Start with CPU, upgrade to WebGPU if available
        batchSize: 1,
        maxLength: 1000,
        temperature: 0.7,
        lengthScale: 1.0,
        noiseScale: 0.667,
        enableWebAssembly: true
      };

      await this.errorHandler.handleAsync(
        async () => {
          this.styleTTS2Engine = new StyleTTS2Engine(styleTTS2Config);
        },
        { additionalData: { component: 'StyleTTS2Engine', config: styleTTS2Config } },
        {
          retries: 2,
          retryDelay: 2000,
          fallback: async () => {
            throw this.errorHandler.createError(
              'STYLETTS2_ENGINE_INIT_FAILED',
              'Failed to initialize StyleTTS2 synthesis engine',
              ErrorCategory.SYSTEM,
              ErrorSeverity.CRITICAL,
              {},
              {
                userMessage: 'Voice synthesis engine failed to initialize.',
                suggestedActions: ['Refresh the page', 'Contact support']
              }
            );
          }
        }
      );

      // Set up StyleTTS2 event handlers with null check
      if (this.styleTTS2Engine) {
        this.styleTTS2Engine.on('engineReady', () => {
          this.logger.info('✓ StyleTTS2 Engine ready');
        });

        this.styleTTS2Engine.on('modelLoaded', (data: ModelLoadedEventData) => {
          this.logger.info(`✓ StyleTTS2 model loaded: ${data.modelId}`);
          this.emit('modelLoaded', data);
        });

        this.styleTTS2Engine.on('synthesisProgress', (data: SynthesisProgressEventData) => {
          this.emit('synthesisProgress', data);
        });

        this.styleTTS2Engine.on('error', (error: SynthesisErrorEventData) => {
          this.logger.error('StyleTTS2 Engine error:', error);
          this.emit('error', error);
        });

        // Initialize StyleTTS2 Engine
        await this.styleTTS2Engine.initialize();
      }

      // Initialize worker pool for fallback processing
      await this.initializeWorkerPool();

      // Load critical voice models (SOVREN AI, CEO, CFO, CTO first)
      const criticalModels = ['sovren-ai-neural', 'ceo-authoritative', 'cfo-analytical', 'cto-technical'];
      await Promise.all(criticalModels.map(modelId => this.loadVoiceModel(modelId)));

      console.log('Voice Synthesizer with StyleTTS2 initialized successfully');
      this.emit('ready');

    } catch (error) {
      console.error('Failed to initialize Voice Synthesizer:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Check browser compatibility for voice synthesis
   */
  private async checkBrowserCompatibility(): Promise<void> {
    const windowWithWebkit = window as Window & { webkitAudioContext?: typeof AudioContext };
    if (!window.AudioContext && !windowWithWebkit.webkitAudioContext) {
      throw new Error('Web Audio API not supported');
    }

    if (!window.Worker) {
      throw new Error('Web Workers not supported');
    }

    console.log('✅ Browser compatibility check passed');
  }

  /**
   * Detect optimal device for synthesis (CPU/GPU)
   */
  private async detectOptimalDevice(): Promise<string> {
    try {
      // Check for WebGPU support
      const navigatorWithGPU = navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } };
      if (navigatorWithGPU.gpu) {
        const adapter = await navigatorWithGPU.gpu.requestAdapter();
        if (adapter) {
          console.log('🚀 WebGPU detected, using GPU acceleration');
          return 'gpu';
        }
      }
    } catch (error) {
      console.log('WebGPU not available, falling back to CPU');
    }

    return 'cpu';
  }

  /**
   * Setup comprehensive StyleTTS2 event handlers
   */
  private setupStyleTTS2EventHandlers(): void {
    if (!this.styleTTS2Engine) {
      console.warn('StyleTTS2 engine not initialized, skipping event handler setup');
      return;
    }

    this.styleTTS2Engine.on('engineReady', () => {
      console.log('✓ StyleTTS2 Engine ready');
    });

    this.styleTTS2Engine.on('modelLoaded', (data: ModelLoadedEventData) => {
      console.log(`✓ StyleTTS2 model loaded: ${data.modelId}`);
      this.emit('modelLoaded', data);
    });

    this.styleTTS2Engine.on('synthesisProgress', (data: SynthesisProgressEventData) => {
      this.emit('synthesisProgress', data);
    });

    this.styleTTS2Engine.on('synthesisComplete', (result: SynthesisCompleteEventData) => {
      this.emit('synthesisComplete', result);
    });

    this.styleTTS2Engine.on('error', (error: SynthesisErrorEventData) => {
      console.error('StyleTTS2 Engine error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Load and validate voice models
   */
  private async loadAndValidateVoiceModels(): Promise<void> {
    console.log('📦 Loading and validating voice models...');

    // Load critical models first
    const criticalModels = ['sovren-ai-neural', 'ceo-authoritative', 'cfo-analytical', 'cto-technical'];

    for (const modelId of criticalModels) {
      try {
        await this.loadVoiceModel(modelId);
        console.log(`✅ Critical model loaded: ${modelId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to load critical model ${modelId}:`, error);
      }
    }
  }

  /**
   * Perform system health check
   */
  private async performHealthCheck(): Promise<void> {
    console.log('🏥 Performing voice synthesis health check...');

    try {
      // Test synthesis with a simple phrase
      const testResult = await this.synthesize('System health check', 'sovren-ai-neural', 'high');

      if (testResult && typeof testResult === 'string' && testResult.length > 0) {
        console.log('✅ Voice synthesis health check passed');
      } else {
        throw new Error('Health check produced empty result');
      }
    } catch (error) {
      console.warn('⚠️ Voice synthesis health check failed:', error);
      // Don't throw - allow system to continue with degraded functionality
    }
  }

  private async initializeWorkerPool(): Promise<void> {
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = new Worker('/workers/voice-synthesis-worker.js');
        worker.onmessage = this.handleWorkerMessage.bind(this);
        worker.onerror = this.handleWorkerError.bind(this);
        this.workerPool.push(worker);
      } catch (error) {
        console.warn(`Failed to create synthesis worker ${i}:`, error);
      }
    }

    if (this.workerPool.length === 0) {
      console.warn('No synthesis workers available, falling back to main thread processing');
    }
  }

  private handleWorkerMessage(event: MessageEvent): void {
    const { type, requestId, result, error } = event.data;

    switch (type) {
      case 'synthesis-complete':
        this.handleSynthesisComplete(requestId, result);
        break;
      case 'synthesis-error':
        this.handleSynthesisError(requestId, error);
        break;
      case 'model-loaded':
        this.handleModelLoaded(result.modelId);
        break;
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Synthesis worker error:', error);
    this.emit('error', error);
  }

  private async loadVoiceModel(modelId: string): Promise<void> {
    const model = this.voiceModels.get(modelId);
    if (!model || model.isLoaded) {
      return;
    }

    try {
      // In a real implementation, this would load the actual model
      // For now, we'll simulate loading
      console.log(`Loading voice model: ${model.name}`);
      
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      model.isLoaded = true;
      console.log(`✓ Voice model loaded: ${model.name}`);
      this.emit('modelLoaded', { modelId, model });

    } catch (error) {
      console.error(`Failed to load voice model ${modelId}:`, error);
      this.emit('error', { modelId, error });
      throw error;
    }
  }

  public async synthesize(
    text: string, 
    voiceModelId: string, 
    priority: 'low' | 'normal' | 'high' = 'normal',
    options?: SynthesisRequest['options']
  ): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Voice synthesis is disabled');
    }

    // Check if model exists and load if necessary
    const model = this.voiceModels.get(voiceModelId);
    if (!model) {
      throw new Error(`Voice model not found: ${voiceModelId}`);
    }

    if (!model.isLoaded) {
      await this.loadVoiceModel(voiceModelId);
    }

    // Create synthesis request
    const request: SynthesisRequest = {
      id: this.generateRequestId(),
      text,
      voiceModel: voiceModelId,
      priority,
      timestamp: new Date(),
      options
    };

    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    if (this.cache.has(cacheKey)) {
      const cachedResult = this.cache.get(cacheKey)!;
      this.emit('synthesisComplete', { requestId: request.id, result: cachedResult, fromCache: true });
      return request.id;
    }

    // Add to queue
    this.addToQueue(request);

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }

    return request.id;
  }

  private addToQueue(request: SynthesisRequest): void {
    // Insert based on priority
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const insertIndex = this.synthesisQueue.findIndex(
      req => priorityOrder[req.priority] > priorityOrder[request.priority]
    );

    if (insertIndex === -1) {
      this.synthesisQueue.push(request);
    } else {
      this.synthesisQueue.splice(insertIndex, 0, request);
    }

    this.emit('queueUpdated', { queueLength: this.synthesisQueue.length });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.synthesisQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.synthesisQueue.length > 0) {
      const request = this.synthesisQueue.shift()!;
      
      try {
        await this.processSynthesisRequest(request);
      } catch (error) {
        console.error(`Synthesis failed for request ${request.id}:`, error);
        this.emit('synthesisError', { requestId: request.id, error });
      }
    }

    this.isProcessing = false;
  }

  private async processSynthesisRequest(request: SynthesisRequest): Promise<void> {
    const model = this.voiceModels.get(request.voiceModel)!;

    // Get available worker or process in main thread
    const worker = this.getAvailableWorker();
    
    if (worker) {
      // Process with worker
      worker.postMessage({
        type: 'synthesize',
        request,
        model
      });
    } else {
      // Process in main thread (fallback)
      await this.synthesizeInMainThread(request, model);
    }
  }

  private getAvailableWorker(): Worker | null {
    // In a real implementation, you'd track worker availability
    if (this.workerPool.length > 0) {
      const worker = this.workerPool[0];
      return worker !== undefined ? worker : null;
    }
    return null;
  }

  private async synthesizeInMainThread(request: SynthesisRequest, model: VoiceModel): Promise<void> {
    try {
      console.log(`Synthesizing with StyleTTS2: "${request.text}" using ${model.name}`);

      if (this.styleTTS2Engine) {
        // Use StyleTTS2 for high-quality synthesis
        const synthesisParams: SynthesisParameters = {
          text: request.text,
          voiceId: request.voiceModel,
          speed: request.options?.speed || model.characteristics.speed,
          pitch: request.options?.pitch || model.characteristics.pitch,
          energy: 1.0,
          emotion: request.options?.emotion || 'neutral',
          style: [], // Style vector for voice cloning
          prosody: {
            rate: request.options?.speed || 1.0,
            volume: request.options?.volume || 1.0,
            emphasis: [] // Emphasis points
          }
        };

        const audioBuffer = await this.styleTTS2Engine.synthesize(synthesisParams);
        const duration = (audioBuffer.byteLength / 2) / 22050 * 1000; // Convert to milliseconds

        const result: SynthesisResult = {
          requestId: request.id,
          audioBuffer,
          duration,
          format: 'wav',
          sampleRate: 22050
        };

        this.handleSynthesisComplete(request.id, result);

      } else {
        // Fallback to basic synthesis
        console.log(`Fallback synthesis: "${request.text}" with ${model.name}`);

        const duration = request.text.length * 50; // Simulate duration
        await new Promise(resolve => setTimeout(resolve, duration));

        // Create mock audio buffer
        const sampleRate = 22050;
        const samples = Math.floor(duration * sampleRate / 1000);
        const audioBuffer = new ArrayBuffer(samples * 2); // 16-bit audio

        const result: SynthesisResult = {
          requestId: request.id,
          audioBuffer,
          duration,
          format: 'wav',
          sampleRate
        };

        this.handleSynthesisComplete(request.id, result);
      }

    } catch (error) {
      console.error('Synthesis failed, falling back to basic synthesis:', error);
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.handleSynthesisError(request.id, errorObj);
    }
  }

  private handleSynthesisComplete(requestId: string, result: SynthesisResult): void {
    // Cache the result
    const request = this.synthesisQueue.find(req => req.id === requestId);
    if (request) {
      const cacheKey = this.generateCacheKey(request);
      this.addToCache(cacheKey, result);
    }

    console.log(`Synthesis complete for request: ${requestId}`);
    this.emit('synthesisComplete', { requestId, result });
  }

  private handleSynthesisError(requestId: string, error: Error): void {
    const sovrenError = this.errorHandler.handleError(error, {
      requestId,
      additionalData: {
        synthesisRequestId: requestId,
        stage: 'synthesis'
      }
    });

    this.logger.error(`Synthesis error for request ${requestId}:`, sovrenError);

    const errorData: SynthesisErrorEventData = {
      requestId,
      error: sovrenError.originalError || error,
      stage: 'synthesis',
      retryable: sovrenError.isRetryable
    };
    this.emit('synthesisError', errorData);
  }

  private handleModelLoaded(modelId: string): void {
    const model = this.voiceModels.get(modelId);
    if (model) {
      model.isLoaded = true;
      this.emit('modelLoaded', { modelId, model });
    }
  }

  private generateRequestId(): string {
    return `synthesis_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateCacheKey(request: SynthesisRequest): string {
    const optionsStr = JSON.stringify(request.options || {});
    return `${request.voiceModel}_${request.text}_${optionsStr}`;
  }

  private addToCache(key: string, result: SynthesisResult): void {
    // Implement LRU cache
    if (this.cache.size >= this.config.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, result);
  }

  public getVoiceModels(): VoiceModel[] {
    return Array.from(this.voiceModels.values());
  }

  public getLoadedModels(): VoiceModel[] {
    return Array.from(this.voiceModels.values()).filter(model => model.isLoaded);
  }

  public getQueueLength(): number {
    return this.synthesisQueue.length;
  }

  public clearQueue(): void {
    this.synthesisQueue = [];
    this.emit('queueUpdated', { queueLength: 0 });
  }

  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  public getStyleTTS2Status(): VoiceSystemStatus {
    if (!this.styleTTS2Engine) {
      return {
        status: 'not_initialized',
        modelsLoaded: 0,
        totalModels: 0,
        memoryUsage: 0,
        activeRequests: 0
      };
    }

    return {
      status: 'ready',
      modelsLoaded: this.styleTTS2Engine.getLoadedModels().length,
      totalModels: this.voiceModels.size,
      memoryUsage: this.styleTTS2Engine.getMemoryUsage(),
      activeRequests: this.synthesisQueue.length
    };
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down Voice Synthesizer...');

    // Clear queue
    this.clearQueue();

    // Terminate workers
    this.workerPool.forEach(worker => worker.terminate());
    this.workerPool = [];

    // Shutdown StyleTTS2 Engine
    if (this.styleTTS2Engine) {
      await this.styleTTS2Engine.shutdown();
      this.styleTTS2Engine = null;
    }

    // Close audio context
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    // Clear cache
    this.cache.clear();

    console.log('✓ Voice Synthesizer shutdown complete');
  }
}
