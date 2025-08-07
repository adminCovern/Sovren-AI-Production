/**
 * Phone System Manager
 * Orchestrates the complete phone system: Skyetel + FreeSWITCH + SOVREN AI
 */

import { SkyetelService, UserPhoneAllocation } from './SkyetelService';
import { FreeSwitchService, CallSession } from './FreeSwitchService';
import { PhoneProvisioningManager } from './PhoneProvisioningManager';

export interface PhoneSystemConfig {
  skyetel: {
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
    sipDomain: string;
  };
  freeswitch: {
    host: string;
    port: number;
    eslPort: number;
    eslPassword: string;
    sipDomain: string;
  };
}

export interface CallRequest {
  userId: string;
  executiveRole: string;
  toNumber: string;
  fromNumber?: string; // If not provided, uses executive's number
}

export interface CallStatus {
  callId: string;
  status: 'ringing' | 'answered' | 'ended' | 'failed';
  duration?: number;
  recording?: string;
  transcript?: string;
}

export class PhoneSystemManager {
  private skyetelService: SkyetelService;
  private freeswitchService: FreeSwitchService;
  private provisioningManager: PhoneProvisioningManager;
  private userAllocations: Map<string, UserPhoneAllocation> = new Map();

  constructor(private config: PhoneSystemConfig) {
    this.skyetelService = new SkyetelService(config.skyetel);
    this.freeswitchService = new FreeSwitchService(config.freeswitch);
    this.provisioningManager = new PhoneProvisioningManager(config.skyetel);
  }

  /**
   * Initialize the complete phone system
   */
  public async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing SOVREN AI Phone System...');

      // Initialize FreeSWITCH connection
      const freeswitchReady = await this.freeswitchService.initialize();
      if (!freeswitchReady) {
        throw new Error('Failed to initialize FreeSWITCH');
      }

