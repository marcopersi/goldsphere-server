/**
 * IUserService Interface
 * 
 * Defines the contract for User business operations.
 * Handles CRUD operations, validation, and business logic.
 */

import {
  UserEntity,
  UserProfileEntity,
  UserAddressEntity,
  UserVerificationStatusEntity,
  ListUsersOptions,
  GetUsersResult,
  UserRole,
  UserTitle,
} from '../types';
import { AuditTrailUser } from '../../../utils/auditTrail';

/**
 * Result type for user operations that may fail with validation errors
 */
export interface UserOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: UserErrorCode;
}

/**
 * Error codes for user operations
 */
export enum UserErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  USER_HAS_DEPENDENCIES = 'USER_HAS_DEPENDENCIES',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  USER_ALREADY_BLOCKED = 'USER_ALREADY_BLOCKED',
  USER_NOT_BLOCKED = 'USER_NOT_BLOCKED',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  CANNOT_BLOCK_SELF = 'CANNOT_BLOCK_SELF',
}

/**
 * Complete user data including profile and address
 */
export interface UserWithDetails {
  user: UserEntity;
  profile: UserProfileEntity | null;
  address: UserAddressEntity | null;
  verificationStatus: UserVerificationStatusEntity | null;
}

/**
 * Input for creating a new user with password
 */
export interface CreateUserInput {
  email: string;
  password: string;
  role?: UserRole;
  termsVersion?: string;
  termsAcceptedAt?: Date;
  // Optional profile data
  title?: UserTitle | null;
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
}

/**
 * Input for updating user data
 */
export interface UpdateUserInput {
  email?: string;
  password?: string;
  role?: UserRole;
  emailVerified?: boolean;
  identityVerified?: boolean;
  // Optional profile data
  title?: UserTitle | null;
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
}

/**
 * User Service Interface
 * 
 * Provides business operations for user management.
 * Implementations should handle validation, password hashing,
 * and coordinate with the repository layer.
 */
export interface IUserService {
  // =========================================================================
  // User CRUD Operations
  // =========================================================================

  /**
   * Create a new user with hashed password
   * @param input User creation data including plain password
   * @returns Created user entity (without password hash)
   */
  createUser(input: CreateUserInput, authenticatedUser: AuditTrailUser): Promise<UserOperationResult<UserEntity>>;

  /**
   * Get user by ID
   * @param id User UUID
   * @returns User entity or null if not found
   */
  getUserById(id: string): Promise<UserOperationResult<UserEntity>>;

  /**
   * Get user by email
   * @param email User email address
   * @returns User entity or null if not found
   */
  getUserByEmail(email: string): Promise<UserOperationResult<UserEntity>>;

  /**
   * Get user with all related details (profile, address, verification)
   * @param id User UUID
   * @returns Complete user data or error
   */
  getUserWithDetails(id: string): Promise<UserOperationResult<UserWithDetails>>;

  /**
   * List users with pagination, filtering, and sorting
   * @param options Query options
   * @returns Paginated list of users
   */
  getUsers(options: ListUsersOptions): Promise<UserOperationResult<GetUsersResult>>;

  /**
   * Update user data
   * @param id User UUID
   * @param input Updated fields
   * @returns Updated user entity
   */
  updateUser(
    id: string,
    input: UpdateUserInput,
    authenticatedUser: AuditTrailUser
  ): Promise<UserOperationResult<UserEntity>>;

  /**
   * Delete user (with dependency checks)
   * @param id User UUID
   * @returns Success status
   */
  deleteUser(id: string): Promise<UserOperationResult<void>>;

  // =========================================================================
  // User Account Management
  // =========================================================================

  /**
   * Block a user account (admin only)
   * Sets account_status to 'blocked' and records who blocked and why
   * @param userId User UUID to block
   * @param blockedBy Admin user UUID performing the action
   * @param reason Reason for blocking
   * @returns Updated user entity
   */
  blockUser(
    userId: string,
    blockedBy: string,
    reason: string,
    authenticatedUser: AuditTrailUser
  ): Promise<UserOperationResult<UserEntity>>;

  /**
   * Unblock a user account (admin only)
   * Sets account_status back to 'active'
   * @param userId User UUID to unblock
   * @returns Updated user entity
   */
  unblockUser(userId: string, authenticatedUser: AuditTrailUser): Promise<UserOperationResult<UserEntity>>;

  /**
   * Soft delete a user account (admin only)
   * Sets account_status to 'deleted' but preserves data
   * @param userId User UUID to soft delete
   * @returns Updated user entity
   */
  softDeleteUser(userId: string, authenticatedUser: AuditTrailUser): Promise<UserOperationResult<UserEntity>>;

  /**
   * Find all blocked users
   * @returns List of blocked/suspended users
   */
  findBlockedUsers(): Promise<UserOperationResult<UserEntity[]>>;

  // =========================================================================
  // Authentication Support
  // =========================================================================

  /**
   * Validate user credentials
   * @param email User email
   * @param password Plain text password
   * @returns User entity if valid, error if invalid
   */
  validateCredentials(email: string, password: string): Promise<UserOperationResult<UserEntity>>;

  /**
   * Update last login timestamp
   * @param userId User UUID
   */
  updateLastLogin(userId: string): Promise<void>;

  // =========================================================================
  // Validation Utilities
  // =========================================================================

  /**
   * Check if email is available (not taken by another user)
   * @param email Email to check
   * @param excludeUserId Optional user ID to exclude (for updates)
   * @returns true if email is available
   */
  isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean>;

  /**
   * Validate email format
   * @param email Email to validate
   * @returns true if valid format
   */
  validateEmailFormat(email: string): boolean;

  /**
   * Validate password strength
   * @param password Password to validate
   * @returns Validation result with error message if invalid
   */
  validatePassword(password: string): { valid: boolean; message?: string };
}
