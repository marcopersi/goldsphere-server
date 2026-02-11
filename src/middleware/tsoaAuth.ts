/**
 * tsoa Authentication Module
 * 
 * Handles JWT authentication for tsoa controllers
 */

import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { getPool } from '../dbConfig';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Verify user exists in database
 */
async function verifyUserInDatabase(userId: string): Promise<boolean> {
  try {
    const result = await getPool().query('SELECT id FROM users WHERE id = $1', [userId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database verification error:', error);
    return false;
  }
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
  if (securityName === 'bearerAuth') {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      
      // Verify user exists in database
      const userExists = await verifyUserInDatabase(decoded.id);
      if (!userExists) {
        throw new Error('User not found or has been deactivated');
      }

      // Check role-based scopes if specified
      if (scopes && scopes.length > 0) {
        if (!scopes.includes(decoded.role)) {
          const scopeError = new Error('Insufficient permissions') as Error & { status: number };
          scopeError.status = 403;
          throw scopeError;
        }
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found or has been deactivated') {
        throw error;
      }
      if (error instanceof Error && error.message === 'Insufficient permissions') {
        throw error;
      }
      throw new Error('Invalid or expired token');
    }
  }

  throw new Error(`Unknown security name: ${securityName}`);
}
