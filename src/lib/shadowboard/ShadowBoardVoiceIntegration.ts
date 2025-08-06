/**
 * SHADOW BOARD VOICE INTEGRATION
 * Connects Shadow Board executives with the telephony and voice synthesis systems
 */

import { EventEmitter } from 'events';
import { ShadowBoardManager, ExecutiveEntity } from './ShadowBoardManager';
import { VoiceSystemManager } from '../voice/VoiceSystemManager';
import { PhoneSystemManager } from '../telephony/PhoneSystemManager';
import { UserPhoneAllocation } from '../telephony/SkyetelService';
import { VoiceSynthesizer } from '../voice/VoiceSynthesizer';

export interface ExecutiveVoiceProfile {
  executiveId: string;
  executiveRole: string;
  executiveName: string;
  voiceModelId: string;
  phoneNumber: string;
  voiceCharacteristics: {
    gender: 'male' | 'female';
    age: 'young' | 'middle' | 'mature';
    accent: string;
    tone: 'professional' | 'warm' | 'authoritative' | 'friendly';
    pace: 'slow' | 'normal' | 'fast';
    pitch: 'low' | 'medium' | 'high';
  };
  isVoiceModelLoaded: boolean;
  canMakeCalls: boolean;
  canReceiveCalls: boolean;
  maxConcurrentCalls: number;
  currentCallCount: number;
}

export interface ExecutiveCallRequest {
  executiveRole: string;
  targetNumber: string;
  callPurpose: 'sales' | 'support' | 'negotiation' | 'follow-up' | 'meeting' | 'emergency';
  message?: string;
  context?: {
    customerName?: string;
    dealValue?: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    expectedDuration?: number;
    followUpRequired?: boolean;
  };
}

export interface ExecutiveCallSession {
  callId: string;
  executiveRole: string;
  executiveName: string;
  targetNumber: string;
  startTime: Date;
  status: 'initiating' | 'ringing' | 'connected' | 'speaking' | 'ended' | 'failed';
  duration?: number;
  transcript: Array<{
    timestamp: Date;
    speaker: 'executive' | 'caller';
    text: string;
    confidence: number;
  }>;
  callPurpose: string;
  outcome?: 'successful' | 'failed' | 'no-answer' | 'busy' | 'voicemail';
  notes?: string;
}

export class ShadowBoardVoiceIntegration extends EventEmitter {
  private shadowBoard: ShadowBoardManager;
  private voiceSystem: VoiceSystemManager;
  private phoneSystem: PhoneSystemManager;
  private voiceSynthesizer: VoiceSynthesizer;
  
  private executiveVoiceProfiles: Map<string, ExecutiveVoiceProfile> = new Map();
  private activeCallSessions: Map<string, ExecutiveCallSession> = new Map();
  private voiceModelCache: Map<string, any> = new Map();
  
  private isInitialized: boolean = false;

  constructor(
    shadowBoard: ShadowBoardManager,
    voiceSystem: VoiceSystemManager,
    phoneSystem: PhoneSystemManager,
    voiceSynthesizer: VoiceSynthesizer
  ) {
    super();
    this.shadowBoard = shadowBoard;
    this.voiceSystem = voiceSystem;
    this.phoneSystem = phoneSystem;
    this.voiceSynthesizer = voiceSynthesizer;
  }

  /**
   * Initialize Shadow Board voice integration
   */
  public async initialize(userPhoneAllocation: UserPhoneAllocation): Promise<void> {
    try {
      console.log('🎤 Initializing Shadow Board Voice Integration...');

      // Create voice profiles for each executive
      await this.createExecutiveVoiceProfiles(userPhoneAllocation);

      // Load voice models for all executives
      await this.loadExecutiveVoiceModels();

      // Set up call routing for executives
      await this.setupExecutiveCallRouting(userPhoneAllocation);

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ Shadow Board Voice Integration initialized');

      this.emit('initialized', {
        executiveCount: this.executiveVoiceProfiles.size,
        voiceModelsLoaded: Array.from(this.voiceModelCache.keys()).length
      });

    } catch (error) {
      console.error('❌ Failed to initialize Shadow Board Voice Integration:', error);
      throw error;
    }
  }

