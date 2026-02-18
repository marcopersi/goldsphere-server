/**
 * Auth Controller
 *
 * Handles authentication endpoints (login, validate, refresh, me)
 * Auto-generates Swagger docs and Express routes via tsoa
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Header,
  Route,
  Tags,
  Response,
  SuccessResponse,
  Security,
  Request,
} from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import { AuthServiceFactory } from '../services/auth/AuthServiceFactory';
import type { IAuthService } from '../services/auth/IAuthService';
import { AuthErrorCode } from '../services/auth/types/AuthTypes';
import {
  type SessionSuccessResponse,
  type UserSuccessResponse,
  serializeUserSuccessResponse,
} from '../services/auth/contract/AuthContract';
import {
  AUTH_ERROR_CODES,
  type AuthErrorCode as CanonicalAuthErrorCode,
  type AuthErrorResponse,
  createAuthError,
  createValidationError,
  getAuthHttpStatus,
} from '../services/auth/contract/AuthErrorFactory';

// ============================================================================
// Request/Response Types for tsoa
// ============================================================================

/**
 * Login request body
 */
export interface LoginRequestBody {
  /**
   * User email address
   * @example "user@goldsphere.vault"
   */
  email?: string;

  /**
   * User password
   * @example "SecurePassword123"
   */
  password?: string;
}

