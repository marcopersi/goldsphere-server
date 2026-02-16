/**
 * User Registration Types and Validation Schemas
 * 
 * Contains Zod validation schemas and registration-specific types.
 * Core entity types are imported from ./types module.
 */

import { z } from 'zod';
import { UserTitle, EmailVerificationStatus, IdentityVerificationStatus } from './types';

// =============================================================================
// REQUEST INTERFACES
// =============================================================================

export interface PersonalInfo {
  title: UserTitle | null;
  firstName: string;
  lastName: string;
  birthDate: string; // ISO 8601 date format (YYYY-MM-DD)
  email: string;
  password: string;
  phone?: string;
  gender?: 'male' | 'female' | 'diverse' | 'prefer_not_to_say';
  preferredCurrency?: 'CHF' | 'EUR' | 'USD' | 'GBP' | 'CAD' | 'AUD';
  preferredPaymentMethod?: 'bank_transfer' | 'card' | 'invoice';
}

export interface Address {
  countryId?: string | null; // Foreign key to country table
  postalCode?: string | null;
  city?: string | null;
  state?: string | null; // Canton/State name
  street?: string | null; // Street name
  houseNumber?: string | null;
  addressLine2?: string | null;
  poBox?: string | null;
}

export interface DocumentInfo {
  wasProcessed: boolean;
  originalFilename: string | null;
  extractedFields: Record<string, unknown>;
}

export interface Consent {
  agreeToTerms: boolean;
  termsVersion: string;
  consentTimestamp: string; // ISO 8601 timestamp
}

export interface EnhancedRegistrationRequest {
  personalInfo: PersonalInfo;
  address: Address;
  documentInfo?: DocumentInfo;
  consent: Consent;
}

// =============================================================================
// RESPONSE INTERFACES
// =============================================================================

export interface UserProfile {
  title: UserTitle | null;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone?: string | null;
  gender?: string | null;
  preferredCurrency?: string | null;
  preferredPaymentMethod?: string | null;
  address: Address;
  createdAt: string;
  verificationStatus: {
    email: EmailVerificationStatus;
    identity: IdentityVerificationStatus;
  };
}

export interface RegisteredUser {
  id: string;
  email: string;
  role: string;
  profile: UserProfile;
}

export interface EnhancedRegistrationResponse {
  success: true;
  user: RegisteredUser;
  token: string;
  expiresAt: string;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface RegistrationErrorDetails {
  field?: string;
  message?: string;
  validationErrors?: ValidationError[];
}

export interface RegistrationErrorResponse {
  success: false;
  error: string;
  code: string;
  details: RegistrationErrorDetails;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Personal Info Schema
const PersonalInfoSchema = z.object({
  title: z.enum(['Herr', 'Frau', 'Divers']).nullable().optional(),
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]+$/, 'First name contains invalid characters'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]+$/, 'Last name contains invalid characters'),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must be in YYYY-MM-DD format')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
      return adjustedAge >= 18;
    }, 'You must be at least 18 years old to register'),
  email: z
    .string()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address')
    .max(255, 'Email address is too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format')
    .max(20, 'Phone cannot exceed 20 characters')
    .optional(),
  gender: z
    .enum(['male', 'female', 'diverse', 'prefer_not_to_say'])
    .optional(),
  preferredCurrency: z
    .enum(['CHF', 'EUR', 'USD', 'GBP', 'CAD', 'AUD'])
    .optional(),
  preferredPaymentMethod: z
    .enum(['bank_transfer', 'card', 'invoice'])
    .optional(),
});

// Address Schema
const AddressSchema = z.object({
  countryId: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      'Country ID must be a valid UUID'
    )
    .optional(),
  postalCode: z
    .string()
    .min(3, 'Postal code is too short')
    .max(20, 'Postal code is too long')
    .regex(/^[A-Z0-9\s-]+$/i, 'Invalid postal code format')
    .optional(),
  city: z
    .string()
    .min(2, 'City name must be at least 2 characters')
    .max(100, 'City name is too long')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]+$/, 'City name contains invalid characters')
    .optional(),
  state: z
    .string()
    .min(2, 'State/Canton name must be at least 2 characters')
    .max(100, 'State/Canton name is too long')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]+$/, 'State/Canton name contains invalid characters')
    .optional(),
  street: z
    .string()
    .min(5, 'Street address must be at least 5 characters')
    .max(200, 'Street address is too long')
    .optional(),
  houseNumber: z.string().max(50, 'House number is too long').optional(),
  addressLine2: z.string().max(200, 'Address line 2 is too long').optional(),
  poBox: z.string().max(100, 'PO box is too long').optional(),
});

// Document Info Schema
const DocumentInfoSchema = z.object({
  wasProcessed: z.boolean(),
  originalFilename: z.string().nullable(),
  extractedFields: z.record(z.string(), z.unknown()).default({}),
}).optional();

// Consent Schema
const ConsentSchema = z.object({
  agreeToTerms: z.literal(true, {
    message: 'You must agree to the terms and conditions to register',
  }),
  termsVersion: z.string().min(1, 'Terms version is required'),
  consentTimestamp: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid consent timestamp format'),
});

// Main Registration Request Schema
export const EnhancedRegistrationRequestSchema = z.object({
  personalInfo: PersonalInfoSchema,
  address: AddressSchema,
  documentInfo: DocumentInfoSchema,
  consent: ConsentSchema,
});

// =============================================================================
// ERROR CODE CONSTANTS
// =============================================================================

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  UNDERAGE_USER: 'UNDERAGE_USER',
  INVALID_COUNTRY: 'INVALID_COUNTRY',
  INVALID_POSTAL_CODE: 'INVALID_POSTAL_CODE',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type RegistrationResult = EnhancedRegistrationResponse | RegistrationErrorResponse;
