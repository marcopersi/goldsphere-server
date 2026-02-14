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
import type { 
  LoginRequest, 
  LoginResponse, 
  AuthUser 
} from '../services/auth/types/AuthTypes';
import { AuthErrorCode } from '../services/auth/types/AuthTypes';

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

/**
 * Successful login response
 */
export interface LoginSuccessResponse {
  success: true;
  token: string;
  user: AuthUserResponse;
}

/**
 * Auth user info
 */
export interface AuthUserResponse {
  /**
   * User ID (UUID)
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id: string;
  
  /**
   * User email
   * @example "user@goldsphere.vault"
   */
  email: string;
  
  /**
   * User role
   * @example "user"
   */
  role: string;
}

/**
 * Token validation response
 */
export interface ValidateResponse {
  success: true;
  user: AuthUserResponse;
}

/**
 * Error response
 */
export interface AuthErrorResponse {
  success: false;
  error: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusCode(code: AuthErrorCode): number {
  switch (code) {
    case AuthErrorCode.INVALID_CREDENTIALS:
    case AuthErrorCode.TOKEN_EXPIRED:
    case AuthErrorCode.TOKEN_INVALID:
      return 401;
    case AuthErrorCode.ACCOUNT_INACTIVE:
    case AuthErrorCode.ACCOUNT_LOCKED:
      return 403;
    case AuthErrorCode.USER_NOT_FOUND:
      return 404;
    case AuthErrorCode.INTERNAL_ERROR:
    default:
      return 500;
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
   * @returns JWT token and user info on success
   */
  @Post('login')
  @SuccessResponse(200, 'Login successful')
  @Response<AuthErrorResponse>(400, 'Missing required fields')
  @Response<AuthErrorResponse>(401, 'Invalid credentials')
  @Response<AuthErrorResponse>(403, 'Account inactive or locked')
  public async login(
    @Body() body: LoginRequestBody
  ): Promise<LoginSuccessResponse | AuthErrorResponse> {
    const { email, password } = body;

    if (!email || !password) {
      this.setStatus(400);
      return {
        success: false,
        error: 'Email and password are required'
      };
    }

    const result = await this.authService.login({ email, password });

    if (!result.success) {
      const statusCode = getStatusCode(result.error!.code);
      this.setStatus(statusCode);
      return {
        success: false,
        error: result.error!.message
      };
    }

    return result.data!;
  }

  /**
   * Validate current JWT token
   * @summary Validate token
   * @param authorization Bearer token header
   * @returns User info if token is valid
   */
  @Get('validate')
  @Security('bearerAuth')
  @SuccessResponse(200, 'Token is valid')
  @Response<AuthErrorResponse>(401, 'Invalid or expired token')
  public async validate(
    @Request() request: ExpressRequest
  ): Promise<ValidateResponse> {
    // User is already validated by security middleware
    const user = (request as any).user;
    
    if (!user) {
      this.setStatus(401);
      throw new Error('Invalid token');
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Refresh JWT token
   * @summary Refresh token
   * @param authorization Bearer token header
   * @returns New JWT token
   */
  @Post('refresh')
  @SuccessResponse(200, 'Token refreshed successfully')
  @Response<AuthErrorResponse>(401, 'Invalid or expired token')
  public async refresh(
    @Header('Authorization') authorization?: string
  ): Promise<LoginSuccessResponse | AuthErrorResponse> {
    const token = authorization?.replace('Bearer ', '');

    if (!token) {
      this.setStatus(401);
      return {
        success: false,
        error: 'No token provided',
      };
    }

    const result = await this.authService.refreshToken(token);

    if (!result.success) {
      const statusCode = getStatusCode(result.error!.code);
      this.setStatus(statusCode);
      return {
        success: false,
        error: result.error!.message,
      };
    }

    return result.data!;
  }

  /**
   * Get current authenticated user info
   * @summary Get current user
   * @param authorization Bearer token header
   * @returns Current user information
   */
  @Get('me')
  @SuccessResponse(200, 'User information retrieved')
  @Response<AuthErrorResponse>(401, 'Invalid or expired token')
  public async getCurrentUser(
    @Header('Authorization') authorization?: string
  ): Promise<AuthUserResponse | AuthErrorResponse> {
    const token = authorization?.replace('Bearer ', '');

    if (!token) {
      this.setStatus(401);
      return {
        success: false,
        error: 'No token provided',
      };
    }

    const result = await this.authService.getCurrentUser(token);

    if (!result.success) {
      const statusCode = getStatusCode(result.error!.code);
      this.setStatus(statusCode);
      return {
        success: false,
        error: result.error!.message,
      };
    }

    return result.data!;
  }
}
