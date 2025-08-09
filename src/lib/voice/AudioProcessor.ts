export interface AudioProcessingConfig {
  sampleRate: number;
  bufferSize: number;
  enableNoiseReduction: boolean;
  enableEchoCancellation: boolean;
  enableAutoGainControl: boolean;
  spatialAudioEnabled: boolean;
}

export interface AudioMetrics {
  volume: number;
  frequency: number[];
  isActive: boolean;
  noiseLevel: number;
  clarity: number;
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private activeStreams: Map<string, MediaStream> = new Map();
  private processors: Map<string, AudioWorkletNode> = new Map();
  private analyzers: Map<string, AnalyserNode> = new Map();
  private spatialNodes: Map<string, PannerNode> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(private config: AudioProcessingConfig = {
    sampleRate: 48000,
    bufferSize: 4096,
    enableNoiseReduction: true,
    enableEchoCancellation: true,
    enableAutoGainControl: true,
    spatialAudioEnabled: true
  }) {
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.eventListeners.set('audioActivity', []);
    this.eventListeners.set('volumeChange', []);
    this.eventListeners.set('qualityChange', []);
    this.eventListeners.set('spatialUpdate', []);
  }

  public async initialize(): Promise<void> {
    try {
      // Create AudioContext with optimal settings
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
        latencyHint: 'interactive'
      });

      // Load audio worklet for advanced processing
      await this.loadAudioWorklets();
      
