/**
 * Phone System Manager Tests
 * Integration tests for the complete phone system orchestration
 */

import { PhoneSystemManager, PhoneSystemConfig, CallRequest } from '../../lib/telephony/PhoneSystemManager';
import { SkyetelService, UserPhoneAllocation } from '../../lib/telephony/SkyetelService';
import { FreeSwitchService } from '../../lib/telephony/FreeSwitchService';
import { PhoneProvisioningManager } from '../../lib/telephony/PhoneProvisioningManager';

// Mock dependencies
jest.mock('../../lib/telephony/SkyetelService');
jest.mock('../../lib/telephony/FreeSwitchService');
jest.mock('../../lib/telephony/PhoneProvisioningManager');

describe('PhoneSystemManager', () => {
  let phoneSystemManager: PhoneSystemManager;
  let mockSkyetelService: jest.Mocked<SkyetelService>;
  let mockFreeSwitchService: jest.Mocked<FreeSwitchService>;
  let mockProvisioningManager: jest.Mocked<PhoneProvisioningManager>;

  const mockConfig: PhoneSystemConfig = {
    skyetel: {
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      baseUrl: 'https://api.skyetel.com/v1',
      sipDomain: 'sip.sovren.ai'
    },
    freeswitch: {
      host: 'localhost',
      port: 5060,
      eslPort: 8021,
      eslPassword: 'ClueCon',
      sipDomain: 'sovren.local'
    }
  };

  const mockUserAllocation: UserPhoneAllocation = {
    userId: 'test-user-123',
    subscriptionTier: 'sovren_proof',
    geography: 'San Francisco, CA',
    phoneNumbers: {
      sovrenAI: '+14155551001',
      executives: {
        cfo: '+14155551002',
        cmo: '+14155551003',
        clo: '+14155551004',
        cto: '+14155551005'
      }
    },
    areaCode: '415',
    skyetelOrderIds: ['order-123'],
    provisionedAt: new Date(),
    monthlyRate: 25.00
  };

  beforeEach(() => {
    // Create mocked instances
    mockSkyetelService = new SkyetelService({} as any) as jest.Mocked<SkyetelService>;
    mockFreeSwitchService = new FreeSwitchService({} as any) as jest.Mocked<FreeSwitchService>;
    mockProvisioningManager = new PhoneProvisioningManager({} as any) as jest.Mocked<PhoneProvisioningManager>;

    // Mock constructor calls
    (SkyetelService as jest.Mock).mockReturnValue(mockSkyetelService);
    (FreeSwitchService as jest.Mock).mockReturnValue(mockFreeSwitchService);
    (PhoneProvisioningManager as jest.Mock).mockReturnValue(mockProvisioningManager);

    phoneSystemManager = new PhoneSystemManager(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize all components successfully', async () => {
      mockFreeSwitchService.initialize.mockResolvedValue(true);
      mockProvisioningManager.initialize.mockResolvedValue(undefined);

      const result = await phoneSystemManager.initialize();

      expect(result).toBe(true);
      expect(mockFreeSwitchService.initialize).toHaveBeenCalled();
      expect(mockProvisioningManager.initialize).toHaveBeenCalled();
    });

    it('should handle FreeSWITCH initialization failure', async () => {
      mockFreeSwitchService.initialize.mockResolvedValue(false);

      const result = await phoneSystemManager.initialize();

      expect(result).toBe(false);
    });

    it('should handle provisioning manager initialization failure', async () => {
      mockFreeSwitchService.initialize.mockResolvedValue(true);
      mockProvisioningManager.initialize.mockRejectedValue(new Error('Provisioning init failed'));

      const result = await phoneSystemManager.initialize();

      expect(result).toBe(false);
    });
  });

  describe('Phone Number Provisioning', () => {
    beforeEach(async () => {
      mockFreeSwitchService.initialize.mockResolvedValue(true);
      mockProvisioningManager.initialize.mockResolvedValue(undefined);
      await phoneSystemManager.initialize();
    });

    it('should provision phone numbers successfully', async () => {
      mockProvisioningManager.provisionUserPhoneNumbers.mockResolvedValue({
        success: true,
        allocation: mockUserAllocation,
        estimatedMonthlyCost: 25.00,
        provisioningTimeMs: 5000
      });

      mockFreeSwitchService.configureUserRouting.mockResolvedValue(true);

      const result = await phoneSystemManager.provisionUserPhoneNumbers(
        'test-user-123',
        'sovren_proof',
        'San Francisco, CA',
        'test@example.com',
        'Test Company'
      );

      expect(result).toEqual(mockUserAllocation);
      expect(mockProvisioningManager.provisionUserPhoneNumbers).toHaveBeenCalledWith({
        userId: 'test-user-123',
        subscriptionTier: 'sovren_proof',
        geography: 'San Francisco, CA',
        userEmail: 'test@example.com',
        companyName: 'Test Company'
      });
      expect(mockFreeSwitchService.configureUserRouting).toHaveBeenCalledWith(mockUserAllocation);
    });

    it('should handle provisioning failures', async () => {
      mockProvisioningManager.provisionUserPhoneNumbers.mockResolvedValue({
        success: false,
        error: 'Provisioning failed',
        estimatedMonthlyCost: 0,
        provisioningTimeMs: 1000
      });

      const result = await phoneSystemManager.provisionUserPhoneNumbers(
        'test-user-fail',
        'sovren_proof',
        'San Francisco, CA',
        'test@example.com',
        'Test Company'
      );

      expect(result).toBeNull();
    });

    it('should handle FreeSWITCH routing configuration failure', async () => {
      mockProvisioningManager.provisionUserPhoneNumbers.mockResolvedValue({
        success: true,
        allocation: mockUserAllocation,
        estimatedMonthlyCost: 25.00,
        provisioningTimeMs: 5000
      });

      mockFreeSwitchService.configureUserRouting.mockResolvedValue(false);

      const result = await phoneSystemManager.provisionUserPhoneNumbers(
        'test-user-routing-fail',
        'sovren_proof',
        'San Francisco, CA',
        'test@example.com',
        'Test Company'
      );

      expect(result).toBeNull();
    });
  });

  describe('Outbound Calls', () => {
    beforeEach(async () => {
      mockFreeSwitchService.initialize.mockResolvedValue(true);
      mockProvisioningManager.initialize.mockResolvedValue(undefined);
      await phoneSystemManager.initialize();

      // Set up user allocation
      phoneSystemManager['userAllocations'].set('test-user-123', mockUserAllocation);
    });

    it('should make outbound call successfully', async () => {
      const callRequest: CallRequest = {
        userId: 'test-user-123',
        executiveRole: 'cfo',
        toNumber: '+15559876543'
      };

      mockFreeSwitchService.initiateOutboundCall.mockResolvedValue('call-123');

      const result = await phoneSystemManager.makeOutboundCall(callRequest);

      expect(result).toBe('call-123');
      expect(mockFreeSwitchService.initiateOutboundCall).toHaveBeenCalledWith(
        'test-user-123',
        'cfo',
        '+14155551002', // CFO's number
        '+15559876543'
      );
    });

    it('should use provided fromNumber when specified', async () => {
      const callRequest: CallRequest = {
        userId: 'test-user-123',
        executiveRole: 'cfo',
        toNumber: '+15559876543',
        fromNumber: '+14155559999'
      };

      mockFreeSwitchService.initiateOutboundCall.mockResolvedValue('call-456');

      const result = await phoneSystemManager.makeOutboundCall(callRequest);

      expect(result).toBe('call-456');
      expect(mockFreeSwitchService.initiateOutboundCall).toHaveBeenCalledWith(
        'test-user-123',
        'cfo',
        '+14155559999', // Custom fromNumber
        '+15559876543'
      );
    });

    it('should handle calls for users without phone allocation', async () => {
      const callRequest: CallRequest = {
        userId: 'unknown-user',
        executiveRole: 'cfo',
        toNumber: '+15559876543'
      };

      const result = await phoneSystemManager.makeOutboundCall(callRequest);

      expect(result).toBeNull();
      expect(mockFreeSwitchService.initiateOutboundCall).not.toHaveBeenCalled();
    });

    it('should handle calls for invalid executive roles', async () => {
      const callRequest: CallRequest = {
        userId: 'test-user-123',
        executiveRole: 'invalid-role',
        toNumber: '+15559876543'
      };

      const result = await phoneSystemManager.makeOutboundCall(callRequest);

      expect(result).toBeNull();
      expect(mockFreeSwitchService.initiateOutboundCall).not.toHaveBeenCalled();
    });

    it('should handle FreeSWITCH call initiation failure', async () => {
      const callRequest: CallRequest = {
        userId: 'test-user-123',
        executiveRole: 'cfo',
        toNumber: '+15559876543'
      };

      mockFreeSwitchService.initiateOutboundCall.mockResolvedValue(null);

      const result = await phoneSystemManager.makeOutboundCall(callRequest);

      expect(result).toBeNull();
    });
  });

  describe('Active Calls Management', () => {
    beforeEach(async () => {
      mockFreeSwitchService.initialize.mockResolvedValue(true);
      mockProvisioningManager.initialize.mockResolvedValue(undefined);
      await phoneSystemManager.initialize();
    });

    it('should get active calls for user', () => {
      const mockCalls = [
        {
          callId: 'call-1',
          userId: 'test-user-123',
          executiveRole: 'cfo',
          phoneNumber: '+14155551002',
          callerNumber: '+15559876543',
          startTime: new Date(),
          status: 'answered' as const
        }
      ];

      mockFreeSwitchService.getActiveCallsForUser.mockReturnValue(mockCalls);

      const result = phoneSystemManager.getActiveCallsForUser('test-user-123');

      expect(result).toEqual(mockCalls);
      expect(mockFreeSwitchService.getActiveCallsForUser).toHaveBeenCalledWith('test-user-123');
    });
  });

  describe('System Status', () => {
    beforeEach(async () => {
      mockFreeSwitchService.initialize.mockResolvedValue(true);
      mockProvisioningManager.initialize.mockResolvedValue(undefined);
      await phoneSystemManager.initialize();

      // Add some test data
      phoneSystemManager['userAllocations'].set('user-1', mockUserAllocation);
      phoneSystemManager['userAllocations'].set('user-2', {
        ...mockUserAllocation,
        userId: 'user-2',
        phoneNumbers: {
          sovrenAI: '+14155552001',
          executives: {
            cfo: '+14155552002',
            cmo: '+14155552003'
          }
        }
      });
    });

    it('should return system status', async () => {
      mockFreeSwitchService.getActiveCallsForUser.mockReturnValue([]);

      const status = await phoneSystemManager.getSystemStatus();

      expect(status).toEqual({
        skyetelConnected: true,
        freeswitchConnected: true,
        activeUsers: 2,
        activeCalls: 0,
        totalPhoneNumbers: 8 // 5 from user-1 + 3 from user-2 (includes SOVREN AI)
      });
    });
  });

  describe('User Phone Numbers', () => {
    beforeEach(async () => {
      mockFreeSwitchService.initialize.mockResolvedValue(true);
      mockProvisioningManager.initialize.mockResolvedValue(undefined);
      await phoneSystemManager.initialize();

      phoneSystemManager['userAllocations'].set('test-user-123', mockUserAllocation);
    });

    it('should get user phone allocation', () => {
      const result = phoneSystemManager.getUserPhoneAllocation('test-user-123');

      expect(result).toEqual(mockUserAllocation);
    });

    it('should return null for unknown user', () => {
      const result = phoneSystemManager.getUserPhoneAllocation('unknown-user');

      expect(result).toBeNull();
    });

    it('should get user phone numbers', () => {
      const result = phoneSystemManager.getUserPhoneNumbers('test-user-123');

      expect(result).toEqual([
        '+14155551001', // SOVREN AI
        '+14155551002', // CFO
        '+14155551003', // CMO
        '+14155551004', // CLO
        '+14155551005'  // CTO
      ]);
    });

    it('should return empty array for unknown user', () => {
      const result = phoneSystemManager.getUserPhoneNumbers('unknown-user');

      expect(result).toEqual([]);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown all components', async () => {
      mockFreeSwitchService.disconnect.mockResolvedValue(undefined);

      await phoneSystemManager.shutdown();

      expect(mockFreeSwitchService.disconnect).toHaveBeenCalled();
    });
  });

  describe('Load User Allocations', () => {
    it('should load user allocations from database', async () => {
      await phoneSystemManager.loadUserAllocations();

      // This is a placeholder test since the actual implementation
      // would load from database
      expect(true).toBe(true);
    });
  });
});
