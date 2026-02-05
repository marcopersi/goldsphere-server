/**
 * User Controller
 *
 * Handles user management endpoints (CRUD, block/unblock, soft delete)
 * Auto-generates Swagger docs and Express routes via tsoa
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Path,
  Body,
  Query,
  Route,
  Tags,
  Response,
  SuccessResponse,
  Security,
  Request,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import { getPool } from '../dbConfig';
import { UuidSchema } from '@marcopersi/shared';
import { 
  UserServiceFactory, 
  UserErrorCode,
  UserRole,
  UserTitle,
  isValidUserRole,
} from '../services/user';
import type { IUserService } from '../services/user/service/IUserService';

// ============================================================================
// Request/Response Types for tsoa
// ============================================================================

/**
 * User response
 */
export interface UserResponse {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User list response with pagination
 */
export interface UserListResponse {
  success: true;
  data: UserResponse[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

/**
 * User with details response
 */
export interface UserDetailsResponse {
  success: true;
  data: {
    user: UserResponse;
    profile: UserProfileData | null;
    address: UserAddressData | null;
    verificationStatus: VerificationStatusData | null;
  };
}

/**
 * User profile data
 */
export interface UserProfileData {
  title?: string | null;
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
}

/**
 * User address data
 */
export interface UserAddressData {
  countryId?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  street?: string;
}

/**
 * Verification status data
 */
export interface VerificationStatusData {
  emailStatus?: string;
  identityStatus?: string;
}

/**
 * Create user request
 */
export interface CreateUserRequest {
  /**
   * User email address
   * @example "newuser@goldsphere.vault"
   */
  email: string;
  
  /**
   * User password (min 8 chars, letters + numbers)
   * @example "SecurePassword123"
   */
  password: string;
  
  /**
   * User role
   * @example "user"
   */
  role?: 'admin' | 'user' | 'advisor' | 'investor';
  
  /**
   * Personal title
   * @example "Herr"
   */
  title?: 'Herr' | 'Frau' | 'Divers';
  
  /**
   * First name
   * @example "Max"
   */
  firstName?: string;
  
  /**
   * Last name
   * @example "Mustermann"
   */
  lastName?: string;
  
  /**
   * Birth date (ISO 8601 format)
   * @example "1990-01-15"
   */
  birthDate?: Date;
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  email?: string;
  password?: string;
  role?: 'admin' | 'user' | 'advisor' | 'investor';
  emailVerified?: boolean;
  identityVerified?: boolean;
  // Profile fields
  title?: 'Herr' | 'Frau' | 'Divers';
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
}

/**
 * Block user request
 */
export interface BlockUserRequest {
  /**
   * Reason for blocking the user
   * @example "Violation of terms of service"
   */
  reason: string;
}

/**
 * Blocked user response
 */
export interface BlockedUserResponse {
  id: string;
  email: string;
  accountStatus: string;
  blockedAt?: Date | null;
  blockedBy?: string | null;
  blockReason?: string | null;
}

/**
 * Success response wrapper
 */
export interface SuccessResponseWrapper<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Error response
 */
export interface UserErrorResponse {
  success: false;
  error: string;
  code?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getUserService(): IUserService {
  return UserServiceFactory.createUserService(getPool());
}

/**
 * Converts string title to UserTitle enum
 */
function parseUserTitle(title?: 'Herr' | 'Frau' | 'Divers'): UserTitle | null | undefined {
  if (title === undefined) return undefined;
  if (title === null) return null;
  
  switch (title) {
    case 'Herr': return UserTitle.HERR;
    case 'Frau': return UserTitle.FRAU;
    case 'Divers': return UserTitle.DIVERS;
    default: return null;
  }
}

function mapErrorCodeToStatus(errorCode?: UserErrorCode): number {
  switch (errorCode) {
    case UserErrorCode.USER_NOT_FOUND:
      return 404;
    case UserErrorCode.EMAIL_ALREADY_EXISTS:
    case UserErrorCode.USER_HAS_DEPENDENCIES:
    case UserErrorCode.USER_ALREADY_BLOCKED:
    case UserErrorCode.USER_NOT_BLOCKED:
    case UserErrorCode.INVALID_STATUS_TRANSITION:
      return 409;
    case UserErrorCode.INVALID_EMAIL_FORMAT:
    case UserErrorCode.INVALID_PASSWORD:
    case UserErrorCode.VALIDATION_ERROR:
      return 400;
    case UserErrorCode.UNAUTHORIZED:
    case UserErrorCode.CANNOT_BLOCK_SELF:
      return 403;
    default:
      return 500;
  }
}

// ============================================================================
// Controller
// ============================================================================

@Route('users')
@Tags('Users')
export class UserController extends Controller {

  /**
   * List all users with pagination, filtering, and sorting
   * @summary Get all users
   * @param page Page number (default: 1)
   * @param limit Items per page (max: 100, default: 20)
   * @param search Search by email
   * @param role Filter by role
   * @param sortBy Sort field
   * @param sortOrder Sort direction
   */
  @Get()
  @Security('bearerAuth')
  @SuccessResponse(200, 'Users retrieved')
  @Response<UserErrorResponse>(500, 'Internal server error')
  public async getUsers(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() search?: string,
    @Query() role?: string,
    @Query() sortBy?: 'email' | 'createdAt' | 'updatedAt' | 'lastLogin',
    @Query() sortOrder?: 'asc' | 'desc'
  ): Promise<UserListResponse> {
    const userService = getUserService();
    
    const options = {
      page: page || 1,
      limit: Math.min(limit || 20, 100),
      search,
      role: isValidUserRole(role as string) ? role as UserRole : undefined,
      sortBy: sortBy || 'email',
      sortOrder: sortOrder || 'asc',
    };

    const result = await userService.getUsers(options);

    if (!result.success) {
      this.setStatus(500);
      throw new Error(result.error || 'Failed to fetch users');
    }

    return {
      success: true,
      data: result.data!.users.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      pagination: result.data!.pagination,
    };
  }

  /**
   * Get all blocked/suspended users (Admin only)
   * @summary Get blocked users
   */
  @Get('blocked')
  @Security('bearerAuth', ['admin'])
  @SuccessResponse(200, 'Blocked users retrieved')
  @Response<UserErrorResponse>(401, 'Unauthorized')
  @Response<UserErrorResponse>(403, 'Forbidden - Admin only')
  public async getBlockedUsers(): Promise<SuccessResponseWrapper<BlockedUserResponse[]>> {
    const userService = getUserService();
    const result = await userService.findBlockedUsers();

    if (!result.success) {
      this.setStatus(500);
      throw new Error(result.error || 'Failed to fetch blocked users');
    }

    return {
      success: true,
      data: result.data!.map(user => ({
        id: user.id,
        email: user.email,
        accountStatus: user.accountStatus || 'blocked',
        blockedAt: user.blockedAt,
        blockedBy: user.blockedBy,
        blockReason: user.blockReason,
      })),
    };
  }

  /**
   * Get user by ID
   * @summary Get user by ID
   * @param id User UUID
   */
  @Get('{id}')
  @SuccessResponse(200, 'User retrieved')
  @Response<UserErrorResponse>(400, 'Invalid user ID')
  @Response<UserErrorResponse>(404, 'User not found')
  public async getUserById(
    @Path() id: string
  ): Promise<SuccessResponseWrapper<UserResponse> | UserErrorResponse> {
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      this.setStatus(400);
      return {
        success: false,
        error: 'Invalid user ID format'
      };
    }

    const userService = getUserService();
    const result = await userService.getUserById(id);

    if (!result.success) {
      const status = result.errorCode === UserErrorCode.USER_NOT_FOUND ? 404 : 500;
      this.setStatus(status);
      return {
        success: false,
        error: result.error || 'Failed to fetch user'
      };
    }

    return {
      success: true,
      data: {
        id: result.data!.id,
        email: result.data!.email,
        role: result.data!.role,
        emailVerified: result.data!.emailVerified,
        createdAt: result.data!.createdAt,
        updatedAt: result.data!.updatedAt,
      },
    };
  }

  /**
   * Get user with full details (profile, address, verification)
   * @summary Get user details
   * @param id User UUID
   */
  @Get('{id}/details')
  @Security('bearerAuth')
  @SuccessResponse(200, 'User details retrieved')
  @Response<UserErrorResponse>(400, 'Invalid user ID')
  @Response<UserErrorResponse>(404, 'User not found')
  @Response<UserErrorResponse>(500, 'Internal server error')
  public async getUserDetails(
    @Path() id: string
  ): Promise<UserDetailsResponse | UserErrorResponse> {
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      this.setStatus(400);
      return {
        success: false,
        error: 'Invalid user ID format'
      };
    }

    const userService = getUserService();
    const result = await userService.getUserWithDetails(id);

    if (!result.success) {
      const status = result.errorCode === UserErrorCode.USER_NOT_FOUND ? 404 : 500;
      this.setStatus(status);
      return {
        success: false,
        error: result.error || 'Failed to fetch user details'
      };
    }

    const { user, profile, address, verificationStatus } = result.data!;

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        profile: profile ? {
          title: profile.title,
          firstName: profile.firstName,
          lastName: profile.lastName,
          birthDate: profile.birthDate,
        } : null,
        address: address ? {
          countryId: address.countryId,
          postalCode: address.postalCode,
          city: address.city,
          state: address.state,
          street: address.street,
        } : null,
        verificationStatus: verificationStatus ? {
          emailStatus: verificationStatus.emailVerificationStatus,
          identityStatus: verificationStatus.identityVerificationStatus,
        } : null,
      },
    };
  }

