/**
 * Auth Repository Interface
 * Defines data access operations for authentication
 */

import { AuthUserRecord } from '../types';

export interface IAuthRepository {
  /**
   * Find user by email for authentication
   */
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;

  /**
   * Update last login timestamp
   */
  updateLastLogin(userId: string): Promise<void>;

  /**
   * Check if user account is active
   */
  isUserActive(userId: string): Promise<boolean>;

  /**
   * Revoke a JWT token so it can no longer be used
   */
  revokeToken(token: string, expiresAt: Date): Promise<void>;

  /**
   * Check whether a JWT token has been revoked
   */
  isTokenRevoked(token: string): Promise<boolean>;
}
