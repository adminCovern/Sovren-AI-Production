import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import * as path from 'path';
import { authSystem } from '@/lib/auth/AuthenticationSystem';

/**
 * Voice Audio Serving API
 * Serves synthesized audio files with proper authentication and caching
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { audioId: string } }
) {
  try {
    const { audioId } = params;
    
    // Validate audio ID format
    if (!audioId || !audioId.match(/^[a-f0-9-]+\.(wav|mp3|ogg)$/)) {
      return NextResponse.json(
        { error: 'Invalid audio ID format' },
        { status: 400 }
      );
    }

    // Extract user ID from request headers or query params
    const authHeader = request.headers.get('authorization');
    const userId = request.nextUrl.searchParams.get('userId');
    
    // Authenticate request
    if (!authHeader && !userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let isAuthenticated = false;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const authResult = await authSystem.verifyToken(token);
      isAuthenticated = authResult.success;
    } else if (userId) {
      isAuthenticated = await authSystem.validateSession(userId);
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Construct file path
    const audioDirectory = path.join(process.cwd(), 'data', 'voice_output');
    const audioPath = path.join(audioDirectory, audioId);

    // Check if file exists
    try {
      await fs.access(audioPath);
    } catch (error) {
      return NextResponse.json(
        { error: 'Audio file not found' },
        { status: 404 }
      );
    }

    // Read audio file
    const audioBuffer = await fs.readFile(audioPath);
    const fileExtension = path.extname(audioId).toLowerCase();
    
    // Determine content type
    let contentType = 'audio/wav';
    switch (fileExtension) {
      case '.mp3':
        contentType = 'audio/mpeg';
        break;
      case '.ogg':
        contentType = 'audio/ogg';
        break;
      case '.wav':
      default:
        contentType = 'audio/wav';
        break;
    }

    // Get file stats for headers
    const stats = await fs.stat(audioPath);
    
    // Create response with proper headers
    const response = new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.length.toString(),
        'Content-Disposition': `inline; filename="${audioId}"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Last-Modified': stats.mtime.toUTCString(),
        'Accept-Ranges': 'bytes',
        'X-Audio-Duration': '0', // Would be calculated from actual audio
        'X-Audio-Format': fileExtension.substring(1),
        'X-Generated-By': 'SOVREN-B200-Voice-Engine'
      }
    });

    return response;

  } catch (error) {
    console.error('Voice audio serving error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle HEAD requests for audio metadata
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: { audioId: string } }
) {
  try {
    const { audioId } = params;
    
    // Validate audio ID format
    if (!audioId || !audioId.match(/^[a-f0-9-]+\.(wav|mp3|ogg)$/)) {
      return new NextResponse(null, { status: 400 });
    }

    // Construct file path
    const audioDirectory = path.join(process.cwd(), 'data', 'voice_output');
    const audioPath = path.join(audioDirectory, audioId);

    // Check if file exists
    try {
      const stats = await fs.stat(audioPath);
      const fileExtension = path.extname(audioId).toLowerCase();
      
      let contentType = 'audio/wav';
      switch (fileExtension) {
        case '.mp3':
          contentType = 'audio/mpeg';
          break;
        case '.ogg':
          contentType = 'audio/ogg';
          break;
        case '.wav':
        default:
          contentType = 'audio/wav';
          break;
      }

      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': stats.size.toString(),
          'Last-Modified': stats.mtime.toUTCString(),
          'Accept-Ranges': 'bytes',
          'X-Audio-Format': fileExtension.substring(1),
          'X-Generated-By': 'SOVREN-B200-Voice-Engine'
        }
      });

    } catch (error) {
      return new NextResponse(null, { status: 404 });
    }

  } catch (error) {
    console.error('Voice audio HEAD error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
