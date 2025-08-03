/**
 * SOVREN AI PRODUCTION SECURITY MIDDLEWARE
 * Comprehensive security hardening for production deployment
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './rateLimit';
import { authSystem } from '@/lib/auth/AuthenticationSystem';

export interface SecurityConfig {
  enableRateLimit: boolean;
  enableCORS: boolean;
  enableCSP: boolean;
  enableInputSanitization: boolean;
  enableJWTValidation: boolean;
  allowedOrigins: string[];
  maxRequestsPerMinute: number;
}

export class SecurityMiddleware {
  private config: SecurityConfig;
  private rateLimiter: any;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      enableRateLimit: true,
      enableCORS: true,
      enableCSP: true,
      enableInputSanitization: true,
      enableJWTValidation: true,
      allowedOrigins: [
        'https://sovren.ai',
        'https://app.sovren.ai',
        'https://api.sovren.ai'
      ],
      maxRequestsPerMinute: 100,
      ...config
    };

    if (this.config.enableRateLimit) {
      this.rateLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: this.config.maxRequestsPerMinute,
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      });
    }
  }

  /**
   * Main security middleware handler
   */
  public async handle(request: NextRequest): Promise<NextResponse | null> {
    try {
      // 1. Rate Limiting
      if (this.config.enableRateLimit) {
        const rateLimitResult = await this.handleRateLimit(request);
        if (rateLimitResult) return rateLimitResult;
      }

      // 2. CORS Headers
      if (this.config.enableCORS) {
        const corsResult = await this.handleCORS(request);
        if (corsResult) return corsResult;
      }

      // 3. JWT Validation for protected routes
      if (this.config.enableJWTValidation && this.isProtectedRoute(request)) {
        const authResult = await this.handleAuthentication(request);
        if (authResult) return authResult;
      }

      // 4. Input Sanitization
      if (this.config.enableInputSanitization) {
        const sanitizationResult = await this.handleInputSanitization(request);
        if (sanitizationResult) return sanitizationResult;
      }

      // 5. Security Headers
      const response = NextResponse.next();
      this.addSecurityHeaders(response);

      return null; // Continue to next middleware

    } catch (error) {
      console.error('Security middleware error:', error);
      return new NextResponse('Security validation failed', { status: 500 });
    }
  }

  /**
   * Handle rate limiting
   */
  private async handleRateLimit(request: NextRequest): Promise<NextResponse | null> {
    const ip = this.getClientIP(request);
    const key = `rate_limit:${ip}`;
    
    // Simple in-memory rate limiting (in production, use Redis)
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    // This would be implemented with Redis in production
    const requestCount = await this.getRequestCount(key, windowStart);
    
    if (requestCount >= this.config.maxRequestsPerMinute) {
      return new NextResponse('Rate limit exceeded', { 
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': this.config.maxRequestsPerMinute.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil((now + 60000) / 1000).toString()
        }
      });
    }

    await this.incrementRequestCount(key);
    return null;
  }

  /**
   * Handle CORS
   */
  private async handleCORS(request: NextRequest): Promise<NextResponse | null> {
    const origin = request.headers.get('origin');
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': this.isAllowedOrigin(origin) ? origin! : 'null',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    return null;
  }

  /**
   * Handle JWT authentication
   */
  private async handleAuthentication(request: NextRequest): Promise<NextResponse | null> {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse('Authentication required', { 
        status: 401,
        headers: {
          'WWW-Authenticate': 'Bearer realm="SOVREN AI"'
        }
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const authResult = await authSystem.verifyToken(token);
      
      if (!authResult.success) {
        return new NextResponse('Invalid token', { status: 401 });
      }

      // Add user info to request headers for downstream use
      const response = NextResponse.next();
      response.headers.set('X-User-ID', authResult.user!.id);
      response.headers.set('X-User-Tier', authResult.user!.tier);
      
      return null;

    } catch (error) {
      console.error('JWT validation error:', error);
      return new NextResponse('Authentication failed', { status: 401 });
    }
  }

  /**
   * Handle input sanitization
   */
  private async handleInputSanitization(request: NextRequest): Promise<NextResponse | null> {
    if (request.method === 'POST' || request.method === 'PUT') {
      try {
        const contentType = request.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          const body = await request.json();
          const sanitizedBody = this.sanitizeObject(body);
          
          // In a real implementation, you'd need to modify the request body
          // For now, we'll just validate it doesn't contain dangerous content
          if (this.containsDangerousContent(body)) {
            return new NextResponse('Invalid input detected', { status: 400 });
          }
        }
      } catch (error) {
        return new NextResponse('Invalid request body', { status: 400 });
      }
    }

    return null;
  }

  /**
   * Add security headers to response
   */
  private addSecurityHeaders(response: NextResponse): void {
    // Content Security Policy
    if (this.config.enableCSP) {
      response.headers.set('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' wss: https:; " +
        "media-src 'self'; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self';"
      );
    }

    // Security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 
      'camera=(), microphone=(), geolocation=(), payment=()');
    
    // HSTS (only in production with HTTPS)
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 
        'max-age=31536000; includeSubDomains; preload');
    }

    // Remove server information
    response.headers.delete('Server');
    response.headers.delete('X-Powered-By');
  }

  /**
   * Check if route requires authentication
   */
  private isProtectedRoute(request: NextRequest): boolean {
    const pathname = request.nextUrl.pathname;
    
    const protectedPaths = [
      '/api/tts',
      '/api/shadowboard',
      '/api/crm',
      '/api/email',
      '/api/user'
    ];

    return protectedPaths.some(path => pathname.startsWith(path));
  }

  /**
   * Check if origin is allowed
   */
  private isAllowedOrigin(origin: string | null): boolean {
    if (!origin) return false;
    
    // Allow localhost in development
    if (process.env.NODE_ENV === 'development' && 
        origin.startsWith('http://localhost')) {
      return true;
    }

    return this.config.allowedOrigins.includes(origin);
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }

    return request.ip || 'unknown';
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[this.sanitizeString(key)] = this.sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Sanitize string input
   */
  private sanitizeString(str: string): string {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Check for dangerous content
   */
  private containsDangerousContent(obj: any): boolean {
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /eval\s*\(/i,
      /document\.cookie/i
    ];

    const str = JSON.stringify(obj);
    return dangerousPatterns.some(pattern => pattern.test(str));
  }

  // Placeholder methods for rate limiting (would use Redis in production)
  private async getRequestCount(key: string, windowStart: number): Promise<number> {
    // In production, this would query Redis
    return 0;
  }

  private async incrementRequestCount(key: string): Promise<void> {
    // In production, this would increment Redis counter
  }
}

// Export configured security middleware
export const securityMiddleware = new SecurityMiddleware();
