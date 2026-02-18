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
  Patch,
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
import { requireAuthenticatedUser } from '../utils/auditTrail';
import { UuidSchema } from '@marcopersi/shared';
import { UserErrorCode } from '../services/user';
import type { UserRole, UserTitle } from '../services/user';
import {
  getUserService,
  mapErrorCodeToStatus,
} from './user/UserController.helpers';
import {
  mapBlockedUserResponse,
  mapUserDetailsData,
  mapUserProfilePatchData,
  mapUserResponse,
} from './user/UserController.mappers';
import {
  PatchProfileSchema,
  toValidationErrorResponse,
  validateRoleAndTitleReferences,
  validatePatchProfileReferences,
} from './user/UserController.validation';
import type {
  BlockedUserResponse,
  BlockUserRequest,
  CreateUserRequest,
  PatchUserProfileRequest,
  SuccessResponseWrapper,
  UpdateUserRequest,
  UserDetailsResponse,
  UserErrorResponse,
  UserListResponse,
  UserProfilePatchResponse,
  UserResponse,
} from './user/UserController.types';
import { normalizePagination } from '../utils/paginationResponse';
// ============================================================================
// Controller
// ============================================================================

@Route('users')
@Tags('Users')
export class UserController extends Controller {

  private createHttpError(status: number, message: string): Error & { status: number } {
    const error = new Error(message) as Error & { status: number };
    error.status = status;
    return error;
  }

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

    const roleValidationResult = await validateRoleAndTitleReferences(userService, { role });
    if (roleValidationResult) {
      this.setStatus(400);
      throw new Error(roleValidationResult.details?.fields?.[0]?.message ?? 'Validation failed');
    }
    
    const options = {
      page: page || 1,
      limit: Math.min(limit || 20, 100),
      search,
      role: role as UserRole | undefined,
      sortBy: sortBy || 'email',
      sortOrder: sortOrder || 'asc',
    };

    const result = await userService.getUsers(options);

    if (!result.success) {
      this.setStatus(500);
      throw new Error(result.error || 'Failed to fetch users');
    }

    if (!result.data) {
      this.setStatus(500);
      throw new Error('Failed to fetch users');
    }

