/**
 * User Registration Service Interface
 * 
 * Defines the contract for user registration services.
 * Uses types from ./types module for entity types.
 */

import {
  UserEntity,
  UserProfileEntity,
  CreateUserData,
  CreateUserProfileData,
  CreateUserAddressData,
  CreateDocumentLogData,
  CreateConsentLogData,
  CreateVerificationStatusData,
  ClientInfo,
} from './types';
import {
  EnhancedRegistrationRequest,
  EnhancedRegistrationResponse,
  RegistrationErrorResponse,
  ValidationError,
} from './registrationTypes';

// =============================================================================
// SERVICE INTERFACES
// =============================================================================

export interface IUserRegistrationService {
  /**
   * Register a new user with comprehensive profile information
   */
  registerUser(
    registrationData: EnhancedRegistrationRequest,
    clientInfo: ClientInfo
  ): Promise<EnhancedRegistrationResponse | RegistrationErrorResponse>;

  /**
   * Check if an email address is already registered
   */
  isEmailRegistered(email: string): Promise<boolean>;

  /**
   * Validate registration data against business rules
   */
  validateRegistrationData(
    registrationData: EnhancedRegistrationRequest
  ): Promise<ValidationResult>;

  /**
   * Generate email verification token for a user
   */
  generateEmailVerificationToken(userId: string): Promise<string>;
}

export interface IRegistrationRepository {
  /**
   * Create a new user entity
   */
  createUser(userData: CreateUserData): Promise<UserEntity>;

  /**
   * Create user profile
   */
  createUserProfile(profileData: CreateUserProfileData): Promise<UserProfileEntity>;

  /**
   * Create user address
   */
  createUserAddress(addressData: CreateUserAddressData): Promise<import('./types').UserAddressEntity>;

  /**
   * Log document processing activity
   */
  logDocumentProcessing(documentData: CreateDocumentLogData): Promise<import('./types').DocumentProcessingLogEntity>;

  /**
   * Log consent activity
   */
  logConsent(consentData: CreateConsentLogData): Promise<import('./types').ConsentLogEntity>;

  /**
   * Create user verification status record
   */
  createUserVerificationStatus(verificationData: CreateVerificationStatusData): Promise<import('./types').UserVerificationStatusEntity>;

  /**
   * Find user by email
   */
  findUserByEmail(email: string): Promise<UserEntity | null>;

  /**
   * Find user profile by user ID
   */
  findUserProfileByUserId(userId: string): Promise<UserProfileEntity | null>;

  /**
   * Find user address by user ID
   */
  findUserAddressByUserId(userId: string): Promise<import('./types').UserAddressEntity | null>;

  /**
   * Execute a database transaction
   */
  executeTransaction<T>(callback: (client: unknown) => Promise<T>): Promise<T>;
}

export interface IPasswordService {
  /**
   * Hash a plaintext password
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Verify a password against a hash
   */
  verifyPassword(password: string, hash: string): Promise<boolean>;
}

export interface ITokenService {
  /**
   * Generate a JWT token for a user
   */
  generateJwtToken(user: UserEntity, profile: UserProfileEntity): Promise<{
    token: string;
    expiresAt: string;
  }>;

  /**
   * Generate a verification token
   */
  generateVerificationToken(userId: string): Promise<string>;
}

export interface IEmailService {
  /**
   * Send email verification email
   */
  sendEmailVerification(
    email: string,
    token: string,
    userInfo: { firstName: string; lastName: string }
  ): Promise<void>;
}

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// =============================================================================
// CONFIGURATION INTERFACES
// =============================================================================

export interface RegistrationConfig {
  passwordSaltRounds: number;
  jwtSecret: string;
  jwtExpirationTime: string;
  emailVerificationTokenExpiry: number; // hours
  maxRegistrationAttemptsPerHour: number;
}
