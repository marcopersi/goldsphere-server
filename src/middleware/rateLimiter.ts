/**
 * Rate Limiting Middleware
 * 
 * Implements rate limiting with standard HTTP headers:
 * - X-RateLimit-Limit: Maximum requests allowed per window
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: Unix timestamp when the rate limit resets
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds (default: 15 minutes)
  maxRequests: number;   // Max requests per window (default: 100)
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean;     // Don't count failed requests
  keyGenerator?: (req: Request) => string; // Custom key generator
}

/**
 * In-memory rate limit store (use Redis in production)
 */
const store: RateLimitStore = {};

/**
 * Default options
 */
const defaultOptions: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,         // 100 requests per window
};

/**
 * Generate key from request (default: IP address)
 */
function defaultKeyGenerator(req: Request): string {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/**
 * Clean up expired entries (run periodically)
 */
function cleanup(): void {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

/**
 * Create rate limit middleware
 */
export function createRateLimiter(options?: Partial<RateLimitOptions>) {
  const opts = { ...defaultOptions, ...options };
  const keyGenerator = opts.keyGenerator || defaultKeyGenerator;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Initialize or get current rate limit data
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + opts.windowMs,
      };
    }

    // Increment request count
    store[key].count++;

    // Calculate remaining requests
    const remaining = Math.max(0, opts.maxRequests - store[key].count);
    const resetTime = Math.ceil(store[key].resetTime / 1000); // Unix timestamp in seconds

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', opts.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toString());

    // Check if rate limit exceeded
    if (store[key].count > opts.maxRequests) {
      res.setHeader('Retry-After', Math.ceil((store[key].resetTime - now) / 1000).toString());
      
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          details: {
            limit: opts.maxRequests,
            resetTime: new Date(store[key].resetTime).toISOString(),
          },
        },
      });
      return;
    }

    next();
  };
}

/**
 * Preset rate limiters for common scenarios
 */
export const RateLimitPresets = {
  /**
   * Strict rate limit for authentication endpoints
   * 5 requests per 15 minutes
   */
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  }),

  /**
   * Standard API rate limit
   * 100 requests per 15 minutes
   */
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
  }),

  /**
   * Generous rate limit for read-only endpoints
   * 300 requests per 15 minutes
   */
  readOnly: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 300,
  }),

  /**
   * Strict rate limit for write operations
   * 30 requests per 15 minutes
   */
  writeOnly: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 30,
  }),
};

/**
 * Per-user rate limiter (requires authentication)
 */
export function createUserRateLimiter(options?: Partial<RateLimitOptions>) {
  return createRateLimiter({
    ...options,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise fall back to IP
      const user = (req as any).user;
      return user?.id || req.ip || 'anonymous';
    },
  });
}
