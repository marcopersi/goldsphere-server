/**
 * User Domain Entity Types
 * 
 * Database entity and row types for the User domain.
 * Entity types map to database tables with camelCase properties.
 * DbRow types represent raw database results with snake_case columns.
 */

import { UserRole, UserTitle, EmailVerificationStatus, IdentityVerificationStatus } from './UserEnums';

// =============================================================================
// Database Entity Types (map to database tables)
// =============================================================================

/**
 * User entity from 'users' table
 */
export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  emailVerified: boolean;
  identityVerified: boolean;
  termsVersion: string | null;
  termsAcceptedAt: Date | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

/**
 * User profile entity from 'user_profiles' table
 */
export interface UserProfileEntity {
  id: string;
  userId: string;
  title: UserTitle | null;
  firstName: string;
  lastName: string;
  birthDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User address entity from 'user_addresses' table
 */
export interface UserAddressEntity {
  id: string;
  userId: string;
  countryId: string;
  postalCode: string;
  city: string;
  state: string;
  street: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User verification status entity from 'user_verification_status' table
 */
export interface UserVerificationStatusEntity {
  id: string;
  userId: string;
  emailVerificationStatus: EmailVerificationStatus;
  emailVerificationToken: string | null;
  emailVerificationExpiresAt: Date | null;
  identityVerificationStatus: IdentityVerificationStatus;
  identityVerificationNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document processing log entity from 'document_processing_log' table
 */
export interface DocumentProcessingLogEntity {
  id: string;
  userId: string;
  originalFilename: string | null;
  processingStatus: string;
  extractedFields: Record<string, unknown>;
  wasProcessed: boolean;
  processedAt: Date;
}

/**
 * Consent log entity from 'consent_log' table
 */
export interface ConsentLogEntity {
  id: string;
  userId: string;
  consentType: string;
  consentGiven: boolean;
  termsVersion: string | null;
  consentTimestamp: Date;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// =============================================================================
// Database Row Types (raw database results with snake_case columns)
// =============================================================================

/**
 * Raw database row from 'users' table
 */
export interface UserDbRow {
  id: string;
  email: string;
  passwordhash: string;
  role: string;
  email_verified: boolean;
  identity_verified: boolean;
  terms_version: string | null;
  terms_accepted_at: Date | null;
  last_login: Date | null;
  createdat: Date;
  updatedat: Date;
  createdby: string | null;
  updatedby: string | null;
}

/**
 * Raw database row from 'user_profiles' table
 */
export interface UserProfileDbRow {
  id: string;
  user_id: string;
  title: string | null;
  first_name: string;
  last_name: string;
  birth_date: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Raw database row from 'user_addresses' table
 */
export interface UserAddressDbRow {
  id: string;
  user_id: string;
  countryid: string;
  postal_code: string;
  city: string;
  state: string;
  street: string;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Raw database row from 'user_verification_status' table
 */
export interface UserVerificationStatusDbRow {
  id: string;
  user_id: string;
  email_verification_status: string;
  email_verification_token: string | null;
  email_verification_expires_at: Date | null;
  identity_verification_status: string;
  identity_verification_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Raw database row from 'document_processing_log' table
 */
export interface DocumentProcessingLogDbRow {
  id: string;
  user_id: string;
  original_filename: string | null;
  processing_status: string;
  extracted_fields: string | Record<string, unknown>;
  was_processed: boolean;
  processed_at: Date;
}

/**
 * Raw database row from 'consent_log' table
 */
export interface ConsentLogDbRow {
  id: string;
  user_id: string;
  consent_type: string;
  consent_given: boolean;
  terms_version: string | null;
  consent_timestamp: Date;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

// =============================================================================
// Composite Types
// =============================================================================

/**
 * User with profile (joined data)
 */
export interface UserWithProfile extends UserEntity {
  profile: UserProfileEntity | null;
}

/**
 * User with full details (all related data)
 */
export interface UserWithDetails extends UserEntity {
  profile: UserProfileEntity | null;
  addresses: UserAddressEntity[];
  verificationStatus: UserVerificationStatusEntity | null;
}