      console.log('Audio Processor initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Audio Processor:', error);
      throw error;
    }
  }

  private async loadAudioWorklets(): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Load noise reduction worklet
      await this.audioContext.audioWorklet.addModule('/audio-worklets/noise-reduction.js');
      
      // Load voice enhancement worklet
      await this.audioContext.audioWorklet.addModule('/audio-worklets/voice-enhancement.js');
      
      // Load spatial audio worklet
      await this.audioContext.audioWorklet.addModule('/audio-worklets/spatial-processor.js');
      
    } catch (error) {
      console.warn('Audio worklets not available, falling back to basic processing:', error);
    }
  }

  public async processInboundAudio(stream: MediaStream, executiveId: string): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    const streamId = `inbound_${executiveId}_${Date.now()}`;
    this.activeStreams.set(streamId, stream);

    try {
      // Create audio processing chain
      const source = this.audioContext!.createMediaStreamSource(stream);
      const analyzer = this.createAnalyzer();
      const enhancer = await this.createVoiceEnhancer();
      const spatializer = this.createSpatializer(executiveId);
      const destination = this.audioContext!.destination;

      // Connect processing chain
      source.connect(analyzer);
      analyzer.connect(enhancer);
      enhancer.connect(spatializer);
      spatializer.connect(destination);

      // Store references
      this.analyzers.set(streamId, analyzer);
      this.processors.set(streamId, enhancer);
      this.spatialNodes.set(streamId, spatializer);

      // Start monitoring
      this.startAudioMonitoring(streamId, analyzer, executiveId);

      console.log(`Inbound audio processing started for executive ${executiveId}`);

    } catch (error) {
      console.error('Failed to process inbound audio:', error);
      this.stopProcessing(stream);
    }
  }

  public async processOutboundAudio(stream: MediaStream, executiveId: string): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    const streamId = `outbound_${executiveId}_${Date.now()}`;
    this.activeStreams.set(streamId, stream);

    try {
      // Create outbound processing chain
      const source = this.audioContext!.createMediaStreamSource(stream);
      const analyzer = this.createAnalyzer();
      const noiseReducer = await this.createNoiseReducer();
      const enhancer = await this.createVoiceEnhancer();

      // Connect processing chain
      source.connect(analyzer);
      analyzer.connect(noiseReducer);
      noiseReducer.connect(enhancer);

      // Store references
      this.analyzers.set(streamId, analyzer);
      this.processors.set(streamId, enhancer);

      // Start monitoring
      this.startAudioMonitoring(streamId, analyzer, executiveId);

      console.log(`Outbound audio processing started for executive ${executiveId}`);

    } catch (error) {
      console.error('Failed to process outbound audio:', error);
      this.stopProcessing(stream);
    }
  }

  private createAnalyzer(): AnalyserNode {
    const analyzer = this.audioContext!.createAnalyser();
    analyzer.fftSize = 2048;
    analyzer.smoothingTimeConstant = 0.8;
    return analyzer;
  }

  private async createNoiseReducer(): Promise<AudioWorkletNode> {
    try {
      const processor = new AudioWorkletNode(this.audioContext!, 'noise-reduction-processor', {
        processorOptions: {
          threshold: -30,
          ratio: 4,
          attack: 0.003,
          release: 0.1
        }
      });
      return processor;
    } catch (error) {
      // Fallback to basic filtering
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 80;
      return filter as any;
    }
  }

  private async createVoiceEnhancer(): Promise<AudioWorkletNode> {
    try {
      const processor = new AudioWorkletNode(this.audioContext!, 'voice-enhancement-processor', {
        processorOptions: {
          clarity: 1.2,
          warmth: 0.8,
          presence: 1.1
        }
      });
      return processor;
    } catch (error) {
      // Fallback to basic EQ
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = 2000;
      filter.Q.value = 1;
      filter.gain.value = 3;
      return filter as any;
    }
  }

  private createSpatializer(executiveId: string): PannerNode {
    const panner = this.audioContext!.createPanner();
    
    // Configure 3D audio settings
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;

    // Set executive position based on their circle position
    const position = this.getExecutivePosition(executiveId);
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;

    return panner;
  }

  private getExecutivePosition(executiveId: string): { x: number; y: number; z: number } {
    const executives = ['ceo', 'cfo', 'cto', 'cmo', 'coo', 'chro', 'clo', 'cso'];
    const index = executives.indexOf(executiveId.toLowerCase());
    
    if (index === -1) {
      return { x: 0, y: 0, z: 0 };
    }

    const angle = (index / executives.length) * Math.PI * 2;
    const radius = 6; // Match the visual circle radius
    
    return {
      x: Math.cos(angle) * radius,
      y: 0,
      z: Math.sin(angle) * radius
    };
  }

  private startAudioMonitoring(streamId: string, analyzer: AnalyserNode, executiveId: string): void {
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const frequencyData = new Float32Array(bufferLength);

    const monitor = () => {
      if (!this.analyzers.has(streamId)) return;

      analyzer.getByteTimeDomainData(dataArray);
      analyzer.getFloatFrequencyData(frequencyData);

      // Calculate volume (RMS)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const sample = (dataArray[i] - 128) / 128;
        sum += sample * sample;
      }
      const volume = Math.sqrt(sum / bufferLength);

      // Calculate dominant frequency
      let maxIndex = 0;
      let maxValue = -Infinity;
      for (let i = 0; i < frequencyData.length; i++) {
        const value = frequencyData[i];
        if (value !== undefined && value > maxValue) {
          maxValue = value;
          maxIndex = i;
        }
      }
      const dominantFreq = (maxIndex * this.audioContext!.sampleRate) / (2 * bufferLength);

      // Determine if audio is active
      const isActive = volume > 0.01;

      // Calculate noise level and clarity
      const noiseLevel = this.calculateNoiseLevel(frequencyData);
      const clarity = this.calculateClarity(frequencyData);

      const metrics: AudioMetrics = {
        volume,
        frequency: Array.from(frequencyData),
        isActive,
        noiseLevel,
        clarity
      };

      this.emit('audioActivity', {
        executiveId,
        streamId,
        metrics,
        dominantFrequency: dominantFreq
      });

      // Continue monitoring
      requestAnimationFrame(monitor);
    };

    monitor();
  }

  private calculateNoiseLevel(frequencyData: Float32Array): number {
    // Calculate noise level in lower frequencies (below 300Hz)
    const noiseRange = Math.floor((300 / this.audioContext!.sampleRate) * frequencyData.length * 2);
    let noiseSum = 0;
    
    for (let i = 0; i < Math.min(noiseRange, frequencyData.length); i++) {
      const value = frequencyData[i];
      if (value !== undefined) {
        noiseSum += Math.pow(10, value / 20);
      }
    }
    
    return noiseSum / noiseRange;
  }

  private calculateClarity(frequencyData: Float32Array): number {
    // Calculate clarity based on voice frequency range (300Hz - 3400Hz)
    const voiceStart = Math.floor((300 / this.audioContext!.sampleRate) * frequencyData.length * 2);
    const voiceEnd = Math.floor((3400 / this.audioContext!.sampleRate) * frequencyData.length * 2);
    
    let voiceSum = 0;
    let totalSum = 0;
    
    for (let i = 0; i < frequencyData.length; i++) {
      const value = frequencyData[i];
      if (value !== undefined) {
        const power = Math.pow(10, value / 20);
        totalSum += power;

        if (i >= voiceStart && i <= voiceEnd) {
          voiceSum += power;
        }
      }
    }
    
    return totalSum > 0 ? voiceSum / totalSum : 0;
  }

  public updateExecutivePosition(executiveId: string, x: number, y: number, z: number): void {
    for (const [streamId, panner] of this.spatialNodes.entries()) {
      if (streamId.includes(executiveId)) {
        panner.positionX.value = x;
        panner.positionY.value = y;
        panner.positionZ.value = z;
        
        this.emit('spatialUpdate', { executiveId, position: { x, y, z } });
      }
    }
  }

  public stopProcessing(stream: MediaStream): void {
    const streamId = Array.from(this.activeStreams.entries())
      .find(([_, s]) => s === stream)?.[0];
    
    if (streamId) {
      // Clean up analyzers
      this.analyzers.delete(streamId);
      
      // Clean up processors
      const processor = this.processors.get(streamId);
      if (processor) {
        processor.disconnect();
        this.processors.delete(streamId);
      }
      
      // Clean up spatial nodes
      const spatialNode = this.spatialNodes.get(streamId);
      if (spatialNode) {
        spatialNode.disconnect();
        this.spatialNodes.delete(streamId);
      }
      
      // Remove stream
      this.activeStreams.delete(streamId);
      
      console.log(`Audio processing stopped for stream: ${streamId}`);
    }
  }

  public getAudioMetrics(executiveId: string): AudioMetrics | null {
    // This would return the latest metrics for the executive
    // Implementation would depend on how you want to store/retrieve metrics
    return null;
  }

  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.push(callback);
    }
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

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  public async destroy(): Promise<void> {
    // Stop all processing
    for (const stream of this.activeStreams.values()) {
      this.stopProcessing(stream);
    }
    
    // Close audio context
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    console.log('Audio Processor destroyed');
  }
}
