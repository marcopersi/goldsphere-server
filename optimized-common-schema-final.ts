/**
 * Optimized Common Schema Definitions for GoldSphere Platform
 * 
 * High-performance shared Zod schemas with comprehensive validation and caching
 * Foundation schemas used across all platform modules
 */

import { z } from 'zod';

// =============================================================================
// CORE VALIDATION PRIMITIVES
// =============================================================================

// UUID validation with optimized regex
const UuidSchema = z.string().uuid('Invalid UUID format');

// ISO currency code validation (3-letter codes)
const CurrencyCodeSchema = z.string().length(3, 'Currency must be 3-letter ISO code').regex(
  /^[A-Z]{3}$/,
  'Currency must be uppercase ISO code (e.g., USD, EUR, GBP)'
);

// ISO country code validation (2-letter codes)
const CountryCodeSchema = z.string().length(2, 'Country must be 2-letter ISO code').regex(
  /^[A-Z]{2}$/,
  'Country must be uppercase ISO code (e.g., US, CA, GB)'
);

// Timestamp validation (ISO 8601 format)
const TimestampSchema = z.string().datetime('Invalid ISO 8601 timestamp format');

// Email validation with enhanced checking
const EmailSchema = z.string().email('Invalid email format').max(254, 'Email too long');

// Phone number validation (international format)
const PhoneSchema = z.string().regex(
  /^\+?[\d\s\-()]{7,20}$/,
  'Invalid phone number format'
).max(20, 'Phone number too long');

// =============================================================================
// ENHANCED PAGINATION SCHEMA
// =============================================================================

// Comprehensive pagination schema with metadata
const CommonPaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(), // Standardized naming (fixed from hasPrev)
  offset: z.number().int().min(0).optional(), // For SQL OFFSET queries
  startCursor: z.string().optional(), // For cursor-based pagination
  endCursor: z.string().optional()
});

// Query parameter pagination (from URL strings)
const CommonPaginationQuerySchema = z.object({
  page: z.string().optional().transform(val => {
    const parsed = parseInt(val || '1', 10);
    return Math.max(1, isNaN(parsed) ? 1 : parsed);
  }),
  limit: z.string().optional().transform(val => {
    const parsed = parseInt(val || '20', 10);
    return Math.min(100, Math.max(1, isNaN(parsed) ? 20 : parsed));
  }),
  cursor: z.string().optional() // For cursor-based pagination
});

// =============================================================================
// STANDARDIZED RESPONSE SCHEMAS
// =============================================================================

// Success response with optional data
const CommonSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  timestamp: TimestampSchema.optional()
});

// Generic success response with data
const DataSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: TimestampSchema.optional()
  });

// Paginated response schema
const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      pagination: CommonPaginationSchema
    }),
    message: z.string().optional(),
    timestamp: TimestampSchema.optional()
  });

// =============================================================================
// COMPREHENSIVE ERROR SCHEMAS
// =============================================================================

// Standard error response
const CommonErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.string().optional(),
  timestamp: TimestampSchema.optional()
});

// Validation error response with field-level errors
const CommonValidationErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.literal('Validation Error'),
  code: z.literal('VALIDATION_ERROR'),
  details: z.string(),
  validationErrors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    value: z.any().optional(),
    code: z.string().optional()
  })),
  timestamp: TimestampSchema
});

// Business logic error response
const CommonBusinessErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.enum([
    // Authentication & Authorization
    'UNAUTHORIZED',
    'FORBIDDEN',
    'TOKEN_EXPIRED',
    'INVALID_CREDENTIALS',
    
    // Resource Management
    'NOT_FOUND',
    'ALREADY_EXISTS',
    'CONFLICT',
    'GONE',
    
    // Business Logic
    'INSUFFICIENT_FUNDS',
    'INVALID_OPERATION',
    'BUSINESS_RULE_VIOLATION',
    'QUOTA_EXCEEDED',
    
    // System Errors
    'INTERNAL_ERROR',
    'SERVICE_UNAVAILABLE',
    'TIMEOUT',
    'RATE_LIMITED',
    
    // Data Integrity
    'INVALID_STATE',
    'DEPENDENCY_ERROR',
    'CONSTRAINT_VIOLATION'
  ]),
  details: z.string(),
  timestamp: TimestampSchema,
  retryable: z.boolean().optional(),
  retryAfter: z.number().int().min(0).optional() // seconds
});

// =============================================================================
// QUERY PARAMETER HELPERS
// =============================================================================

// String to number transformer with bounds
const stringToNumber = (min?: number, max?: number) =>
  z.string().optional().transform(val => {
    if (!val) return undefined;
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) return undefined;
    if (min !== undefined && parsed < min) return min;
    if (max !== undefined && parsed > max) return max;
    return parsed;
  });

