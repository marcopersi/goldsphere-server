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
}
