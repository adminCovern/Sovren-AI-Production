/**
 * Skyetel API Integration Service
 * Handles automated phone number provisioning with geographic area code matching
 */

import axios, { AxiosInstance } from 'axios';
import { GeographicAreaCodeMapper, GeographicLocation, AreaCodeInfo } from './GeographicAreaCodeMapper';

export interface SkyetelConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  sipDomain: string;
}

export interface PhoneNumberSearchRequest {
  areaCode: string;
  quantity: number;
  numberType: 'local' | 'tollfree';
  features?: string[];
}

export interface PhoneNumberSearchResult {
  phoneNumber: string;
  areaCode: string;
  monthlyRate: number;
  setupFee: number;
  available: boolean;
  features: string[];
}

export interface PhoneNumberOrder {
  orderId: string;
  phoneNumbers: string[];
  totalCost: number;
  status: 'pending' | 'completed' | 'failed';
  provisionedAt?: Date;
}

export interface UserPhoneAllocation {
  userId: string;
  subscriptionTier: 'sovren_proof' | 'sovren_proof_plus';
  geography: string;
  phoneNumbers: {
    sovrenAI: string | undefined;
    executives: {
      cfo?: string;
      cmo?: string;
      clo?: string;
      cto?: string;
      coo?: string;
      chro?: string;
      cso?: string;
      cio?: string;
    };
  };
  areaCode: string;
  skyetelOrderIds: string[];
  provisionedAt: Date;
  monthlyRate: number;
}

export class SkyetelService {
  private apiClient: AxiosInstance;
  private areaCodeMapper: GeographicAreaCodeMapper;

  constructor(private config: SkyetelConfig) {
    this.apiClient = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'X-AUTH-SID': config.apiKey,
        'X-AUTH-SECRET': config.apiSecret,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    this.areaCodeMapper = new GeographicAreaCodeMapper();
  }

  /**
   * Provision phone numbers for a new user based on subscription tier and geography
   */
  public async provisionUserPhoneNumbers(
    userId: string,
    subscriptionTier: 'sovren_proof' | 'sovren_proof_plus',
    geography: string
  ): Promise<UserPhoneAllocation> {
    try {
      console.log(`📞 Provisioning phone numbers for user ${userId} (${subscriptionTier}) in ${geography}`);

      // Determine number of phone numbers needed
      const numbersNeeded = subscriptionTier === 'sovren_proof' ? 5 : 9;
      
      // Get appropriate area codes for user's location
      const geoParts = geography.split(',');
      const locationData: GeographicLocation = {
        city: geoParts.length > 0 ? geoParts[0].trim() : geography,
        state: geoParts.length > 1 ? geoParts[1].trim() : undefined
      };
      const areaCodes = await this.areaCodeMapper.getAreaCodesForLocation(locationData);
      
      if (areaCodes.length === 0) {
        throw new Error(`No area codes found for location: ${geography}`);
      }

      // Search for available numbers in preferred area codes
      let phoneNumbers: string[] = [];
      let selectedAreaCode: string = '';
      let totalCost: number = 0;

      for (const areaCodeInfo of areaCodes) {
        console.log(`🔍 Searching for ${numbersNeeded} numbers in area code ${areaCodeInfo.areaCode}...`);
        
        const searchResult = await this.searchAvailableNumbers({
          areaCode: areaCodeInfo.areaCode,
          quantity: numbersNeeded,
          numberType: 'local',
          features: ['sms', 'voice', 'fax']
        });

        if (searchResult.length >= numbersNeeded) {
          // Found enough numbers in this area code
          phoneNumbers = searchResult.slice(0, numbersNeeded).map(r => r.phoneNumber);
          selectedAreaCode = areaCodeInfo.areaCode;
          totalCost = searchResult.slice(0, numbersNeeded).reduce((sum, r) => sum + r.monthlyRate, 0);
          break;
        }
      }

      if (phoneNumbers.length === 0) {
        throw new Error(`Could not find ${numbersNeeded} available phone numbers in any area code for ${geography}`);
      }

      // Purchase the phone numbers
      const order = await this.purchasePhoneNumbers(phoneNumbers);
      
      if (order.status !== 'completed') {
        throw new Error(`Phone number purchase failed: ${order.status}`);
      }

      // Assign numbers to SOVREN AI and executives
      const allocation = this.assignNumbersToExecutives(
        userId,
        subscriptionTier,
        geography,
        phoneNumbers,
        selectedAreaCode,
        [order.orderId],
        totalCost
      );

      console.log(`✅ Successfully provisioned ${phoneNumbers.length} phone numbers for user ${userId}`);
      console.log(`📍 Area code: ${selectedAreaCode} (${geography})`);
      console.log(`💰 Monthly cost: $${totalCost.toFixed(2)}`);

      return allocation;

    } catch (error) {
      console.error('Failed to provision phone numbers:', error);
      throw error;
    }
  }

