/**
 * User Domain DTOs (Data Transfer Objects)
 * 
 * Types for API communication: request/response objects,
 * create/update data, query options, and pagination.
 */

import { UserRole, UserTitle, EmailVerificationStatus, IdentityVerificationStatus } from './UserEnums';
import { UserEntity, UserProfileEntity, UserAddressEntity, UserVerificationStatusEntity } from './UserEntityTypes';

// =============================================================================
// Create DTOs
// =============================================================================

/**
 * Create user request data
 */
export interface CreateUserData {
  email: string;
  passwordHash: string;
  role?: UserRole;
  termsVersion?: string;
  termsAcceptedAt?: Date;
}

/**
 * Create user profile data
 */
export interface CreateUserProfileData {
  userId: string;
  title: UserTitle | null;
  firstName: string;
  lastName: string;
  birthDate: Date;
  phone?: string;
  gender?: string;
  preferredCurrency?: string;
  preferredPaymentMethod?: string;
}

/**
 * Update user profile data
 */
export interface UpdateUserProfileData {
  title?: UserTitle | null;
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
  phone?: string;
  gender?: string;
  preferredCurrency?: string;
  preferredPaymentMethod?: string;
}

/**
 * Create user address data
 */
export interface CreateUserAddressData {
  userId: string;
  countryId?: string | null;
  postalCode?: string | null;
  city?: string | null;
  state?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  addressLine2?: string | null;
  poBox?: string | null;
  isPrimary?: boolean;
}

/**
 * Create document processing log data
 */
export interface CreateDocumentLogData {
  userId: string;
  originalFilename: string | null;
  processingStatus: string;
  extractedFields: Record<string, unknown>;
  wasProcessed: boolean;
}

/**
 * Create consent log data
 */
export interface CreateConsentLogData {
  userId: string;
  consentType: string;
  consentGiven: boolean;
  termsVersion: string;
  consentTimestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create verification status data
 */
export interface CreateVerificationStatusData {
  userId: string;
  emailVerificationToken: string;
  emailVerificationExpiresAt: Date;
}

// =============================================================================
// Update DTOs
// =============================================================================

/**
 * Update user request data
 */
export interface UpdateUserData {
  email?: string;
  passwordHash?: string;
  role?: UserRole;
  emailVerified?: boolean;
  identityVerified?: boolean;
  lastLogin?: Date;
}

/**
 * Update user profile data
 */
export interface UpdateUserProfileData {
  title?: UserTitle | null;
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
  phone?: string;
  gender?: string;
  preferredCurrency?: string;
  preferredPaymentMethod?: string;
}

/**
 * Update user address data
 */
export interface UpdateUserAddressData {
  countryId?: string | null;
  postalCode?: string | null;
  city?: string | null;
  state?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  addressLine2?: string | null;
  poBox?: string | null;
  isPrimary?: boolean;
}

/**
 * Update verification status data
 */
export interface UpdateVerificationStatusData {
  emailVerificationStatus?: EmailVerificationStatus;
  emailVerificationToken?: string;
  emailVerificationExpiresAt?: Date;
  identityVerificationStatus?: IdentityVerificationStatus;
  identityVerificationNotes?: string;
}

// =============================================================================
// Query Options
// =============================================================================

/**
 * Options for listing users
 */
export interface ListUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  emailVerified?: boolean;
  sortBy?: 'email' | 'createdAt' | 'updatedAt' | 'lastLogin';
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// Pagination and Results
// =============================================================================

/**
 * Pagination info
 */
export interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

/**
 * Result type for paginated user list
 */
export interface GetUsersResult {
  users: UserEntity[];
  pagination: Pagination;
}

// =============================================================================
// Client Info
// =============================================================================

/**
 * Client info for audit trails
 */
export interface ClientInfo {
  ipAddress?: string;
  userAgent?: string;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * User response (without sensitive data)
 */
export type UserResponse = Omit<UserEntity, 'passwordHash'>;

/**
 * User with profile response
 */
export interface UserWithProfileResponse {
  id: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  identityVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  profile: UserProfileEntity | null;
}

/**
 * Full user details response
 */
export interface UserDetailsResponse {
  user: UserResponse;
  profile: UserProfileEntity | null;
  addresses: UserAddressEntity[];
  verificationStatus: UserVerificationStatusEntity | null;
}

// =============================================================================
// User Management Actions
// =============================================================================

/**
 * Input data for blocking a user
 */
export interface BlockUserInput {
  userId: string;
  blockedBy: string;
  reason: string;
}

/**
 * Input data for unblocking a user
 */
export interface UnblockUserInput {
  userId: string;
}

/**
 * User preferences data
 */
export interface UserPreferences {
  preferredCurrencyId?: string;
  preferredLanguage?: string;
  gender?: string;
  phoneNumber?: string;
}

/**
 * Extended update profile input including new user fields
 */
export interface UpdateProfileInput extends UpdateUserProfileData {
  phoneNumber?: string;
  gender?: string;
  preferredCurrencyId?: string;
  preferredLanguage?: string;
}