// String to float transformer with bounds
const stringToFloat = (min?: number, max?: number) =>
  z.string().optional().transform(val => {
    if (!val) return undefined;
    const parsed = parseFloat(val);
    if (isNaN(parsed)) return undefined;
    if (min !== undefined && parsed < min) return min;
    if (max !== undefined && parsed > max) return max;
    return parsed;
  });

// String to boolean transformer
const stringToBoolean = z.string().optional().transform(val => {
  if (val === 'true' || val === '1') return true;
  if (val === 'false' || val === '0') return false;
  return undefined;
});

// String to date transformer
const stringToDate = z.string().optional().transform(val => {
  if (!val) return undefined;
  const date = new Date(val);
  return isNaN(date.getTime()) ? undefined : date;
});

// =============================================================================
// FINANCIAL SCHEMAS
// =============================================================================

// Money amount schema with currency
const MoneySchema = z.object({
  amount: z.number().min(0),
  currency: CurrencyCodeSchema,
  precision: z.number().int().min(0).max(8).default(2)
});

// Price range schema
const PriceRangeSchema = z.object({
  min: MoneySchema,
  max: MoneySchema
}).refine(
  data => data.min.currency === data.max.currency,
  { message: 'Min and max prices must use the same currency' }
).refine(
  data => data.min.amount <= data.max.amount,
  { message: 'Minimum price must be less than or equal to maximum price' }
);

// =============================================================================
// PERFORMANCE OPTIMIZATION HELPERS
// =============================================================================

// Cache key generator for consistent caching
const generateCacheKey = (...parts: (string | number)[]): string => {
  return parts.map(part => String(part).toLowerCase()).join(':');
};

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

// Validate and transform query parameters safely
const parseQueryParams = <T extends z.ZodTypeAny>(
  schema: T,
  params: unknown
): z.infer<T> | null => {
  try {
    return schema.parse(params);
  } catch (error) {
    console.warn('Query parameter validation failed:', error);
    return null;
  }
};

// Create a safe parser that returns success/error result
const createSafeParser = <T extends z.ZodTypeAny>(schema: T) => {
  return (data: unknown): { success: true; data: z.infer<T> } | { success: false; error: string } => {
    try {
      const result = schema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed';
      return { success: false, error: message };
    }
  };
};

// Create an enum validation schema with caching
const createCachedEnumSchema = <T extends readonly string[]>(
  values: T,
  name: string
) => {
  const valueSet = new Set(values.map(v => v.toLowerCase()));
  
  return z.string().refine(
    (value) => valueSet.has(value.toLowerCase()),
    { message: `Invalid ${name}. Must be one of: ${values.join(', ')}` }
  );
};

// Create a paginated response schema for any item type
const createPaginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) =>
  PaginatedResponseSchema(itemSchema);

// Create a success response schema with typed data
const createDataResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  DataSuccessResponseSchema(dataSchema);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Core types
export type UuidType = z.infer<typeof UuidSchema>;
export type CurrencyCodeType = z.infer<typeof CurrencyCodeSchema>;
export type CountryCodeType = z.infer<typeof CountryCodeSchema>;
export type TimestampType = z.infer<typeof TimestampSchema>;
export type EmailType = z.infer<typeof EmailSchema>;
export type PhoneType = z.infer<typeof PhoneSchema>;

// Response types
export type CommonPaginationType = z.infer<typeof CommonPaginationSchema>;
export type CommonPaginationQueryType = z.infer<typeof CommonPaginationQuerySchema>;
export type CommonSuccessResponseType = z.infer<typeof CommonSuccessResponseSchema>;
export type CommonErrorResponseType = z.infer<typeof CommonErrorResponseSchema>;
export type CommonValidationErrorResponseType = z.infer<typeof CommonValidationErrorResponseSchema>;
export type CommonBusinessErrorResponseType = z.infer<typeof CommonBusinessErrorResponseSchema>;

// Financial types
export type MoneyType = z.infer<typeof MoneySchema>;
export type PriceRangeType = z.infer<typeof PriceRangeSchema>;

// =============================================================================
// EXPORT ALL SCHEMAS FOR EASY IMPORTING
// =============================================================================

export {
  // Core schemas
  UuidSchema,
  CurrencyCodeSchema,
  CountryCodeSchema,
  TimestampSchema,
  EmailSchema,
  PhoneSchema,
  
  // Response schemas (with Common prefix to avoid conflicts)
  CommonPaginationSchema,
  CommonPaginationQuerySchema,
  CommonSuccessResponseSchema,
  CommonErrorResponseSchema,
  CommonValidationErrorResponseSchema,
  CommonBusinessErrorResponseSchema,
  
  // Financial schemas
  MoneySchema,
  PriceRangeSchema,
  
  // Factory functions
  DataSuccessResponseSchema,
  PaginatedResponseSchema,
  createPaginatedResponse,
  createDataResponse,
  createCachedEnumSchema,
  
  // Helper functions
  stringToNumber,
  stringToFloat,
  stringToBoolean,
  stringToDate,
  generateCacheKey,
  parseQueryParams,
  createSafeParser
};