    return {
      success: true,
      data: result.data.users.map(mapUserResponse),
      pagination: normalizePagination(result.data.pagination),
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

    if (!result.data) {
      this.setStatus(500);
      throw new Error('Failed to fetch blocked users');
    }

    return {
      success: true,
      data: result.data.map(mapBlockedUserResponse),
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

    if (!result.data) {
      this.setStatus(500);
      return {
        success: false,
        error: 'Failed to fetch user'
      };
    }

    return {
      success: true,
      data: {
        id: result.data.id,
        email: result.data.email,
        role: result.data.role,
        emailVerified: result.data.emailVerified,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
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

    if (!result.data) {
      this.setStatus(500);
      return {
        success: false,
        error: 'Failed to fetch user details'
      };
    }

    return {
      success: true,
      data: mapUserDetailsData(result.data),
    };
  }

  /**
   * Patch user profile fields
   * @summary Patch user profile
   * @param id User UUID
   * @param body Profile patch data
   */
  @Patch('{id}/profile')
  @Security('bearerAuth')
  @SuccessResponse(200, 'User profile patched')
  @Response<UserErrorResponse>(400, 'Invalid input')
  @Response<UserErrorResponse>(403, 'Forbidden')
  @Response<UserErrorResponse>(404, 'User not found')
  public async patchUserProfile(
    @Path() id: string,
    @Body() body: PatchUserProfileRequest,
    @Request() request: ExpressRequest
  ): Promise<UserProfilePatchResponse | UserErrorResponse> {
    const parsedBody = PatchProfileSchema.safeParse(body);
    if (!parsedBody.success) {
      this.setStatus(400);
      return toValidationErrorResponse(parsedBody.error.issues);
    }

    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      this.setStatus(400);
      return {
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Validation failed',
        details: {
          fields: [{ path: 'id', message: 'Invalid user ID format' }],
        },
      };
    }

    const authenticatedUser = requireAuthenticatedUser(request);
    if (authenticatedUser.id !== id && authenticatedUser.role !== 'admin') {
      this.setStatus(403);
      return {
        success: false,
        code: 'UNAUTHORIZED',
        error: 'You can only patch your own profile'
      };
    }

    const userService = getUserService();

    const referenceValidationError = await validatePatchProfileReferences(userService, parsedBody.data);
    if (referenceValidationError) {
      this.setStatus(400);
      return referenceValidationError;
    }

    const result = await userService.updateUserProfile(
      id,
      {
        title:
          parsedBody.data.title === null
            ? null
            : (parsedBody.data.title as UserTitle | undefined),
        firstName: parsedBody.data.firstName,
        lastName: parsedBody.data.lastName,
        birthDate: parsedBody.data.birthDate,
        phone: parsedBody.data.phone,
        gender: parsedBody.data.gender,
        preferredCurrency: parsedBody.data.preferredCurrency,
        preferredPaymentMethod: parsedBody.data.preferredPaymentMethod,
        address: parsedBody.data.address,
      },
      authenticatedUser
    );

    if (!result.success || !result.data) {
      let status = 500;
      if (result.errorCode === UserErrorCode.USER_NOT_FOUND) {
        status = 404;
      } else if (result.errorCode === UserErrorCode.VALIDATION_ERROR) {
        status = 400;
      }
      this.setStatus(status);
      return {
        success: false,
        code: result.errorCode,
        error: result.error || 'Failed to patch user profile'
      };
    }

    return {
      success: true,
      data: mapUserProfilePatchData(result.data),
    };
  }

  /**
   * Create a new user
   * @summary Create user
   * @param body User creation data
   */
  @Post()
  @Security('bearerAuth')
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

    const userService = getUserService();

    const referenceValidation = await validateRoleAndTitleReferences(userService, {
      role,
      title: body.title,
    });
    if (referenceValidation) {
      this.setStatus(400);
      return referenceValidation;
    }

    const authenticatedUser = requireAuthenticatedUser(request);
    const result = await userService.createUser({
      email,
      password,
      role: role as UserRole | undefined,
      title: body.title as UserTitle | undefined,
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

    if (!result.data) {
      this.setStatus(500);
      return {
        success: false,
        error: 'Failed to create user'
      };
    }

    this.setStatus(201);
    return {
      success: true,
      data: mapUserResponse(result.data),
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
  @Security('bearerAuth')
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

    if (
      !email &&
      !password &&
      role === undefined &&
      emailVerified === undefined &&
      identityVerified === undefined &&
      body.title === undefined &&
      body.firstName === undefined &&
      body.lastName === undefined &&
      body.birthDate === undefined
    ) {
      this.setStatus(400);
      return {
        success: false,
        error: 'No valid fields provided for update'
      };
    }

    const userService = getUserService();

    const referenceValidation = await validateRoleAndTitleReferences(userService, {
      role,
      title: body.title,
    });
    if (referenceValidation) {
      this.setStatus(400);
      return referenceValidation;
    }

    const authenticatedUser = requireAuthenticatedUser(request);
    const result = await userService.updateUser(id, {
      email,
      password,
      role: role as UserRole | undefined,
      emailVerified,
      identityVerified,
      title:
        body.title === null
          ? null
          : (body.title as UserTitle | undefined),
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

    if (!result.data) {
      this.setStatus(500);
      return {
        success: false,
        error: 'Failed to update user'
      };
    }

    return {
      success: true,
      data: mapUserResponse(result.data),
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
      throw this.createHttpError(400, 'Invalid user ID format');
    }

    if (!body.reason || body.reason.trim().length === 0) {
      throw this.createHttpError(400, 'Block reason is required');
    }

    const authenticatedUser = requireAuthenticatedUser(request);
    const blockedBy = authenticatedUser.id;

    const userService = getUserService();
    const result = await userService.blockUser(id, blockedBy, body.reason, authenticatedUser);

    if (!result.success) {
      const status = mapErrorCodeToStatus(result.errorCode);
      throw this.createHttpError(status, result.error || 'Failed to block user');
    }

    if (!result.data) {
      throw this.createHttpError(500, 'Failed to block user');
    }

    return {
      success: true,
      data: mapBlockedUserResponse(result.data),
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
      throw this.createHttpError(400, 'Invalid user ID format');
    }

    const authenticatedUser = requireAuthenticatedUser(request);

    const userService = getUserService();
    const result = await userService.unblockUser(id, authenticatedUser);

    if (!result.success) {
      const status = mapErrorCodeToStatus(result.errorCode);
      throw this.createHttpError(status, result.error || 'Failed to unblock user');
    }

    if (!result.data) {
      throw this.createHttpError(500, 'Failed to unblock user');
    }

    return {
      success: true,
      data: mapUserResponse(result.data),
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
      throw this.createHttpError(400, 'Invalid user ID format');
    }

    const authenticatedUser = requireAuthenticatedUser(request);

    const userService = getUserService();
    const result = await userService.softDeleteUser(id, authenticatedUser);

    if (!result.success) {
      const status = mapErrorCodeToStatus(result.errorCode);
      throw this.createHttpError(status, result.error || 'Failed to soft delete user');
    }

    if (!result.data) {
      throw this.createHttpError(500, 'Failed to soft delete user');
    }

    return {
      success: true,
      data: mapUserResponse(result.data),
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
    const userEmail = userResult.success && userResult.data ? userResult.data.email : 'Unknown';

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
