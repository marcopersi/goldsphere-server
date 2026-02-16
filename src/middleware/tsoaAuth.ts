/**
 * tsoa Authentication Module
 * 
 * Handles JWT authentication for tsoa controllers
 */

import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { getPool } from '../dbConfig';
import { UserErrorCode, UserServiceFactory } from '../services/user';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

function getBearerToken(authHeader?: string): string {
  if (!authHeader) {
    throw new Error('No authorization header provided');
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
      throw new Error('User not found or has been deactivated');
    }
    if (verification.errorCode === UserErrorCode.UNAUTHORIZED) {
      throw new Error(verification.error || 'Unauthorized');
    }
    throw new Error('Invalid or expired token');
  }

  return {
    id: verification.data.id,
    email: verification.data.email,
    role: verification.data.role,
  };
}

function rethrowKnownAuthError(error: unknown): never {
  if (!(error instanceof Error)) {
    throw new Error('Invalid or expired token');
  }

  const knownErrors = new Set([
    'User not found or has been deactivated',
    'User account is inactive',
    'Token role is stale. Please re-authenticate.',
    'Insufficient permissions',
  ]);

  if (knownErrors.has(error.message)) {
    throw error;
  }

  throw new Error('Invalid or expired token');
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
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    const authenticatedUser = await verifyAuthenticatedUser(decoded);

    if (scopes && scopes.length > 0 && !scopes.includes(authenticatedUser.role)) {
      const scopeError = new Error('Insufficient permissions') as Error & { status: number };
      scopeError.status = 403;
      throw scopeError;
    }

    return authenticatedUser;
  } catch (error) {
    rethrowKnownAuthError(error);
  }
}
