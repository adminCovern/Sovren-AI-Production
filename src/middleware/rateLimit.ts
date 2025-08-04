/**
 * SOVREN AI RATE LIMITING SYSTEM
 * Production-grade rate limiting with Redis support
 */

import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';
import { NextRequest } from 'next/server';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

export class RedisRateLimiter {
  private config: RateLimitConfig;
  private redisClient: RedisClientType | null = null;
  private fallbackStore: Map<string, { count: number; resetTime: number }> = new Map();
  private isRedisConnected: boolean = false;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis Rate Limiter Error:', err);
        this.isRedisConnected = false;
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis Rate Limiter connected');
        this.isRedisConnected = true;
      });

      await this.redisClient.connect();
    } catch (error) {
      console.warn('⚠️ Redis Rate Limiter connection failed, using memory fallback:', error);
      this.redisClient = null;
      this.isRedisConnected = false;
    }
  }
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if request should be rate limited
   */
  public async checkLimit(key: string): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Get or create entry
    let entry = this.store.get(key);
    
    if (!entry || entry.resetTime <= now) {
      // Create new window
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
      this.store.set(key, entry);
    }

    const info: RateLimitInfo = {
      limit: this.config.max,
      current: entry.count,
      remaining: Math.max(0, this.config.max - entry.count),
      resetTime: new Date(entry.resetTime)
    };

    if (entry.count >= this.config.max) {
      return { allowed: false, info };
    }

    // Increment counter
    entry.count++;
    this.store.set(key, entry);

    info.current = entry.count;
    info.remaining = Math.max(0, this.config.max - entry.count);

    return { allowed: true, info };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a key
   */
  public reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Get current rate limit info
   */
  public async getInfo(key: string): Promise<RateLimitInfo> {
    const entry = this.store.get(key);
    
    if (!entry) {
      return {
        limit: this.config.max,
        current: 0,
        remaining: this.config.max,
        resetTime: new Date(Date.now() + this.config.windowMs)
      };
    }

    return {
      limit: this.config.max,
      current: entry.count,
      remaining: Math.max(0, this.config.max - entry.count),
      resetTime: new Date(entry.resetTime)
    };
  }
}

/**
 * Create rate limiter with configuration
 */
export function rateLimit(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Default rate limiters for different endpoints
 */
export const rateLimiters = {
  // General API rate limit
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many API requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // TTS synthesis rate limit (more restrictive)
  tts: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 TTS requests per minute
    message: 'Too many TTS requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Authentication rate limit
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Email rate limit
  email: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 emails per minute
    message: 'Too many email requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // CRM sync rate limit
  crm: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 CRM operations per 5 minutes
    message: 'Too many CRM requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  })
};

/**
 * Get client identifier for rate limiting
 */
export function getClientId(request: any): string {
  // Try to get user ID from authenticated request
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return `ip:${forwarded.split(',')[0].trim()}`;
  }
  
  if (realIP) {
    return `ip:${realIP}`;
  }

  return `ip:${request.ip || 'unknown'}`;
}
