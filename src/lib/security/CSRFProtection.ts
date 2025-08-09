/**
 * CSRF PROTECTION
 * Cross-Site Request Forgery protection for production security
 */

import { randomBytes, createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export interface CSRFToken {
  token: string;
  timestamp: number;
  sessionId: string;
}

export interface CSRFConfig {
  secret: string;
  tokenExpiry: number; // in milliseconds
  cookieName: string;
  headerName: string;
  excludedMethods: string[];
  excludedPaths: string[];
}

/**
 * CSRF Protection Implementation
 */
export class CSRFProtection {
  private config: CSRFConfig;
  private readonly TOKEN_LENGTH = 32;

  constructor(config?: Partial<CSRFConfig>) {
    this.config = {
      secret: process.env.CSRF_SECRET || this.generateSecret(),
      tokenExpiry: 60 * 60 * 1000, // 1 hour
      cookieName: 'csrf-token',
      headerName: 'x-csrf-token',
      excludedMethods: ['GET', 'HEAD', 'OPTIONS'],
      excludedPaths: ['/api/health', '/api/metrics'],
      ...config
    };

    if (!process.env.CSRF_SECRET) {
      console.warn('⚠️ CSRF_SECRET not set, using generated secret (not suitable for production)');
    }
  }

  /**
   * Generate CSRF token for a session
   */
  public generateToken(sessionId: string): string {
    const timestamp = Date.now();
    const randomToken = randomBytes(this.TOKEN_LENGTH).toString('hex');
    const payload = `${sessionId}:${timestamp}:${randomToken}`;
    const signature = this.createSignature(payload);
    
    return `${payload}:${signature}`;
  }

  /**
   * Validate CSRF token
   */
  public validateToken(token: string, sessionId: string): boolean {
    try {
      const parts = token.split(':');
      if (parts.length !== 4) {
        return false;
      }

      const [tokenSessionId, timestampStr, randomToken, signature] = parts;
      const timestamp = parseInt(timestampStr, 10);

      // Check if timestamp is valid
      if (isNaN(timestamp)) {
        return false;
      }

      // Check if token is for the correct session
      if (tokenSessionId !== sessionId) {
        return false;
      }

      // Check if token has expired
      if (Date.now() - timestamp > this.config.tokenExpiry) {
        return false;
      }

      // Verify signature
      const payload = `${tokenSessionId}:${timestamp}:${randomToken}`;
      const expectedSignature = this.createSignature(payload);
      
      return this.constantTimeCompare(signature, expectedSignature);
    } catch (error) {
      console.error('CSRF token validation error:', error);
      return false;
    }
  }

  /**
   * Middleware to handle CSRF protection
   */
  public async middleware(request: NextRequest): Promise<NextResponse | null> {
    const method = request.method;
    const pathname = request.nextUrl.pathname;

    // Skip CSRF protection for excluded methods
    if (this.config.excludedMethods.includes(method)) {
      return null;
    }

    // Skip CSRF protection for excluded paths
    if (this.config.excludedPaths.some(path => pathname.startsWith(path))) {
      return null;
    }

    // Get session ID from request (you'll need to implement session management)
    const sessionId = this.getSessionId(request);
    if (!sessionId) {
      return new NextResponse('Session required for CSRF protection', { status: 401 });
    }

    // Get CSRF token from header or body
    const csrfToken = request.headers.get(this.config.headerName) || 
                     await this.getTokenFromBody(request);

    if (!csrfToken) {
      return new NextResponse('CSRF token required', { 
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate CSRF token
    if (!this.validateToken(csrfToken, sessionId)) {
      return new NextResponse('Invalid CSRF token', { 
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    return null; // Allow request to proceed
  }

  /**
   * Add CSRF token to response headers
   */
  public addTokenToResponse(response: NextResponse, sessionId: string): NextResponse {
    const token = this.generateToken(sessionId);
    
    // Add token to response headers
    response.headers.set('X-CSRF-Token', token);
    
    // Set secure cookie with token
    const cookieOptions = [
      `${this.config.cookieName}=${token}`,
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      `Max-Age=${Math.floor(this.config.tokenExpiry / 1000)}`,
      'Path=/'
    ].join('; ');
    
    response.headers.set('Set-Cookie', cookieOptions);
    
    return response;
  }

  /**
   * Create HMAC signature for token
   */
  private createSignature(payload: string): string {
    return createHmac('sha256', this.config.secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Constant time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Generate secure secret for CSRF protection
   */
  private generateSecret(): string {
    return randomBytes(64).toString('hex');
  }

  /**
   * Get session ID from request
   */
  private getSessionId(request: NextRequest): string | null {
    // This is a placeholder - you'll need to implement proper session management
    // For now, we'll use a simple approach with cookies or headers
    const sessionCookie = request.cookies.get('session-id');
    if (sessionCookie) {
      return sessionCookie.value;
    }

    const sessionHeader = request.headers.get('x-session-id');
    if (sessionHeader) {
      return sessionHeader;
    }

    return null;
  }

  /**
   * Extract CSRF token from request body
   */
  private async getTokenFromBody(request: NextRequest): Promise<string | null> {
    try {
      const contentType = request.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        const body = await request.json();
        return body.csrfToken || body._token || null;
      }
      
      if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        return formData.get('csrfToken')?.toString() || 
               formData.get('_token')?.toString() || null;
      }
    } catch (error) {
      console.error('Error extracting CSRF token from body:', error);
    }
    
    return null;
  }

  /**
   * Generate CSRF token for client-side use
   */
  public getTokenForClient(sessionId: string): { token: string; headerName: string } {
    return {
      token: this.generateToken(sessionId),
      headerName: this.config.headerName
    };
  }

  /**
   * Validate configuration
   */
  public validateConfig(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!this.config.secret || this.config.secret.length < 32) {
      issues.push('CSRF secret must be at least 32 characters long');
    }

    if (this.config.tokenExpiry < 60000) { // Less than 1 minute
      issues.push('CSRF token expiry should be at least 1 minute');
    }

    if (this.config.tokenExpiry > 24 * 60 * 60 * 1000) { // More than 24 hours
      issues.push('CSRF token expiry should not exceed 24 hours');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// Export singleton instance
export const csrfProtection = new CSRFProtection();
