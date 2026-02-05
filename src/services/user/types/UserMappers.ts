/**
 * User Domain Mappers
 * 
 * Pure functions to map database rows to entity types.
 * These functions handle the conversion from snake_case DB columns
 * to camelCase TypeScript properties.
 */

import {
  UserEntity,
  UserProfileEntity,
  UserAddressEntity,
  UserVerificationStatusEntity,
  DocumentProcessingLogEntity,
  ConsentLogEntity,
  UserDbRow,
  UserProfileDbRow,
  UserAddressDbRow,
  UserVerificationStatusDbRow,
  DocumentProcessingLogDbRow,
  ConsentLogDbRow,
} from './UserEntityTypes';
import {
  UserRole,
  UserTitle,
  EmailVerificationStatus,
  IdentityVerificationStatus,
  AccountStatus,
  isValidUserRole,
  isValidUserTitle,
  isValidEmailVerificationStatus,
  isValidIdentityVerificationStatus,
  isValidAccountStatus,
  isValidGender,
} from './UserEnums';

// =============================================================================
// User Mappers
// =============================================================================

/**
 * Map database row to UserEntity
 */
export function mapUserEntity(row: UserDbRow): UserEntity {
  const role = isValidUserRole(row.role) ? row.role : UserRole.CUSTOMER;
  const accountStatus = isValidAccountStatus(row.account_status) 
    ? row.account_status 
    : AccountStatus.ACTIVE;
  const gender = row.gender && isValidGender(row.gender) 
    ? row.gender 
    : null;
  
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordhash,
    role: role,
    emailVerified: row.email_verified,
    identityVerified: row.identity_verified,
    termsVersion: row.terms_version,
    termsAcceptedAt: row.terms_accepted_at,
    lastLogin: row.last_login,
    createdAt: row.createdat,
    updatedAt: row.updatedat,
    createdBy: row.createdby,
    updatedBy: row.updatedby,
    accountStatus: accountStatus,
    blockedAt: row.blocked_at,
    blockedBy: row.blocked_by,
    blockReason: row.block_reason,
    phoneNumber: row.phone_number,
    gender: gender,
    preferredCurrencyId: row.preferred_currency_id,
    preferredLanguage: row.preferred_language,
  };
}

/**
 * Map UserEntity to API response (excludes sensitive fields)
 */
export function mapUserToResponse(user: UserEntity): Omit<UserEntity, 'passwordHash'> {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

// =============================================================================
// User Profile Mappers
// =============================================================================

/**
 * Map database row to UserProfileEntity
 */
export function mapUserProfileEntity(row: UserProfileDbRow): UserProfileEntity {
  const title = isValidUserTitle(row.title) ? row.title as UserTitle : null;
  
  return {
    id: row.id,
    userId: row.user_id,
    title: title,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// User Address Mappers
// =============================================================================

/**
 * Map database row to UserAddressEntity
 */
export function mapUserAddressEntity(row: UserAddressDbRow): UserAddressEntity {
  return {
    id: row.id,
    userId: row.user_id,
    countryId: row.countryid,
    postalCode: row.postal_code,
    city: row.city,
    state: row.state,
    street: row.street,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// User Verification Status Mappers
// =============================================================================

/**
 * Map database row to UserVerificationStatusEntity
 */
export function mapUserVerificationStatusEntity(row: UserVerificationStatusDbRow): UserVerificationStatusEntity {
  const emailStatus = isValidEmailVerificationStatus(row.email_verification_status)
    ? row.email_verification_status
    : EmailVerificationStatus.PENDING;
    
  const identityStatus = isValidIdentityVerificationStatus(row.identity_verification_status)
    ? row.identity_verification_status
    : IdentityVerificationStatus.PENDING;
  
  return {
    id: row.id,
    userId: row.user_id,
    emailVerificationStatus: emailStatus,
    emailVerificationToken: row.email_verification_token,
    emailVerificationExpiresAt: row.email_verification_expires_at,
    identityVerificationStatus: identityStatus,
    identityVerificationNotes: row.identity_verification_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// Document Processing Log Mappers
// =============================================================================

/**
 * Map database row to DocumentProcessingLogEntity
 */
export function mapDocumentProcessingLogEntity(row: DocumentProcessingLogDbRow): DocumentProcessingLogEntity {
  let extractedFields: Record<string, unknown>;
  
  if (typeof row.extracted_fields === 'string') {
    try {
      extractedFields = JSON.parse(row.extracted_fields);
    } catch {
      extractedFields = {};
    }
  } else {
    extractedFields = row.extracted_fields || {};
  }
  
  return {
    id: row.id,
    userId: row.user_id,
    originalFilename: row.original_filename,
    processingStatus: row.processing_status,
    extractedFields,
    wasProcessed: row.was_processed,
    processedAt: row.processed_at,
  };
}

// =============================================================================
// Consent Log Mappers
// =============================================================================

/**
 * Map database row to ConsentLogEntity
 */
export function mapConsentLogEntity(row: ConsentLogDbRow): ConsentLogEntity {
  return {
    id: row.id,
    userId: row.user_id,
    consentType: row.consent_type,
    consentGiven: row.consent_given,
    termsVersion: row.terms_version,
    consentTimestamp: row.consent_timestamp,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}
