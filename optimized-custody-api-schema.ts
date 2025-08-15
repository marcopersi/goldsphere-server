/**
 * Optimized Custody API Request/Response Schemas for GoldSphere Platform
 * 
 * High-performance Zod schemas aligned with database structure and optimized custody schemas
 * Includes proper validation, caching, and database field mapping
 */

import { z } from 'zod';
import { 
  CustodianSchema, 
  CustodyServiceSchema, 
  CustodyAssignmentSchema,
  ExtendedCustodianSchema,
  ExtendedCustodyServiceSchema,
  PaymentFrequencyEnumSchema,
  CustodyServiceTypeEnumSchema,
  PositionCustodyInfoSchema
} from './optimized-custody-schema';

// =============================================================================
// COMMON SCHEMAS (with fallbacks if not available)
// =============================================================================

// Pagination schema with proper defaults
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrevious: z.boolean()
});

// Query parameter transformers (for URL string to proper types)
const stringToNumber = z.string().optional().transform(val => val ? parseInt(val, 10) : undefined);
const stringToFloat = z.string().optional().transform(val => val ? parseFloat(val) : undefined);
const stringToBoolean = z.string().optional().transform(val => {
  if (val === 'true') return true;
  if (val === 'false') return false;
  return undefined;
});

// =============================================================================
// DATABASE-ALIGNED REQUEST SCHEMAS
// =============================================================================

// Custodian creation (aligned with actual database fields)
export const CreateCustodianRequestSchema = z.object({
  name: z.string().min(1, 'Custodian name is required').max(200),
  description: z.string().max(1000).optional()
});

// Custodian update (simplified for database compatibility)
export const UpdateCustodianRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional()
});

// Extended custodian creation (for future features)
export const CreateExtendedCustodianRequestSchema = z.object({
  name: z.string().min(1, 'Custodian name is required').max(200),
  value: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  contactInfo: z.object({
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    address: z.object({
      street: z.string().max(200).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(50).optional(),
      zipCode: z.string().max(20).optional(),
      country: z.string().length(2).optional() // ISO country code
    }).optional()
  }).optional(),
  capabilities: z.array(z.string().max(50)).max(20).optional(),
  certifications: z.array(z.string().max(100)).max(10).optional(),
  isActive: z.boolean().default(true)
});

// Custody service creation (aligned with database structure)
export const CreateCustodyServiceRequestSchema = z.object({
  custodianId: z.string().uuid('Invalid custodian ID'),
  serviceName: z.string().min(1, 'Service name is required').max(200),
  serviceType: CustodyServiceTypeEnumSchema.optional(),
  description: z.string().max(1000).optional(),
  fee: z.number().min(0, 'Fee must be non-negative'),
  paymentFrequency: PaymentFrequencyEnumSchema,
  currency: z.string().length(3, 'Currency must be 3-letter ISO code'),
  maxWeight: z.number().min(0).optional()
});

// Extended custody service creation (for future features)
export const CreateExtendedCustodyServiceRequestSchema = z.object({
  custodianId: z.string().uuid('Invalid custodian ID'),
  serviceName: z.string().min(1, 'Service name is required').max(200),
  serviceType: CustodyServiceTypeEnumSchema.optional(),
  description: z.string().max(1000).optional(),
  fee: z.number().min(0, 'Fee must be non-negative'),
  feeStructure: z.object({
    baseAmount: z.number().min(0),
    percentage: z.number().min(0).max(100).optional(),
    minimumFee: z.number().min(0).optional(),
    maximumFee: z.number().min(0).optional()
  }).optional(),
  paymentFrequency: PaymentFrequencyEnumSchema,
  currency: z.string().length(3, 'Currency must be 3-letter ISO code'),
  maxWeight: z.number().min(0).optional(),
  weightUnit: z.enum(['grams', 'troy_ounces', 'kilograms']).default('grams'),
  supportedMetals: z.array(z.string().max(20)).max(10).optional(),
  minimumValue: z.number().min(0).optional(),
  maximumValue: z.number().min(0).optional(),
  terms: z.object({
    minimumTerm: z.string().max(50).optional(),
    cancellationNotice: z.string().max(50).optional(),
    autoRenewal: z.boolean().default(false)
  }).optional(),
  features: z.object({
    insurance: z.boolean().default(false),
    auditReports: z.boolean().default(false),
    onlineAccess: z.boolean().default(false),
    physicalDelivery: z.boolean().default(false)
  }).optional(),
  availableRegions: z.array(z.string().length(2)).max(50).optional(), // ISO country codes
  isActive: z.boolean().default(true)
});