  /**
   * Create a new user
   * @summary Create user
   * @param body User creation data
   */
  @Post()
  @SuccessResponse(201, 'User created')
  @Response<UserErrorResponse>(400, 'Invalid input')
  @Response<UserErrorResponse>(409, 'Email already exists')
  public async createUser(
    @Body() body: CreateUserRequest,
    @Request() request: ExpressRequest
  ): Promise<SuccessResponseWrapper<UserResponse> | UserErrorResponse> {
    const { email, password, role } = body;

    if (!email || !password) {
      this.setStatus(400);
      return {
        success: false,
        error: 'Email and password are required'
      };
    }

    const authenticatedUser = (request as any).user;

    const userService = getUserService();
    const result = await userService.createUser({
      email,
      password,
      role: role && isValidUserRole(role) ? role : undefined,
      title: parseUserTitle(body.title),
      firstName: body.firstName,
      lastName: body.lastName,
      birthDate: body.birthDate,
    }, authenticatedUser);

    if (!result.success) {
      const status = mapErrorCodeToStatus(result.errorCode);
      this.setStatus(status);
      return {
        success: false,
        error: result.error || 'Failed to create user'
      };
    }

    this.setStatus(201);
    return {
      success: true,
      data: {
        id: result.data!.id,
        email: result.data!.email,
        role: result.data!.role,
        createdAt: result.data!.createdAt,
      },
      message: 'User created successfully',
    };
  }

