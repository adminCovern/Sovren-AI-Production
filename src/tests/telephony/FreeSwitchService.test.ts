/**
 * FreeSWITCH Service Tests
 * Comprehensive testing for FreeSWITCH integration with proper type safety
 */

import { FreeSwitchService, FreeSwitchConfig, CallSession } from '../../lib/telephony/FreeSwitchService';
import { UserPhoneAllocation } from '../../lib/telephony/SkyetelService';
import { EventSocket, FreeSwitchEvent } from 'modesl';

// Mock the modesl module
jest.mock('modesl', () => ({
  EventSocket: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    subscribe: jest.fn(),
    api: jest.fn(),
    disconnect: jest.fn()
  }))
}));

describe('FreeSwitchService', () => {
  let freeSwitchService: FreeSwitchService;
  let mockEventSocket: jest.Mocked<EventSocket>;
  let config: FreeSwitchConfig;
  let userAllocation: UserPhoneAllocation;

  beforeEach(() => {
    config = {
      host: 'localhost',
      port: 5060,
      eslPort: 8021,
      eslPassword: 'ClueCon',
      sipDomain: 'sovren.local'
    };

    userAllocation = {
      userId: 'test-user-123',
      subscriptionTier: 'sovren_proof',
      geography: 'San Francisco, CA',
      phoneNumbers: {
        sovrenAI: '+15551234567',
        executives: {
          cfo: '+15551234568',
          cmo: '+15551234569',
          clo: '+15551234570',
          cto: '+15551234571'
        }
      },
      areaCode: '555',
      skyetelOrderIds: ['test-order-123'],
      provisionedAt: new Date('2024-01-01T00:00:00Z'),
      monthlyRate: 25.00
    };

    freeSwitchService = new FreeSwitchService(config);
    mockEventSocket = new EventSocket({} as any) as jest.Mocked<EventSocket>;
    (EventSocket as unknown as jest.Mock).mockReturnValue(mockEventSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize FreeSWITCH connection successfully', async () => {
      // Mock successful connection
      mockEventSocket.on.mockImplementation((event: string, callback: any) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 0);
        }
        return mockEventSocket;
      });

      mockEventSocket.connect.mockResolvedValue(undefined);
      mockEventSocket.subscribe.mockResolvedValue(undefined);

      const result = await freeSwitchService.initialize();

      expect(result).toBe(true);
      expect(EventSocket).toHaveBeenCalledWith({
        host: config.host,
        port: config.eslPort,
        password: config.eslPassword
      });
      expect(mockEventSocket.connect).toHaveBeenCalled();
      expect(mockEventSocket.subscribe).toHaveBeenCalledWith([
        'CHANNEL_CREATE',
        'CHANNEL_ANSWER',
        'CHANNEL_HANGUP',
        'CHANNEL_BRIDGE'
      ]);
    });

    it('should handle connection errors gracefully', async () => {
      const testError = new Error('Connection failed');
      
      mockEventSocket.on.mockImplementation((event: string, callback: any) => {
        if (event === 'error') {
          setTimeout(() => callback(testError), 0);
        }
        return mockEventSocket;
      });

      const result = await freeSwitchService.initialize();

      expect(result).toBe(false);
    });
  });

  describe('User Routing Configuration', () => {
    it('should configure user routing successfully', async () => {
      const result = await freeSwitchService.configureUserRouting(userAllocation);

      expect(result).toBe(true);
    });

    it('should handle routing configuration errors', async () => {
      // Create invalid allocation to trigger error
      const invalidAllocation = {
        ...userAllocation,
        phoneNumbers: null as any
      };

      const result = await freeSwitchService.configureUserRouting(invalidAllocation);

      expect(result).toBe(false);
    });
  });

  describe('Call Event Handling', () => {
    let mockEvent: jest.Mocked<FreeSwitchEvent>;

    beforeEach(async () => {
      // Setup service with routing
      await freeSwitchService.configureUserRouting(userAllocation);

      // Create mock event
      mockEvent = {
        getHeader: jest.fn(),
        getHeaders: jest.fn(),
        getBody: jest.fn(),
        getType: jest.fn(),
        serialize: jest.fn(),
        getPlainObject: jest.fn()
      };
    });

    it('should handle incoming call start event', () => {
      mockEvent.getHeader.mockImplementation((header: string) => {
        switch (header) {
          case 'Destination-Number': return '5551234567';
          case 'Caller-Caller-ID-Number': return '+15559876543';
          case 'Unique-ID': return 'test-call-uuid-123';
          default: return undefined;
        }
      });

      // Simulate call start event
      const eventHandlers = mockEventSocket.on.mock.calls;
      const channelCreateHandler = eventHandlers.find(call => call[0] === 'CHANNEL_CREATE')?.[1];

      expect(channelCreateHandler).toBeDefined();
      if (channelCreateHandler) {
        channelCreateHandler(mockEvent);
      }

      // Verify call was tracked
      const activeCalls = freeSwitchService.getActiveCallsForUser(userAllocation.userId);
      expect(activeCalls).toHaveLength(1);
      expect(activeCalls[0]).toMatchObject({
        callId: 'test-call-uuid-123',
        userId: userAllocation.userId,
        executiveRole: 'sovren-ai',
        phoneNumber: '+15551234567',
        callerNumber: '+15559876543',
        status: 'ringing'
      });
    });

    it('should handle call answer event', () => {
      // First create a call
      mockEvent.getHeader.mockImplementation((header: string) => {
        switch (header) {
          case 'Destination-Number': return '5551234567';
          case 'Caller-Caller-ID-Number': return '+15559876543';
          case 'Unique-ID': return 'test-call-uuid-123';
          default: return undefined;
        }
      });

      const channelCreateHandler = mockEventSocket.on.mock.calls.find(call => call[0] === 'CHANNEL_CREATE')?.[1];
      if (channelCreateHandler) {
        channelCreateHandler(mockEvent);
      }

      // Now handle answer event
      mockEvent.getHeader.mockImplementation((header: string) => {
        if (header === 'Unique-ID') return 'test-call-uuid-123';
        return undefined;
      });

      const channelAnswerHandler = mockEventSocket.on.mock.calls.find(call => call[0] === 'CHANNEL_ANSWER')?.[1];
      if (channelAnswerHandler) {
        channelAnswerHandler(mockEvent);
      }

      // Verify call status updated
      const activeCalls = freeSwitchService.getActiveCallsForUser(userAllocation.userId);
      expect(activeCalls[0].status).toBe('answered');
    });

    it('should handle call end event', () => {
      // First create and answer a call
      mockEvent.getHeader.mockImplementation((header: string) => {
        switch (header) {
          case 'Destination-Number': return '5551234567';
          case 'Caller-Caller-ID-Number': return '+15559876543';
          case 'Unique-ID': return 'test-call-uuid-123';
          default: return undefined;
        }
      });

      const channelCreateHandler = mockEventSocket.on.mock.calls.find(call => call[0] === 'CHANNEL_CREATE')?.[1];
      if (channelCreateHandler) {
        channelCreateHandler(mockEvent);
      }

      // Now handle hangup event
      mockEvent.getHeader.mockImplementation((header: string) => {
        if (header === 'Unique-ID') return 'test-call-uuid-123';
        return undefined;
      });

      const channelHangupHandler = mockEventSocket.on.mock.calls.find(call => call[0] === 'CHANNEL_HANGUP')?.[1];
      if (channelHangupHandler) {
        channelHangupHandler(mockEvent);
      }

      // Verify call was removed from active calls
      const activeCalls = freeSwitchService.getActiveCallsForUser(userAllocation.userId);
      expect(activeCalls).toHaveLength(0);
    });

    it('should handle events with missing headers gracefully', () => {
      mockEvent.getHeader.mockReturnValue(undefined);

      const channelCreateHandler = mockEventSocket.on.mock.calls.find(call => call[0] === 'CHANNEL_CREATE')?.[1];

      // Should not throw error
      expect(() => {
        if (channelCreateHandler) {
          channelCreateHandler(mockEvent);
        }
      }).not.toThrow();
      
      // Should not create any active calls
      const activeCalls = freeSwitchService.getActiveCallsForUser(userAllocation.userId);
      expect(activeCalls).toHaveLength(0);
    });
  });

  describe('Outbound Calls', () => {
    beforeEach(async () => {
      await freeSwitchService.initialize();
      await freeSwitchService.configureUserRouting(userAllocation);
    });

    it('should initiate outbound call successfully', async () => {
      mockEventSocket.api.mockResolvedValue('OK');

      const callId = await freeSwitchService.initiateOutboundCall(
        userAllocation.userId,
        'cfo',
        '+15551234568',
        '+15559876543'
      );

      expect(callId).toBeTruthy();
      expect(mockEventSocket.api).toHaveBeenCalledWith(
        expect.stringContaining('originate sofia/gateway/skyetel/+15559876543')
      );
    });

    it('should handle outbound call failures', async () => {
      mockEventSocket.api.mockRejectedValue(new Error('API call failed'));

      const callId = await freeSwitchService.initiateOutboundCall(
        userAllocation.userId,
        'cfo',
        '+15551234568',
        '+15559876543'
      );

      expect(callId).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should disconnect properly', async () => {
      await freeSwitchService.initialize();
      await freeSwitchService.disconnect();

      expect(mockEventSocket.disconnect).toHaveBeenCalled();
    });
  });
});
