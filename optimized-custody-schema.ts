/**
 * Optimized Custody Validation Schemas for GoldSphere Platform
 * 
 * High-performance Zod schemas with database alignment and caching
 * Aligned with actual database structure and API implementation
 */

import { z } from 'zod';

// =============================================================================
// PERFORMANCE-OPTIMIZED ENUM CACHING
// =============================================================================

// Cache custody enum values for performance
let _custodianCache: { values: Set<string>; names: Set<string> } | null = null;
let _paymentFrequencyCache: Set<string> | null = null;
let _custodyServiceTypeCache: Set<string> | null = null;

// Lazy initialization with fallbacks
const getCustodianCache = () => {
  if (!_custodianCache) {
    try {
      const { Custodian } = require('../enums') as any;
      const values = Custodian.values();
      _custodianCache = {
        values: new Set(values.map((c: any) => c.value.toLowerCase())),
        names: new Set(values.map((c: any) => c.name.toLowerCase()))
      };
    } catch (error: unknown) {
      console.warn('Failed to load Custodian enum, using fallback values:', error);
      _custodianCache = {
        values: new Set(['brinks', 'loomis', 'malca-amit', 'via-mat']),
        names: new Set(['brinks', 'loomis', 'malca-amit', 'via mat international'])
      };
    }
  }
  return _custodianCache;
};

const getPaymentFrequencyCache = () => {
  if (!_paymentFrequencyCache) {
    try {
      const { PaymentFrequency } = require('../enums') as any;
      const values = PaymentFrequency.values();
      _paymentFrequencyCache = new Set(values.map((pf: any) => pf.value.toLowerCase()));
    } catch (error: unknown) {
      console.warn('Failed to load PaymentFrequency enum, using fallback values:', error);
      _paymentFrequencyCache = new Set(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);
    }
  }
  return _paymentFrequencyCache;
};

const getCustodyServiceTypeCache = () => {
  if (!_custodyServiceTypeCache) {
    try {
      const { CustodyServiceType } = require('../enums') as any;
      const values = CustodyServiceType.values();
      _custodyServiceTypeCache = new Set(values.map((cst: any) => cst.value.toLowerCase()));
    } catch (error: unknown) {
      console.warn('Failed to load CustodyServiceType enum, using fallback values:', error);
      _custodyServiceTypeCache = new Set(['segregated-storage', 'allocated-storage', 'pooled-storage', 'vault-storage']);
    }
  }
  return _custodyServiceTypeCache;
};

// =============================================================================
// OPTIMIZED ENUM VALIDATION SCHEMAS
// =============================================================================

// Custodian validation (accepts value OR name)
export const CustodianEnumSchema = z.string().refine(
  (value) => {
    const cache = getCustodianCache();
    const normalized = value.toLowerCase().trim();
    return cache.values.has(normalized) || cache.names.has(normalized);
  },
  {
    message: "Invalid custodian. Must be a valid custodian value or name"
  }
);

// Payment frequency validation
export const PaymentFrequencyEnumSchema = z.string().refine(
  (value) => {
    const cache = getPaymentFrequencyCache();
    const normalized = value.toLowerCase().trim();
    return cache.has(normalized);
  },
  {
    message: "Invalid payment frequency. Must be one of: daily, weekly, monthly, quarterly, yearly"
  }
);

// Custody service type validation
export const CustodyServiceTypeEnumSchema = z.string().refine(
  (value) => {
    const cache = getCustodyServiceTypeCache();
    const normalized = value.toLowerCase().trim();
    return cache.has(normalized);
  },
  {
    message: "Invalid custody service type. Must be one of: segregated-storage, allocated-storage, pooled-storage, vault-storage"
  }
);

// =============================================================================
// DATABASE-ALIGNED CORE SCHEMAS
// =============================================================================

// Custodian Schema (aligned with database table)
export const CustodianSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Custodian name is required'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

// Database custodian record schema (for mapping)
export const CustodianDatabaseRowSchema = z.object({
  id: z.string().uuid(),
  custodianname: z.string(), // Database column name
  createdat: z.string(),     // Database returns as string
  updatedat: z.string()      // Database returns as string
});

