import { NextRequest, NextResponse } from 'next/server';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { B200VoiceSynthesisEngine, VoiceSynthesisRequest } from '@/lib/voice/B200VoiceSynthesisEngine';
import { rateLimiters } from '@/lib/security/RateLimiters';

/**
 * Voice Synthesis API Endpoint
 * Handles B200-accelerated voice synthesis requests for Shadow Board executives
 */

// Global voice synthesis engine instance
let voiceEngine: B200VoiceSynthesisEngine | null = null;

function getVoiceEngine(): B200VoiceSynthesisEngine {
  if (!voiceEngine) {
    voiceEngine = new B200VoiceSynthesisEngine();
  }
  return voiceEngine;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    const rateLimitResult = rateLimiters.checkLimit('api', clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetTime: rateLimitResult.resetTime },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { text, executiveRole, outputFormat, sampleRate, priority, userId } = body;

    // Validate required fields
    if (!text || !executiveRole || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: text, executiveRole, userId' },
        { status: 400 }
      );
    }

    // Authenticate user
    const isAuthenticated = await authSystem.validateSession(userId);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Validate text length (prevent abuse)
    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    // Get voice engine
    const engine = getVoiceEngine();
    
    // Get voice profile for executive
    const voiceProfile = engine.getVoiceProfile(executiveRole);
    if (!voiceProfile) {
      return NextResponse.json(
        { error: `Voice profile not found for executive: ${executiveRole}` },
        { status: 400 }
      );
    }

    // Create synthesis request
    const synthesisRequest: VoiceSynthesisRequest = {
      text,
      voiceProfile,
      outputFormat: outputFormat || 'wav',
      sampleRate: sampleRate || 22050,
      priority: priority || 'medium',
      executiveRole
    };

    console.log(`🎤 Voice synthesis request: ${executiveRole} - "${text.substring(0, 50)}..."`);

    // Synthesize speech
    const startTime = Date.now();
    const result = await engine.synthesizeSpeech(synthesisRequest);
    const totalTime = Date.now() - startTime;

    // Return synthesis result
    return NextResponse.json({
      success: true,
      audioUrl: result.audioUrl,
      duration: result.duration,
      format: result.format,
      sampleRate: result.sampleRate,
      fileSize: result.fileSize,
      synthesisTime: result.synthesisTime,
      totalTime,
      gpuUtilization: result.gpuUtilization,
      executiveRole,
      voiceProfile: {
        name: voiceProfile.name,
        gender: voiceProfile.gender,
        accent: voiceProfile.accent,
        personality: voiceProfile.personality
      }
    });

  } catch (error) {
    console.error('Voice synthesis API error:', error);
    return NextResponse.json(
      { 
        error: 'Voice synthesis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get available voice profiles
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    const rateLimitResult = rateLimiters.checkLimit('api', clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetTime: rateLimitResult.resetTime },
        { status: 429 }
      );
    }

    // Get user ID from query params
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Authenticate user
    const isAuthenticated = await authSystem.validateSession(userId);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Get voice engine and available voices
    const engine = getVoiceEngine();
    const availableVoices = engine.getAvailableVoices();

    // Return voice profiles (without sensitive model paths)
    const publicVoiceProfiles = availableVoices.map(voice => ({
      id: voice.id,
      name: voice.name,
      gender: voice.gender,
      age: voice.age,
      accent: voice.accent,
      personality: voice.personality,
      pitch: voice.pitch,
      speed: voice.speed,
      b200Optimized: voice.b200Optimized
    }));

    return NextResponse.json({
      success: true,
      voices: publicVoiceProfiles,
      totalVoices: publicVoiceProfiles.length,
      b200Enabled: true
    });

  } catch (error) {
    console.error('Voice profiles API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get voice profiles',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Health check for voice synthesis system
 */
export async function HEAD(request: NextRequest) {
  try {
    const engine = getVoiceEngine();
    const availableVoices = engine.getAvailableVoices();
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Voice-Engine': 'B200-Accelerated',
        'X-Available-Voices': availableVoices.length.toString(),
        'X-B200-Enabled': 'true',
        'X-Service-Status': 'operational'
      }
    });

  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Service-Status': 'error',
        'X-Error': error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}
