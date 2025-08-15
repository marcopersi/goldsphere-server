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
  /^\+?[\d\s\-\(\)]{7,20}$/,
  'Invalid phone number format'
).max(20, 'Phone number too long');

// =============================================================================
// ENHANCED PAGINATION SCHEMA
// =============================================================================

// Comprehensive pagination schema with metadata
const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(), // Standardized naming
  offset: z.number().int().min(0).optional(), // For SQL OFFSET queries
  startCursor: z.string().optional(), // For cursor-based pagination
  endCursor: z.string().optional()
});

// Query parameter pagination (from URL strings)
const PaginationQuerySchema = z.object({
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
const SuccessResponseSchema = z.object({
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
      pagination: PaginationSchema
    }),
    message: z.string().optional(),
    timestamp: TimestampSchema.optional()
  });

// =============================================================================
// COMPREHENSIVE ERROR SCHEMAS
// =============================================================================

// Standard error response
const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.string().optional(),
  timestamp: TimestampSchema.optional()
});

// Validation error response with field-level errors
const ValidationErrorResponseSchema = z.object({
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
const BusinessErrorResponseSchema = z.object({
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
// COMMON SORT AND FILTER SCHEMAS
// =============================================================================

// Generic sort schema
const SortSchema = z.object({
  sortBy: z.string().min(1).max(50),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

// Date range filter
const DateRangeSchema = z.object({
  startDate: TimestampSchema.optional(),
  endDate: TimestampSchema.optional()
}).refine(
  data => !data.startDate || !data.endDate || new Date(data.startDate) <= new Date(data.endDate),
  { message: 'Start date must be before or equal to end date' }
);

// Number range filter
const NumberRangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional()
}).refine(
  data => data.min === undefined || data.max === undefined || data.min <= data.max,
  { message: 'Minimum value must be less than or equal to maximum value' }
);

// Search filter with enhanced options
const SearchSchema = z.object({
  query: z.string().min(1).max(200),
  fields: z.array(z.string().min(1).max(50)).max(10).optional(),
  exact: z.boolean().default(false),
  caseSensitive: z.boolean().default(false)
});

// =============================================================================
// METADATA SCHEMAS
// =============================================================================

// Audit trail schema
const AuditSchema = z.object({
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  createdBy: UuidSchema.optional(),
  updatedBy: UuidSchema.optional(),
  version: z.number().int().min(1).default(1)
});

// Soft delete schema
const SoftDeleteSchema = z.object({
  isDeleted: z.boolean().default(false),
  deletedAt: TimestampSchema.optional(),
  deletedBy: UuidSchema.optional()
});

// Activity status schema
const StatusSchema = z.object({
  isActive: z.boolean().default(true),
  statusReason: z.string().max(500).optional(),
  statusChangedAt: TimestampSchema.optional(),
  statusChangedBy: UuidSchema.optional()
});

// =============================================================================
// ADDRESS AND CONTACT SCHEMAS
// =============================================================================

// Comprehensive address schema
const AddressSchema = z.object({
  street: z.string().min(1).max(200),
  street2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(50).optional(),
  postalCode: z.string().max(20).optional(),
  country: CountryCodeSchema,
  isDefault: z.boolean().default(false),
  type: z.enum(['billing', 'shipping', 'business', 'home']).optional()
});

// Contact information schema
const ContactInfoSchema = z.object({
  email: EmailSchema.optional(),
  phone: PhoneSchema.optional(),
  website: z.string().url().optional(),
  address: AddressSchema.optional()
});

// =============================================================================
// FILE AND MEDIA SCHEMAS
// =============================================================================

// File metadata schema
const FileMetadataSchema = z.object({
  filename: z.string().min(1).max(255),
  originalName: z.string().max(255).optional(),
  mimeType: z.string().max(100),
  size: z.number().int().min(0),
  url: z.string().url().optional(),
  checksum: z.string().max(64).optional(), // For integrity verification
  uploadedAt: TimestampSchema,
  uploadedBy: UuidSchema.optional()
});

// Image metadata schema
const ImageMetadataSchema = FileMetadataSchema.extend({
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
  thumbnailUrl: z.string().url().optional()
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

// Rate limiting metadata
const RateLimitSchema = z.object({
  limit: z.number().int().min(1),
  remaining: z.number().int().min(0),
  resetTime: TimestampSchema,
  retryAfter: z.number().int().min(0).optional()
});

// =============================================================================
// WEBHOOK AND EVENT SCHEMAS
// =============================================================================

// Webhook payload schema
const WebhookPayloadSchema = z.object({
  id: UuidSchema,
  event: z.string().min(1).max(100),
  data: z.any(),
  timestamp: TimestampSchema,
  version: z.string().default('1.0'),
  signature: z.string().optional() // For webhook verification
});

// Event metadata schema
const EventMetadataSchema = z.object({
  eventId: UuidSchema,
  eventType: z.string().min(1).max(100),
  source: z.string().min(1).max(100),
  timestamp: TimestampSchema,
  correlationId: UuidSchema.optional(),
  userId: UuidSchema.optional(),
  sessionId: z.string().max(100).optional()
});

// =============================================================================
// HEALTH CHECK AND MONITORING
// =============================================================================

// Health check response schema
const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: TimestampSchema,
  version: z.string(),
  uptime: z.number().min(0), // seconds
  checks: z.record(z.object({
    status: z.enum(['pass', 'fail', 'warn']),
    message: z.string().optional(),
    time: z.number().min(0).optional() // response time in ms
  })).optional()
});

// =============================================================================
// SCHEMA FACTORY FUNCTIONS
// =============================================================================

// Create a paginated response schema for any item type
const createPaginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) =>
  PaginatedResponseSchema(itemSchema);

// Create a success response schema with typed data
const createDataResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  DataSuccessResponseSchema(dataSchema);

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
export type CommonPaginationType = z.infer<typeof PaginationSchema>;
export type CommonPaginationQueryType = z.infer<typeof PaginationQuerySchema>;
export type CommonSuccessResponseType = z.infer<typeof SuccessResponseSchema>;
export type CommonErrorResponseType = z.infer<typeof ErrorResponseSchema>;
export type CommonValidationErrorResponseType = z.infer<typeof ValidationErrorResponseSchema>;
export type CommonBusinessErrorResponseType = z.infer<typeof BusinessErrorResponseSchema>;

// Common filter types
export type SortType = z.infer<typeof SortSchema>;
export type DateRangeType = z.infer<typeof DateRangeSchema>;
export type NumberRangeType = z.infer<typeof NumberRangeSchema>;
export type SearchType = z.infer<typeof SearchSchema>;

// Metadata types
export type AuditType = z.infer<typeof AuditSchema>;
export type SoftDeleteType = z.infer<typeof SoftDeleteSchema>;
export type StatusType = z.infer<typeof StatusSchema>;

// Contact types
export type AddressType = z.infer<typeof AddressSchema>;
export type ContactInfoType = z.infer<typeof ContactInfoSchema>;

// File types
export type FileMetadataType = z.infer<typeof FileMetadataSchema>;
export type ImageMetadataType = z.infer<typeof ImageMetadataSchema>;

// Financial types
export type MoneyType = z.infer<typeof MoneySchema>;
export type PriceRangeType = z.infer<typeof PriceRangeSchema>;

// System types
export type RateLimitType = z.infer<typeof RateLimitSchema>;
export type WebhookPayloadType = z.infer<typeof WebhookPayloadSchema>;
export type EventMetadataType = z.infer<typeof EventMetadataSchema>;
export type HealthCheckType = z.infer<typeof HealthCheckSchema>;

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
  PaginationSchema as CommonPaginationSchema,
  PaginationQuerySchema as CommonPaginationQuerySchema,
  SuccessResponseSchema as CommonSuccessResponseSchema,
  ErrorResponseSchema as CommonErrorResponseSchema,
  ValidationErrorResponseSchema as CommonValidationErrorResponseSchema,
  BusinessErrorResponseSchema as CommonBusinessErrorResponseSchema,
  
  // Common schemas
  SortSchema,
  DateRangeSchema,
  NumberRangeSchema,
  SearchSchema,
  AuditSchema,
  SoftDeleteSchema,
  StatusSchema,
  AddressSchema,
  ContactInfoSchema,
  FileMetadataSchema,
  ImageMetadataSchema,
  MoneySchema,
  PriceRangeSchema,
  RateLimitSchema,
  WebhookPayloadSchema,
  EventMetadataSchema,
  HealthCheckSchema,
  
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

// =============================================================================
// ENHANCED PAGINATION SCHEMA
// =============================================================================

// Comprehensive pagination schema with metadata
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(), // Standardized naming
  offset: z.number().int().min(0).optional(), // For SQL OFFSET queries
  startCursor: z.string().optional(), // For cursor-based pagination
  endCursor: z.string().optional()
});

// Query parameter pagination (from URL strings)
export const PaginationQuerySchema = z.object({
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
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  timestamp: TimestampSchema.optional()
});

// Generic success response with data
export const DataSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: TimestampSchema.optional()
  });