// Custody service update schemas
export const UpdateCustodyServiceRequestSchema = CreateCustodyServiceRequestSchema.partial();
export const UpdateExtendedCustodyServiceRequestSchema = CreateExtendedCustodyServiceRequestSchema.partial();

// =============================================================================
// CUSTODY ASSIGNMENT SCHEMAS
// =============================================================================

// Custody assignment creation
export const CreateCustodyAssignmentRequestSchema = z.object({
  positionId: z.string().uuid('Invalid position ID'),
  custodyServiceId: z.string().uuid('Invalid custody service ID'),
  quantity: z.number().positive('Quantity must be positive'),
  storageLocation: z.string().max(200).optional(),
  certificateNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional()
});

// Custody assignment update
export const UpdateCustodyAssignmentRequestSchema = z.object({
  quantity: z.number().positive('Quantity must be positive').optional(),
  storageLocation: z.string().max(200).optional(),
  certificateNumber: z.string().max(100).optional(),
  status: z.enum(['active', 'pending', 'transferred', 'withdrawn']).optional(),
  notes: z.string().max(500).optional()
});

// Bulk custody assignment operations
export const BulkCustodyAssignmentRequestSchema = z.object({
  assignments: z.array(CreateCustodyAssignmentRequestSchema).min(1).max(100),
  validateOnly: z.boolean().default(false)
});

// =============================================================================
// OPTIMIZED RESPONSE SCHEMAS
// =============================================================================

// Single item responses
export const CustodianResponseSchema = z.object({
  success: z.boolean(),
  data: CustodianSchema,
  message: z.string().optional()
});

export const CustodyServiceResponseSchema = z.object({
  success: z.boolean(),
  data: CustodyServiceSchema,
  message: z.string().optional()
});

export const CustodyAssignmentResponseSchema = z.object({
  success: z.boolean(),
  data: CustodyAssignmentSchema,
  message: z.string().optional()
});

// Collection responses with pagination
export const CustodiansResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    custodians: z.array(CustodianSchema),
    pagination: PaginationSchema
  }),
  message: z.string().optional()
});

export const CustodyServicesResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    custodyServices: z.array(CustodyServiceSchema),
    pagination: PaginationSchema
  }),
  message: z.string().optional()
});

export const CustodyAssignmentsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    custodyAssignments: z.array(CustodyAssignmentSchema),
    pagination: PaginationSchema
  }),
  message: z.string().optional()
});

// Extended responses (for future features)
export const ExtendedCustodiansResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    custodians: z.array(ExtendedCustodianSchema),
    pagination: PaginationSchema,
    summary: z.object({
      totalActive: z.number().int().min(0),
      totalInactive: z.number().int().min(0),
      totalServices: z.number().int().min(0)
    }).optional()
  }),
  message: z.string().optional()
});

export const ExtendedCustodyServicesResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    custodyServices: z.array(ExtendedCustodyServiceSchema),
    pagination: PaginationSchema,
    summary: z.object({
      totalActive: z.number().int().min(0),
      totalInactive: z.number().int().min(0),
      averageFee: z.number().min(0).optional(),
      totalAssignments: z.number().int().min(0)
    }).optional()
  }),
  message: z.string().optional()
});

// Position custody info response (for position endpoints)
export const PositionCustodyResponseSchema = z.object({
  success: z.boolean(),
  data: PositionCustodyInfoSchema,
  message: z.string().optional()
});

// =============================================================================
// HIGH-PERFORMANCE QUERY SCHEMAS
// =============================================================================

