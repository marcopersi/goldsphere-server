/**
 * Enhanced User Registration Service Interface
 * 
 * This interface defines the contract for user registration services,
 * separating the interface from implementation for better testability
 * and maintainability.
 */

import {
  EnhancedRegistrationRequest,
  EnhancedRegistrationResponse,
  RegistrationErrorResponse,
  UserEntity,
  UserProfileEntity,
  UserAddressEntity,
  DocumentProcessingLogEntity,
  ConsentLogEntity,
  UserVerificationStatusEntity,
} from '../types/registration';

// =============================================================================
// SERVICE INTERFACES
// =============================================================================

export interface IUserRegistrationService {
  /**
   * Register a new user with comprehensive profile information
   * @param registrationData - Complete registration data
   * @param clientInfo - Client information for audit trails
   * @returns Registration result or error response
   */
  registerUser(
    registrationData: EnhancedRegistrationRequest,
    clientInfo: ClientInfo
  ): Promise<EnhancedRegistrationResponse | RegistrationErrorResponse>;

  /**
   * Check if an email address is already registered
   * @param email - Email address to check
   * @returns True if email exists, false otherwise
   */
  isEmailRegistered(email: string): Promise<boolean>;

  /**
   * Validate registration data against business rules
   * @param registrationData - Data to validate
   * @returns Validation result with any errors
   */
  validateRegistrationData(
    registrationData: EnhancedRegistrationRequest
  ): Promise<ValidationResult>;

  /**
   * Generate email verification token for a user
   * @param userId - User ID to generate token for
   * @returns Verification token
   */
  generateEmailVerificationToken(userId: string): Promise<string>;
}

export interface IUserRepository {
  /**
   * Create a new user entity
   * @param userData - User data to create
   * @returns Created user entity
   */
  createUser(userData: CreateUserData): Promise<UserEntity>;

  /**
   * Create user profile
   * @param profileData - Profile data to create
   * @returns Created profile entity
   */
  createUserProfile(profileData: CreateUserProfileData): Promise<UserProfileEntity>;

  /**
   * Create user address
   * @param addressData - Address data to create
   * @returns Created address entity
   */
  createUserAddress(addressData: CreateUserAddressData): Promise<UserAddressEntity>;

  /**
   * Log document processing activity
   * @param documentData - Document processing data
   * @returns Created log entry
   */
  logDocumentProcessing(documentData: CreateDocumentLogData): Promise<DocumentProcessingLogEntity>;

  /**
   * Log consent activity
   * @param consentData - Consent data to log
   * @returns Created consent log entry
   */
  logConsent(consentData: CreateConsentLogData): Promise<ConsentLogEntity>;

  /**
   * Create user verification status record
   * @param verificationData - Verification status data
   * @returns Created verification status entity
   */
  createUserVerificationStatus(verificationData: CreateVerificationStatusData): Promise<UserVerificationStatusEntity>;

  /**
   * Find user by email
   * @param email - Email address to search for
   * @returns User entity if found, null otherwise
   */
  findUserByEmail(email: string): Promise<UserEntity | null>;

  /**
   * Find user profile by user ID
   * @param userId - User ID to search for
   * @returns Profile entity if found, null otherwise
   */
  findUserProfileByUserId(userId: string): Promise<UserProfileEntity | null>;

  /**
   * Find user address by user ID
   * @param userId - User ID to search for
   * @returns Address entity if found, null otherwise
   */
  findUserAddressByUserId(userId: string): Promise<UserAddressEntity | null>;

  /**
   * Execute a database transaction
   * @param callback - Transaction callback function
   * @returns Transaction result
   */
  executeTransaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
}

export interface IPasswordService {
  /**
   * Hash a plaintext password
   * @param password - Plaintext password
   * @returns Hashed password
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Verify a password against a hash
   * @param password - Plaintext password
   * @param hash - Hashed password
   * @returns True if password matches, false otherwise
   */
  verifyPassword(password: string, hash: string): Promise<boolean>;
}

export interface ITokenService {
  /**
   * Generate a JWT token for a user
   * @param user - User entity
   * @param profile - User profile entity
   * @returns JWT token and expiration
   */
  generateJwtToken(user: UserEntity, profile: UserProfileEntity): Promise<{
    token: string;
    expiresAt: string;
  }>;

  /**
   * Generate a verification token
   * @param userId - User ID
   * @returns Verification token
   */
  generateVerificationToken(userId: string): Promise<string>;
}

export interface IEmailService {
  /**
   * Send email verification email
   * @param email - User email address
   * @param token - Verification token
   * @param userInfo - User information for personalization
   * @returns Promise that resolves when email is sent
   */
  sendEmailVerification(
    email: string,
    token: string,
    userInfo: { firstName: string; lastName: string }
  ): Promise<void>;
}

// =============================================================================
// DATA TRANSFER OBJECTS
// =============================================================================

export interface ClientInfo {
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
  role: string;
  termsVersion: string;
  termsAcceptedAt: Date;
}

export interface CreateUserProfileData {
  userId: string;
  title: string | null;
  firstName: string;
  lastName: string;
  birthDate: Date;
}

export interface CreateUserAddressData {
  userId: string;
  country: string;
  postalCode: string;
  city: string;
  state: string;
  street: string;
  isPrimary: boolean;
}

export interface CreateDocumentLogData {
  userId: string;
  originalFilename: string | null;
  processingStatus: string;
  extractedFields: string[];
  wasProcessed: boolean;
}

export interface CreateConsentLogData {
  userId: string;
  consentType: string;
  consentGiven: boolean;
  termsVersion: string;
  consentTimestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateVerificationStatusData {
  userId: string;
  emailVerificationToken: string;
  emailVerificationExpiresAt: Date;
}

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

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

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type TransactionCallback<T> = (client: any) => Promise<T>;
