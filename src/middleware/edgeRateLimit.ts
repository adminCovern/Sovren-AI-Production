/**
 * EDGE-COMPATIBLE RATE LIMITER
 * Simple in-memory rate limiter for Next.js Edge Runtime
 */

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

/**
 * Simple in-memory rate limiter for Edge Runtime
 */
export class EdgeRateLimiter {
  private requests = new Map<string, RateLimitInfo>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is within rate limit
   */
  public checkLimit(clientId: string): { allowed: boolean; info: RateLimitInfo } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Clean up expired entries
    this.cleanup(windowStart);

    // Get or create client info
    let clientInfo = this.requests.get(clientId);
    
    if (!clientInfo || clientInfo.resetTime <= now) {
      // Create new window
      clientInfo = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      this.requests.set(clientId, clientInfo);
      
      return {
        allowed: true,
        info: {
          count: clientInfo.count,
          resetTime: clientInfo.resetTime
        }
      };
    }

    // Increment count
    clientInfo.count++;

    const allowed = clientInfo.count <= this.config.maxRequests;

    return {
      allowed,
      info: {
        count: clientInfo.count,
        resetTime: clientInfo.resetTime
      }
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(windowStart: number): void {
    for (const [clientId, info] of this.requests.entries()) {
      if (info.resetTime <= windowStart) {
        this.requests.delete(clientId);
      }
    }
  }
}

/**
 * Rate limiters for different endpoints
 */
export const edgeRateLimiters = {
  api: new EdgeRateLimiter({ windowMs: 60000, maxRequests: 100 }), // 100 requests per minute
  auth: new EdgeRateLimiter({ windowMs: 300000, maxRequests: 5 }), // 5 auth attempts per 5 minutes
  tts: new EdgeRateLimiter({ windowMs: 60000, maxRequests: 10 }), // 10 TTS requests per minute
  email: new EdgeRateLimiter({ windowMs: 60000, maxRequests: 20 }), // 20 email requests per minute
  crm: new EdgeRateLimiter({ windowMs: 60000, maxRequests: 50 }), // 50 CRM requests per minute
};

/**
 * Get client ID from request
 */
export function getEdgeClientId(request: Request): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  
  // Include user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const userAgentHash = btoa(userAgent).substring(0, 8);
  
  return `${ip}_${userAgentHash}`;
}
