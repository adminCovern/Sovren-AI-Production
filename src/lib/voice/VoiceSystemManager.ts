import { SIPClient, SIPConfig, CallSession } from './SIPClient';
import { AudioProcessor, AudioProcessingConfig } from './AudioProcessor';
import { ExecutiveVoiceRouter, ExecutiveProfile } from './ExecutiveVoiceRouter';
import { VoiceSynthesizer } from './VoiceSynthesizer';

export interface VoiceSystemConfig {
  sip: SIPConfig;
  audio: AudioProcessingConfig;
  synthesis: {
    enabled: boolean;
    modelsPath: string;
    cacheSize: number;
  };
  recording: {
    enabled: boolean;
    format: 'wav' | 'mp3' | 'ogg';
    quality: 'low' | 'medium' | 'high';
  };
  transcription: {
    enabled: boolean;
    language: string;
    realTime: boolean;
  };
  subscriptionTier?: 'sovren_proof' | 'sovren_proof_plus'; // NEW: Subscription tier
}

export interface VoiceSystemStatus {
  isInitialized: boolean;
  sipStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  audioStatus: 'inactive' | 'active' | 'error';
  synthesisStatus: 'disabled' | 'loading' | 'ready' | 'error';
  activeCalls: number;
  availableExecutives: number;
  systemLoad: number;
}

export class VoiceSystemManager {
  private sipClient: SIPClient;
  private audioProcessor: AudioProcessor;
  private voiceRouter: ExecutiveVoiceRouter;
  private voiceSynthesizer: VoiceSynthesizer;
  private isInitialized: boolean = false;
  private eventListeners: Map<string, Function[]> = new Map();
  private systemStatus: VoiceSystemStatus;

  constructor(private config: VoiceSystemConfig) {
    // Get subscription tier from config or default to basic
    const subscriptionTier = config.subscriptionTier || 'sovren_proof';

    // Initialize components with subscription tier
    this.audioProcessor = new AudioProcessor(config.audio);
    this.voiceRouter = new ExecutiveVoiceRouter(subscriptionTier);
    this.voiceSynthesizer = new VoiceSynthesizer(config.synthesis, subscriptionTier);
    this.sipClient = new SIPClient(config.sip, this.audioProcessor, this.voiceRouter);

    // Initialize system status with tier-appropriate executive count
    const maxExecutives = subscriptionTier === 'sovren_proof_plus' ? 9 : 5;
    this.systemStatus = {
      isInitialized: false,
      sipStatus: 'disconnected',
      audioStatus: 'inactive',
      synthesisStatus: config.synthesis.enabled ? 'loading' : 'disabled',
      activeCalls: 0,
      availableExecutives: maxExecutives,
      systemLoad: 0
    };

    this.initializeEventListeners();
    this.setupComponentEventHandlers();
  }

  private initializeEventListeners(): void {
    this.eventListeners.set('systemReady', []);
    this.eventListeners.set('callStarted', []);
    this.eventListeners.set('callEnded', []);
    this.eventListeners.set('executiveAssigned', []);
    this.eventListeners.set('audioActivity', []);
    this.eventListeners.set('synthesisComplete', []);
    this.eventListeners.set('error', []);
    this.eventListeners.set('statusChanged', []);
  }

  private setupComponentEventHandlers(): void {
    // SIP Client events
    this.sipClient.on('registered', () => {
      this.systemStatus.sipStatus = 'connected';
      this.emit('statusChanged', this.systemStatus);
    });

    this.sipClient.on('registrationFailed', (error: any) => {
      this.systemStatus.sipStatus = 'error';
      this.emit('error', { component: 'sip', error });
      this.emit('statusChanged', this.systemStatus);
    });

    this.sipClient.on('invite', (session: CallSession) => {
      this.systemStatus.activeCalls++;
      this.emit('callStarted', session);
      this.emit('statusChanged', this.systemStatus);
    });

    this.sipClient.on('bye', (session: CallSession) => {
      this.systemStatus.activeCalls--;
      this.voiceRouter.releaseExecutive(session.executive);
      this.emit('callEnded', session);
      this.emit('statusChanged', this.systemStatus);
    });

    // Audio Processor events
    this.audioProcessor.on('audioActivity', (data: any) => {
      this.emit('audioActivity', data);
    });

    // Voice Router events
    this.voiceRouter.on('executiveAssigned', (data: any) => {
      this.emit('executiveAssigned', data);
    });

    this.voiceRouter.on('availabilityChanged', () => {
      this.systemStatus.availableExecutives = this.voiceRouter.getAvailableExecutives().length;
      this.emit('statusChanged', this.systemStatus);
    });

    // Voice Synthesizer events
    this.voiceSynthesizer.on('ready', () => {
      this.systemStatus.synthesisStatus = 'ready';
      this.emit('statusChanged', this.systemStatus);
    });

    this.voiceSynthesizer.on('error', (error: any) => {
      this.systemStatus.synthesisStatus = 'error';
      this.emit('error', { component: 'synthesis', error });
      this.emit('statusChanged', this.systemStatus);
    });

    this.voiceSynthesizer.on('synthesisComplete', (data: any) => {
      this.emit('synthesisComplete', data);
    });
  }