interface LogoutSuccessResponse {
  success: true;
  data: {
    message: string;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCanonicalCode(code?: AuthErrorCode): CanonicalAuthErrorCode {
  switch (code) {
    case AuthErrorCode.INVALID_CREDENTIALS:
      return AUTH_ERROR_CODES.AUTH_INVALID_CREDENTIALS;
    case AuthErrorCode.TOKEN_EXPIRED:
      return AUTH_ERROR_CODES.AUTH_TOKEN_EXPIRED;
    case AuthErrorCode.TOKEN_INVALID:
      return AUTH_ERROR_CODES.AUTH_TOKEN_INVALID;
    case AuthErrorCode.ACCOUNT_LOCKED:
      return AUTH_ERROR_CODES.AUTH_ACCOUNT_LOCKED;
    case AuthErrorCode.USER_INACTIVE:
      return AUTH_ERROR_CODES.AUTH_USER_INACTIVE;
    case AuthErrorCode.STALE_ROLE_CLAIM:
      return AUTH_ERROR_CODES.AUTH_STALE_ROLE_CLAIM;
    case AuthErrorCode.INSUFFICIENT_PERMISSIONS:
      return AUTH_ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS;
    case AuthErrorCode.VALIDATION_ERROR:
      return AUTH_ERROR_CODES.VALIDATION_ERROR;
    default:
      return AUTH_ERROR_CODES.AUTH_INTERNAL_ERROR;
  }
}

// ============================================================================
// Controller
// ============================================================================

@Route('auth')
@Tags('Authentication')
export class AuthController extends Controller {
  private readonly authService: IAuthService;

  constructor() {
    super();
    this.authService = AuthServiceFactory.create();
  }

  /**
   * Authenticate user with email and password
   * @summary User login
   * @param body Login credentials
   * @returns Session data on success
   */
  @Post('login')
  @SuccessResponse(200, 'Login successful')
  @Response<AuthErrorResponse>(400, 'Missing required fields')
  @Response<AuthErrorResponse>(401, 'Invalid credentials')
  @Response<AuthErrorResponse>(403, 'Account locked')
  public async login(
    @Body() body: LoginRequestBody
  ): Promise<SessionSuccessResponse | AuthErrorResponse> {
    const { email, password } = body;

    if (!email) {
      const errorResponse = createValidationError('email', 'Email is required');
      this.setStatus(400);
      return errorResponse;
    }

    if (!password) {
      const errorResponse = createValidationError('password', 'Password is required');
      this.setStatus(400);
      return errorResponse;
    }

    const result = await this.authService.login({ email, password });

    if (!result.success || !result.data) {
      const error = result.error;
      const code = getCanonicalCode(error?.code);
      const errorResponse = createAuthError(code, error?.message || 'Authentication failed');
      this.setStatus(getAuthHttpStatus(code));
      return errorResponse;
    }

    return result.data;
  }

  /**
   * Validate current JWT token
   * @summary Validate token
   * @returns User info if token is valid
   */
  @Get('validate')
  @Security('bearerAuth')
  @SuccessResponse(200, 'Token is valid')
  @Response<AuthErrorResponse>(401, 'Invalid or expired token')
  public async validate(
    @Request() request: ExpressRequest
  ): Promise<UserSuccessResponse | AuthErrorResponse> {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      const code = AUTH_ERROR_CODES.AUTH_TOKEN_INVALID;
      this.setStatus(401);
      return createAuthError(code, 'No token provided');
    }

    const result = await this.authService.getCurrentUser(token);

    if (!result.success || !result.data) {
      const code = getCanonicalCode(result.error?.code);
      const errorResponse = createAuthError(code, result.error?.message || 'Invalid token');
      this.setStatus(getAuthHttpStatus(code));
      return errorResponse;
    }

    return serializeUserSuccessResponse({
      success: true,
      data: {
        user: result.data,
      },
    });
  }

  /**
   * Refresh JWT token
   * @summary Refresh token
   * @param authorization Bearer token header
   * @returns New session data
   */
  @Post('refresh')
  @SuccessResponse(200, 'Token refreshed successfully')
  @Response<AuthErrorResponse>(401, 'Invalid or expired token')
  public async refresh(
    @Header('Authorization') authorization?: string
  ): Promise<SessionSuccessResponse | AuthErrorResponse> {
    const token = authorization?.replace('Bearer ', '');

    if (!token) {
      const code = AUTH_ERROR_CODES.AUTH_TOKEN_INVALID;
      this.setStatus(401);
      return createAuthError(code, 'No token provided');
    }

    const result = await this.authService.refreshToken(token);

    if (!result.success || !result.data) {
      const error = result.error;
      const code = getCanonicalCode(error?.code);
      const errorResponse = createAuthError(code, error?.message || 'Failed to refresh token');
      this.setStatus(getAuthHttpStatus(code));
      return errorResponse;
    }

    return result.data;
  }

  /**
   * Get current authenticated user info
   * @summary Get current user
   * @param authorization Bearer token header
   * @returns Current user information
   */
  @Get('me')
  @Security('bearerAuth')
  @SuccessResponse(200, 'User information retrieved')
  @Response<AuthErrorResponse>(401, 'Invalid or expired token')
  public async getCurrentUser(
    @Header('Authorization') authorization?: string
  ): Promise<UserSuccessResponse | AuthErrorResponse> {
    const token = authorization?.replace('Bearer ', '');

    if (!token) {
      const code = AUTH_ERROR_CODES.AUTH_TOKEN_INVALID;
      this.setStatus(401);
      return createAuthError(code, 'No token provided');
    }

    const result = await this.authService.getCurrentUser(token);

    if (!result.success || !result.data) {
      const error = result.error;
      const code = getCanonicalCode(error?.code);
      const errorResponse = createAuthError(code, error?.message || 'Failed to fetch current user');
      this.setStatus(getAuthHttpStatus(code));
      return errorResponse;
    }

    return serializeUserSuccessResponse({
      success: true,
      data: {
        user: result.data,
      },
    });
  }

  /**
   * Logout current user and invalidate JWT token
   * @summary Logout
   * @param authorization Bearer token header
   */
  @Post('logout')
  @Security('bearerAuth')
  @SuccessResponse(200, 'Logout successful')
  @Response<AuthErrorResponse>(401, 'Invalid or expired token')
  public async logout(
    @Header('Authorization') authorization?: string
  ): Promise<LogoutSuccessResponse | AuthErrorResponse> {
    const token = authorization?.replace('Bearer ', '');

    if (!token) {
      const code = AUTH_ERROR_CODES.AUTH_TOKEN_INVALID;
      this.setStatus(401);
      return createAuthError(code, 'No token provided');
    }

    const result = await this.authService.logout(token);

    if (!result.success || !result.data) {
      const error = result.error;
      const code = getCanonicalCode(error?.code);
      const errorResponse = createAuthError(code, error?.message || 'Failed to logout');
      this.setStatus(getAuthHttpStatus(code));
      return errorResponse;
    }

    return {
      success: true,
      data: {
        message: result.data.message,
      },
    };
  }
}
