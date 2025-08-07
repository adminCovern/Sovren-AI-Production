/**
 * Shadow Board Voice Integration Tests
 * Tests for the integration between Shadow Board executives and voice/telephony systems
 */

import { ShadowBoardVoiceIntegration, ExecutiveCallRequest } from '../../lib/shadowboard/ShadowBoardVoiceIntegration';
import { ShadowBoardManager } from '../../lib/shadowboard/ShadowBoardManager';
import { VoiceSystemManager } from '../../lib/voice/VoiceSystemManager';
import { PhoneSystemManager } from '../../lib/telephony/PhoneSystemManager';
import { VoiceSynthesizer } from '../../lib/voice/VoiceSynthesizer';
import { UserPhoneAllocation } from '../../lib/telephony/SkyetelService';

// Mock dependencies
jest.mock('../../lib/shadowboard/ShadowBoardManager');
jest.mock('../../lib/voice/VoiceSystemManager');
jest.mock('../../lib/telephony/PhoneSystemManager');
jest.mock('../../lib/voice/VoiceSynthesizer');

describe('ShadowBoardVoiceIntegration', () => {
  let voiceIntegration: ShadowBoardVoiceIntegration;
  let mockShadowBoard: jest.Mocked<ShadowBoardManager>;
  let mockVoiceSystem: jest.Mocked<VoiceSystemManager>;
  let mockPhoneSystem: jest.Mocked<PhoneSystemManager>;
  let mockVoiceSynthesizer: jest.Mocked<VoiceSynthesizer>;

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

  const mockExecutive = {
    id: 'exec-cfo-123',
    name: 'CFO Executive', // SECURITY: No hardcoded name in tests
    role: 'CFO',
    voiceModel: 'cfo-analytical',
    neuralLoad: 0.3,
    currentActivity: {
      type: 'thinking',
      focus: 'financial_analysis',
      intensity: 0.5,
      startTime: new Date(),
      estimatedDuration: 5000,
      relatedExecutives: [],
      impactRadius: 1000,
      urgencyLevel: 'medium'
    }
  };

  beforeEach(() => {
    // Create mocked instances
    mockShadowBoard = new ShadowBoardManager({} as any) as jest.Mocked<ShadowBoardManager>;
    mockVoiceSystem = new VoiceSystemManager({} as any) as jest.Mocked<VoiceSystemManager>;
    mockPhoneSystem = new PhoneSystemManager({} as any) as jest.Mocked<PhoneSystemManager>;
    mockVoiceSynthesizer = new VoiceSynthesizer({} as any) as jest.Mocked<VoiceSynthesizer>;

    // Mock Shadow Board methods - SECURITY: No hardcoded names
    mockShadowBoard.getExecutives.mockReturnValue(new Map([
      ['CFO', mockExecutive as any],
      ['CMO', { ...mockExecutive, id: 'exec-cmo-123', name: 'CMO Executive', role: 'CMO' } as any],
      ['CTO', { ...mockExecutive, id: 'exec-cto-123', name: 'CTO Executive', role: 'CTO' } as any],
      ['CLO', { ...mockExecutive, id: 'exec-clo-123', name: 'CLO Executive', role: 'CLO' } as any]
    ]));

    mockShadowBoard.getExecutive.mockImplementation((role: string) => {
      const executives = mockShadowBoard.getExecutives();
      return executives.get(role) || null;
    });

    voiceIntegration = new ShadowBoardVoiceIntegration(
      mockShadowBoard,
      mockPhoneSystem
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize voice integration successfully', async () => {
      await voiceIntegration.initialize(mockUserAllocation);

      const voiceProfiles = voiceIntegration.getExecutiveVoiceProfiles();
      
      expect(voiceProfiles).toHaveLength(4); // CFO, CMO, CTO, CLO
      expect(voiceProfiles[0]).toMatchObject({
        executiveRole: 'CFO',
        executiveName: 'CFO Executive', // SECURITY: No hardcoded name in tests
        phoneNumber: '+14155551002',
        canMakeCalls: true,
        canReceiveCalls: true,
        maxConcurrentCalls: 3,
        currentCallCount: 0
      });
    });

    it('should handle initialization with missing phone numbers', async () => {
      const incompleteAllocation = {
        ...mockUserAllocation,
        phoneNumbers: {
          sovrenAI: '+14155551001',
          executives: {
            cfo: '+14155551002'
            // Missing other executives
          }
        }
      };

      await voiceIntegration.initialize(incompleteAllocation);

      const voiceProfiles = voiceIntegration.getExecutiveVoiceProfiles();
      
      // Should only create profile for CFO
      expect(voiceProfiles).toHaveLength(1);
      expect(voiceProfiles[0].executiveRole).toBe('CFO');
    });
  });

  describe('Executive Calls', () => {
    beforeEach(async () => {
      await voiceIntegration.initialize(mockUserAllocation);
      mockPhoneSystem.makeOutboundCall.mockResolvedValue('phone-call-123');
    });

    it('should make executive call successfully', async () => {
      const callRequest: ExecutiveCallRequest = {
        executiveRole: 'CFO',
        targetNumber: '+15559876543',
        callPurpose: 'sales',
        message: 'Hello, this is Sarah from SOVREN AI.',
        context: {
          customerName: 'John Doe',
          urgency: 'high',
          expectedDuration: 600000
        }
      };

      const callId = await voiceIntegration.makeExecutiveCall(callRequest);

      expect(callId).toBeTruthy();
      expect(mockPhoneSystem.makeOutboundCall).toHaveBeenCalledWith({
        userId: 'shadow-board',
        executiveRole: 'CFO',
        toNumber: '+15559876543',
        fromNumber: '+14155551002'
      });

      // Check that executive status was updated
      const executive = mockShadowBoard.getExecutive('CFO');
      expect(executive?.currentActivity.type).toBe('communicating');
      expect(executive?.currentActivity.focus).toBe('outbound_call');
      expect(executive?.neuralLoad).toBeGreaterThan(0.3);
    });

    it('should handle calls for non-existent executives', async () => {
      const callRequest: ExecutiveCallRequest = {
        executiveRole: 'INVALID',
        targetNumber: '+15559876543',
        callPurpose: 'sales'
      };

      await expect(voiceIntegration.makeExecutiveCall(callRequest))
        .rejects.toThrow('Executive voice profile not found: INVALID');
    });

    it('should handle executives at maximum call capacity', async () => {
      // Set executive to maximum capacity
      const voiceProfiles = voiceIntegration.getExecutiveVoiceProfiles();
      const cfoProfile = voiceProfiles.find(p => p.executiveRole === 'CFO');
      if (cfoProfile) {
        cfoProfile.currentCallCount = cfoProfile.maxConcurrentCalls;
      }

      const callRequest: ExecutiveCallRequest = {
        executiveRole: 'CFO',
        targetNumber: '+15559876543',
        callPurpose: 'sales'
      };

      await expect(voiceIntegration.makeExecutiveCall(callRequest))
        .rejects.toThrow('Executive CFO is at maximum call capacity');
    });

    it('should handle phone system call failures', async () => {
      mockPhoneSystem.makeOutboundCall.mockResolvedValue(null);

      const callRequest: ExecutiveCallRequest = {
        executiveRole: 'CFO',
        targetNumber: '+15559876543',
        callPurpose: 'sales'
      };

      await expect(voiceIntegration.makeExecutiveCall(callRequest))
        .rejects.toThrow('Failed to initiate phone call');
    });
  });

  describe('Executive Speech', () => {
    beforeEach(async () => {
      await voiceIntegration.initialize(mockUserAllocation);
      
      // Create a mock call session
      const callRequest: ExecutiveCallRequest = {
        executiveRole: 'CFO',
        targetNumber: '+15559876543',
        callPurpose: 'sales'
      };
      
      mockPhoneSystem.makeOutboundCall.mockResolvedValue('phone-call-123');
      await voiceIntegration.makeExecutiveCall(callRequest);
    });

    it('should synthesize executive speech successfully', async () => {
      const activeCalls = voiceIntegration.getActiveExecutiveCalls();
      const callId = activeCalls[0].callId;
      const message = 'Thank you for your time today.';

      mockVoiceSynthesizer.synthesize.mockResolvedValue('audio-data');

      await voiceIntegration.executiveSpeak(callId, message);

      expect(mockVoiceSynthesizer.synthesize).toHaveBeenCalledWith(
        message,
        'cfo-analytical',
        'high'
      );

      // Check that transcript was updated
      const updatedCalls = voiceIntegration.getActiveExecutiveCalls();
      const call = updatedCalls.find(c => c.callId === callId);
      
      expect(call?.transcript).toHaveLength(1);
      expect(call?.transcript[0]).toMatchObject({
        speaker: 'executive',
        text: message,
        confidence: 0.95
      });
    });

    it('should handle speech for non-existent calls', async () => {
      await expect(voiceIntegration.executiveSpeak('invalid-call-id', 'Hello'))
        .rejects.toThrow('Call session not found: invalid-call-id');
    });

    it('should handle voice synthesis failures', async () => {
      const activeCalls = voiceIntegration.getActiveExecutiveCalls();
      const callId = activeCalls[0].callId;

      mockVoiceSynthesizer.synthesize.mockRejectedValue(new Error('Synthesis failed'));

      await expect(voiceIntegration.executiveSpeak(callId, 'Hello'))
        .rejects.toThrow('Synthesis failed');
    });
  });

  describe('Call Management', () => {
    beforeEach(async () => {
      await voiceIntegration.initialize(mockUserAllocation);
      mockPhoneSystem.makeOutboundCall.mockResolvedValue('phone-call-123');
    });

    it('should end executive call successfully', async () => {
      const callRequest: ExecutiveCallRequest = {
        executiveRole: 'CFO',
        targetNumber: '+15559876543',
        callPurpose: 'sales'
      };

      const callId = await voiceIntegration.makeExecutiveCall(callRequest);
      
      await voiceIntegration.endExecutiveCall(callId, 'successful', 'Great conversation');

      const activeCalls = voiceIntegration.getActiveExecutiveCalls();
      expect(activeCalls).toHaveLength(0);

      // Check that executive status was updated
      const executive = mockShadowBoard.getExecutive('CFO');
      expect(executive?.currentActivity.type).toBe('thinking');
      expect(executive?.currentActivity.focus).toBe('call_analysis');
    });

    it('should get active executive calls', async () => {
      const callRequest1: ExecutiveCallRequest = {
        executiveRole: 'CFO',
        targetNumber: '+15559876543',
        callPurpose: 'sales'
      };

      const callRequest2: ExecutiveCallRequest = {
        executiveRole: 'CMO',
        targetNumber: '+15559876544',
        callPurpose: 'sales'
      };

      await voiceIntegration.makeExecutiveCall(callRequest1);
      await voiceIntegration.makeExecutiveCall(callRequest2);

      const activeCalls = voiceIntegration.getActiveExecutiveCalls();
      
      expect(activeCalls).toHaveLength(2);
      expect(activeCalls[0].executiveRole).toBe('CFO');
      expect(activeCalls[1].executiveRole).toBe('CMO');
    });
  });

  describe('Voice Characteristics', () => {
    beforeEach(async () => {
      await voiceIntegration.initialize(mockUserAllocation);
    });

    it('should generate appropriate voice characteristics for different roles', () => {
      const voiceProfiles = voiceIntegration.getExecutiveVoiceProfiles();
      
      const cfoProfile = voiceProfiles.find(p => p.executiveRole === 'CFO');
      const cmoProfile = voiceProfiles.find(p => p.executiveRole === 'CMO');
      
      expect(cfoProfile?.voiceCharacteristics.tone).toBe('professional');
      expect(cmoProfile?.voiceCharacteristics.tone).toBe('friendly');
      expect(cmoProfile?.voiceCharacteristics.pace).toBe('fast');
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await voiceIntegration.initialize(mockUserAllocation);
    });

    it('should emit initialization event', async () => {
      const eventSpy = jest.fn();
      voiceIntegration.on('initialized', eventSpy);

      // Re-initialize to trigger event
      await voiceIntegration.initialize(mockUserAllocation);

      expect(eventSpy).toHaveBeenCalledWith({
        executiveCount: 4,
        voiceModelsLoaded: expect.any(Number)
      });
    });

    it('should emit call events', async () => {
      const callInitiatedSpy = jest.fn();
      const callEndedSpy = jest.fn();
      
      voiceIntegration.on('callInitiated', callInitiatedSpy);
      voiceIntegration.on('callEnded', callEndedSpy);

      const callRequest: ExecutiveCallRequest = {
        executiveRole: 'CFO',
        targetNumber: '+15559876543',
        callPurpose: 'sales'
      };

      const callId = await voiceIntegration.makeExecutiveCall(callRequest);
      await voiceIntegration.endExecutiveCall(callId, 'successful');

      expect(callInitiatedSpy).toHaveBeenCalled();
      expect(callEndedSpy).toHaveBeenCalled();
    });
  });
});