// Custody Service Schema (aligned with actual database table)
export const CustodyServiceSchema = z.object({
  id: z.string().uuid(),
  custodianId: z.string().uuid(),
  custodian: CustodianSchema.optional(), // Populated via JOIN
  serviceName: z.string().min(1, 'Service name is required'),
  fee: z.number().min(0, 'Fee must be non-negative'),
  paymentFrequency: z.string().min(1, 'Payment frequency is required'), // Enum value
  currency: z.string().length(3, 'Currency must be 3-letter ISO code'),
  currencyId: z.string().uuid().optional(), // Database foreign key
  maxWeight: z.number().min(0).nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

// Database custody service record schema
export const CustodyServiceDatabaseRowSchema = z.object({
  id: z.string().uuid(),
  custodianid: z.string().uuid(),
  custodyservicename: z.string(),
  fee: z.string(),           // Database returns as string
  paymentfrequency: z.string(),
  currencyid: z.string().uuid(),
  currency: z.string().optional(), // From JOIN with currency table
  maxweight: z.string().nullable().optional(),
  createdat: z.string(),
  updatedat: z.string()
});

// =============================================================================
// EXTENDED SCHEMAS (for future enhancement)
// =============================================================================

// Extended custodian schema (for future features)
export const ExtendedCustodianSchema = CustodianSchema.extend({
  value: z.string().min(1, 'Custodian value is required').optional(),
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
  isActive: z.boolean().default(true),
  certifications: z.array(z.string().max(100)).max(10).optional(),
});

// Extended custody service schema (for future features)
export const ExtendedCustodyServiceSchema = CustodyServiceSchema.extend({
  serviceType: z.string().min(1, 'Service type is required').optional(),
  description: z.string().max(1000).optional(),
  feeStructure: z.object({
    baseAmount: z.number().min(0),
    percentage: z.number().min(0).max(100).optional(),
    minimumFee: z.number().min(0).optional(),
    maximumFee: z.number().min(0).optional()
  }).optional(),
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
  isActive: z.boolean().default(true),
  availableRegions: z.array(z.string().length(2)).max(50).optional(), // ISO country codes
});

// =============================================================================
// POSITION CUSTODY INTEGRATION
// =============================================================================

// Custody assignment schema (linking positions to custody services)
export const CustodyAssignmentSchema = z.object({
  id: z.string().uuid(),
  positionId: z.string().uuid(),
  custodyServiceId: z.string().uuid(),
  custodyService: CustodyServiceSchema.optional(),
  assignedDate: z.coerce.date(),
  quantity: z.number().positive(),
  storageLocation: z.string().max(200).optional(),
  certificateNumber: z.string().max(100).optional(),
  status: z.enum(['active', 'pending', 'transferred', 'withdrawn']).default('active'),
  notes: z.string().max(500).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

// Position custody info (as used in API responses)
export const PositionCustodyInfoSchema = z.object({
  custodyServiceId: z.string().uuid(),
  custodyServiceName: z.string(),
  custodianId: z.string().uuid(),
  custodianName: z.string(),
  fee: z.number().min(0),
  paymentFrequency: z.string()
});

// =============================================================================
// API REQUEST/RESPONSE SCHEMAS
// =============================================================================

// Custodian creation request
export const CreateCustodianRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional()
});

// Custodian update request
export const UpdateCustodianRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional()
});

// Custody service creation request
export const CreateCustodyServiceRequestSchema = z.object({
  custodianId: z.string().uuid(),
  serviceName: z.string().min(1).max(200),
  serviceType: CustodyServiceTypeEnumSchema.optional(),
  fee: z.number().min(0),
  paymentFrequency: PaymentFrequencyEnumSchema,
  currency: z.string().length(3), // ISO currency code
  maxWeight: z.number().min(0).optional(),
  description: z.string().max(1000).optional()
});

// Custody service update request
export const UpdateCustodyServiceRequestSchema = z.object({
  custodianId: z.string().uuid().optional(),
  serviceName: z.string().min(1).max(200).optional(),
  serviceType: CustodyServiceTypeEnumSchema.optional(),
  fee: z.number().min(0).optional(),
  paymentFrequency: PaymentFrequencyEnumSchema.optional(),
  currency: z.string().length(3).optional(),
  maxWeight: z.number().min(0).optional(),
  description: z.string().max(1000).optional()
});

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

// Custodians response
export const CustodiansResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(CustodianSchema)
});

// Custody services response
export const CustodyServicesResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(CustodyServiceSchema)
});

// Error response schema
export const CustodyErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.string().optional(),
  code: z.string().optional()
});

// =============================================================================
// HIGH-PERFORMANCE HELPER FUNCTIONS
// =============================================================================

