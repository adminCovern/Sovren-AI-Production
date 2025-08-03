/**
 * SOVREN AI AUTHENTICATION LOGIN ENDPOINT
 * Secure login with rate limiting and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { rateLimiters, getClientId } from '@/middleware/rateLimit';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    tier: 'SMB' | 'ENTERPRISE';
  };
  expiresAt?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting check
    const clientId = getClientId(request);
    const { allowed, info } = await rateLimiters.auth.checkLimit(clientId);
    
    if (!allowed) {
      return NextResponse.json({
        success: false,
        error: 'Too many login attempts. Please try again later.'
      } as LoginResponse, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': info.limit.toString(),
          'X-RateLimit-Remaining': info.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(info.resetTime.getTime() / 1000).toString()
        }
      });
    }

    // Parse and validate request
    const body: LoginRequest = await request.json();
    
    if (!body.email || !body.password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required'
      } as LoginResponse, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      } as LoginResponse, { status: 400 });
    }

    console.log(`🔐 Login attempt for: ${body.email}`);

    // Authenticate user
    const authResult = await authSystem.authenticate(body.email, body.password);

    if (!authResult.success) {
      console.log(`❌ Login failed for: ${body.email} - ${authResult.error}`);
      
      return NextResponse.json({
        success: false,
        error: authResult.error || 'Authentication failed'
      } as LoginResponse, { status: 401 });
    }

    console.log(`✅ Login successful for: ${body.email}`);

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (body.rememberMe ? 24 * 7 : 24)); // 7 days or 24 hours

    const response: LoginResponse = {
      success: true,
      token: authResult.token!,
      user: {
        id: authResult.user!.id,
        email: authResult.user!.email,
        name: authResult.user!.name,
        tier: authResult.user!.tier
      },
      expiresAt: expiresAt.toISOString()
    };

    // Set secure HTTP-only cookie
    const nextResponse = NextResponse.json(response);
    
    nextResponse.cookies.set('auth-token', authResult.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: body.rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60, // 7 days or 24 hours
      path: '/'
    });

    // Add security headers
    nextResponse.headers.set('X-Content-Type-Options', 'nosniff');
    nextResponse.headers.set('X-Frame-Options', 'DENY');

    return nextResponse;

  } catch (error) {
    console.error('❌ Login endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    } as LoginResponse, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
