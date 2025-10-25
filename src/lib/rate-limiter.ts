import { db } from '@/lib/db';

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  // In-memory store for rate limiting (in production, use Redis)
  private static store = new Map<string, { count: number; resetTime: number }>();

  static async checkRateLimit(
    apiKeyId: string,
    limit: number,
    windowMs: number = 3600000 // 1 hour default
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `ratelimit:${apiKeyId}`;
    
    // Check in-memory store first
    const existing = this.store.get(key);
    
    if (!existing || now > existing.resetTime) {
      // Reset or create new window
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetTime: now + windowMs,
      };
    }
    
    // Check if limit exceeded
    if (existing.count >= limit) {
      const retryAfter = Math.ceil((existing.resetTime - now) / 1000);
      
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTime: existing.resetTime,
        retryAfter,
      };
    }
    
    // Increment count
    existing.count++;
    
    return {
      allowed: true,
      limit,
      remaining: limit - existing.count,
      resetTime: existing.resetTime,
    };
  }

  static async checkApiKeyRateLimit(apiKeyId: string): Promise<RateLimitResult> {
    // Get API key with rate limit
    const apiKey = await db.apiKey.findUnique({
      where: { id: apiKeyId },
      select: { rateLimit: true, isActive: true },
    });

    if (!apiKey || !apiKey.isActive) {
      return {
        allowed: false,
        limit: 0,
        remaining: 0,
        resetTime: Date.now() + 3600000,
        retryAfter: 3600,
      };
    }

    return this.checkRateLimit(apiKeyId, apiKey.rateLimit);
  }

  static async checkGlobalRateLimit(
    identifier: string,
    limit: number,
    windowMs: number = 3600000
  ): Promise<RateLimitResult> {
    return this.checkRateLimit(`global:${identifier}`, limit, windowMs);
  }

  // Clean up expired entries (call this periodically)
  static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => RateLimiter.cleanup(), 300000);
}