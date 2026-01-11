/**
 * Response Metadata Middleware
 * 
 * Adds requestId, timestamp, and executionTime to all responses
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request and Response types
declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    startTime?: number;
  }
  interface Response {
    metadata?: ResponseMetadata;
  }
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: string;
  executionTime?: number; // in milliseconds
}

/**
 * Middleware to track request metadata
 * Call this BEFORE route handlers
 */
export function requestMetadataMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  req.requestId = uuidv4();
  req.startTime = Date.now();
  
  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override json method to inject metadata
  res.json = function(body: any): Response {
    // Calculate execution time
    const executionTime = req.startTime ? Date.now() - req.startTime : undefined;
    
    // Add metadata to response
    const metadata: ResponseMetadata = {
      requestId: req.requestId!,
      timestamp: new Date().toISOString(),
      ...(executionTime !== undefined && { executionTime }),
    };
    
    // Inject metadata into response body
    if (body && typeof body === 'object') {
      body.metadata = metadata;
    }
    
    // Call original json method
    return originalJson(body);
  };
  
  next();
}

/**
 * Helper to get current request metadata
 */
export function getRequestMetadata(req: Request): ResponseMetadata {
  const executionTime = req.startTime ? Date.now() - req.startTime : undefined;
  
  return {
    requestId: req.requestId!,
    timestamp: new Date().toISOString(),
    ...(executionTime !== undefined && { executionTime }),
  };
}