  public async initialize(): Promise<void> {
    try {
      console.log('Initializing SOVREN AI Voice System...');

      // Initialize audio processor first
      this.systemStatus.audioStatus = 'active';
      await this.audioProcessor.initialize();
      console.log('✓ Audio Processor initialized');

      // Initialize voice synthesizer if enabled
      if (this.config.synthesis.enabled) {
        await this.voiceSynthesizer.initialize();
        console.log('✓ Voice Synthesizer initialized');
      }

      // Initialize SIP client
      this.systemStatus.sipStatus = 'connecting';
      await this.sipClient.initialize();
      console.log('✓ SIP Client initialized');

      // System is ready
      this.isInitialized = true;
      this.systemStatus.isInitialized = true;
      this.systemStatus.availableExecutives = this.voiceRouter.getAvailableExecutives().length;

      console.log('🎉 SOVREN AI Voice System initialized successfully');
      this.emit('systemReady', this.systemStatus);
      this.emit('statusChanged', this.systemStatus);

    } catch (error) {
      console.error('Failed to initialize Voice System:', error);
      this.emit('error', { component: 'system', error });
      throw error;
    }
  }

  public async makeCall(targetUri: string, executiveId: string, message?: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Voice System not initialized');
    }

    try {
      // Validate executive availability
      const executive = this.voiceRouter.getExecutiveProfile(executiveId);
      if (!executive) {
        throw new Error(`Executive not found: ${executiveId}`);
      }

      // Make the call
      const sessionId = await this.sipClient.makeCall(targetUri, executiveId);

      // If message provided, synthesize and play it
      if (message && this.config.synthesis.enabled) {
        await this.speakAsExecutive(executiveId, message);
      }

      return sessionId;

    } catch (error) {
      console.error('Failed to make call:', error);
      this.emit('error', { component: 'calling', error });
      throw error;
    }
  }

  public async endCall(sessionId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Voice System not initialized');
    }

    try {
      await this.sipClient.endCall(sessionId);
    } catch (error) {
      console.error('Failed to end call:', error);
      this.emit('error', { component: 'calling', error });
      throw error;
    }
  }

  public async speakAsExecutive(executiveId: string, text: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<void> {
    if (!this.config.synthesis.enabled) {
      console.warn('Voice synthesis is disabled');
      return;
    }

    try {
      const executive = this.voiceRouter.getExecutiveProfile(executiveId);
      if (!executive) {
        throw new Error(`Executive not found: ${executiveId}`);
      }

      await this.voiceSynthesizer.synthesize(text, executive.voiceModel, priority);

    } catch (error) {
      console.error('Failed to synthesize speech:', error);
      this.emit('error', { component: 'synthesis', error });
      throw error;
    }
  }

  public getActiveCalls(): CallSession[] {
    return this.sipClient.getActiveSessions();
  }

  public getCallById(sessionId: string): CallSession | undefined {
    return this.sipClient.getSessionById(sessionId);
  }

  public getExecutiveProfiles(): ExecutiveProfile[] {
    return this.voiceRouter.getAllExecutives();
  }

  public getAvailableExecutives(): ExecutiveProfile[] {
    return this.voiceRouter.getAvailableExecutives();
  }

  public setExecutiveAvailability(executiveId: string, availability: ExecutiveProfile['availability']): void {
    this.voiceRouter.setExecutiveAvailability(executiveId, availability);
  }

  public updateExecutivePosition(executiveId: string, x: number, y: number, z: number): void {
    this.audioProcessor.updateExecutivePosition(executiveId, x, y, z);
  }

  public getSystemStatus(): VoiceSystemStatus {
    // Update system load
    const activeCalls = this.sipClient.getActiveSessions().length;
    const maxCalls = this.voiceRouter.getAllExecutives().reduce((sum, exec) => sum + exec.maxConcurrentCalls, 0);
    this.systemStatus.systemLoad = maxCalls > 0 ? (activeCalls / maxCalls) * 100 : 0;
    this.systemStatus.activeCalls = activeCalls;

    return { ...this.systemStatus };
  }

  public async startRecording(sessionId: string): Promise<void> {
    if (!this.config.recording.enabled) {
      console.warn('Call recording is disabled');
      return;
    }

    // Implementation would depend on your recording backend
    console.log(`Starting recording for session: ${sessionId}`);
  }

  public async stopRecording(sessionId: string): Promise<string> {
    if (!this.config.recording.enabled) {
      throw new Error('Call recording is disabled');
    }

    // Implementation would return the recording file path/URL
    console.log(`Stopping recording for session: ${sessionId}`);
    return `/recordings/${sessionId}.${this.config.recording.format}`;
  }

  public async startTranscription(sessionId: string): Promise<void> {
    if (!this.config.transcription.enabled) {
      console.warn('Call transcription is disabled');
      return;
    }

    // Implementation would start real-time transcription
    console.log(`Starting transcription for session: ${sessionId}`);
  }

  public async getTranscript(sessionId: string): Promise<string> {
    if (!this.config.transcription.enabled) {
      throw new Error('Call transcription is disabled');
    }

    // Implementation would return the transcript
    console.log(`Getting transcript for session: ${sessionId}`);
    return `Transcript for session ${sessionId}`;
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

  public async shutdown(): Promise<void> {
    console.log('Shutting down SOVREN AI Voice System...');

    try {
      // Disconnect SIP client
      await this.sipClient.disconnect();
      
      // Destroy audio processor
      await this.audioProcessor.destroy();
      
      // Shutdown voice synthesizer
      if (this.config.synthesis.enabled) {
        await this.voiceSynthesizer.shutdown();
      }

      this.isInitialized = false;
      this.systemStatus.isInitialized = false;
      this.systemStatus.sipStatus = 'disconnected';
      this.systemStatus.audioStatus = 'inactive';

      console.log('✓ Voice System shutdown complete');
      this.emit('statusChanged', this.systemStatus);

    } catch (error) {
      console.error('Error during Voice System shutdown:', error);
      this.emit('error', { component: 'shutdown', error });
      throw error;
    }
  }
}