// Custodians query with optimized validation
export const CustodiansQuerySchema = z.object({
  page: stringToNumber.transform(val => Math.max(1, val || 1)),
  limit: stringToNumber.transform(val => Math.min(100, Math.max(1, val || 20))),
  search: z.string().max(200).optional(),
  isActive: stringToBoolean,
  region: z.string().length(2).optional(), // ISO country code
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

// Custody services query with enum validation
export const CustodyServicesQuerySchema = z.object({
  page: stringToNumber.transform(val => Math.max(1, val || 1)),
  limit: stringToNumber.transform(val => Math.min(100, Math.max(1, val || 20))),
  search: z.string().max(200).optional(),
  custodianId: z.string().uuid().optional(),
  serviceType: CustodyServiceTypeEnumSchema.optional(),
  paymentFrequency: PaymentFrequencyEnumSchema.optional(),
  currency: z.string().length(3).optional(),
  minFee: stringToFloat.transform(val => val && val >= 0 ? val : undefined),
  maxFee: stringToFloat.transform(val => val && val >= 0 ? val : undefined),
  maxWeight: stringToFloat.transform(val => val && val >= 0 ? val : undefined),
  region: z.string().length(2).optional(),
  isActive: stringToBoolean,
  sortBy: z.enum(['serviceName', 'fee', 'custodianName', 'createdAt']).default('serviceName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

// Custody assignments query
export const CustodyAssignmentsQuerySchema = z.object({
  page: stringToNumber.transform(val => Math.max(1, val || 1)),
  limit: stringToNumber.transform(val => Math.min(100, Math.max(1, val || 20))),
  positionId: z.string().uuid().optional(),
  custodyServiceId: z.string().uuid().optional(),
  custodianId: z.string().uuid().optional(),
  status: z.enum(['active', 'pending', 'transferred', 'withdrawn']).optional(),
  assignedAfter: z.string().datetime().optional(),
  assignedBefore: z.string().datetime().optional(),
  minQuantity: stringToFloat.transform(val => val && val >= 0 ? val : undefined),
  maxQuantity: stringToFloat.transform(val => val && val >= 0 ? val : undefined),
  sortBy: z.enum(['assignedDate', 'quantity', 'status', 'createdAt']).default('assignedDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// =============================================================================
// ERROR RESPONSE SCHEMAS
// =============================================================================

// Standard error response
export const CustodyErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.string().optional(),
  code: z.string().optional(),
  timestamp: z.string().datetime().optional()
});

// Validation error response
export const CustodyValidationErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.literal('Validation Error'),
  details: z.string(),
  validationErrors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    value: z.any().optional()
  })),
  code: z.literal('VALIDATION_ERROR'),
  timestamp: z.string().datetime()
});

// Business logic error response
export const CustodyBusinessErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.string(),
  code: z.enum([
    'CUSTODIAN_NOT_FOUND',
    'CUSTODY_SERVICE_NOT_FOUND',
    'ASSIGNMENT_NOT_FOUND',
    'INSUFFICIENT_QUANTITY',
    'INVALID_STATUS_TRANSITION',
    'DUPLICATE_ASSIGNMENT',
    'CUSTODIAN_HAS_SERVICES',
    'SERVICE_HAS_ASSIGNMENTS'
  ]),
  timestamp: z.string().datetime()
});

// =============================================================================
// BULK OPERATION SCHEMAS
// =============================================================================

// Bulk operations response
export const BulkOperationResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    totalRequested: z.number().int().min(0),
    totalProcessed: z.number().int().min(0),
    totalSuccessful: z.number().int().min(0),
    totalFailed: z.number().int().min(0),
    results: z.array(z.object({
      index: z.number().int().min(0),
      success: z.boolean(),
      data: z.any().optional(),
      error: z.string().optional()
    }))
  }),
  message: z.string().optional()
});

// =============================================================================
// SPECIALIZED SCHEMAS
// =============================================================================

// Custody service availability check
export const CustodyServiceAvailabilityRequestSchema = z.object({
  custodyServiceId: z.string().uuid(),
  quantity: z.number().positive(),
  targetDate: z.string().datetime().optional()
});

export const CustodyServiceAvailabilityResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    custodyServiceId: z.string().uuid(),
    available: z.boolean(),
    availableQuantity: z.number().min(0),
    estimatedFee: z.number().min(0),
    earliestAvailableDate: z.string().datetime().optional(),
    restrictions: z.array(z.string()).optional()
  })
});

