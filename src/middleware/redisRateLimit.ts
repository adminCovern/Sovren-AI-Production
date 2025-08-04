/**
 * SOVREN AI REDIS RATE LIMITING SYSTEM
 * Production-grade distributed rate limiting with Redis backend
 */

import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  allowed: boolean;
}

export class RedisRateLimiter {
  private config: RateLimitConfig;
  private redisClient: RedisClientType | null = null;
  private fallbackStore: Map<string, { count: number; resetTime: number }> = new Map();
  private isRedisConnected: boolean = false;
  private initPromise: Promise<void>;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.initPromise = this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000
        }
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis Rate Limiter Error:', err);
        this.isRedisConnected = false;
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis Rate Limiter connected');
        this.isRedisConnected = true;
      });

      this.redisClient.on('disconnect', () => {
        console.warn('⚠️ Redis Rate Limiter disconnected');
        this.isRedisConnected = false;
      });

      await this.redisClient.connect();
    } catch (error) {
      console.warn('⚠️ Redis Rate Limiter connection failed, using memory fallback:', error);
      this.redisClient = null;
      this.isRedisConnected = false;
    }
  }

  /**
   * Check if request should be rate limited
   */
  async checkLimit(key: string): Promise<RateLimitInfo> {
    // Ensure Redis is initialized
    await this.initPromise;

    if (this.isRedisConnected && this.redisClient) {
      return this.checkLimitRedis(key);
    } else {
      return this.checkLimitMemory(key);
    }
  }

  /**
   * Redis-based rate limiting using sliding window
   */
  private async checkLimitRedis(key: string): Promise<RateLimitInfo> {
    const redisKey = `rate_limit:${key}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redisClient!.multi();
      
      // Remove expired entries
      pipeline.zRemRangeByScore(redisKey, 0, windowStart);
      
      // Count current requests in window
      pipeline.zCard(redisKey);
      
      // Execute pipeline to get current count
      const results = await pipeline.exec();
      const currentCount = (results?.[1] as unknown as number) || 0;
      
      const allowed = currentCount < this.config.max;
      const resetTime = now + this.config.windowMs;
      
      if (allowed) {
        // Add current request if allowed
        await this.redisClient!.zAdd(redisKey, { 
          score: now, 
          value: `${now}-${Math.random().toString(36).substr(2, 9)}` 
        });
        
        // Set expiration
        await this.redisClient!.expire(redisKey, Math.ceil(this.config.windowMs / 1000));
      }
      
      return {
        limit: this.config.max,
        current: allowed ? currentCount + 1 : currentCount,
        remaining: Math.max(0, this.config.max - (allowed ? currentCount + 1 : currentCount)),
        resetTime: new Date(resetTime),
        allowed
      };
    } catch (error) {
      console.warn('Redis rate limit check failed, falling back to memory:', error);
      this.isRedisConnected = false;
      return this.checkLimitMemory(key);
    }
  }

  /**
   * Memory fallback rate limiting
   */
  private checkLimitMemory(key: string): RateLimitInfo {
    const now = Date.now();
    
    // Clean up expired entry for this key
    const existing = this.fallbackStore.get(key);
    if (existing && existing.resetTime <= now) {
      this.fallbackStore.delete(key);
    }

    // Get current count
    const current = this.fallbackStore.get(key);
    const count = current ? current.count : 0;
    const resetTime = current ? current.resetTime : now + this.config.windowMs;
    
    const allowed = count < this.config.max;
    
    if (allowed) {
      // Increment count
      this.fallbackStore.set(key, {
        count: count + 1,
        resetTime: resetTime
      });
    }

    return {
      limit: this.config.max,
      current: allowed ? count + 1 : count,
      remaining: Math.max(0, this.config.max - (allowed ? count + 1 : count)),
      resetTime: new Date(resetTime),
      allowed
    };
  }

  /**
   * Reset rate limit for a key
   */
  async resetKey(key: string): Promise<void> {
    await this.initPromise;
    
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(`rate_limit:${key}`);
      } catch (error) {
        console.warn('Redis reset failed, using memory fallback:', error);
        this.fallbackStore.delete(key);
      }
    } else {
      this.fallbackStore.delete(key);
    }
  }

  /**
   * Get current rate limit info without incrementing
   */
  async getInfo(key: string): Promise<RateLimitInfo> {
    await this.initPromise;
    
    if (this.isRedisConnected && this.redisClient) {
      try {
        const redisKey = `rate_limit:${key}`;
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        
        // Count current requests in window
        const count = await this.redisClient.zCount(redisKey, windowStart, now);
        
        return {
          limit: this.config.max,
          current: count,
          remaining: Math.max(0, this.config.max - count),
          resetTime: new Date(now + this.config.windowMs),
          allowed: count < this.config.max
        };
      } catch (error) {
        console.warn('Redis info check failed, using memory fallback:', error);
      }
    }
    
    // Memory fallback
    const current = this.fallbackStore.get(key);
    const count = current ? current.count : 0;
    const resetTime = current ? current.resetTime : Date.now() + this.config.windowMs;

    return {
      limit: this.config.max,
      current: count,
      remaining: Math.max(0, this.config.max - count),
      resetTime: new Date(resetTime),
      allowed: count < this.config.max
    };
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch (error) {
        console.warn('Redis cleanup error:', error);
      }
    }
  }
}

/**
 * Generate client ID from request
 */
export function getClientId(request: NextRequest): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  
  // Include user agent for better uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const userAgentHash = createHash('sha256').update(userAgent).digest('hex').substring(0, 8);
  
  return `${ip}:${userAgentHash}`;
}

/**
 * Create rate limiter with configuration
 */
export function createRateLimiter(config: RateLimitConfig): RedisRateLimiter {
  return new RedisRateLimiter(config);
}

/**
 * Production-ready rate limiters for different endpoints
 */
export const rateLimiters = {
  // General API rate limit
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many API requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // TTS synthesis rate limit (more restrictive)
  tts: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 TTS requests per minute
    message: 'Too many TTS requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Authentication rate limit
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Email rate limit
  email: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 emails per minute
    message: 'Too many email requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // CRM sync rate limit
  crm: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 CRM operations per 5 minutes
    message: 'Too many CRM requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Voice synthesis rate limit
  voice: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 15, // 15 voice requests per minute
    message: 'Too many voice synthesis requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Shadow board interaction rate limit
  shadowboard: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 shadow board interactions per minute
    message: 'Too many shadow board requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  })
};
