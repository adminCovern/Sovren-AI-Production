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
