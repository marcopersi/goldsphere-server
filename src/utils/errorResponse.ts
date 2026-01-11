/**
 * Unified Error Response Utility
 * 
 * Provides consistent error format across all API endpoints
 */

import { Response } from 'express';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ErrorResponse {
  success: false;
  error: ApiError;
  timestamp?: string;
  requestId?: string;
}

/**
 * Standard error codes
 */
export const ErrorCodes = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Resource errors (404)
  NOT_FOUND: 'NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  
  // Conflict errors (409)
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

/**
 * Send error response with consistent format
 */
export function sendErrorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: any
): void {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(errorResponse);
}

/**
 * Helper functions for common error scenarios
 */
export const ErrorHelpers = {
  badRequest(res: Response, message: string, details?: any): void {
    sendErrorResponse(res, 400, ErrorCodes.VALIDATION_ERROR, message, details);
  },

  unauthorized(res: Response, message = 'Unauthorized'): void {
    sendErrorResponse(res, 401, ErrorCodes.UNAUTHORIZED, message);
  },

  forbidden(res: Response, message = 'Forbidden'): void {
    sendErrorResponse(res, 403, ErrorCodes.FORBIDDEN, message);
  },

  notFound(res: Response, resource: string, id?: string): void {
    const message = id 
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    sendErrorResponse(res, 404, ErrorCodes.NOT_FOUND, message);
  },

  conflict(res: Response, message: string, details?: any): void {
    sendErrorResponse(res, 409, ErrorCodes.ALREADY_EXISTS, message, details);
  },

  internalError(res: Response, error: any): void {
    const message = error instanceof Error ? error.message : 'Internal server error';
    sendErrorResponse(res, 500, ErrorCodes.INTERNAL_ERROR, message, {
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  },

  databaseError(res: Response, error: any): void {
    const message = 'Database operation failed';
    sendErrorResponse(res, 500, ErrorCodes.DATABASE_ERROR, message, {
      ...(process.env.NODE_ENV === 'development' && { originalError: error.message }),
    });
  },
};

/**
 * Express middleware to catch unhandled errors
 */
export function errorHandler(error: any, req: any, res: Response, next: any): void {
  console.error('Unhandled error:', error);
  
  // Send consistent error response
  ErrorHelpers.internalError(res, error);
}