  /**
   * Update user
   * @summary Update user
   * @param id User UUID
   * @param body Update data
   */
  @Put('{id}')
  @SuccessResponse(200, 'User updated')
  @Response<UserErrorResponse>(400, 'Invalid input')
  @Response<UserErrorResponse>(404, 'User not found')
  @Response<UserErrorResponse>(409, 'Email already exists')
  public async updateUser(
    @Path() id: string,
    @Body() body: UpdateUserRequest,
    @Request() request: ExpressRequest
  ): Promise<SuccessResponseWrapper<UserResponse> | UserErrorResponse> {
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      this.setStatus(400);
      return {
        success: false,
        error: 'Invalid user ID format'
      };
    }

    const { email, password, role, emailVerified, identityVerified } = body;

    if (!email && !password && role === undefined && emailVerified === undefined && identityVerified === undefined) {
      this.setStatus(400);
      return {
        success: false,
        error: 'No valid fields provided for update'
      };
    }

    const authenticatedUser = (request as any).user;

    const userService = getUserService();
    const result = await userService.updateUser(id, {
      email,
      password,
      role: role && isValidUserRole(role) ? role : undefined,
      emailVerified,
      identityVerified,
      title: parseUserTitle(body.title),
      firstName: body.firstName,
      lastName: body.lastName,
      birthDate: body.birthDate,
    }, authenticatedUser);

    if (!result.success) {
      const status = mapErrorCodeToStatus(result.errorCode);
      this.setStatus(status);
      return {
        success: false,
        error: result.error || 'Failed to update user'
      };
    }