// Optimized lookup functions with caching
export const getCustodianByValue = (value: string): any => {
  try {
    const { Custodian } = require('../enums') as any;
    const normalized = value.toLowerCase().trim();
    return Custodian.values().find((custodian: any) => 
      custodian.value.toLowerCase() === normalized || 
      custodian.name.toLowerCase() === normalized
    );
  } catch (error: unknown) {
    console.warn('Failed to load Custodian enum for lookup:', error);
    return undefined;
  }
};

export const getPaymentFrequencyByValue = (value: string): any => {
  try {
    const { PaymentFrequency } = require('../enums') as any;
    const normalized = value.toLowerCase().trim();
    return PaymentFrequency.values().find((frequency: any) => 
      frequency.value.toLowerCase() === normalized
    );
  } catch (error: unknown) {
    console.warn('Failed to load PaymentFrequency enum for lookup:', error);
    return undefined;
  }
};

export const getCustodyServiceTypeByValue = (value: string): any => {
  try {
    const { CustodyServiceType } = require('../enums') as any;
    const normalized = value.toLowerCase().trim();
    return CustodyServiceType.values().find((type: any) => 
      type.value.toLowerCase() === normalized
    );
  } catch (error: unknown) {
    console.warn('Failed to load CustodyServiceType enum for lookup:', error);
    return undefined;
  }
};

// =============================================================================
// DATABASE TRANSFORMATION HELPERS
// =============================================================================

// Transform database row to custodian object
export const mapDatabaseRowToCustodian = (row: any) => {
  const validated = CustodianDatabaseRowSchema.parse(row);
  return {
    id: validated.id,
    name: validated.custodianname,
    createdAt: new Date(validated.createdat),
    updatedAt: new Date(validated.updatedat)
  };
};

// Transform database row to custody service object
export const mapDatabaseRowToCustodyService = (row: any) => {
  const validated = CustodyServiceDatabaseRowSchema.parse(row);
  return {
    id: validated.id,
    custodianId: validated.custodianid,
    serviceName: validated.custodyservicename,
    fee: parseFloat(validated.fee),
    paymentFrequency: validated.paymentfrequency,
    currency: validated.currency || 'USD',
    currencyId: validated.currencyid,
    maxWeight: validated.maxweight ? parseFloat(validated.maxweight) : null,
    createdAt: new Date(validated.createdat),
    updatedAt: new Date(validated.updatedat)
  };
};

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

// Clear caches for testing/hot reload
export const clearCustodyCaches = (): void => {
  _custodianCache = null;
  _paymentFrequencyCache = null;
  _custodyServiceTypeCache = null;
};

// Pre-warm caches for production
export const preWarmCustodyCaches = (): void => {
  getCustodianCache();
  getPaymentFrequencyCache();
  getCustodyServiceTypeCache();
  console.log('Custody enum caches pre-warmed successfully');
};

// =============================================================================
// ENUM EXPORTS (with error handling)
// =============================================================================

let custodianEnum: any, paymentFrequencyEnum: any, custodyServiceTypeEnum: any;

try {
  const enums = require('../enums');
  custodianEnum = enums.Custodian;
  paymentFrequencyEnum = enums.PaymentFrequency;
  custodyServiceTypeEnum = enums.CustodyServiceType;
} catch (error: unknown) {
  console.warn('Failed to load custody enum classes, using fallback validation:', error);
}

export const Custodian = custodianEnum;
export const PaymentFrequency = paymentFrequencyEnum;
export const CustodyServiceType = custodyServiceTypeEnum;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CustodianType = z.infer<typeof CustodianSchema>;
export type CustodyServiceType = z.infer<typeof CustodyServiceSchema>;
export type ExtendedCustodianType = z.infer<typeof ExtendedCustodianSchema>;
export type ExtendedCustodyServiceType = z.infer<typeof ExtendedCustodyServiceSchema>;
export type CustodyAssignmentType = z.infer<typeof CustodyAssignmentSchema>;
export type PositionCustodyInfoType = z.infer<typeof PositionCustodyInfoSchema>;
export type CreateCustodianRequestType = z.infer<typeof CreateCustodianRequestSchema>;
export type UpdateCustodianRequestType = z.infer<typeof UpdateCustodianRequestSchema>;
export type CreateCustodyServiceRequestType = z.infer<typeof CreateCustodyServiceRequestSchema>;
export type UpdateCustodyServiceRequestType = z.infer<typeof UpdateCustodyServiceRequestSchema>;
export type CustodiansResponseType = z.infer<typeof CustodiansResponseSchema>;
export type CustodyServicesResponseType = z.infer<typeof CustodyServicesResponseSchema>;
export type CustodyErrorResponseType = z.infer<typeof CustodyErrorResponseSchema>;
