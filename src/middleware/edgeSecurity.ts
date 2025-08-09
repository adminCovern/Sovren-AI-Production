/**
 * EDGE-COMPATIBLE SECURITY MIDDLEWARE
 * Security middleware for Next.js Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';

export interface SecurityConfig {
  enableCORS: boolean;
  enableCSP: boolean;
  enableInputSanitization: boolean;
  allowedOrigins: string[];
  message?: string;
}

/**
 * Edge-compatible security middleware
 */
export class EdgeSecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * Handle security checks
   */
  public async handle(request: NextRequest): Promise<NextResponse | null> {
    try {
      // 1. CORS check
      if (this.config.enableCORS) {
        const corsResult = this.handleCORS(request);
        if (corsResult) return corsResult;
      }

      // 2. Input sanitization
      if (this.config.enableInputSanitization) {
        const sanitizationResult = this.handleInputSanitization(request);
        if (sanitizationResult) return sanitizationResult;
      }

      // 3. Basic security headers
      const securityResult = this.addSecurityHeaders(request);
      if (securityResult) return securityResult;

      return null; // Continue processing

    } catch (error) {
      console.error('Security middleware error:', error);
      return new NextResponse('Security check failed', { status: 500 });
    }
  }

  /**
   * Handle CORS
   */
  private handleCORS(request: NextRequest): NextResponse | null {
    const origin = request.headers.get('origin');
    
    if (origin && !this.isAllowedOrigin(origin)) {
      return new NextResponse('CORS policy violation', { status: 403 });
    }

    return null;
  }

  /**
   * Handle input sanitization
   */
  private handleInputSanitization(request: NextRequest): NextResponse | null {
    const { pathname } = request.nextUrl;

    // Check for common attack patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
      /union.*select/i,
      /drop.*table/i,
      /insert.*into/i,
      /delete.*from/i,
      /\.\.\/\.\.\//,
      /\/etc\/passwd/,
      /\/proc\/self/,
      /cmd\.exe/i,
      /powershell/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(pathname) || pattern.test(request.url)) {
        console.warn(`🚨 Suspicious request blocked: ${pathname}`);
        return new NextResponse('Malicious request detected', { status: 400 });
      }
    }

    return null;
  }

  /**
   * Add security headers
   */
  private addSecurityHeaders(request: NextRequest): NextResponse | null {
    // This will be handled by the response headers in next.config.js
    return null;
  }

  /**
   * Check if origin is allowed
   */
  private isAllowedOrigin(origin: string): boolean {
    // Allow localhost in development
    if (process.env.NODE_ENV === 'development' && 
        origin.startsWith('http://localhost')) {
      return true;
    }

    return this.config.allowedOrigins.includes(origin);
  }
}

/**
 * Default security middleware instance
 */
export const edgeSecurityMiddleware = new EdgeSecurityMiddleware({
  enableCORS: true,
  enableCSP: true,
  enableInputSanitization: true,
  allowedOrigins: [
    'https://sovren.ai',
    'https://app.sovren.ai',
    'https://api.sovren.ai'
  ]
});
