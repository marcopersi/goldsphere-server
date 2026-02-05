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
    const result = await this.pool.query(
      `SELECT 
        id, 
        email, 
        passwordhash, 
        role,
        last_login as "lastLogin"
      FROM users 
      WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordhash,
      role: row.role || 'user',
      status: 'active', // Users table doesn't have status column, default to active
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


