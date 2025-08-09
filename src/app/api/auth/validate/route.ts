import { NextRequest, NextResponse } from 'next/server';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { rateLimiters } from '@/lib/security/RateLimiters';
import type { User } from '@/types/auth';

/**
 * Authentication Validation API
 * Validates user sessions for dashboard access
 */

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    const rateLimitResult = rateLimiters.checkLimit('auth', clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetTime: rateLimitResult.resetTime },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userId, token } = body;

    // Validate required fields
    if (!userId && !token) {
      return NextResponse.json(
        { error: 'Missing userId or token' },
        { status: 400 }
      );
    }

    let isValid = false;
    let user: User | null = null;

    // Validate using token if provided
    if (token) {
      const tokenResult = await authSystem.verifyToken(token);
      if (tokenResult.success && tokenResult.user) {
        isValid = true;
        user = tokenResult.user;
      }
    }
    // Validate using userId and session
    else if (userId) {
      isValid = await authSystem.validateSession(userId);
      if (isValid) {
        // Get user details
        const userDetails = authSystem.getUser(userId);
        if (userDetails) {
          user = {
            id: userDetails.id,
            username: userDetails.username,
            email: userDetails.email,
            role: userDetails.role,
            permissions: userDetails.permissions
          };
        }
      }
    }

    if (isValid && user) {
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
          lastLogin: new Date().toISOString()
        },
        message: 'Session valid'
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid session or token',
          message: 'Authentication failed'
        },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Auth validation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Authentication validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get current user session info
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

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '');
    const tokenResult = await authSystem.verifyToken(token);

    if (!tokenResult.success || !tokenResult.user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: tokenResult.user.id,
        username: tokenResult.user.username,
        email: tokenResult.user.email,
        role: tokenResult.user.role,
        permissions: tokenResult.user.permissions || [],
        sessionActive: true,
        lastActivity: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get session info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
