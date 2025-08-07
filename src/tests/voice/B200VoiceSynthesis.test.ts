import { B200VoiceSynthesisEngine, VoiceSynthesisRequest } from '../../lib/voice/B200VoiceSynthesisEngine';
import { B200ResourceManager } from '../../lib/b200/B200ResourceManager';

// Mock B200ResourceManager
jest.mock('../../lib/b200/B200ResourceManager');

describe('B200VoiceSynthesisEngine', () => {
  let voiceEngine: B200VoiceSynthesisEngine;
  let mockB200ResourceManager: jest.Mocked<B200ResourceManager>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock B200ResourceManager
    mockB200ResourceManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      allocateResources: jest.fn().mockResolvedValue({
        allocation_id: 'voice-test-allocation',
        gpu_ids: [0],
        memory_allocated_gb: 12,
        power_allocated_watts: 200,
        status: 'allocated'
      }),
      deallocateResources: jest.fn().mockResolvedValue(undefined),
      getResourceStatus: jest.fn().mockResolvedValue({
        total_gpus: 8,
        available_gpus: 7,
        total_memory_gb: 640,
        available_memory_gb: 628
      })
    } as any;

    // Create voice engine instance
    voiceEngine = new B200VoiceSynthesisEngine();
  });

  afterEach(async () => {
    if (voiceEngine) {
      await voiceEngine.cleanup();
    }
  });

  describe('Voice Profile Management', () => {
    test('should initialize with executive voice profiles', () => {
      const availableVoices = voiceEngine.getAvailableVoices();
      
      expect(availableVoices).toHaveLength(8); // All executives + SOVREN-AI
      
      // Check CFO voice profile
      const cfoVoice = voiceEngine.getVoiceProfile('cfo');
      expect(cfoVoice).toBeDefined();
      expect(cfoVoice?.name).toBe('Sarah Chen');
      expect(cfoVoice?.gender).toBe('female');
      expect(cfoVoice?.personality).toBe('authoritative');
      expect(cfoVoice?.b200Optimized).toBe(true);
    });

    test('should return null for unknown executive role', () => {
      const unknownVoice = voiceEngine.getVoiceProfile('unknown');
      expect(unknownVoice).toBeNull();
    });

    test('should have unique voice characteristics for each executive', () => {
      const cfoVoice = voiceEngine.getVoiceProfile('cfo');
      const cmoVoice = voiceEngine.getVoiceProfile('cmo');
      const ctoVoice = voiceEngine.getVoiceProfile('cto');
      
      expect(cfoVoice?.pitch).not.toBe(cmoVoice?.pitch);
      expect(cfoVoice?.speed).not.toBe(ctoVoice?.speed);
      expect(cmoVoice?.personality).not.toBe(ctoVoice?.personality);
    });
  });

  describe('Voice Synthesis', () => {
    test('should synthesize speech for CFO', async () => {
      const cfoVoice = voiceEngine.getVoiceProfile('cfo');
      expect(cfoVoice).toBeDefined();

      const synthesisRequest: VoiceSynthesisRequest = {
        text: 'Our Q4 financial results show strong growth across all segments.',
        voiceProfile: cfoVoice!,
        outputFormat: 'wav',
        sampleRate: 22050,
        priority: 'high',
        executiveRole: 'cfo'
      };

      // Mock the synthesis process
      const mockSynthesisResult = {
        audioBuffer: Buffer.from('mock-audio-data'),
        audioUrl: '/api/voice/audio/test-audio.wav',
        duration: 3.5,
        sampleRate: 22050,
        format: 'wav',
        fileSize: 154000,
        synthesisTime: 450,
        gpuUtilization: 85
      };

      // Mock the internal synthesis method
      jest.spyOn(voiceEngine as any, 'runB200TTSSynthesis')
        .mockResolvedValue(mockSynthesisResult.audioBuffer);
      jest.spyOn(voiceEngine as any, 'getAudioDuration')
        .mockResolvedValue(mockSynthesisResult.duration);
      jest.spyOn(voiceEngine as any, 'getGPUUtilization')
        .mockResolvedValue(mockSynthesisResult.gpuUtilization);

      const result = await voiceEngine.synthesizeSpeech(synthesisRequest);

      expect(result).toBeDefined();
      expect(result.audioBuffer).toEqual(mockSynthesisResult.audioBuffer);
      expect(result.duration).toBe(mockSynthesisResult.duration);
      expect(result.format).toBe('wav');
      expect(result.sampleRate).toBe(22050);
      expect(result.gpuUtilization).toBeGreaterThan(0);
    });

    test('should handle different output formats', async () => {
      const cmoVoice = voiceEngine.getVoiceProfile('cmo');
      expect(cmoVoice).toBeDefined();

      const mp3Request: VoiceSynthesisRequest = {
        text: 'Our marketing campaign exceeded all expectations.',
        voiceProfile: cmoVoice!,
        outputFormat: 'mp3',
        sampleRate: 44100,
        priority: 'medium',
        executiveRole: 'cmo'
      };

      // Mock synthesis
      jest.spyOn(voiceEngine as any, 'runB200TTSSynthesis')
        .mockResolvedValue(Buffer.from('mock-mp3-data'));
      jest.spyOn(voiceEngine as any, 'getAudioDuration')
        .mockResolvedValue(2.8);
      jest.spyOn(voiceEngine as any, 'getGPUUtilization')
        .mockResolvedValue(78);

      const result = await voiceEngine.synthesizeSpeech(mp3Request);

      expect(result.format).toBe('mp3');
      expect(result.sampleRate).toBe(44100);
    });

    test('should handle synthesis errors gracefully', async () => {
      const ctoVoice = voiceEngine.getVoiceProfile('cto');
      expect(ctoVoice).toBeDefined();

      const synthesisRequest: VoiceSynthesisRequest = {
        text: 'This synthesis will fail for testing.',
        voiceProfile: ctoVoice!,
        outputFormat: 'wav',
        sampleRate: 22050,
        priority: 'low',
        executiveRole: 'cto'
      };

      // Mock synthesis failure
      jest.spyOn(voiceEngine as any, 'runB200TTSSynthesis')
        .mockRejectedValue(new Error('GPU allocation failed'));

      await expect(voiceEngine.synthesizeSpeech(synthesisRequest))
        .rejects.toThrow('Voice synthesis failed');
    });
  });

  describe('B200 Integration', () => {
    test('should initialize B200 resources', async () => {
      // The constructor should have initialized B200 resources
      expect(mockB200ResourceManager.initialize).toHaveBeenCalled();
    });

    test('should allocate B200 GPU resources for voice synthesis', async () => {
      expect(mockB200ResourceManager.allocateResources).toHaveBeenCalledWith(
        expect.objectContaining({
          component_name: 'voice_synthesis_engine',
          model_type: 'tts_model',
          quantization: 'fp8',
          estimated_vram_gb: 12,
          required_gpus: 1
        })
      );
    });

    test('should cleanup B200 resources', async () => {
      await voiceEngine.cleanup();
      expect(mockB200ResourceManager.deallocateResources).toHaveBeenCalled();
    });
  });

  describe('Performance Metrics', () => {
    test('should track synthesis performance', async () => {
      const sovrenVoice = voiceEngine.getVoiceProfile('sovren-ai');
      expect(sovrenVoice).toBeDefined();

      const synthesisRequest: VoiceSynthesisRequest = {
        text: 'SOVREN-AI is analyzing market conditions and optimizing strategies.',
        voiceProfile: sovrenVoice!,
        outputFormat: 'wav',
        sampleRate: 22050,
        priority: 'critical',
        executiveRole: 'sovren-ai'
      };

      // Mock performance metrics
      jest.spyOn(voiceEngine as any, 'runB200TTSSynthesis')
        .mockResolvedValue(Buffer.from('mock-sovren-audio'));
      jest.spyOn(voiceEngine as any, 'getAudioDuration')
        .mockResolvedValue(4.2);
      jest.spyOn(voiceEngine as any, 'getGPUUtilization')
        .mockResolvedValue(92);

      const startTime = Date.now();
      const result = await voiceEngine.synthesizeSpeech(synthesisRequest);
      const endTime = Date.now();

      expect(result.synthesisTime).toBeGreaterThan(0);
      expect(result.synthesisTime).toBeLessThan(endTime - startTime + 100); // Allow some margin
      expect(result.gpuUtilization).toBeGreaterThan(70); // Should show high GPU usage
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('Voice Quality', () => {
    test('should maintain voice consistency across requests', async () => {
      const legalVoice = voiceEngine.getVoiceProfile('clo');
      expect(legalVoice).toBeDefined();

      const request1: VoiceSynthesisRequest = {
        text: 'The contract terms require careful review.',
        voiceProfile: legalVoice!,
        outputFormat: 'wav',
        sampleRate: 22050,
        priority: 'high',
        executiveRole: 'clo'
      };

      const request2: VoiceSynthesisRequest = {
        text: 'Legal compliance is our top priority.',
        voiceProfile: legalVoice!,
        outputFormat: 'wav',
        sampleRate: 22050,
        priority: 'high',
        executiveRole: 'clo'
      };

      // Mock synthesis for both requests
      jest.spyOn(voiceEngine as any, 'runB200TTSSynthesis')
        .mockResolvedValue(Buffer.from('mock-legal-audio'));
      jest.spyOn(voiceEngine as any, 'getAudioDuration')
        .mockResolvedValue(3.0);
      jest.spyOn(voiceEngine as any, 'getGPUUtilization')
        .mockResolvedValue(80);

      const result1 = await voiceEngine.synthesizeSpeech(request1);
      const result2 = await voiceEngine.synthesizeSpeech(request2);

      // Both should use same voice characteristics
      expect(result1.format).toBe(result2.format);
      expect(result1.sampleRate).toBe(result2.sampleRate);
      expect(result1.gpuUtilization).toBeCloseTo(result2.gpuUtilization, 10);
    });
  });
});
