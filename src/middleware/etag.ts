/**
 * ETag Middleware for HTTP Caching
 * 
 * Generates ETags for GET responses and handles If-None-Match requests
 * Returns 304 Not Modified when content hasn't changed
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Generate ETag from response body
 */
function generateETag(body: any): string {
  const content = typeof body === 'string' ? body : JSON.stringify(body);
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return `"${hash}"`;
}

/**
 * Check if ETags match
 */
function etagsMatch(etag: string, ifNoneMatch: string): boolean {
  // Handle multiple ETags in If-None-Match (comma-separated)
  const clientETags = ifNoneMatch.split(',').map(tag => tag.trim());
  return clientETags.includes(etag) || clientETags.includes('*');
}

/**
 * ETag middleware for GET requests
 */
export function etagMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only apply to GET and HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  // Store original json method
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  // Override json method to add ETag
  res.json = function(body: any): Response {
    // Generate ETag from body
    const etag = generateETag(body);
    
    // Set ETag header
    res.setHeader('ETag', etag);
    
    // Check If-None-Match header
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && etagsMatch(etag, ifNoneMatch)) {
      // Content hasn't changed - return 304 Not Modified
      res.status(304);
      res.removeHeader('Content-Type');
      res.removeHeader('Content-Length');
      return res.end();
    }
    
    // Content changed or no If-None-Match - return full response
    return originalJson(body);
  };

  // Override send method for non-JSON responses
  res.send = function(body: any): Response {
    if (typeof body === 'string' || Buffer.isBuffer(body)) {
      const etag = generateETag(body);
      res.setHeader('ETag', etag);
      
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch && etagsMatch(etag, ifNoneMatch)) {
        res.status(304);
        res.removeHeader('Content-Type');
        res.removeHeader('Content-Length');
        return res.end();
      }
    }
    
    return originalSend(body);
  };

  next();
}

/**
 * Cache-Control middleware presets
 */
export const CacheControlPresets = {
  /**
   * No caching (for sensitive or dynamic data)
   */
  noCache: (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  },

  /**
   * Short cache (5 minutes) for frequently changing data
   */
  shortCache: (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    next();
  },

  /**
   * Medium cache (1 hour) for semi-static data
   */
  mediumCache: (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
    next();
  },

  /**
   * Long cache (24 hours) for static data
   */
  longCache: (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
    next();
  },

  /**
   * Private cache (browser only, not CDN)
   */
  privateCache: (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'private, max-age=3600'); // 1 hour, browser only
    next();
  },
};

/**
 * Combine ETag with Cache-Control
 */
export function createCachedEndpoint(cacheStrategy: 'short' | 'medium' | 'long' = 'medium') {
  const cacheMiddleware = 
    cacheStrategy === 'short' ? CacheControlPresets.shortCache :
    cacheStrategy === 'long' ? CacheControlPresets.longCache :
    CacheControlPresets.mediumCache;

  return [cacheMiddleware, etagMiddleware];
}