// Paginated response schema
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      pagination: PaginationSchema
    }),
    message: z.string().optional(),
    timestamp: TimestampSchema.optional()
  });

// =============================================================================
// COMPREHENSIVE ERROR SCHEMAS
// =============================================================================

// Standard error response
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.string().optional(),
  timestamp: TimestampSchema.optional()
});

// Validation error response with field-level errors
export const ValidationErrorResponseSchema = z.object({
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
export const BusinessErrorResponseSchema = z.object({
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
export const stringToNumber = (min?: number, max?: number) =>
  z.string().optional().transform(val => {
    if (!val) return undefined;
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) return undefined;
    if (min !== undefined && parsed < min) return min;
    if (max !== undefined && parsed > max) return max;
    return parsed;
  });

// String to float transformer with bounds
export const stringToFloat = (min?: number, max?: number) =>
  z.string().optional().transform(val => {
    if (!val) return undefined;
    const parsed = parseFloat(val);
    if (isNaN(parsed)) return undefined;
    if (min !== undefined && parsed < min) return min;
    if (max !== undefined && parsed > max) return max;
    return parsed;
  });

// String to boolean transformer
export const stringToBoolean = z.string().optional().transform(val => {
  if (val === 'true' || val === '1') return true;
  if (val === 'false' || val === '0') return false;
  return undefined;
});

// String to date transformer
export const stringToDate = z.string().optional().transform(val => {
  if (!val) return undefined;
  const date = new Date(val);
  return isNaN(date.getTime()) ? undefined : date;
});

// =============================================================================
// COMMON SORT AND FILTER SCHEMAS
// =============================================================================

// Generic sort schema
export const SortSchema = z.object({
  sortBy: z.string().min(1).max(50),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

// Date range filter
export const DateRangeSchema = z.object({
  startDate: TimestampSchema.optional(),
  endDate: TimestampSchema.optional()
}).refine(
  data => !data.startDate || !data.endDate || new Date(data.startDate) <= new Date(data.endDate),
  { message: 'Start date must be before or equal to end date' }
);

// Number range filter
export const NumberRangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional()
}).refine(
  data => data.min === undefined || data.max === undefined || data.min <= data.max,
  { message: 'Minimum value must be less than or equal to maximum value' }
);

// Search filter with enhanced options
export const SearchSchema = z.object({
  query: z.string().min(1).max(200),
  fields: z.array(z.string().min(1).max(50)).max(10).optional(),
  exact: z.boolean().default(false),
  caseSensitive: z.boolean().default(false)
});

// =============================================================================
// METADATA SCHEMAS
// =============================================================================

// Audit trail schema
export const AuditSchema = z.object({
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  createdBy: UuidSchema.optional(),
  updatedBy: UuidSchema.optional(),
  version: z.number().int().min(1).default(1)
});

// Soft delete schema
export const SoftDeleteSchema = z.object({
  isDeleted: z.boolean().default(false),
  deletedAt: TimestampSchema.optional(),
  deletedBy: UuidSchema.optional()
});

// Activity status schema
export const StatusSchema = z.object({
  isActive: z.boolean().default(true),
  statusReason: z.string().max(500).optional(),
  statusChangedAt: TimestampSchema.optional(),
  statusChangedBy: UuidSchema.optional()
});

// =============================================================================
// ADDRESS AND CONTACT SCHEMAS
// =============================================================================

// Comprehensive address schema
export const AddressSchema = z.object({
  street: z.string().min(1).max(200),
  street2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(50).optional(),
  postalCode: z.string().max(20).optional(),
  country: CountryCodeSchema,
  isDefault: z.boolean().default(false),
  type: z.enum(['billing', 'shipping', 'business', 'home']).optional()
});

// Contact information schema
export const ContactInfoSchema = z.object({
  email: EmailSchema.optional(),
  phone: PhoneSchema.optional(),
  website: z.string().url().optional(),
  address: AddressSchema.optional()
});

// =============================================================================
// FILE AND MEDIA SCHEMAS
// =============================================================================

// File metadata schema
export const FileMetadataSchema = z.object({
  filename: z.string().min(1).max(255),
  originalName: z.string().max(255).optional(),
  mimeType: z.string().max(100),
  size: z.number().int().min(0),
  url: z.string().url().optional(),
  checksum: z.string().max(64).optional(), // For integrity verification
  uploadedAt: TimestampSchema,
  uploadedBy: UuidSchema.optional()
});

// Image metadata schema
export const ImageMetadataSchema = FileMetadataSchema.extend({
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
  thumbnailUrl: z.string().url().optional()
});

// =============================================================================
// FINANCIAL SCHEMAS
// =============================================================================

// Money amount schema with currency
export const MoneySchema = z.object({
  amount: z.number().min(0),
  currency: CurrencyCodeSchema,
  precision: z.number().int().min(0).max(8).default(2)
});

// Price range schema
export const PriceRangeSchema = z.object({
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
export const generateCacheKey = (...parts: (string | number)[]): string => {
  return parts.map(part => String(part).toLowerCase()).join(':');
};

// Rate limiting metadata
export const RateLimitSchema = z.object({
  limit: z.number().int().min(1),
  remaining: z.number().int().min(0),
  resetTime: TimestampSchema,
  retryAfter: z.number().int().min(0).optional()
});

// =============================================================================
// WEBHOOK AND EVENT SCHEMAS
// =============================================================================

// Webhook payload schema
export const WebhookPayloadSchema = z.object({
  id: UuidSchema,
  event: z.string().min(1).max(100),
  data: z.any(),
  timestamp: TimestampSchema,
  version: z.string().default('1.0'),
  signature: z.string().optional() // For webhook verification
});

// Event metadata schema
export const EventMetadataSchema = z.object({
  eventId: UuidSchema,
  eventType: z.string().min(1).max(100),
  source: z.string().min(1).max(100),
  timestamp: TimestampSchema,
  correlationId: UuidSchema.optional(),
  userId: UuidSchema.optional(),
  sessionId: z.string().max(100).optional()
});

// =============================================================================
// HEALTH CHECK AND MONITORING
// =============================================================================

// Health check response schema
export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: TimestampSchema,
  version: z.string(),
  uptime: z.number().min(0), // seconds
  checks: z.record(z.object({
    status: z.enum(['pass', 'fail', 'warn']),
    message: z.string().optional(),
    time: z.number().min(0).optional() // response time in ms
  })).optional()
});

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
export type PaginationType = z.infer<typeof PaginationSchema>;
export type PaginationQueryType = z.infer<typeof PaginationQuerySchema>;
export type SuccessResponseType = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponseType = z.infer<typeof ErrorResponseSchema>;
export type ValidationErrorResponseType = z.infer<typeof ValidationErrorResponseSchema>;
export type BusinessErrorResponseType = z.infer<typeof BusinessErrorResponseSchema>;

// Common filter types
export type SortType = z.infer<typeof SortSchema>;
export type DateRangeType = z.infer<typeof DateRangeSchema>;
export type NumberRangeType = z.infer<typeof NumberRangeSchema>;
export type SearchType = z.infer<typeof SearchSchema>;

// Metadata types
export type AuditType = z.infer<typeof AuditSchema>;
export type SoftDeleteType = z.infer<typeof SoftDeleteSchema>;
export type StatusType = z.infer<typeof StatusSchema>;

// Contact types
export type AddressType = z.infer<typeof AddressSchema>;
export type ContactInfoType = z.infer<typeof ContactInfoSchema>;

// File types
export type FileMetadataType = z.infer<typeof FileMetadataSchema>;
export type ImageMetadataType = z.infer<typeof ImageMetadataSchema>;

// Financial types
export type MoneyType = z.infer<typeof MoneySchema>;
export type PriceRangeType = z.infer<typeof PriceRangeSchema>;

// System types
export type RateLimitType = z.infer<typeof RateLimitSchema>;
export type WebhookPayloadType = z.infer<typeof WebhookPayloadSchema>;
export type EventMetadataType = z.infer<typeof EventMetadataSchema>;
export type HealthCheckType = z.infer<typeof HealthCheckSchema>;

// =============================================================================
// SCHEMA FACTORY FUNCTIONS
// =============================================================================

// Create a paginated response schema for any item type
export const createPaginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) =>
  PaginatedResponseSchema(itemSchema);

// Create a success response schema with typed data
export const createDataResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  DataSuccessResponseSchema(dataSchema);

// Create an enum validation schema with caching
export const createCachedEnumSchema = <T extends readonly string[]>(
  values: T,
  name: string
) => {
  const valueSet = new Set(values.map(v => v.toLowerCase()));
  
  return z.string().refine(
    (value) => valueSet.has(value.toLowerCase()),
    { message: `Invalid ${name}. Must be one of: ${values.join(', ')}` }
  );
};

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

// Validate and transform query parameters safely
export const parseQueryParams = <T extends z.ZodTypeAny>(
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
export const createSafeParser = <T extends z.ZodTypeAny>(schema: T) => {
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
  
  // Response schemas
  PaginationSchema,
  PaginationQuerySchema,
  SuccessResponseSchema,
  ErrorResponseSchema,
  ValidationErrorResponseSchema,
  BusinessErrorResponseSchema,
  
  // Common schemas
  SortSchema,
  DateRangeSchema,
  NumberRangeSchema,
  SearchSchema,
  AuditSchema,
  SoftDeleteSchema,
  StatusSchema,
  AddressSchema,
  ContactInfoSchema,
  FileMetadataSchema,
  ImageMetadataSchema,
  MoneySchema,
  PriceRangeSchema,
  RateLimitSchema,
  WebhookPayloadSchema,
  EventMetadataSchema,
  HealthCheckSchema,
  
  // Helper functions
  stringToNumber,
  stringToFloat,
  stringToBoolean,
  stringToDate,
  generateCacheKey,
  parseQueryParams,
  createSafeParser
};
