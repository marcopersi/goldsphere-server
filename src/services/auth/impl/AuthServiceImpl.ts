/**
 * Auth Service Implementation
 * Handles authentication logic with dependency injection
 */

import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { IAuthService } from '../IAuthService';
import { IAuthRepository } from '../repository/IAuthRepository';
import {
  LoginRequest,
  LoginResponse,
  AuthResult,
  TokenPayload,
  AuthUser,
  AuthErrorCode,
  validateLoginRequest,
} from '../types';

type RoleType = 'admin' | 'user' | 'advisor' | 'investor';

export class AuthServiceImpl implements IAuthService {
  private readonly jwtSecret: string;
  private readonly tokenExpiry: StringValue;

  constructor(
    private readonly authRepository: IAuthRepository,
    jwtSecret?: string,
    tokenExpiry?: StringValue
  ) {
    this.jwtSecret = jwtSecret || process.env.JWT_SECRET || 'your-secret-key';
    this.tokenExpiry = tokenExpiry || '24h';
  }

  async login(request: LoginRequest): Promise<AuthResult<LoginResponse>> {
    // Validate request
    const validation = validateLoginRequest(request);
    if (!validation.success) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.INVALID_CREDENTIALS,
          message: validation.error?.message || 'Invalid request',
        },
      };
    }

    try {
      // Find user by email
      const user = await this.authRepository.findUserByEmail(request.email);
      if (!user) {
        return {
          success: false,
          error: {
            code: AuthErrorCode.INVALID_CREDENTIALS,
            message: 'Invalid credentials',
          },
        };
      }

      // Check user status
      if (user.status !== 'active') {
        return {
          success: false,
          error: {
            code: AuthErrorCode.ACCOUNT_INACTIVE,
            message: 'Account is not active',
          },
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        request.password,
        user.passwordHash
      );
      if (!isValidPassword) {
        return {
          success: false,
          error: {
            code: AuthErrorCode.INVALID_CREDENTIALS,
            message: 'Invalid credentials',
          },
        };
      }

      // Update last login
      await this.authRepository.updateLastLogin(user.id);

      // Determine role (fallback to email-based detection for legacy)
      const userRole: RoleType = (user.role as RoleType) || (user.email.includes('admin') ? 'admin' : 'user');

      // Generate JWT token
      const payload = {
        id: user.id,
        email: user.email,
        role: userRole,
      };

      const signOptions: SignOptions = {
        expiresIn: this.tokenExpiry,
      };

      const token = jwt.sign(payload, this.jwtSecret, signOptions);

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        role: userRole,
      };

      return {
        success: true,
        data: {
          success: true,
          token,
          user: authUser,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: 'Internal server error',
        },
      };
    }
  }

  async validateToken(token: string): Promise<AuthResult<TokenPayload>> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return {
        success: true,
        data: decoded,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          success: false,
          error: {
            code: AuthErrorCode.TOKEN_EXPIRED,
            message: 'Token has expired',
          },
        };
      }
      return {
        success: false,
        error: {
          code: AuthErrorCode.TOKEN_INVALID,
          message: 'Invalid token',
        },
      };
    }
  }

  async refreshToken(token: string): Promise<AuthResult<LoginResponse>> {
    const validation = await this.validateToken(token);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error!,
      };
    }

    const payload = validation.data!;

    // Verify user still exists and is active
    const user = await this.authRepository.findUserByEmail(payload.email);
    if (!user || user.status !== 'active') {
      return {
        success: false,
        error: {
          code: AuthErrorCode.ACCOUNT_INACTIVE,
          message: 'Account is no longer active',
        },
      };
    }

    // Generate new token
    const newPayload = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };

    const signOptions: SignOptions = {
      expiresIn: this.tokenExpiry,
    };

    const newToken = jwt.sign(newPayload, this.jwtSecret, signOptions);

    return {
      success: true,
      data: {
        success: true,
        token: newToken,
        user: {
          id: payload.id,
          email: payload.email,
          role: payload.role,
        },
      },
    };
  }

  async getCurrentUser(token: string): Promise<AuthResult<AuthUser>> {
    const validation = await this.validateToken(token);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error!,
      };
    }

    const payload = validation.data!;
    return {
      success: true,
      data: {
        id: payload.id,
        email: payload.email,
        role: payload.role,
      },
    };
  }
}

