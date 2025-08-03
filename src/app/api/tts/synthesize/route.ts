/**
 * SOVREN AI TTS SYNTHESIS API ENDPOINT
 * Backend service for heavy TTS processing with StyleTTS2
 */

import { NextRequest, NextResponse } from 'next/server';
import { TTSBackendService } from '@/lib/services/TTSBackendService';

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

const ttsService = new TTSBackendService();

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: TTSSynthesisRequest = await request.json();
    
    // Validate request
    if (!body.text || !body.voiceId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: text and voiceId',
        processingTime: 0,
        voiceId: body.voiceId || 'unknown',
        metadata: {
          sampleRate: 0,
          format: 'none',
          size: 0,
          quality: 0
        }
      } as TTSSynthesisResponse, { status: 400 });
    }

    // Validate text length
    if (body.text.length > 5000) {
      return NextResponse.json({
        success: false,
        error: 'Text too long. Maximum 5000 characters.',
        processingTime: 0,
        voiceId: body.voiceId,
        metadata: {
          sampleRate: 0,
          format: 'none',
          size: 0,
          quality: 0
        }
      } as TTSSynthesisResponse, { status: 400 });
    }

    console.log(`🎤 TTS API: Synthesizing "${body.text.substring(0, 50)}..." with ${body.voiceId}`);
    
    const startTime = Date.now();

    // Process TTS synthesis
    const result = await ttsService.synthesize({
      text: body.text,
      voiceId: body.voiceId,
      priority: body.priority || 'medium',
      format: body.format || 'wav',
      sampleRate: body.sampleRate || 22050,
      userId: body.userId
    });

    const processingTime = Date.now() - startTime;

    const response: TTSSynthesisResponse = {
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

    console.log(`✅ TTS API: Synthesis completed in ${processingTime}ms`);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ TTS API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      processingTime: 0,
      voiceId: 'unknown',
      metadata: {
        sampleRate: 0,
        format: 'none',
        size: 0,
        quality: 0
      }
    } as TTSSynthesisResponse, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Health check endpoint
  try {
    const isHealthy = await ttsService.healthCheck();
    
    return NextResponse.json({
      status: 'healthy',
      service: 'TTS Backend Service',
      timestamp: new Date().toISOString(),
      availableVoices: await ttsService.getAvailableVoices(),
      isHealthy
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      service: 'TTS Backend Service',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