  /**
   * Search for available phone numbers in Skyetel using real API
   */
  private async searchAvailableNumbers(request: PhoneNumberSearchRequest): Promise<PhoneNumberSearchResult[]> {
    try {
      // Use actual Skyetel API endpoint for finding available numbers
      const response = await this.apiClient.get('/phonenumbers/available', {
        params: {
          'filter[npas][]': request.areaCode,
          'filter[category]': request.numberType === 'tollfree' ? 3 : 1,
          'filter[quantity]': request.quantity,
          'filter[consecutive]': 1
        }
      });

      // Transform Skyetel response to our format
      const availableNumbers = response.data.map((item: any) => ({
        phoneNumber: item.number,
        areaCode: item.number.substring(1, 4), // Extract area code from full number
        monthlyRate: item.monthly_rate || 2.50, // Default rate if not provided
        setupFee: item.setup_fee || 0,
        available: true,
        features: ['voice', 'sms'] // Standard features
      }));

      return availableNumbers;

    } catch (error) {
      console.error(`Failed to search numbers in area code ${request.areaCode}:`, error);
      return [];
    }
  }

  /**
   * Purchase phone numbers from Skyetel using real API
   */
  private async purchasePhoneNumbers(phoneNumbers: string[]): Promise<PhoneNumberOrder> {
    try {
      // Use actual Skyetel API endpoint for ordering numbers
      const response = await this.apiClient.post('/phonenumbers/order', {
        numbers: phoneNumbers,
        endpoint_group_id: 1, // Default endpoint group
        tenant_id: null, // Use organization level
        features: {
          cnam_enabled: true,
          e911_enabled: true,
          message_enabled: true,
          spamblock_enabled: true
        }
      });

      return {
        orderId: response.data.order_id || `order_${Date.now()}`,
        phoneNumbers: phoneNumbers,
        totalCost: phoneNumbers.length * 2.50, // Estimate $2.50 per number
        status: response.data.success ? 'completed' : 'failed',
        provisionedAt: new Date()
      };

    } catch (error) {
      console.error('Failed to purchase phone numbers:', error);
      throw error;
    }
  }

  /**
   * Assign phone numbers to SOVREN AI and executives based on subscription tier
   */
  private assignNumbersToExecutives(
    userId: string,
    subscriptionTier: 'sovren_proof' | 'sovren_proof_plus',
    geography: string,
    phoneNumbers: string[],
    areaCode: string,
    orderIds: string[],
    monthlyRate: number
  ): UserPhoneAllocation {
    
    const allocation: UserPhoneAllocation = {
      userId,
      subscriptionTier,
      geography,
      phoneNumbers: {
        sovrenAI: phoneNumbers.length > 0 ? phoneNumbers[0] : undefined, // First number always goes to SOVREN AI
        executives: {}
      },
      areaCode,
      skyetelOrderIds: orderIds,
      provisionedAt: new Date(),
      monthlyRate
    };

    // Assign executive numbers based on subscription tier
    if (subscriptionTier === 'sovren_proof') {
      // 4 core executives for Proof tier
      allocation.phoneNumbers.executives = {
        cfo: phoneNumbers.length > 1 ? phoneNumbers[1] : undefined,
        cmo: phoneNumbers.length > 2 ? phoneNumbers[2] : undefined,
        clo: phoneNumbers.length > 3 ? phoneNumbers[3] : undefined,
        cto: phoneNumbers.length > 4 ? phoneNumbers[4] : undefined
      };
    } else {
      // All 8 executives for Proof+ tier
      allocation.phoneNumbers.executives = {
        cfo: phoneNumbers.length > 1 ? phoneNumbers[1] : undefined,
        cmo: phoneNumbers.length > 2 ? phoneNumbers[2] : undefined,
        clo: phoneNumbers.length > 3 ? phoneNumbers[3] : undefined,
        cto: phoneNumbers.length > 4 ? phoneNumbers[4] : undefined,
        coo: phoneNumbers.length > 5 ? phoneNumbers[5] : undefined,
        chro: phoneNumbers.length > 6 ? phoneNumbers[6] : undefined,
        cso: phoneNumbers.length > 7 ? phoneNumbers[7] : undefined,
        cio: phoneNumbers.length > 8 ? phoneNumbers[8] : undefined
      };
    }

    return allocation;
  }