    return {
      success: true,
      data: {
        id: result.data!.id,
        email: result.data!.email,
        role: result.data!.role,
        emailVerified: result.data!.emailVerified,
        updatedAt: result.data!.updatedAt,
      },
      message: 'User updated successfully',
    };
  }

  /**
   * Block a user account (Admin only)
   * @summary Block user
   * @param id User UUID
   * @param body Block reason
   */
  @Post('{id}/block')
  @Security('bearerAuth', ['admin'])
  @SuccessResponse(200, 'User blocked')
  @Response<UserErrorResponse>(400, 'Invalid input')
  @Response<UserErrorResponse>(403, 'Cannot block yourself')
  @Response<UserErrorResponse>(404, 'User not found')
  @Response<UserErrorResponse>(409, 'User already blocked')
  public async blockUser(
    @Path() id: string,
    @Body() body: BlockUserRequest,
    @Request() request: ExpressRequest
  ): Promise<SuccessResponseWrapper<BlockedUserResponse>> {
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      this.setStatus(400);
      throw new Error('Invalid user ID format');
    }

    if (!body.reason || body.reason.trim().length === 0) {
      this.setStatus(400);
      throw new Error('Block reason is required');
    }

    const authenticatedUser = (request as any).user;
    const blockedBy = authenticatedUser?.id;
    if (!blockedBy) {
      this.setStatus(401);
      throw new Error('Authentication required');
    }

    const userService = getUserService();
    const result = await userService.blockUser(id, blockedBy, body.reason, authenticatedUser);

    if (!result.success) {
      const status = mapErrorCodeToStatus(result.errorCode);
      this.setStatus(status);
      throw new Error(result.error || 'Failed to block user');
    }

    return {
      success: true,
      data: {
        id: result.data!.id,
        email: result.data!.email,
        accountStatus: result.data!.accountStatus || 'blocked',
        blockedAt: result.data!.blockedAt,
        blockedBy: result.data!.blockedBy,
        blockReason: result.data!.blockReason,
      },
      message: 'User blocked successfully',
    };
  }

  /**
   * Unblock a user account (Admin only)
   * @summary Unblock user
   * @param id User UUID
   */
  @Post('{id}/unblock')
  @Security('bearerAuth', ['admin'])
  @SuccessResponse(200, 'User unblocked')
  @Response<UserErrorResponse>(400, 'Invalid user ID')
  @Response<UserErrorResponse>(404, 'User not found')
  @Response<UserErrorResponse>(409, 'User not blocked')
  public async unblockUser(
    @Path() id: string,
    @Request() request: ExpressRequest
  ): Promise<SuccessResponseWrapper<UserResponse>> {
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      this.setStatus(400);
      throw new Error('Invalid user ID format');
    }

    const authenticatedUser = (request as any).user;
    if (!authenticatedUser) {
      this.setStatus(401);
      throw new Error('Authentication required');
    }

    const userService = getUserService();
    const result = await userService.unblockUser(id, authenticatedUser);

    if (!result.success) {
      const status = mapErrorCodeToStatus(result.errorCode);
      this.setStatus(status);
      throw new Error(result.error || 'Failed to unblock user');
    }

    return {
      success: true,
      data: {
        id: result.data!.id,
        email: result.data!.email,
        role: result.data!.role,
      },
      message: 'User unblocked successfully',
    };
  }

  /**
   * Soft delete a user account (Admin only)
   * @summary Soft delete user
   * @param id User UUID
   */
  @Delete('{id}/soft')
  @Security('bearerAuth', ['admin'])
  @SuccessResponse(200, 'User soft deleted')
  @Response<UserErrorResponse>(400, 'Invalid user ID')
  @Response<UserErrorResponse>(404, 'User not found')
  @Response<UserErrorResponse>(409, 'User already deleted')
  public async softDeleteUser(
    @Path() id: string,
    @Request() request: ExpressRequest
  ): Promise<SuccessResponseWrapper<UserResponse>> {
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      this.setStatus(400);
      throw new Error('Invalid user ID format');
    }

    const authenticatedUser = (request as any).user;
    if (!authenticatedUser) {
      this.setStatus(401);
      throw new Error('Authentication required');
    }

    const userService = getUserService();
    const result = await userService.softDeleteUser(id, authenticatedUser);

    if (!result.success) {
      const status = mapErrorCodeToStatus(result.errorCode);
      this.setStatus(status);
      throw new Error(result.error || 'Failed to soft delete user');
    }

    return {
      success: true,
      data: {
        id: result.data!.id,
        email: result.data!.email,
        role: result.data!.role,
      },
      message: 'User soft deleted successfully',
    };
  }

  /**
   * Delete user (with dependency check)
   * @summary Delete user
   * @param id User UUID
   */
  @Delete('{id}')
  @SuccessResponse(200, 'User deleted')
  @Response<UserErrorResponse>(400, 'Invalid user ID')
  @Response<UserErrorResponse>(404, 'User not found')
  @Response<UserErrorResponse>(409, 'User has dependencies')
  public async deleteUser(
    @Path() id: string
  ): Promise<{ success: true; message: string } | UserErrorResponse> {
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      this.setStatus(400);
      return {
        success: false,
        error: 'Invalid user ID format'
      };
    }

    const userService = getUserService();
    
    // Get user email for response message before deletion
    const userResult = await userService.getUserById(id);
    const userEmail = userResult.success ? userResult.data!.email : 'Unknown';

    const result = await userService.deleteUser(id);

    if (!result.success) {
      const status = mapErrorCodeToStatus(result.errorCode);
      this.setStatus(status);
      return {
        success: false,
        error: result.error || 'Failed to delete user'
      };
    }

    return {
      success: true,
      message: `User '${userEmail}' deleted successfully`,
    };
  }
}
