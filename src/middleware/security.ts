/**
 * SOVREN AI PRODUCTION SECURITY MIDDLEWARE
 * Comprehensive security hardening for production deployment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter, getClientId } from './redisRateLimit';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { csrfProtection } from '@/lib/security/CSRFProtection';

export interface SecurityConfig {
  enableRateLimit: boolean;
  enableCORS: boolean;
  enableCSP: boolean;
  enableInputSanitization: boolean;
  enableJWTValidation: boolean;
  enableCSRFProtection: boolean;
  allowedOrigins: string[];
  maxRequestsPerMinute: number;
  message?: string;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  allowed: boolean;
}

export interface RateLimiter {
  checkLimit(key: string): Promise<RateLimitInfo>;
}

export class SecurityMiddleware {
  private config: SecurityConfig;
  private rateLimiter: RateLimiter | null = null;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      enableRateLimit: true,
      enableCORS: true,
      enableCSP: true,
      enableInputSanitization: true,
      enableJWTValidation: true,
      enableCSRFProtection: true,
      allowedOrigins: [
        'https://sovren.ai',
        'https://app.sovren.ai',
        'https://api.sovren.ai'
      ],
      maxRequestsPerMinute: 100,
      ...config
    };

    if (this.config.enableRateLimit) {
      this.rateLimiter = createRateLimiter({
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

      // 3. CSRF Protection for state-changing requests
      if (this.config.enableCSRFProtection) {
        const csrfResult = await this.handleCSRFProtection(request);
        if (csrfResult) return csrfResult;
      }

      // 4. JWT Validation for protected routes
      if (this.config.enableJWTValidation && this.isProtectedRoute(request)) {
        const authResult = await this.handleAuthentication(request);
        if (authResult) return authResult;
      }

      // 5. Input Sanitization
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
   * Handle rate limiting with Redis
   */
  private async handleRateLimit(request: NextRequest): Promise<NextResponse | null> {
    if (!this.rateLimiter) return null;

    const clientId = getClientId(request);
    const rateLimitInfo = await this.rateLimiter.checkLimit(clientId);

    if (!rateLimitInfo.allowed) {
      return new NextResponse(this.config.message || 'Rate limit exceeded', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
          'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(rateLimitInfo.resetTime.getTime() / 1000).toString(),
          'X-RateLimit-Used': rateLimitInfo.current.toString()
        }
      });
    }

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
   * Handle CSRF protection
   */
  private async handleCSRFProtection(request: NextRequest): Promise<NextResponse | null> {
    try {
      return await csrfProtection.middleware(request);
    } catch (error) {
      console.error('CSRF protection error:', error);
      return new NextResponse('CSRF protection error', { status: 500 });
    }
  }

  /**
   * Handle comprehensive input sanitization and validation
   */
  private async handleInputSanitization(request: NextRequest): Promise<NextResponse | null> {
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      try {
        const contentType = request.headers.get('content-type');

        // Check content length
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
          return new NextResponse('Request too large', { status: 413 });
        }

        if (contentType?.includes('application/json')) {
          const body = await request.json();

          // Comprehensive validation
          const validationResult = this.validateInput(body);
          if (!validationResult.valid) {
            return new NextResponse(`Input validation failed: ${validationResult.error}`, {
              status: 400,
              headers: {
                'X-Validation-Error': validationResult.error || 'Unknown validation error'
              }
            });
          }

          // Check for dangerous content
          if (this.containsDangerousContent(body)) {
            return new NextResponse('Potentially malicious content detected', {
              status: 400,
              headers: {
                'X-Security-Error': 'Malicious content blocked'
              }
            });
          }
        }

        // Validate URL parameters
        const url = new URL(request.url);
        for (const [key, value] of url.searchParams.entries()) {
          if (this.containsDangerousContent({ [key]: value })) {
            return new NextResponse('Invalid URL parameters', { status: 400 });
          }
        }

      } catch (error) {
        console.error('Input sanitization error:', error);
        return new NextResponse('Invalid request format', { status: 400 });
      }
    }

    return null;
  }

  /**
   * Comprehensive input validation
   */
  private validateInput(data: unknown): { valid: boolean; error?: string } {
    // Check for null or undefined
    if (data === null || data === undefined) {
      return { valid: false, error: 'Data cannot be null or undefined' };
    }

    // Check for circular references
    try {
      JSON.stringify(data);
    } catch (error) {
      return { valid: false, error: 'Circular reference detected' };
    }

    // Check depth (prevent deep nesting attacks)
    if (this.getObjectDepth(data) > 10) {
      return { valid: false, error: 'Object nesting too deep' };
    }

    // Check for prototype pollution
    if (this.hasPrototypePollution(data)) {
      return { valid: false, error: 'Prototype pollution attempt detected' };
    }

    return { valid: true };
  }

  /**
   * Check object depth
   */
  private getObjectDepth(obj: unknown, depth = 0): number {
    if (depth > 10) return depth; // Prevent stack overflow

    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return Math.max(depth, ...Object.values(obj).map(v => this.getObjectDepth(v, depth + 1)));
    }

    if (Array.isArray(obj)) {
      return Math.max(depth, ...obj.map(v => this.getObjectDepth(v, depth + 1)));
    }

    return depth;
  }

  /**
   * Check for prototype pollution attempts
   */
  private hasPrototypePollution(obj: unknown): boolean {
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

    if (obj && typeof obj === 'object' && obj !== null) {
      const objRecord = obj as Record<string, unknown>;
      for (const key of Object.keys(objRecord)) {
        if (dangerousKeys.includes(key)) {
          return true;
        }

        if (typeof objRecord[key] === 'object' && objRecord[key] !== null) {
          if (this.hasPrototypePollution(objRecord[key])) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Add security headers to response
   */
  private addSecurityHeaders(response: NextResponse): void {
    // Content Security Policy
    if (this.config.enableCSP) {
      // Enhanced CSP for production security
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' ws: wss: https:",
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
      ].join('; ');

      response.headers.set('Content-Security-Policy', csp);
    }

    // Enhanced security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

    // Enhanced Permissions Policy
    const permissionsPolicy = [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'picture-in-picture=()'
    ].join(', ');

    response.headers.set('Permissions-Policy', permissionsPolicy);

    // HSTS (enhanced for production)
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload');
    }

    // Remove server information and add additional security headers
    response.headers.delete('Server');
    response.headers.delete('X-Powered-By');
    response.headers.set('X-DNS-Prefetch-Control', 'off');
    response.headers.set('X-Download-Options', 'noopen');
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
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
  private sanitizeObject(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
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
   * Enhanced dangerous content detection
   */
  private containsDangerousContent(obj: unknown): boolean {
    const dangerousPatterns = [
      // XSS patterns
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
      /vbscript:/gi,

      // Code injection patterns
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi,

      // DOM manipulation
      /document\.(cookie|domain|write)/gi,
      /window\.(location|open)/gi,

      // SQL injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(--|\/\*|\*\/|;)/g,

      // Command injection patterns
      /(\||&|;|`|\$\(|\${)/g,

      // Path traversal
      /\.\.[\/\\]/g,

      // LDAP injection
      /(\*|\(|\)|\\|\/)/g,

      // NoSQL injection
      /(\$where|\$ne|\$gt|\$lt|\$regex)/gi
    ];

    const str = JSON.stringify(obj);
    return dangerousPatterns.some(pattern => pattern.test(str));
  }

}

// Export configured security middleware
export const securityMiddleware = new SecurityMiddleware();