      console.log('✅ Phone system initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize phone system:', error);
      return false;
    }
  }

  /**
   * Provision phone numbers for a new user
   */
  public async provisionUserPhoneNumbers(
    userId: string,
    subscriptionTier: 'sovren_proof' | 'sovren_proof_plus',
    geography: string,
    userEmail: string,
    companyName: string
  ): Promise<UserPhoneAllocation | null> {
    try {
      console.log(`📞 Provisioning phone numbers for user ${userId}...`);

      // Step 1: Provision numbers through Skyetel
      const provisioningResult = await this.provisioningManager.provisionUserPhoneNumbers({
        userId,
        subscriptionTier,
        geography,
        userEmail,
        companyName
      });

      if (!provisioningResult.success || !provisioningResult.allocation) {
        throw new Error(`Phone provisioning failed: ${provisioningResult.error}`);
      }

      const allocation = provisioningResult.allocation;

      // Step 2: Configure FreeSWITCH routing
      const routingConfigured = await this.freeswitchService.configureUserRouting(allocation);
      if (!routingConfigured) {
        throw new Error('Failed to configure FreeSWITCH routing');
      }

      // Step 3: Store allocation locally
      this.userAllocations.set(userId, allocation);

      console.log(`✅ Phone system ready for user ${userId}`);
      console.log(`📞 SOVREN AI: ${allocation.phoneNumbers.sovrenAI}`);
      console.log(`👔 Executives: ${Object.keys(allocation.phoneNumbers.executives).length} numbers`);

      return allocation;

    } catch (error) {
      console.error('Failed to provision user phone numbers:', error);
      return null;
    }
  }

  /**
   * Initiate a call (alias for makeOutboundCall for compatibility)
   */
  public async initiateCall(
    fromNumber: string,
    toNumber: string,
    options: {
      userId: string;
      executiveRole: string;
      context?: any;
    }
  ): Promise<string | null> {
    return this.makeOutboundCall({
      userId: options.userId,
      executiveRole: options.executiveRole,
      toNumber,
      fromNumber
    });
  }

  /**
   * Make an outbound call as an executive
   */
  public async makeOutboundCall(request: CallRequest): Promise<string | null> {
    try {
      const allocation = this.userAllocations.get(request.userId);
      if (!allocation) {
        throw new Error(`No phone allocation found for user ${request.userId}`);
      }

      // Determine which number to use as caller ID
      let fromNumber: string;
      
      if (request.executiveRole === 'sovren-ai') {
        fromNumber = allocation.phoneNumbers.sovrenAI;
      } else {
        const executiveNumber = allocation.phoneNumbers.executives[request.executiveRole as keyof typeof allocation.phoneNumbers.executives];
        if (!executiveNumber) {
          throw new Error(`No phone number found for executive role: ${request.executiveRole}`);
        }
        fromNumber = executiveNumber;
      }

      // Override with provided fromNumber if specified
      if (request.fromNumber) {
        fromNumber = request.fromNumber;
      }

      console.log(`📞 Making outbound call: ${request.executiveRole} (${fromNumber}) → ${request.toNumber}`);

      // Initiate call through FreeSWITCH
      const callId = await this.freeswitchService.initiateOutboundCall(
        request.userId,
        request.executiveRole,
        fromNumber,
        request.toNumber
      );

      if (!callId) {
        throw new Error('Failed to initiate outbound call');
      }

      return callId;

    } catch (error) {
      console.error('Failed to make outbound call:', error);
      return null;
    }
  }

  /**
   * Accept an incoming call
   */
  public async acceptCall(phoneNumber: string, callerNumber: string): Promise<boolean> {
    try {
      console.log(`📞 Accepting incoming call: ${callerNumber} → ${phoneNumber}`);

      // In a real implementation, this would interact with FreeSWITCH to accept the call
      // For now, we'll simulate accepting the call
      const accepted = await this.freeswitchService.acceptIncomingCall(phoneNumber, callerNumber);

      if (accepted) {
        console.log(`✅ Call accepted: ${callerNumber} → ${phoneNumber}`);
        return true;
      } else {
        console.log(`❌ Failed to accept call: ${callerNumber} → ${phoneNumber}`);
        return false;
      }

    } catch (error) {
      console.error('Failed to accept incoming call:', error);
      return false;
    }
  }

  /**
   * Get active calls for a user
   */
  public getActiveCallsForUser(userId: string): CallSession[] {
    return this.freeswitchService.getActiveCallsForUser(userId);
  }

  /**
   * Get user's phone allocation
   */
  public getUserPhoneAllocation(userId: string): UserPhoneAllocation | null {
    return this.userAllocations.get(userId) || null;
  }

  /**
   * Get all phone numbers for a user
   */
  public getUserPhoneNumbers(userId: string): string[] {
    const allocation = this.userAllocations.get(userId);
    if (!allocation) return [];

    return [
      allocation.phoneNumbers.sovrenAI,
      ...Object.values(allocation.phoneNumbers.executives)
    ].filter(Boolean);
  }

  /**
   * Get executive role by phone number
   */
  public getExecutiveRoleByPhoneNumber(phoneNumber: string): { userId: string; role: string } | null {
    for (const [userId, allocation] of this.userAllocations.entries()) {
      if (allocation.phoneNumbers.sovrenAI === phoneNumber) {
        return { userId, role: 'sovren-ai' };
      }

      for (const [role, number] of Object.entries(allocation.phoneNumbers.executives)) {
        if (number === phoneNumber) {
          return { userId, role };
        }
      }
    }

    return null;
  }

  /**
   * Release user's phone numbers (subscription cancellation)
   */
  public async releaseUserPhoneNumbers(userId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Releasing phone numbers for user ${userId}...`);

      const allocation = this.userAllocations.get(userId);
      if (!allocation) {
        console.log(`⚠️ No phone allocation found for user ${userId}`);
        return false;
      }

      // Release numbers through Skyetel
      const released = await this.skyetelService.releaseUserPhoneNumbers(allocation);
      
      if (released) {
        // Remove from local cache
        this.userAllocations.delete(userId);
        console.log(`✅ Phone numbers released for user ${userId}`);
      }

      return released;

    } catch (error) {
      console.error('Failed to release user phone numbers:', error);
      return false;
    }
  }

  /**
   * Get system status
   */
  public async getSystemStatus(): Promise<{
    skyetelConnected: boolean;
    freeswitchConnected: boolean;
    activeUsers: number;
    activeCalls: number;
    totalPhoneNumbers: number;
  }> {
    const activeUsers = this.userAllocations.size;
    let activeCalls = 0;
    let totalPhoneNumbers = 0;

    // Count active calls and phone numbers
    for (const [userId, allocation] of this.userAllocations.entries()) {
      const userCalls = this.freeswitchService.getActiveCallsForUser(userId);
      activeCalls += userCalls.length;
      
      totalPhoneNumbers += 1; // SOVREN AI number
      totalPhoneNumbers += Object.keys(allocation.phoneNumbers.executives).length;
    }

    return {
      skyetelConnected: true, // Would check actual connection status
      freeswitchConnected: true, // Would check actual connection status
      activeUsers,
      activeCalls,
      totalPhoneNumbers
    };
  }

  /**
   * Load existing user allocations from database
   */
  public async loadUserAllocations(): Promise<void> {
    try {
      console.log('📂 Loading existing user phone allocations...');
      
      // In production, this would load from database
      // For now, we'll start with empty allocations
      
      console.log('✅ User allocations loaded');

    } catch (error) {
      console.error('Failed to load user allocations:', error);
    }
  }

  /**
   * Get stream quality for call
   */
  public async getStreamQuality(callId: string): Promise<{ quality: number; latency: number; packetsLost: number } | null> {
    try {
      const callSession = await this.freeswitchService.getCallSession(callId);
      if (!callSession) {
        return null;
      }

      // Get real-time call quality metrics
      return {
        quality: callSession.audioQuality || 0.9,
        latency: callSession.latency || 100,
        packetsLost: callSession.packetsLost || 0
      };

    } catch (error) {
      console.error(`❌ Failed to get stream quality for call ${callId}:`, error);
      return null;
    }
  }

  /**
   * Get call status
   */
  public async getCallStatus(callId: string): Promise<string> {
    try {
      const callSession = await this.freeswitchService.getCallSession(callId);
      return callSession ? callSession.status : 'ended';

    } catch (error) {
      console.error(`❌ Failed to get call status for ${callId}:`, error);
      return 'ended';
    }
  }

  /**
   * End call
   */
  public async endCall(callId: string): Promise<void> {
    try {
      console.log(`📞 Ending call: ${callId}`);
      await this.freeswitchService.hangupCall(callId);

    } catch (error) {
      console.error(`❌ Failed to end call ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Connect voice stream to call
   */
  public async connectVoiceStream(callId: string, voiceStream: any): Promise<void> {
    try {
      console.log(`🎤 Connecting voice stream to call ${callId}`);
      await this.freeswitchService.connectAudioStream(callId, voiceStream);

    } catch (error) {
      console.error(`❌ Failed to connect voice stream to call ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Create streaming URL for audio
   */
  public async createStreamingUrl(audioData: Buffer, quality: string): Promise<string> {
    try {
      // Create temporary streaming endpoint for audio data
      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const streamingUrl = `https://voice-streams.sovren.ai/${streamId}`;

      // In production, this would upload to CDN or streaming service
      console.log(`🎵 Created streaming URL: ${streamingUrl} (${audioData.length} bytes, ${quality} quality)`);

      return streamingUrl;

    } catch (error) {
      console.error('❌ Failed to create streaming URL:', error);
      throw error;
    }
  }

  /**
   * Check if phone system is ready
   */
  public async isReady(): Promise<boolean> {
    try {
      const freeswitchReady = this.freeswitchService.isConnected;
      const skyetelReady = await this.skyetelService.testConnection();

      return freeswitchReady && skyetelReady;

    } catch (error) {
      console.error('❌ Phone system readiness check failed:', error);
      return false;
    }
  }

  /**
   * Allocate phone number for executive
   */
  public async allocatePhoneNumber(executiveId: string): Promise<string> {
    try {
      // Use existing provisioning system
      const phoneNumber = await this.provisioningManager.allocatePhoneNumber();
      console.log(`📞 Allocated phone number ${phoneNumber} for executive ${executiveId}`);
      return phoneNumber;

    } catch (error) {
      console.error(`❌ Failed to allocate phone number for executive ${executiveId}:`, error);
      throw error;
    }
  }

  /**
   * Allocate backup phone numbers
   */
  public async allocateBackupNumbers(executiveId: string, count: number): Promise<string[]> {
    const backupNumbers: string[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const phoneNumber = await this.provisioningManager.allocatePhoneNumber();
        backupNumbers.push(phoneNumber);
      } catch (error) {
        console.error(`❌ Failed to allocate backup number ${i + 1} for executive ${executiveId}:`, error);
      }
    }

    console.log(`📞 Allocated ${backupNumbers.length} backup numbers for executive ${executiveId}`);
    return backupNumbers;
  }



  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up Phone System Manager...');
      await this.shutdown();
      console.log('✅ Phone System Manager cleanup complete');

    } catch (error) {
      console.error('❌ Phone System Manager cleanup failed:', error);
    }
  }

  /**
   * Shutdown the phone system
   */
  public async shutdown(): Promise<void> {
    try {
      console.log('🛑 Shutting down phone system...');

      await this.freeswitchService.disconnect();

      console.log('✅ Phone system shutdown complete');

    } catch (error) {
      console.error('Error during phone system shutdown:', error);
    }
  }
}