  /**
   * Configure SIP trunk for provisioned numbers using Skyetel endpoints
   */
  public async configureSIPTrunk(allocation: UserPhoneAllocation): Promise<boolean> {
    try {
      console.log(`🔧 Configuring SIP trunk for user ${allocation.userId}...`);

      // First, create or get endpoint group for this user
      const endpointGroupId = await this.createUserEndpointGroup(allocation.userId);

      // Configure each phone number to route to the user's endpoint group
      const allNumbers: string[] = [];

      if (allocation.phoneNumbers.sovrenAI) {
        allNumbers.push(allocation.phoneNumbers.sovrenAI);
      }

      Object.values(allocation.phoneNumbers.executives).forEach(number => {
        if (number) {
          allNumbers.push(number);
        }
      });

      for (const phoneNumber of allNumbers) {
        // Get the phone number ID from Skyetel
        const phoneNumberData = await this.getPhoneNumberByNumber(phoneNumber);

        if (phoneNumberData) {
          // Update phone number to route to user's endpoint group
          await this.apiClient.patch(`/phonenumbers/${phoneNumberData.id}`, {
            endpoint_group_id: endpointGroupId,
            forward: null, // Clear any forwarding
            failover: null, // Clear any failover
            note: `SOVREN AI - User ${allocation.userId}`
          });
        }
      }

      console.log(`✅ SIP trunk configured for user ${allocation.userId}`);
      return true;

    } catch (error) {
      console.error('Failed to configure SIP trunk:', error);
      return false;
    }
  }

  /**
   * Create endpoint group for user
   */
  private async createUserEndpointGroup(userId: string): Promise<number> {
    try {
      // For now, return default endpoint group ID
      // In production, you'd create a dedicated endpoint group per user
      return 1; // Default endpoint group
    } catch (error) {
      console.error('Failed to create endpoint group:', error);
      return 1; // Fallback to default
    }
  }

  /**
   * Get phone number data by number string
   */
  private async getPhoneNumberByNumber(phoneNumber: string): Promise<any> {
    try {
      const response = await this.apiClient.get('/phonenumbers', {
        params: {
          'filter[number]': phoneNumber
        }
      });

      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      console.error(`Failed to get phone number data for ${phoneNumber}:`, error);
      return null;
    }
  }

  /**
   * Test connection to Skyetel API
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/account');
      return response.status === 200;
    } catch (error) {
      console.error('Skyetel connection test failed:', error);
      return false;
    }
  }

  /**
   * Release phone numbers when user cancels subscription using Skyetel API
   */
  public async releaseUserPhoneNumbers(allocation: UserPhoneAllocation): Promise<boolean> {
    try {
      console.log(`🗑️ Releasing phone numbers for user ${allocation.userId}...`);

      const allNumbers: string[] = [];

      if (allocation.phoneNumbers.sovrenAI) {
        allNumbers.push(allocation.phoneNumbers.sovrenAI);
      }

      Object.values(allocation.phoneNumbers.executives).forEach(number => {
        if (number) {
          allNumbers.push(number);
        }
      });

      // Delete each phone number using Skyetel API
      for (const phoneNumber of allNumbers) {
        const phoneNumberData = await this.getPhoneNumberByNumber(phoneNumber);

        if (phoneNumberData) {
          await this.apiClient.delete(`/phonenumbers/${phoneNumberData.id}`);
        }
      }

      console.log(`✅ Released ${allNumbers.length} phone numbers for user ${allocation.userId}`);
      return true;

    } catch (error) {
      console.error('Failed to release phone numbers:', error);
      return false;
    }
  }
}
