/**
 * Phone Number Provisioning Manager
 * Orchestrates the complete phone number provisioning process during user onboarding
 */

import { SkyetelService, UserPhoneAllocation } from './SkyetelService';
import { GeographicAreaCodeMapper } from './GeographicAreaCodeMapper';

export interface ProvisioningRequest {
  userId: string;
  subscriptionTier: 'sovren_proof' | 'sovren_proof_plus';
  geography: string;
  userEmail: string;
  companyName: string;
}

export interface ProvisioningResult {
  success: boolean;
  allocation?: UserPhoneAllocation;
  error?: string;
  estimatedMonthlyCost: number;
  provisioningTimeMs: number;
}

export class PhoneProvisioningManager {
  private skyetelService: SkyetelService;
  private areaCodeMapper: GeographicAreaCodeMapper;
  private provisioningCache: Map<string, UserPhoneAllocation> = new Map();

  constructor(skyetelConfig: any) {
    this.skyetelService = new SkyetelService(skyetelConfig);
    this.areaCodeMapper = new GeographicAreaCodeMapper();
  }

  /**
   * Initialize the phone provisioning manager
   */
  public async initialize(): Promise<void> {
    console.log('📞 Initializing Phone Provisioning Manager...');
    // Initialize area code mapper and skyetel service
    await this.areaCodeMapper.initialize();
    console.log('✅ Phone Provisioning Manager initialized');
  }

  /**
   * Allocate a phone number for an executive
   */
  public async allocatePhoneNumber(): Promise<string> {
    // Simple allocation - in production this would be more sophisticated
    const areaCode = '415'; // Default to San Francisco area
    const number = `+1${areaCode}${Math.floor(Math.random() * 9000000) + 1000000}`;
    console.log(`📞 Allocated phone number: ${number}`);
    return number;
  }

