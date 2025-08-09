/**
 * SOVREN AI TTS SYNTHESIS API ENDPOINT
 * Backend service for heavy TTS processing with comprehensive error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { TTSBackendService } from '@/lib/services/TTSBackendService';
import { withErrorHandling } from '@/lib/middleware/ErrorHandlingMiddleware';
import { ErrorHandler, ErrorCategory, ErrorSeverity } from '@/lib/errors/ErrorHandler';
import { container, SERVICE_IDENTIFIERS } from '@/lib/di/DIContainer';
import { registerServices } from '@/lib/di/ServiceRegistry';

export interface TTSSynthesisRequest {
  text: string;
  voiceId: string;
  priority: 'low' | 'medium' | 'high';
  format: 'wav' | 'mp3' | 'ogg';
  sampleRate?: number;
  userId?: string;
}

export interface TTSSynthesisResponse {
  success: boolean;
  audioData?: string; // Base64 encoded audio
  audioUrl?: string;  // URL to audio file
  duration?: number;
  processingTime: number;
  voiceId: string;
  error?: string;
  metadata: {
    sampleRate: number;
    format: string;
    size: number;
    quality: number;
  };
}

// TTS synthesis handler with comprehensive error handling
async function ttsSynthesisHandler(request: NextRequest): Promise<TTSSynthesisResponse> {
  // Ensure services are registered
  try {
    container.resolve<ErrorHandler>(SERVICE_IDENTIFIERS.ERROR_HANDLER);
  } catch (error) {
    // Services not registered, register them now
    registerServices();
  }

  const errorHandler = container.resolve<ErrorHandler>(SERVICE_IDENTIFIERS.ERROR_HANDLER);
  const ttsService = container.resolve<TTSBackendService>(SERVICE_IDENTIFIERS.TTS_BACKEND_SERVICE);

  const body: TTSSynthesisRequest = await request.json();
  const startTime = Date.now();

  // Validate text content
  if (!body.text || body.text.trim().length === 0) {
    throw errorHandler.createError(
      'EMPTY_TEXT',
      'Text content cannot be empty',
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      {},
      {
        userMessage: 'Please provide text to synthesize.',
        suggestedActions: ['Enter text content for synthesis']
      }
    );
  }

  // Validate text length with detailed feedback
  if (body.text.length > 5000) {
    throw errorHandler.createError(
      'TEXT_TOO_LONG',
      `Text length ${body.text.length} exceeds maximum of 5000 characters`,
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      { additionalData: { textLength: body.text.length, maxLength: 5000 } },
      {
        userMessage: `Text is too long (${body.text.length} characters). Maximum allowed is 5000 characters.`,
        suggestedActions: ['Shorten the text', 'Split into multiple requests']
      }
    );
  }

  // Validate voice ID
  if (!body.voiceId || body.voiceId.trim().length === 0) {
    throw errorHandler.createError(
      'MISSING_VOICE_ID',
      'Voice ID is required for synthesis',
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      {},
      {
        userMessage: 'Please select a voice for synthesis.',
        suggestedActions: ['Choose from available voices']
      }
    );
  }

  // Validate format
  const validFormats = ['wav', 'mp3', 'ogg'];
  if (body.format && !validFormats.includes(body.format)) {
    throw errorHandler.createError(
      'INVALID_FORMAT',
      `Invalid audio format: ${body.format}. Supported formats: ${validFormats.join(', ')}`,
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      { additionalData: { providedFormat: body.format, validFormats } },
      {
        userMessage: `Invalid audio format. Supported formats: ${validFormats.join(', ')}`,
        suggestedActions: ['Use wav, mp3, or ogg format']
      }
    );
  }

  // Validate sample rate
  const validSampleRates = [16000, 22050, 44100, 48000];
  if (body.sampleRate && !validSampleRates.includes(body.sampleRate)) {
    throw errorHandler.createError(
      'INVALID_SAMPLE_RATE',
      `Invalid sample rate: ${body.sampleRate}. Supported rates: ${validSampleRates.join(', ')}`,
      ErrorCategory.VALIDATION,
      ErrorSeverity.MEDIUM,
      { additionalData: { providedRate: body.sampleRate, validRates: validSampleRates } },
      {
        userMessage: `Invalid sample rate. Supported rates: ${validSampleRates.join(', ')} Hz`,
        suggestedActions: ['Use a supported sample rate']
      }
    );
  }

  // Process TTS synthesis with comprehensive error handling
  const result = await errorHandler.handleAsync(
    () => ttsService.synthesize({
      text: body.text,
      voiceId: body.voiceId,
      priority: body.priority || 'medium',
      format: body.format || 'wav',
      sampleRate: body.sampleRate || 22050,
      userId: body.userId
    }),
    {
      additionalData: {
        textLength: body.text.length,
        voiceId: body.voiceId,
        format: body.format || 'wav'
      }
    },
    {
      retries: 2,
      retryDelay: 2000,
      fallback: async () => {
        throw errorHandler.createError(
          'TTS_SERVICE_UNAVAILABLE',
          'Text-to-speech service is temporarily unavailable',
          ErrorCategory.EXTERNAL_SERVICE,
          ErrorSeverity.HIGH,
          {},
          {
            userMessage: 'Voice synthesis service is temporarily unavailable. Please try again later.',
            suggestedActions: ['Wait a few minutes and try again', 'Contact support if problem persists']
          }
        );
      }
    }
  );

  const processingTime = Date.now() - startTime;

  return {
    success: true,
    audioData: result.audioData,
    audioUrl: result.audioUrl,
    duration: result.duration,
    processingTime,
    voiceId: body.voiceId,
    metadata: {
      sampleRate: result.sampleRate,
      format: result.format,
      size: result.size,
      quality: result.quality
    }
  };
}

// Validation function for TTS requests
function validateTTSRequest(body: unknown): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    errors.push('Request body must be a valid JSON object');
    return { valid: false, errors };
  }

  const ttsBody = body as Partial<TTSSynthesisRequest>;

  if (!ttsBody.text) {
    errors.push('Text is required');
  } else if (typeof ttsBody.text !== 'string') {
    errors.push('Text must be a string');
  } else if (ttsBody.text.trim().length === 0) {
    errors.push('Text cannot be empty');
  } else if (ttsBody.text.length > 5000) {
    errors.push('Text cannot exceed 5000 characters');
  }

  if (!ttsBody.voiceId) {
    errors.push('Voice ID is required');
  } else if (typeof ttsBody.voiceId !== 'string') {
    errors.push('Voice ID must be a string');
  }

  if (ttsBody.priority && !['low', 'medium', 'high'].includes(ttsBody.priority)) {
    errors.push('Priority must be low, medium, or high');
  }

  if (ttsBody.format && !['wav', 'mp3', 'ogg'].includes(ttsBody.format)) {
    errors.push('Format must be wav, mp3, or ogg');
  }

  if (ttsBody.sampleRate && ![16000, 22050, 44100, 48000].includes(ttsBody.sampleRate)) {
    errors.push('Sample rate must be 16000, 22050, 44100, or 48000');
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

// Export POST handler with comprehensive error handling
export const POST = withErrorHandling(ttsSynthesisHandler, {
  endpoint: '/api/tts/synthesize',
  requireAuth: true,
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 10 // 10 requests per minute
  },
  validation: validateTTSRequest
});

// Health check handler
async function ttsHealthHandler(request: NextRequest): Promise<{
  status: string;
  service: string;
  timestamp: string;
  availableVoices: string[];
  isHealthy: boolean;
}> {
  // Ensure services are registered
  try {
    container.resolve<ErrorHandler>(SERVICE_IDENTIFIERS.ERROR_HANDLER);
  } catch (error) {
    // Services not registered, register them now
    registerServices();
  }

  const errorHandler = container.resolve<ErrorHandler>(SERVICE_IDENTIFIERS.ERROR_HANDLER);
  const ttsService = container.resolve<TTSBackendService>(SERVICE_IDENTIFIERS.TTS_BACKEND_SERVICE);

  const healthResult = await errorHandler.handleAsync(
    () => ttsService.healthCheck(),
    {},
    {
      retries: 1,
      retryDelay: 1000,
      fallback: async () => false
    }
  );

  const voiceModels = await errorHandler.handleAsync(
    () => ttsService.getAvailableVoices(),
    {},
    {
      retries: 1,
      retryDelay: 1000,
      fallback: async () => []
    }
  );

  // Convert VoiceModel[] to string[] by extracting voice IDs
  const availableVoices = voiceModels.map(voice => voice.id);

  return {
    status: healthResult ? 'healthy' : 'unhealthy',
    service: 'TTS Backend Service',
    timestamp: new Date().toISOString(),
    availableVoices,
    isHealthy: healthResult
  };
}

// Export GET handler with error handling
export const GET = withErrorHandling(ttsHealthHandler, {
  endpoint: '/api/tts/synthesize',
  requireAuth: false
});