  /**
   * Make a call as a specific executive
   */
  public async makeExecutiveCall(request: ExecutiveCallRequest): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Shadow Board Voice Integration not initialized');
    }

    const executiveProfile = this.executiveVoiceProfiles.get(request.executiveRole);
    if (!executiveProfile) {
      throw new Error(`Executive voice profile not found: ${request.executiveRole}`);
    }

    if (!executiveProfile.canMakeCalls) {
      throw new Error(`Executive ${request.executiveRole} cannot make calls`);
    }

    if (executiveProfile.currentCallCount >= executiveProfile.maxConcurrentCalls) {
      throw new Error(`Executive ${request.executiveRole} is at maximum call capacity`);
    }

    try {
      const callId = `exec_call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create call session
      const callSession: ExecutiveCallSession = {
        callId,
        executiveRole: request.executiveRole,
        executiveName: executiveProfile.executiveName,
        targetNumber: request.targetNumber,
        startTime: new Date(),
        status: 'initiating',
        transcript: [],
        callPurpose: request.callPurpose
      };

      this.activeCallSessions.set(callId, callSession);

      // Update executive status
      const executive = this.shadowBoard.getExecutive(request.executiveRole);
      if (executive) {
        executive.currentActivity = {
          type: 'communicating',
          focus: 'outbound_call',
          intensity: request.context?.urgency === 'critical' ? 1.0 : 0.8,
          startTime: new Date(),
          estimatedDuration: request.context?.expectedDuration || 300000, // 5 minutes default
          relatedExecutives: [],
          impactRadius: 1000,
          urgencyLevel: request.context?.urgency || 'medium'
        };
        executive.neuralLoad = Math.min(1.0, executive.neuralLoad + 0.3);
      }

      // Initiate call through phone system
      const phoneCallId = await this.phoneSystem.makeOutboundCall({
        userId: 'shadow-board',
        executiveRole: request.executiveRole,
        toNumber: request.targetNumber,
        fromNumber: executiveProfile.phoneNumber
      });

      if (!phoneCallId) {
        throw new Error('Failed to initiate phone call');
      }

      callSession.status = 'ringing';
      executiveProfile.currentCallCount++;

      console.log(`📞 ${executiveProfile.executiveName} calling ${request.targetNumber} for ${request.callPurpose}`);

      // If initial message provided, prepare to speak it when call connects
      if (request.message) {
        this.scheduleExecutiveSpeech(callId, request.message, 2000); // Speak after 2 seconds
      }

      this.emit('callInitiated', { callSession, request });

      return callId;

    } catch (error) {
      console.error(`Failed to make executive call for ${request.executiveRole}:`, error);
      throw error;
    }
  }

  /**
   * Have an executive speak during a call
   */
  public async executiveSpeak(callId: string, message: string): Promise<void> {
    const callSession = this.activeCallSessions.get(callId);
    if (!callSession) {
      throw new Error(`Call session not found: ${callId}`);
    }

    const executiveProfile = this.executiveVoiceProfiles.get(callSession.executiveRole);
    if (!executiveProfile) {
      throw new Error(`Executive voice profile not found: ${callSession.executiveRole}`);
    }

    try {
      // Synthesize speech using executive's voice model
      await this.voiceSynthesizer.synthesize(
        message,
        executiveProfile.voiceModelId,
        'high' // High priority for live calls
      );

      // Add to call transcript
      callSession.transcript.push({
        timestamp: new Date(),
        speaker: 'executive',
        text: message,
        confidence: 0.95
      });

      console.log(`🗣️ ${executiveProfile.executiveName}: "${message.substring(0, 50)}..."`);

      this.emit('executiveSpoke', { callSession, message });

    } catch (error) {
      console.error(`Failed to synthesize speech for ${callSession.executiveRole}:`, error);
      throw error;
    }
  }

  /**
   * End an executive call
   */
  public async endExecutiveCall(callId: string, outcome?: ExecutiveCallSession['outcome'], notes?: string): Promise<void> {
    const callSession = this.activeCallSessions.get(callId);
    if (!callSession) {
      throw new Error(`Call session not found: ${callId}`);
    }

    const executiveProfile = this.executiveVoiceProfiles.get(callSession.executiveRole);
    if (executiveProfile) {
      executiveProfile.currentCallCount = Math.max(0, executiveProfile.currentCallCount - 1);
    }

    // Update call session
    callSession.status = 'ended';
    callSession.duration = Date.now() - callSession.startTime.getTime();
    callSession.outcome = outcome || 'successful';
    callSession.notes = notes;

    // Update executive status
    const executive = this.shadowBoard.getExecutive(callSession.executiveRole);
    if (executive) {
      executive.currentActivity.type = 'thinking';
      executive.currentActivity.focus = 'call_analysis';
      executive.neuralLoad = Math.max(0.1, executive.neuralLoad - 0.2);
    }

    // Remove from active calls
    this.activeCallSessions.delete(callId);

    console.log(`📞 Call ended: ${callSession.executiveName} → ${callSession.targetNumber} (${callSession.duration}ms)`);

    this.emit('callEnded', { callSession, outcome, notes });
  }

  /**
   * Get active calls for all executives
   */
  public getActiveExecutiveCalls(): ExecutiveCallSession[] {
    return Array.from(this.activeCallSessions.values());
  }

  /**
   * Get executive voice profiles
   */
  public getExecutiveVoiceProfiles(): ExecutiveVoiceProfile[] {
    return Array.from(this.executiveVoiceProfiles.values());
  }

  /**
   * Create voice profiles for each executive
   */
  private async createExecutiveVoiceProfiles(userPhoneAllocation: UserPhoneAllocation): Promise<void> {
    const executives = this.shadowBoard.getExecutives();
    
    for (const [role, executive] of executives) {
      // Get phone number for this executive
      const phoneNumber = this.getExecutivePhoneNumber(role, userPhoneAllocation);
      if (!phoneNumber) {
        console.warn(`No phone number found for executive: ${role}`);
        continue;
      }

      // Create voice profile
      const voiceProfile: ExecutiveVoiceProfile = {
        executiveId: executive.id,
        executiveRole: role,
        executiveName: executive.name,
        voiceModelId: executive.voiceModel,
        phoneNumber,
        voiceCharacteristics: this.generateVoiceCharacteristics(role, executive),
        isVoiceModelLoaded: false,
        canMakeCalls: true,
        canReceiveCalls: true,
        maxConcurrentCalls: 3,
        currentCallCount: 0
      };

      this.executiveVoiceProfiles.set(role, voiceProfile);
      console.log(`👤 Created voice profile for ${executive.name} (${role}): ${phoneNumber}`);
    }
  }

  /**
   * Load voice models for all executives
   */
  private async loadExecutiveVoiceModels(): Promise<void> {
    const loadPromises = Array.from(this.executiveVoiceProfiles.values()).map(async (profile) => {
      try {
        // Load voice model (this would integrate with actual voice model loading)
        await this.loadVoiceModel(profile.voiceModelId);
        profile.isVoiceModelLoaded = true;
        console.log(`🎤 Loaded voice model for ${profile.executiveName}: ${profile.voiceModelId}`);
      } catch (error) {
        console.error(`Failed to load voice model for ${profile.executiveName}:`, error);
        profile.isVoiceModelLoaded = false;
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Set up call routing for executives
   */
  private async setupExecutiveCallRouting(userPhoneAllocation: UserPhoneAllocation): Promise<void> {
    // This would configure FreeSWITCH routing rules for each executive's phone number
    console.log('📞 Setting up executive call routing...');
    
    for (const [role, profile] of this.executiveVoiceProfiles) {
      // Configure routing rule for this executive's number
      console.log(`📞 Routing configured: ${profile.phoneNumber} → ${profile.executiveName}`);
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for Shadow Board events
    this.shadowBoard.on('executiveDecision', (event) => {
      this.handleExecutiveDecision(event);
    });

    // Listen for phone system events
    this.phoneSystem.on('callConnected', (event) => {
      this.handleCallConnected(event);
    });

    this.phoneSystem.on('callEnded', (event) => {
      this.handleCallEnded(event);
    });
  }

  /**
   * Get phone number for specific executive
   */
  private getExecutivePhoneNumber(role: string, allocation: UserPhoneAllocation): string | null {
    const roleMapping: Record<string, keyof typeof allocation.phoneNumbers.executives> = {
      'CFO': 'cfo',
      'CMO': 'cmo',
      'CLO': 'clo',
      'CTO': 'cto',
      'COO': 'coo',
      'CHRO': 'chro',
      'CSO': 'cso'
    };

    const mappedRole = roleMapping[role];
    if (mappedRole && allocation.phoneNumbers.executives[mappedRole]) {
      return allocation.phoneNumbers.executives[mappedRole]!;
    }

    return null;
  }

  /**
   * Generate voice characteristics for executive
   */
  private generateVoiceCharacteristics(role: string, executive: ExecutiveEntity): ExecutiveVoiceProfile['voiceCharacteristics'] {
    // Generate characteristics based on executive role and psychological profile
    const characteristics = {
      'CFO': { gender: 'female' as const, age: 'middle' as const, tone: 'professional' as const, pace: 'normal' as const },
      'CMO': { gender: 'male' as const, age: 'young' as const, tone: 'friendly' as const, pace: 'fast' as const },
      'CTO': { gender: 'male' as const, age: 'middle' as const, tone: 'authoritative' as const, pace: 'normal' as const },
      'CLO': { gender: 'female' as const, age: 'mature' as const, tone: 'professional' as const, pace: 'slow' as const }
    };

    const defaultChar = characteristics[role as keyof typeof characteristics] || {
      gender: 'male' as const,
      age: 'middle' as const,
      tone: 'professional' as const,
      pace: 'normal' as const
    };

    return {
      ...defaultChar,
      accent: 'american',
      pitch: 'medium'
    };
  }

  /**
   * Load voice model
   */
  private async loadVoiceModel(voiceModelId: string): Promise<void> {
    if (this.voiceModelCache.has(voiceModelId)) {
      return;
    }

    // Simulate voice model loading
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.voiceModelCache.set(voiceModelId, { loaded: true, modelId: voiceModelId });
  }

  /**
   * Schedule executive speech
   */
  private scheduleExecutiveSpeech(callId: string, message: string, delay: number): void {
    setTimeout(async () => {
      try {
        await this.executiveSpeak(callId, message);
      } catch (error) {
        console.error('Failed to execute scheduled speech:', error);
      }
    }, delay);
  }

  /**
   * Handle executive decision events
   */
  private handleExecutiveDecision(event: any): void {
    // Could trigger automated calls based on executive decisions
    console.log(`📊 Executive decision event: ${event.executiveRole}`);
  }

  /**
   * Handle call connected events
   */
  private handleCallConnected(event: any): void {
    // Update call session status when call connects
    for (const [callId, session] of this.activeCallSessions) {
      if (session.status === 'ringing') {
        session.status = 'connected';
        this.emit('callConnected', { callSession: session });
        break;
      }
    }
  }

  /**
   * Handle call ended events
   */
  private handleCallEnded(event: any): void {
    // Clean up call sessions when calls end
    for (const [callId, session] of this.activeCallSessions) {
      if (session.status === 'connected' || session.status === 'speaking') {
        this.endExecutiveCall(callId, 'successful');
        break;
      }
    }
  }
}
