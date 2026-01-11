/**
 * User Domain Enums
 * 
 * TypeScript enum definitions matching PostgreSQL ENUM types.
 * Keep in sync with initdb/06-user-enums.sql
 */

// =============================================================================
// User Role
// =============================================================================

/**
 * User roles in the system
 * Maps to PostgreSQL: user_role ENUM ('customer', 'admin', 'user')
 */
export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  USER = 'user'
}

/**
 * Default role for new users
 */
export const DEFAULT_USER_ROLE = UserRole.CUSTOMER;

// =============================================================================
// User Title
// =============================================================================

/**
 * Personal title/salutation
 * Maps to PostgreSQL: user_title ENUM ('Herr', 'Frau', 'Divers')
 */
export enum UserTitle {
  HERR = 'Herr',
  FRAU = 'Frau',
  DIVERS = 'Divers'
}

// =============================================================================
// Verification Status
// =============================================================================

/**
 * Email verification status
 * Maps to PostgreSQL: email_verification_status ENUM ('pending', 'verified', 'failed')
 */
export enum EmailVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed'
}

/**
 * Identity verification status
 * Maps to PostgreSQL: identity_verification_status ENUM ('pending', 'verified', 'failed', 'rejected')
 */
export enum IdentityVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  REJECTED = 'rejected'
}

/**
 * Default verification status for new users
 */
export const DEFAULT_EMAIL_VERIFICATION_STATUS = EmailVerificationStatus.PENDING;
export const DEFAULT_IDENTITY_VERIFICATION_STATUS = IdentityVerificationStatus.PENDING;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a string is a valid UserRole
 */
export function isValidUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

/**
 * Check if a string is a valid UserTitle
 */
export function isValidUserTitle(value: string | null): value is UserTitle {
  if (value === null) return true; // title can be null
  return Object.values(UserTitle).includes(value as UserTitle);
}

/**
 * Check if a string is a valid EmailVerificationStatus
 */
export function isValidEmailVerificationStatus(value: string): value is EmailVerificationStatus {
  return Object.values(EmailVerificationStatus).includes(value as EmailVerificationStatus);
}

/**
 * Check if a string is a valid IdentityVerificationStatus
 */
export function isValidIdentityVerificationStatus(value: string): value is IdentityVerificationStatus {
  return Object.values(IdentityVerificationStatus).includes(value as IdentityVerificationStatus);
}
