/**
 * UserServiceImpl
 * 
 * Implementation of IUserService.
 * Handles business logic, validation, and password hashing.
 * Uses dependency injection for repository and utilities.
 */

import bcrypt from 'bcrypt';
import { IUserRepository } from '../repository/IUserRepository';
import {
  IUserService,
  UserOperationResult,
  UserErrorCode,
  CreateUserInput,
  UpdateUserInput,
  UserWithDetails,
} from './IUserService';
import {
  UserEntity,
  CreateUserData,
  UpdateUserData,
  ListUsersOptions,
  GetUsersResult,
} from '../types';

// Password hashing configuration
const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UserServiceImpl implements IUserService {
  constructor(private readonly userRepository: IUserRepository) {}

  // =========================================================================
  // User CRUD Operations
  // =========================================================================

  async createUser(input: CreateUserInput): Promise<UserOperationResult<UserEntity>> {
    try {
      // Validate email format
      if (!this.validateEmailFormat(input.email)) {
        return {
          success: false,
          error: 'Invalid email format',
          errorCode: UserErrorCode.INVALID_EMAIL_FORMAT,
        };
      }

      // Validate password
      const passwordValidation = this.validatePassword(input.password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.message,
          errorCode: UserErrorCode.INVALID_PASSWORD,
        };
      }

      // Check email uniqueness
      const emailExists = await this.userRepository.emailExists(input.email);
      if (emailExists) {
        return {
          success: false,
          error: 'Email already exists',
          errorCode: UserErrorCode.EMAIL_ALREADY_EXISTS,
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

      // Create user data
      const userData: CreateUserData = {
        email: input.email.toLowerCase().trim(),
        passwordHash,
        role: input.role,
        termsVersion: input.termsVersion,
        termsAcceptedAt: input.termsAcceptedAt,
      };

      const user = await this.userRepository.createUser(userData);

      return { success: true, data: user };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: 'Failed to create user',
        errorCode: UserErrorCode.INTERNAL_ERROR,
      };
    }
  }

  async getUserById(id: string): Promise<UserOperationResult<UserEntity>> {
    try {
      const user = await this.userRepository.findUserById(id);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          errorCode: UserErrorCode.USER_NOT_FOUND,
        };
      }

      return { success: true, data: user };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return {
        success: false,
        error: 'Failed to get user',
        errorCode: UserErrorCode.INTERNAL_ERROR,
      };
    }
  }

  async getUserByEmail(email: string): Promise<UserOperationResult<UserEntity>> {
    try {
      const user = await this.userRepository.findUserByEmail(email.toLowerCase().trim());
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          errorCode: UserErrorCode.USER_NOT_FOUND,
        };
      }

      return { success: true, data: user };
    } catch (error) {
      console.error('Error getting user by email:', error);
      return {
        success: false,
        error: 'Failed to get user',
        errorCode: UserErrorCode.INTERNAL_ERROR,
      };
    }
  }

  async getUserWithDetails(id: string): Promise<UserOperationResult<UserWithDetails>> {
    try {
      const user = await this.userRepository.findUserById(id);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          errorCode: UserErrorCode.USER_NOT_FOUND,
        };
      }

      const [profile, address, verificationStatus] = await Promise.all([
        this.userRepository.findUserProfileByUserId(id),
        this.userRepository.findUserAddressByUserId(id),
        this.userRepository.findVerificationStatusByUserId(id),
      ]);

      return {
        success: true,
        data: { user, profile, address, verificationStatus },
      };
    } catch (error) {
      console.error('Error getting user with details:', error);
      return {
        success: false,
        error: 'Failed to get user details',
        errorCode: UserErrorCode.INTERNAL_ERROR,
      };
    }
  }

  async getUsers(options: ListUsersOptions): Promise<UserOperationResult<GetUsersResult>> {
    try {
      const result = await this.userRepository.getUsers(options);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting users:', error);
      return {
        success: false,
        error: 'Failed to get users',
        errorCode: UserErrorCode.INTERNAL_ERROR,
      };
    }
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<UserOperationResult<UserEntity>> {
    try {
      // Check user exists
      const existingUser = await this.userRepository.findUserById(id);
      if (!existingUser) {
        return {
          success: false,
          error: 'User not found',
          errorCode: UserErrorCode.USER_NOT_FOUND,
        };
      }

      // Validate email if changing
      if (input.email) {
        if (!this.validateEmailFormat(input.email)) {
          return {
            success: false,
            error: 'Invalid email format',
            errorCode: UserErrorCode.INVALID_EMAIL_FORMAT,
          };
        }

        const emailTaken = await this.userRepository.emailExists(input.email, id);
        if (emailTaken) {
          return {
            success: false,
            error: 'Email already exists',
            errorCode: UserErrorCode.EMAIL_ALREADY_EXISTS,
          };
        }
      }

      // Validate password if changing
      if (input.password) {
        const passwordValidation = this.validatePassword(input.password);
        if (!passwordValidation.valid) {
          return {
            success: false,
            error: passwordValidation.message,
            errorCode: UserErrorCode.INVALID_PASSWORD,
          };
        }
      }

      // Build update data
      const updateData: UpdateUserData = {};
      
      if (input.email) {
        updateData.email = input.email.toLowerCase().trim();
      }
      if (input.password) {
        updateData.passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
      }
      if (input.role !== undefined) {
        updateData.role = input.role;
      }
      if (input.emailVerified !== undefined) {
        updateData.emailVerified = input.emailVerified;
      }
      if (input.identityVerified !== undefined) {
        updateData.identityVerified = input.identityVerified;
      }

      const updatedUser = await this.userRepository.updateUser(id, updateData);

      if (!updatedUser) {
        return {
          success: false,
          error: 'Failed to update user',
          errorCode: UserErrorCode.INTERNAL_ERROR,
        };
      }

      return { success: true, data: updatedUser };
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        error: 'Failed to update user',
        errorCode: UserErrorCode.INTERNAL_ERROR,
      };
    }
  }

  async deleteUser(id: string): Promise<UserOperationResult<void>> {
    try {
      // Check user exists
      const user = await this.userRepository.findUserById(id);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          errorCode: UserErrorCode.USER_NOT_FOUND,
        };
      }

      // Check for dependencies
      const [hasOrders, hasPortfolios] = await Promise.all([
        this.userRepository.hasOrders(id),
        this.userRepository.hasPortfolios(id),
      ]);

      if (hasOrders || hasPortfolios) {
        return {
          success: false,
          error: 'Cannot delete user with existing orders or portfolios',
          errorCode: UserErrorCode.USER_HAS_DEPENDENCIES,
        };
      }

      const deleted = await this.userRepository.deleteUser(id);

      if (!deleted) {
        return {
          success: false,
          error: 'Failed to delete user',
          errorCode: UserErrorCode.INTERNAL_ERROR,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: 'Failed to delete user',
        errorCode: UserErrorCode.INTERNAL_ERROR,
      };
    }
  }

  // =========================================================================
  // Authentication Support
  // =========================================================================

  async validateCredentials(
    email: string,
    password: string
  ): Promise<UserOperationResult<UserEntity>> {
    try {
      const user = await this.userRepository.findUserByEmail(email.toLowerCase().trim());

      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials',
          errorCode: UserErrorCode.UNAUTHORIZED,
        };
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);

      if (!isValid) {
        return {
          success: false,
          error: 'Invalid credentials',
          errorCode: UserErrorCode.UNAUTHORIZED,
        };
      }

      return { success: true, data: user };
    } catch (error) {
      console.error('Error validating credentials:', error);
      return {
        success: false,
        error: 'Authentication failed',
        errorCode: UserErrorCode.INTERNAL_ERROR,
      };
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.userRepository.updateUser(userId, { lastLogin: new Date() });
    } catch (error) {
      console.error('Error updating last login:', error);
      // Non-critical, don't throw
    }
  }

  // =========================================================================
  // Validation Utilities
  // =========================================================================

  async isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
    const exists = await this.userRepository.emailExists(email.toLowerCase().trim(), excludeUserId);
    return !exists;
  }

  validateEmailFormat(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }
    return EMAIL_REGEX.test(email.trim());
  }

  validatePassword(password: string): { valid: boolean; message?: string } {
    if (!password || typeof password !== 'string') {
      return { valid: false, message: 'Password is required' };
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return {
        valid: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      };
    }

    // Check for at least one letter and one number
    if (!/[a-zA-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one letter' };
    }

    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }

    return { valid: true };
  }
}