  /**
   * Complete phone number provisioning process for new user
   */
  public async provisionUserPhoneNumbers(request: ProvisioningRequest): Promise<ProvisioningResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 Starting phone provisioning for user ${request.userId}`);
      console.log(`📍 Location: ${request.geography}`);
      console.log(`💼 Tier: ${request.subscriptionTier}`);

      // Step 1: Check if already provisioned (prevent duplicates)
      if (this.provisioningCache.has(request.userId)) {
        console.log(`⚠️ User ${request.userId} already has phone numbers provisioned`);
        return {
          success: false,
          error: 'Phone numbers already provisioned for this user',
          estimatedMonthlyCost: 0,
          provisioningTimeMs: Date.now() - startTime
        };
      }

      // Step 2: Provision phone numbers through Skyetel
      const allocation = await this.skyetelService.provisionUserPhoneNumbers(
        request.userId,
        request.subscriptionTier,
        request.geography
      );

      // Step 3: Configure SIP trunk for the numbers
      const sipConfigured = await this.skyetelService.configureSIPTrunk(allocation);
      
      if (!sipConfigured) {
        throw new Error('Failed to configure SIP trunk for provisioned numbers');
      }

      // Step 4: Store allocation in cache and database
      this.provisioningCache.set(request.userId, allocation);
      await this.storeAllocationInDatabase(allocation);

      // Step 5: Generate dynamic phone delegation matrix for this user
      await this.generateUserPhoneDelegationMatrix(allocation, request);

      const provisioningTime = Date.now() - startTime;

      console.log(`✅ Phone provisioning completed for user ${request.userId} in ${provisioningTime}ms`);
      console.log(`📞 SOVREN AI: ${allocation.phoneNumbers.sovrenAI}`);
      console.log(`👔 Executives: ${Object.keys(allocation.phoneNumbers.executives).length} numbers`);

      return {
        success: true,
        allocation,
        estimatedMonthlyCost: allocation.monthlyRate,
        provisioningTimeMs: provisioningTime
      };

    } catch (error) {
      console.error('Phone provisioning failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown provisioning error',
        estimatedMonthlyCost: 0,
        provisioningTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Generate user-specific phone delegation matrix
   */
  private async generateUserPhoneDelegationMatrix(
    allocation: UserPhoneAllocation, 
    request: ProvisioningRequest
  ): Promise<void> {
    const delegationMatrix = {
      version: "1.0",
      userId: allocation.userId,
      subscriptionTier: allocation.subscriptionTier,
      geography: allocation.geography,
      lastUpdated: new Date().toISOString(),
      
      entities: {
        "sovren-ai": {
          name: "SOVREN AI",
          role: "Neural OS Core",
          phoneNumber: allocation.phoneNumbers.sovrenAI,
          priority: 11,
          capabilities: {
            canInitiateCalls: true,
            canReceiveCalls: true,
            canTransferCalls: true,
            canConferenceCalls: true,
            maxConcurrentCalls: 10,
            autoAnswer: true,
            recordCalls: true
          },
          workingHours: {
            timezone: "UTC",
            schedule: "24/7",
            alwaysAvailable: true
          }
        }
      },

      callRouting: {
        mainNumber: allocation.phoneNumbers.sovrenAI,
        defaultHandler: "sovren-ai",
        areaCode: allocation.areaCode,
        geography: allocation.geography
      },

      integrations: {
        skyetelSIPTrunk: {
          enabled: true,
          provider: "Skyetel",
          endpoint: "sip.skyetel.com",
          orderIds: allocation.skyetelOrderIds,
          provisionedAt: allocation.provisionedAt.toISOString()
        }
      }
    };

    // Add executives based on subscription tier
    const executiveRoles = this.getExecutiveRolesForTier(allocation.subscriptionTier);
    
    executiveRoles.forEach((role, index) => {
      const phoneNumber = allocation.phoneNumbers.executives[role as keyof typeof allocation.phoneNumbers.executives];
      
      if (phoneNumber) {
        (delegationMatrix.entities as any)[role] = {
          name: this.getExecutiveName(role),
          role: role.toUpperCase(),
          phoneNumber: phoneNumber,
          priority: 10 - index,
          capabilities: {
            canInitiateCalls: true,
            canReceiveCalls: true,
            canTransferCalls: true,
            canConferenceCalls: true,
            maxConcurrentCalls: 3,
            autoAnswer: false,
            recordCalls: true
          },
          specializations: this.getExecutiveSpecializations(role),
          workingHours: {
            timezone: this.getTimezoneForAreaCode(allocation.areaCode),
            schedule: "9AM-6PM",
            alwaysAvailable: false
          }
        };
      }
    });

    // Store user-specific delegation matrix
    await this.storeUserDelegationMatrix(allocation.userId, delegationMatrix);
  }

  /**
   * Get executive roles for subscription tier
   */
  private getExecutiveRolesForTier(tier: 'sovren_proof' | 'sovren_proof_plus'): string[] {
    if (tier === 'sovren_proof') {
      return ['cfo', 'cmo', 'clo', 'cto']; // 4 core executives
    } else {
      return ['cfo', 'cmo', 'clo', 'cto', 'coo', 'chro', 'cso', 'cio']; // All 8 executives
    }
  }

  /**
   * Get executive display name
   */
  private getExecutiveName(role: string): string {
    const names = {
      cfo: 'Chief Financial Officer',
      cmo: 'Chief Marketing Officer', 
      clo: 'Chief Legal Officer',
      cto: 'Chief Technology Officer',
      coo: 'Chief Operating Officer',
      chro: 'Chief Human Resources Officer',
      cso: 'Chief Security Officer',
      cio: 'Chief Information Officer'
    };
    return names[role as keyof typeof names] || role.toUpperCase();
  }

  /**
   * Get executive specializations
   */
  private getExecutiveSpecializations(role: string): string[] {
    const specializations = {
      cfo: ['financial-analysis', 'risk-management', 'investment-strategy', 'budgeting'],
      cmo: ['marketing-strategy', 'brand-management', 'customer-acquisition', 'growth'],
      clo: ['legal-compliance', 'contract-management', 'risk-mitigation', 'regulatory'],
      cto: ['technology-strategy', 'innovation', 'digital-transformation', 'architecture'],
      coo: ['operations-optimization', 'process-improvement', 'efficiency', 'execution'],
      chro: ['talent-management', 'organizational-development', 'culture', 'leadership'],
      cso: ['security-strategy', 'threat-assessment', 'crisis-management', 'compliance'],
      cio: ['information-systems', 'data-strategy', 'digital-infrastructure', 'analytics']
    };
    return specializations[role as keyof typeof specializations] || [];
  }

  /**
   * Get timezone for area code
   */
  private getTimezoneForAreaCode(areaCode: string): string {
    const areaCodeInfo = this.areaCodeMapper.getAreaCodeInfo(areaCode);
    return areaCodeInfo?.timezone || 'America/New_York';
  }

  /**
   * Store allocation in database
   */
  private async storeAllocationInDatabase(allocation: UserPhoneAllocation): Promise<void> {
    // This would integrate with your database system
    console.log(`💾 Storing phone allocation for user ${allocation.userId} in database`);
    // Implementation would go here
  }

  /**
   * Store user-specific delegation matrix
   */
  private async storeUserDelegationMatrix(userId: string, matrix: any): Promise<void> {
    // Store user-specific phone delegation matrix
    console.log(`💾 Storing delegation matrix for user ${userId}`);
    // Implementation would go here
  }

  /**
   * Get user's phone allocation
   */
  public async getUserPhoneAllocation(userId: string): Promise<UserPhoneAllocation | null> {
    return this.provisioningCache.get(userId) || null;
  }

  /**
   * Release user's phone numbers (for subscription cancellation)
   */
  public async releaseUserPhoneNumbers(userId: string): Promise<boolean> {
    const allocation = this.provisioningCache.get(userId);
    
    if (!allocation) {
      console.log(`⚠️ No phone allocation found for user ${userId}`);
      return false;
    }

    const released = await this.skyetelService.releaseUserPhoneNumbers(allocation);
    
    if (released) {
      this.provisioningCache.delete(userId);
      console.log(`✅ Released phone numbers for user ${userId}`);
    }

    return released;
  }
}