// Custody cost calculation
export const CustodyFeeCalculationRequestSchema = z.object({
  custodyServiceId: z.string().uuid(),
  quantity: z.number().positive(),
  duration: z.number().int().positive().optional(), // days
  currency: z.string().length(3).optional()
});

export const CustodyFeeCalculationResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    custodyServiceId: z.string().uuid(),
    quantity: z.number().positive(),
    baseFee: z.number().min(0),
    totalFee: z.number().min(0),
    currency: z.string().length(3),
    feeBreakdown: z.array(z.object({
      type: z.string(),
      amount: z.number(),
      description: z.string().optional()
    })).optional(),
    validUntil: z.string().datetime().optional()
  })
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Request types
export type CreateCustodianRequestType = z.infer<typeof CreateCustodianRequestSchema>;
export type UpdateCustodianRequestType = z.infer<typeof UpdateCustodianRequestSchema>;
export type CreateExtendedCustodianRequestType = z.infer<typeof CreateExtendedCustodianRequestSchema>;
export type CreateCustodyServiceRequestType = z.infer<typeof CreateCustodyServiceRequestSchema>;
export type UpdateCustodyServiceRequestType = z.infer<typeof UpdateCustodyServiceRequestSchema>;
export type CreateExtendedCustodyServiceRequestType = z.infer<typeof CreateExtendedCustodyServiceRequestSchema>;
export type UpdateExtendedCustodyServiceRequestType = z.infer<typeof UpdateExtendedCustodyServiceRequestSchema>;
export type CreateCustodyAssignmentRequestType = z.infer<typeof CreateCustodyAssignmentRequestSchema>;
export type UpdateCustodyAssignmentRequestType = z.infer<typeof UpdateCustodyAssignmentRequestSchema>;
export type BulkCustodyAssignmentRequestType = z.infer<typeof BulkCustodyAssignmentRequestSchema>;

// Response types
export type CustodianResponseType = z.infer<typeof CustodianResponseSchema>;
export type CustodiansResponseType = z.infer<typeof CustodiansResponseSchema>;
export type CustodyServiceResponseType = z.infer<typeof CustodyServiceResponseSchema>;
export type CustodyServicesResponseType = z.infer<typeof CustodyServicesResponseSchema>;
export type CustodyAssignmentResponseType = z.infer<typeof CustodyAssignmentResponseSchema>;
export type CustodyAssignmentsResponseType = z.infer<typeof CustodyAssignmentsResponseSchema>;
export type ExtendedCustodiansResponseType = z.infer<typeof ExtendedCustodiansResponseSchema>;
export type ExtendedCustodyServicesResponseType = z.infer<typeof ExtendedCustodyServicesResponseSchema>;
export type PositionCustodyResponseType = z.infer<typeof PositionCustodyResponseSchema>;

// Query types
export type CustodiansQueryType = z.infer<typeof CustodiansQuerySchema>;
export type CustodyServicesQueryType = z.infer<typeof CustodyServicesQuerySchema>;
export type CustodyAssignmentsQueryType = z.infer<typeof CustodyAssignmentsQuerySchema>;

// Error types
export type CustodyErrorResponseType = z.infer<typeof CustodyErrorResponseSchema>;
export type CustodyValidationErrorResponseType = z.infer<typeof CustodyValidationErrorResponseSchema>;
export type CustodyBusinessErrorResponseType = z.infer<typeof CustodyBusinessErrorResponseSchema>;

// Specialized types
export type CustodyServiceAvailabilityRequestType = z.infer<typeof CustodyServiceAvailabilityRequestSchema>;
export type CustodyServiceAvailabilityResponseType = z.infer<typeof CustodyServiceAvailabilityResponseSchema>;
export type CustodyFeeCalculationRequestType = z.infer<typeof CustodyFeeCalculationRequestSchema>;
export type CustodyFeeCalculationResponseType = z.infer<typeof CustodyFeeCalculationResponseSchema>;
export type BulkOperationResponseType = z.infer<typeof BulkOperationResponseSchema>;

// Common types
export type PaginationType = z.infer<typeof PaginationSchema>;
