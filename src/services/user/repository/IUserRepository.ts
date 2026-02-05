/**
 * IUserRepository Interface
 * 
 * Defines the contract for user data access operations.
 * All database operations for the User domain go through this interface.
 */

import { PoolClient } from 'pg';
import {
  UserEntity,
  UserProfileEntity,
  UserAddressEntity,
  UserVerificationStatusEntity,
  DocumentProcessingLogEntity,
  ConsentLogEntity,
  CreateUserData,
  CreateUserProfileData,
  UpdateUserProfileData,
  CreateUserAddressData,
  CreateDocumentLogData,
  CreateConsentLogData,
  CreateVerificationStatusData,
  UpdateUserData,
  UpdateVerificationStatusData,
  ListUsersOptions,
  GetUsersResult,
  BlockUserInput,
  UnblockUserInput,
} from '../types';
import { AuditTrailUser } from '../../../utils/auditTrail';

// =============================================================================
// Transaction Callback Type
// =============================================================================

/**
 * Callback function for database transactions
 */
export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

// =============================================================================
// IUserRepository Interface
// =============================================================================

export interface IUserRepository {
  // =========================================================================
  // User CRUD Operations
  // =========================================================================
  
  /**
   * Create a new user
   */
  createUser(userData: CreateUserData, authenticatedUser?: AuditTrailUser): Promise<UserEntity>;
  
  /**
   * Find user by ID
   */
  findUserById(id: string): Promise<UserEntity | null>;
  
  /**
   * Find user by email
   */
  findUserByEmail(email: string): Promise<UserEntity | null>;
  
  /**
   * Get all users with pagination
   */
  getUsers(options: ListUsersOptions): Promise<GetUsersResult>;
  
  /**
   * Update user by ID
   */
  updateUser(id: string, data: UpdateUserData, authenticatedUser?: AuditTrailUser): Promise<UserEntity | null>;
  
  /**
   * Delete user by ID
   */
  deleteUser(id: string): Promise<boolean>;
  
  /**
   * Check if email exists
   */
  emailExists(email: string, excludeUserId?: string): Promise<boolean>;

  // =========================================================================
  // User Account Management Operations
  // =========================================================================
  
  /**
   * Block a user account
   * Sets account_status to 'blocked', records blocked_at, blocked_by, and reason
   */
  blockUser(
    userId: string,
    blockedBy: string,
    reason: string,
    authenticatedUser?: AuditTrailUser
  ): Promise<UserEntity | null>;
  
  /**
   * Unblock a user account
   * Sets account_status back to 'active', clears blocked_at, blocked_by, block_reason
   */
  unblockUser(userId: string, authenticatedUser?: AuditTrailUser): Promise<UserEntity | null>;
  
  /**
   * Soft delete a user account
   * Sets account_status to 'deleted'
   */
  softDeleteUser(userId: string, authenticatedUser?: AuditTrailUser): Promise<UserEntity | null>;
  
  /**
   * Find all blocked users
   */
  findBlockedUsers(): Promise<UserEntity[]>;

  // =========================================================================
  // User Profile Operations
  // =========================================================================
  
  /**
   * Create user profile
   */
  createUserProfile(profileData: CreateUserProfileData): Promise<UserProfileEntity>;
  
  /**
   * Find user profile by user ID
   */
  findUserProfileByUserId(userId: string): Promise<UserProfileEntity | null>;
  
  /**
   * Update user profile by user ID
   */
  updateUserProfile(userId: string, data: UpdateUserProfileData): Promise<UserProfileEntity | null>;

  // =========================================================================
  // User Address Operations
  // =========================================================================
  
  /**
   * Create user address
   */
  createUserAddress(addressData: CreateUserAddressData): Promise<UserAddressEntity>;
  
  /**
   * Find user address by user ID (primary address)
   */
  findUserAddressByUserId(userId: string): Promise<UserAddressEntity | null>;
  
  /**
   * Find all addresses for a user
   */
  findUserAddressesByUserId(userId: string): Promise<UserAddressEntity[]>;

  // =========================================================================
  // Verification Status Operations
  // =========================================================================
  
  /**
   * Create user verification status
   */
  createUserVerificationStatus(data: CreateVerificationStatusData): Promise<UserVerificationStatusEntity>;
  
  /**
   * Find verification status by user ID
   */
  findVerificationStatusByUserId(userId: string): Promise<UserVerificationStatusEntity | null>;
  
  /**
   * Update verification status
   */
  updateVerificationStatus(userId: string, data: UpdateVerificationStatusData): Promise<void>;

  // =========================================================================
  // Logging Operations
  // =========================================================================
  
  /**
   * Log document processing
   */
  logDocumentProcessing(data: CreateDocumentLogData): Promise<DocumentProcessingLogEntity>;
  
  /**
   * Log consent
   */
  logConsent(data: CreateConsentLogData): Promise<ConsentLogEntity>;

  // =========================================================================
  // Transaction Support
  // =========================================================================
  
  /**
   * Execute operations within a database transaction
   */
  executeTransaction<T>(callback: TransactionCallback<T>): Promise<T>;

  // =========================================================================
  // Referential Integrity Checks
  // =========================================================================
  
  /**
   * Check if user has orders
   */
  hasOrders(userId: string): Promise<boolean>;
  
  /**
   * Check if user has portfolios
   */
  hasPortfolios(userId: string): Promise<boolean>;
}
