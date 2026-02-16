/**
 * Auth Repository Implementation
 * PostgreSQL-based data access for authentication
 */

import { Pool } from 'pg';
import { IAuthRepository } from './IAuthRepository';
import { AuthUserRecord } from '../types';

export class AuthRepositoryImpl implements IAuthRepository {
  constructor(private readonly pool: Pool) {}

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    let result;
    try {
      result = await this.pool.query(
        `SELECT 
          u.id,
          u.email,
          u.passwordhash,
          u.role,
          u.last_login as "lastLogin",
          u.account_status as "accountStatus",
          up.first_name as "firstName",
          up.last_name as "lastName"
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        WHERE u.email = $1`,
        [email]
      );
    } catch (error) {
      const pgError = error as { code?: string; message?: string };
      if (pgError.code === '42703' && pgError.message?.includes('account_status')) {
        throw new Error(
          'Database schema is outdated: missing users.account_status. Apply migration initdb/08-user-account-status.sql.'
        );
      }
      throw error;
    }

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const firstName = typeof row.firstName === 'string' ? row.firstName.trim() : '';
    const lastName = typeof row.lastName === 'string' ? row.lastName.trim() : '';
    const role = typeof row.role === 'string' ? row.role.trim() : '';
    const accountStatus = typeof row.accountStatus === 'string' ? row.accountStatus.trim() : '';

    if (!firstName || !lastName) {
      throw new Error(`User profile is incomplete for ${email}: firstName and lastName are required`);
    }

    if (!role) {
      throw new Error(`User role is missing for ${email}`);
    }

    if (!accountStatus) {
      throw new Error(`User account_status is missing for ${email}`);
    }

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordhash,
      firstName,
      lastName,
      role,
      status: accountStatus,
      lastLogin: row.lastLogin ? new Date(row.lastLogin) : undefined,
    };
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  async isUserActive(userId: string): Promise<boolean> {
    const result = await this.pool.query(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );

    // Users exist = active (no status column in current schema)
    return result.rows.length > 0;
  }
}


