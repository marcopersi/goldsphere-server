/**
 * Auth Service Implementation
 * Handles authentication logic with dependency injection
 */

import bcrypt from 'bcrypt';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { IAuthService } from '../IAuthService';
import { IAuthRepository } from '../repository/IAuthRepository';
import {
  LoginRequest,
  LoginResponse,
  AuthResult,
  TokenPayload,
  AuthErrorCode,
  validateLoginRequest,
} from '../types';
import { type AuthUser, serializeSessionSuccessResponse } from '../contract/AuthContract';

type RoleType = 'admin' | 'user' | 'customer' | 'advisor' | 'investor';

function requireNonEmptyString(value: string | null | undefined, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`Missing required auth user field: ${fieldName}`);
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    throw new TypeError(`Missing required auth user field: ${fieldName}`);
  }

  return trimmedValue;
}

function resolveRole(value: string | null | undefined): RoleType {
  const role = requireNonEmptyString(value, 'role');
  const allowedRoles: readonly RoleType[] = ['admin', 'user', 'customer', 'advisor', 'investor'];

  if (!allowedRoles.includes(role as RoleType)) {
    throw new Error(`Unsupported auth role value: ${role}`);
  }

  return role as RoleType;
}

function mapAuthUser(user: {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}, fallbackRole?: string): AuthUser {
  const roleSource = fallbackRole ?? user.role;

  return {
    id: requireNonEmptyString(user.id, 'id'),
    email: requireNonEmptyString(user.email, 'email'),
    firstName: requireNonEmptyString(user.firstName, 'firstName'),
    lastName: requireNonEmptyString(user.lastName, 'lastName'),
    role: resolveRole(roleSource),
  };
}

function decodeTokenTimestamps(token: string): { expiresIn: number; expiresAt: string; issuedAt?: string } {
  const decoded = jwt.decode(token) as JwtPayload | null;

  if (!decoded || typeof decoded !== 'object' || typeof decoded.exp !== 'number') {
    throw new Error('Unable to decode token expiration metadata');
  }

  const issuedAtSeconds = typeof decoded.iat === 'number' ? decoded.iat : undefined;
  const expiresIn = issuedAtSeconds ? Math.max(0, decoded.exp - issuedAtSeconds) : Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));

  return {
    expiresIn,
    expiresAt: new Date(decoded.exp * 1000).toISOString(),
    issuedAt: issuedAtSeconds ? new Date(issuedAtSeconds * 1000).toISOString() : undefined,
  };
}

export class AuthServiceImpl implements IAuthService {
  private readonly jwtSecret: string;
  private readonly tokenExpiry: StringValue;

  constructor(
    private readonly authRepository: IAuthRepository,
    jwtSecret?: string,
    tokenExpiry?: StringValue
  ) {
    const resolvedJwtSecret = jwtSecret ?? process.env.JWT_SECRET;
    const resolvedTokenExpiry = tokenExpiry ?? (process.env.JWT_EXPIRES_IN as StringValue | undefined);

    if (!resolvedJwtSecret || resolvedJwtSecret.trim().length === 0) {
      throw new Error('JWT_SECRET must be configured for AuthServiceImpl');
    }

    if (!resolvedTokenExpiry || String(resolvedTokenExpiry).trim().length === 0) {
      throw new Error('JWT_EXPIRES_IN must be configured for AuthServiceImpl');
    }

    this.jwtSecret = resolvedJwtSecret;
    this.tokenExpiry = resolvedTokenExpiry;
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
        const statusCode =
          user.status === 'locked' || user.status === 'blocked' || user.status === 'suspended'
            ? AuthErrorCode.ACCOUNT_LOCKED
            : AuthErrorCode.USER_INACTIVE;

        return {
          success: false,
          error: {
            code: statusCode,
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

      const userRole = resolveRole(user.role);

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

      const { expiresIn, expiresAt, issuedAt } = decodeTokenTimestamps(token);

      const authUser = mapAuthUser(user, userRole);

      const sessionResponse = serializeSessionSuccessResponse({
        success: true,
        data: {
          accessToken: token,
          tokenType: 'Bearer',
          expiresIn,
          expiresAt,
          issuedAt,
          user: authUser,
        },
      });

      return {
        success: true,
        data: sessionResponse,
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
      const revoked = await this.authRepository.isTokenRevoked(token);
      if (revoked) {
        return {
          success: false,
          error: {
            code: AuthErrorCode.TOKEN_INVALID,
            message: 'Token has been revoked',
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: `Failed to validate token revocation state: ${(error as Error).message}`,
        },
      };
    }

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
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError) {
          return {
            success: false,
            error: {
              code: AuthErrorCode.TOKEN_INVALID,
              message: 'Invalid token',
            },
          };
        }
      return {
        success: false,
        error: {
            code: AuthErrorCode.INTERNAL_ERROR,
            message: `Token verification failed: ${(error as Error).message}`,
        },
      };
    }
  }

  async refreshToken(token: string): Promise<AuthResult<LoginResponse>> {
    const validation = await this.validateToken(token);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error || {
          code: AuthErrorCode.TOKEN_INVALID,
          message: 'Invalid token',
        },
      };
    }

    if (!validation.data) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.TOKEN_INVALID,
          message: 'Invalid token payload',
        },
      };
    }

    const payload = validation.data;

    // Verify user still exists and is active
    const user = await this.authRepository.findUserByEmail(payload.email);
    if (user?.status !== 'active') {
      return {
        success: false,
        error: {
          code: AuthErrorCode.USER_INACTIVE,
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

    const { expiresIn, expiresAt, issuedAt } = decodeTokenTimestamps(newToken);

    let authUser: AuthUser;
    try {
      authUser = mapAuthUser(user);
    } catch (error) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: `Failed to build refresh session payload: ${(error as Error).message}`,
        },
      };
    }

    const refreshResponse = serializeSessionSuccessResponse({
      success: true,
      data: {
        accessToken: newToken,
        tokenType: 'Bearer',
        expiresIn,
        expiresAt,
        issuedAt,
        user: authUser,
      },
    });

    return {
      success: true,
      data: refreshResponse,
    };
  }

  async getCurrentUser(token: string): Promise<AuthResult<AuthUser>> {
    const validation = await this.validateToken(token);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error || {
          code: AuthErrorCode.TOKEN_INVALID,
          message: 'Invalid token',
        },
      };
    }

    if (!validation.data) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.TOKEN_INVALID,
          message: 'Invalid token payload',
        },
      };
    }

    const payload = validation.data;

    const user = await this.authRepository.findUserByEmail(payload.email);
    if (user?.status !== 'active') {
      return {
        success: false,
        error: {
          code: AuthErrorCode.USER_INACTIVE,
          message: 'Account is no longer active',
        },
      };
    }

    try {
      return {
        success: true,
        data: mapAuthUser(user),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: `Failed to build current user payload: ${(error as Error).message}`,
        },
      };
    }
  }

  async logout(token: string): Promise<AuthResult<{ message: string }>> {
    const validation = await this.validateToken(token);

    if (!validation.success || !validation.data) {
      return {
        success: false,
        error: validation.error || {
          code: AuthErrorCode.TOKEN_INVALID,
          message: 'Invalid token',
        },
      };
    }

    const expiresAt = validation.data.exp
      ? new Date(validation.data.exp * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.authRepository.revokeToken(token, expiresAt);

    return {
      success: true,
      data: {
        message: 'Logout successful',
      },
    };
  }
}

