/**
 * Rate Limiters for API endpoints
 * Provides rate limiting functionality for different API routes
 */

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
}

/**
 * Rate Limiter Implementation
 */
export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is allowed
   */
  public checkLimit(identifier: string): RateLimitResult {
    const now = Date.now();
    const existing = this.requests.get(identifier);

    // Clean up expired entries
    if (existing && now > existing.resetTime) {
      this.requests.delete(identifier);
    }

    const current = this.requests.get(identifier);

    if (!current) {
      // First request in window
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.config.windowMs
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      };
    }

    if (current.count >= this.config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
        message: this.config.message || 'Rate limit exceeded'
      };
    }

    // Increment count
    current.count++;
    this.requests.set(identifier, current);

    return {
      allowed: true,
      remaining: this.config.maxRequests - current.count,
      resetTime: current.resetTime
    };
  }

  /**
   * Reset rate limit for identifier
   */
  public reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Get current status for identifier
   */
  public getStatus(identifier: string): { count: number; resetTime: number } | null {
    const now = Date.now();
    const existing = this.requests.get(identifier);

    if (!existing || now > existing.resetTime) {
      return null;
    }

    return existing;
  }
}

/**
 * Rate Limiters Collection
 */
export class RateLimiters {
  private limiters: Map<string, RateLimiter> = new Map();

  constructor() {
    this.initializeDefaultLimiters();
  }

  /**
   * Initialize default rate limiters
   */
  private initializeDefaultLimiters(): void {
    // API rate limiter - 100 requests per minute
    this.limiters.set('api', new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      message: 'API rate limit exceeded. Please try again later.'
    }));

    // Auth rate limiter - 5 login attempts per minute
    this.limiters.set('auth', new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5,
      message: 'Too many authentication attempts. Please try again later.'
    }));

    // Shadow Board rate limiter - 50 requests per minute
    this.limiters.set('shadowboard', new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50,
      message: 'Shadow Board rate limit exceeded. Please try again later.'
    }));

    // Executive rate limiter - 20 requests per minute per executive
    this.limiters.set('executive', new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20,
      message: 'Executive interaction rate limit exceeded. Please try again later.'
    }));

    // Upload rate limiter - 10 uploads per hour
    this.limiters.set('upload', new RateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
      message: 'Upload rate limit exceeded. Please try again later.'
    }));

    // Registration rate limiter - 3 registrations per hour per IP
    this.limiters.set('registration', new RateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      message: 'Registration rate limit exceeded. Please try again later.'
    }));
  }

  /**
   * Get rate limiter by name
   */
  public get(name: string): RateLimiter | undefined {
    return this.limiters.get(name);
  }

  /**
   * Check rate limit for specific limiter
   */
  public checkLimit(limiterName: string, identifier: string): RateLimitResult {
    const limiter = this.limiters.get(limiterName);
    if (!limiter) {
      // If limiter doesn't exist, allow the request
      return {
        allowed: true,
        remaining: 999,
        resetTime: Date.now() + 60000
      };
    }

    return limiter.checkLimit(identifier);
  }

  /**
   * Add custom rate limiter
   */
  public addLimiter(name: string, config: RateLimitConfig): void {
    this.limiters.set(name, new RateLimiter(config));
  }

  /**
   * Remove rate limiter
   */
  public removeLimiter(name: string): void {
    this.limiters.delete(name);
  }

  /**
   * Reset rate limit for specific identifier
   */
  public reset(limiterName: string, identifier: string): void {
    const limiter = this.limiters.get(limiterName);
    if (limiter) {
      limiter.reset(identifier);
    }
  }

  /**
   * Get all active limiters
   */
  public getActiveLimiters(): string[] {
    return Array.from(this.limiters.keys());
  }

  /**
   * Clean up expired entries across all limiters
   */
  public cleanup(): void {
    // This would be called periodically to clean up expired entries
    // For now, cleanup happens automatically during checkLimit calls
  }
}

// Global rate limiters instance
export const rateLimiters = new RateLimiters();

// Export individual rate limiter access methods for backward compatibility
export const apiRateLimit = (identifier: string) => rateLimiters.checkLimit('api', identifier);
export const authRateLimit = (identifier: string) => rateLimiters.checkLimit('auth', identifier);
export const shadowBoardRateLimit = (identifier: string) => rateLimiters.checkLimit('shadowboard', identifier);
export const executiveRateLimit = (identifier: string) => rateLimiters.checkLimit('executive', identifier);
export const uploadRateLimit = (identifier: string) => rateLimiters.checkLimit('upload', identifier);
export const registrationRateLimit = (identifier: string) => rateLimiters.checkLimit('registration', identifier);

console.log('🛡️ Rate Limiters initialized');
console.log(`📊 Active limiters: ${rateLimiters.getActiveLimiters().join(', ')}`);
