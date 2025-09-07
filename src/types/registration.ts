/**
 * Enhanced User Registration Types and Interfaces
 * 
 * This file defines all TypeScript interfaces, types, and validation schemas
 * for the comprehensive user registration system.
 */

import { z } from 'zod';

// =============================================================================
// CORE TYPE DEFINITIONS
// =============================================================================

export type UserTitle = 'Herr' | 'Frau' | 'Divers';
export type VerificationStatus = 'pending' | 'verified' | 'failed';
export type IdentityVerificationStatus = 'pending' | 'verified' | 'failed' | 'rejected';

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
}

export interface Address {
  countryId: string; // Foreign key to country table
  postalCode: string;
  city: string;
  state: string; // Canton/State name
  street: string; // Street and house number
}

export interface DocumentInfo {
  wasProcessed: boolean;
  originalFilename: string | null;
  extractedFields: Record<string, any>;
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
  address: Address;
  createdAt: string;
  verificationStatus: {
    email: VerificationStatus;
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
// DATABASE ENTITY INTERFACES
// =============================================================================

export interface UserEntity {
  id: string;
  email: string;
  passwordhash: string;
  role: string;
  emailverified: boolean;
  identityverified: boolean;
  termsversion: string | null;
  termsacceptedat: Date | null;
  lastlogin: Date | null;
  createdat: Date;
  updatedat: Date;
}

export interface UserProfileEntity {
  id: string;
  userid: string;
  title: UserTitle | null;
  firstname: string;
  lastname: string;
  birthdate: Date;
  createdat: Date;
  updatedat: Date;
}

export interface UserAddressEntity {
  id: string;
  userid: string;
  countryId: string;
  postalcode: string;
  city: string;
  state: string;
  street: string;
  isprimary: boolean;
  createdat: Date;
  updatedat: Date;
}

export interface DocumentProcessingLogEntity {
  id: string;
  userid: string;
  originalfilename: string | null;
  processingstatus: string;
  extractedfields: string[];
  wasprocessed: boolean;
  processedat: Date;
}

export interface ConsentLogEntity {
  id: string;
  userid: string;
  consenttype: string;
  consentgiven: boolean;
  termsversion: string | null;
  consenttimestamp: Date;
  ipaddress: string | null;
  useragent: string | null;
  createdat: Date;
}

export interface UserVerificationStatusEntity {
  id: string;
  userid: string;
  emailverificationstatus: VerificationStatus;
  emailverificationtoken: string | null;
  emailverificationexpiresat: Date | null;
  identityverificationstatus: IdentityVerificationStatus;
  identityverificationnotes: string | null;
  createdat: Date;
  updatedat: Date;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Country codes validation (ISO 3166-1 alpha-2)
// FIXME: get rid of these hardcoded values
const VALID_COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT',
  'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI',
  'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY',
  'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
  'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK',
  'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL',
  'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR',
  'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN',
  'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS',
  'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW',
  'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP',
  'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
  'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM',
  'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF',
  'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
  'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
] as const;

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
    .email('Please enter a valid email address')
    .max(255, 'Email address is too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
});

// Address Schema
const AddressSchema = z.object({
  countryId: z
    .string()
    .uuid({ message: 'Country ID must be a valid UUID' }),
  postalCode: z
    .string()
    .min(3, 'Postal code is too short')
    .max(20, 'Postal code is too long')
    .regex(/^[A-Z0-9\s-]+$/i, 'Invalid postal code format'),
  city: z
    .string()
    .min(2, 'City name must be at least 2 characters')
    .max(100, 'City name is too long')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]+$/, 'City name contains invalid characters'),
  state: z
    .string()
    .min(2, 'State/Canton name must be at least 2 characters')
    .max(100, 'State/Canton name is too long')
    .regex(/^[a-zA-ZÀ-ÿĀ-žА-я\u4e00-\u9fff\s'-]+$/, 'State/Canton name contains invalid characters'),
  street: z
    .string()
    .min(5, 'Street address must be at least 5 characters')
    .max(200, 'Street address is too long'),
});

// Document Info Schema
const DocumentInfoSchema = z.object({
  wasProcessed: z.boolean(),
  originalFilename: z.string().nullable(),
  extractedFields: z.record(z.string(), z.any()).default({}),
}).optional();

// Consent Schema
const ConsentSchema = z.object({
  agreeToTerms: z.literal(true, {
    message: 'You must agree to the terms and conditions to register',
  }),
  termsVersion: z.string().min(1, 'Terms version is required'),
  consentTimestamp: z.string().datetime('Invalid consent timestamp format'),
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
