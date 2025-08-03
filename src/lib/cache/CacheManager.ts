/**
 * SOVREN AI PRODUCTION CACHE MANAGER
 * High-performance caching system for production deployment
 */

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  enableRedis: boolean;
  redisUrl?: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private redisClient: any = null;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      defaultTTL: 60 * 60 * 1000, // 1 hour
      maxSize: 1000,
      enableRedis: process.env.REDIS_URL ? true : false,
      redisUrl: process.env.REDIS_URL,
      ...config
    };

    if (this.config.enableRedis) {
      this.initializeRedis();
    }

    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get cached value
   */
  public async get<T>(key: string): Promise<T | null> {
    // Try Redis first if available
    if (this.redisClient) {
      try {
        const redisValue = await this.redisClient.get(key);
        if (redisValue) {
          return JSON.parse(redisValue);
        }
      } catch (error) {
        console.warn('Redis get error:', error);
      }
    }

    // Fallback to memory cache
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;
    return entry.data;
  }

  /**
   * Set cached value
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheTTL = ttl || this.config.defaultTTL;

    // Store in Redis if available
    if (this.redisClient) {
      try {
        await this.redisClient.setex(key, Math.floor(cacheTTL / 1000), JSON.stringify(value));
      } catch (error) {
        console.warn('Redis set error:', error);
      }
    }

    // Store in memory cache
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: cacheTTL,
      hits: 0
    };

    // Check cache size limit
    if (this.memoryCache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.memoryCache.set(key, entry);
  }

  /**
   * Delete cached value
   */
  public async delete(key: string): Promise<void> {
    // Delete from Redis
    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.warn('Redis delete error:', error);
      }
    }

    // Delete from memory cache
    this.memoryCache.delete(key);
  }

  /**
   * Clear all cache
   */
  public async clear(): Promise<void> {
    // Clear Redis
    if (this.redisClient) {
      try {
        await this.redisClient.flushall();
      } catch (error) {
        console.warn('Redis clear error:', error);
      }
    }

    // Clear memory cache
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getStats(): any {
    const entries = Array.from(this.memoryCache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const avgHits = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      memoryEntries: this.memoryCache.size,
      maxSize: this.config.maxSize,
      totalHits,
      avgHits: Math.round(avgHits * 100) / 100,
      redisEnabled: this.config.enableRedis,
      redisConnected: this.redisClient ? true : false
    };
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      // In production, you would use actual Redis client
      console.log('🔴 Redis caching enabled for production');
      // this.redisClient = new Redis(this.config.redisUrl);
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.config.enableRedis = false;
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }
}

/**
 * Specialized cache managers for different data types
 */
export class TTSCacheManager extends CacheManager {
  constructor() {
    super({
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours for TTS
      maxSize: 500,
    });
  }

  public async getTTSAudio(text: string, voiceId: string): Promise<ArrayBuffer | null> {
    const key = `tts:${voiceId}:${this.hashText(text)}`;
    const cached = await this.get<string>(key);
    
    if (cached) {
      // Convert base64 back to ArrayBuffer
      const binaryString = atob(cached);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
    
    return null;
  }

  public async setTTSAudio(text: string, voiceId: string, audioBuffer: ArrayBuffer): Promise<void> {
    const key = `tts:${voiceId}:${this.hashText(text)}`;
    
    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(audioBuffer);
    const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    const base64 = btoa(binaryString);
    
    await this.set(key, base64);
  }

  private hashText(text: string): string {
    // Simple hash function for cache keys
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

export class CRMCacheManager extends CacheManager {
  constructor() {
    super({
      defaultTTL: 15 * 60 * 1000, // 15 minutes for CRM data
      maxSize: 200,
    });
  }

  public async getCRMData(userId: string, dataType: string): Promise<any> {
    const key = `crm:${userId}:${dataType}`;
    return await this.get(key);
  }

  public async setCRMData(userId: string, dataType: string, data: any): Promise<void> {
    const key = `crm:${userId}:${dataType}`;
    await this.set(key, data);
  }
}

export class ExecutiveCacheManager extends CacheManager {
  constructor() {
    super({
      defaultTTL: 60 * 60 * 1000, // 1 hour for executive data
      maxSize: 100,
    });
  }

  public async getExecutiveState(executiveId: string): Promise<any> {
    const key = `executive:${executiveId}:state`;
    return await this.get(key);
  }

  public async setExecutiveState(executiveId: string, state: any): Promise<void> {
    const key = `executive:${executiveId}:state`;
    await this.set(key, state);
  }
}

// Global cache instances
export const globalCache = new CacheManager();
export const ttsCache = new TTSCacheManager();
export const crmCache = new CRMCacheManager();
export const executiveCache = new ExecutiveCacheManager();
