/**
 * tsoa Authentication Module
 * 
 * Handles JWT authentication for tsoa controllers
 */

import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { getPool } from '../dbConfig';
import { UserErrorCode, UserServiceFactory } from '../services/user';
import { AUTH_ERROR_CODES } from '../services/auth/contract/AuthErrorFactory';
import { AuthRepositoryImpl } from '../services/auth/repository/AuthRepositoryImpl';

const envJwtSecret = process.env.JWT_SECRET;

if (!envJwtSecret || envJwtSecret.trim().length === 0) {
  throw new Error('JWT_SECRET must be configured for tsoa authentication middleware');
}

const JWT_SECRET: string = envJwtSecret;

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

interface AuthSecurityError extends Error {
  status: number;
  code: string;
}

function createAuthSecurityError(status: number, code: string, message: string): AuthSecurityError {
  const error = new Error(message) as AuthSecurityError;
  error.status = status;
  error.code = code;
  return error;
}

function getBearerToken(authHeader?: string): string {
  if (!authHeader) {
    throw createAuthSecurityError(401, AUTH_ERROR_CODES.AUTH_TOKEN_INVALID, 'No authorization header provided');
  }

  return authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;
}

async function verifyAuthenticatedUser(decoded: AuthenticatedUser): Promise<AuthenticatedUser> {
  const userService = UserServiceFactory.createUserService(getPool());
  const verification = await userService.verifyUser(decoded.id, decoded.role);

  if (!verification.success || !verification.data) {
    if (verification.errorCode === UserErrorCode.USER_NOT_FOUND) {
      throw createAuthSecurityError(401, AUTH_ERROR_CODES.AUTH_USER_INACTIVE, 'User not found or has been deactivated');
    }
    if (verification.errorCode === UserErrorCode.UNAUTHORIZED) {
      if (verification.error === 'Token role is stale. Please re-authenticate.') {
        throw createAuthSecurityError(401, AUTH_ERROR_CODES.AUTH_STALE_ROLE_CLAIM, verification.error);
      }
      throw createAuthSecurityError(401, AUTH_ERROR_CODES.AUTH_USER_INACTIVE, verification.error || 'Unauthorized');
    }
    throw createAuthSecurityError(401, AUTH_ERROR_CODES.AUTH_TOKEN_INVALID, 'Invalid or expired token');
  }

  return {
    id: verification.data.id,
    email: verification.data.email,
    role: verification.data.role,
  };
}

function rethrowKnownAuthError(error: unknown): never {
  if (!error || !(error instanceof Error)) {
    throw createAuthSecurityError(500, AUTH_ERROR_CODES.AUTH_INTERNAL_ERROR, 'Authentication service unavailable');
  }

  const authError = error as Partial<AuthSecurityError>;
  if (typeof authError.status === 'number' && typeof authError.code === 'string') {
    throw error;
  }

  if (error instanceof jwt.TokenExpiredError) {
    throw createAuthSecurityError(401, AUTH_ERROR_CODES.AUTH_TOKEN_EXPIRED, 'Token has expired');
  }

  if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError) {
    throw createAuthSecurityError(401, AUTH_ERROR_CODES.AUTH_TOKEN_INVALID, 'Invalid or expired token');
  }

  throw createAuthSecurityError(500, AUTH_ERROR_CODES.AUTH_INTERNAL_ERROR, 'Authentication service unavailable');
}

/**
 * Authentication function for tsoa @Security decorator
 * Called automatically by tsoa-generated routes
 * 
 * @param scopes - Required roles, e.g. ["admin"] from @Security("bearerAuth", ["admin"])
 */
export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[]
): Promise<AuthenticatedUser> {
  if (securityName !== 'bearerAuth') {
    throw new Error(`Unknown security name: ${securityName}`);
  }

  try {
    const token = getBearerToken(request.headers.authorization);
    const authRepository = new AuthRepositoryImpl(getPool());
    const revoked = await authRepository.isTokenRevoked(token);
    if (revoked) {
      throw createAuthSecurityError(401, AUTH_ERROR_CODES.AUTH_TOKEN_INVALID, 'Token has been revoked');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    const authenticatedUser = await verifyAuthenticatedUser(decoded);

    if (scopes && scopes.length > 0 && !scopes.includes(authenticatedUser.role)) {
      throw createAuthSecurityError(403, AUTH_ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS, 'Insufficient permissions');
    }

    return authenticatedUser;
  } catch (error) {
    rethrowKnownAuthError(error);
  }
}
