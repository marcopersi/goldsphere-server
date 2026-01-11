/**
 * UserRepositoryImpl
 * 
 * PostgreSQL implementation of IUserRepository.
 * Uses dependency injection for the database pool.
 */

import { Pool, PoolClient } from 'pg';
import { IUserRepository, TransactionCallback } from './IUserRepository';
import {
  UserEntity,
  UserProfileEntity,
  UserAddressEntity,
  UserVerificationStatusEntity,
  DocumentProcessingLogEntity,
  ConsentLogEntity,
  CreateUserData,
  CreateUserProfileData,
  CreateUserAddressData,
  CreateDocumentLogData,
  CreateConsentLogData,
  CreateVerificationStatusData,
  UpdateUserData,
  UpdateVerificationStatusData,
  ListUsersOptions,
  GetUsersResult,
  UserDbRow,
  UserProfileDbRow,
  UserAddressDbRow,
  UserVerificationStatusDbRow,
  DocumentProcessingLogDbRow,
  ConsentLogDbRow,
  mapUserEntity,
  mapUserProfileEntity,
  mapUserAddressEntity,
  mapUserVerificationStatusEntity,
  mapDocumentProcessingLogEntity,
  mapConsentLogEntity,
  DEFAULT_USER_ROLE,
} from '../types';

export class UserRepositoryImpl implements IUserRepository {
  constructor(private readonly pool: Pool) {}

  // =========================================================================
  // User CRUD Operations
  // =========================================================================

  async createUser(userData: CreateUserData): Promise<UserEntity> {
    const role = userData.role ?? DEFAULT_USER_ROLE;
    
    const result = await this.pool.query<UserDbRow>(
      `INSERT INTO users (email, passwordhash, role, email_verified, terms_version, terms_accepted_at) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        userData.email,
        userData.passwordHash,
        role,
        false,
        userData.termsVersion ?? null,
        userData.termsAcceptedAt ?? null,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create user');
    }

    return mapUserEntity(result.rows[0]);
  }

  async findUserById(id: string): Promise<UserEntity | null> {
    const result = await this.pool.query<UserDbRow>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? mapUserEntity(result.rows[0]) : null;
  }

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    const result = await this.pool.query<UserDbRow>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows.length > 0 ? mapUserEntity(result.rows[0]) : null;
  }

  async getUsers(options: ListUsersOptions): Promise<GetUsersResult> {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: (string | boolean | number)[] = [];
    let paramIndex = 1;

    if (options.search) {
      conditions.push(`email ILIKE $${paramIndex}`);
      params.push(`%${options.search}%`);
      paramIndex++;
    }

    if (options.role) {
      conditions.push(`role = $${paramIndex}`);
      params.push(options.role);
      paramIndex++;
    }

    if (options.emailVerified !== undefined) {
      conditions.push(`email_verified = $${paramIndex}`);
      params.push(options.emailVerified);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY
    const sortColumn = this.getSortColumn(options.sortBy ?? 'email');
    const sortOrder = options.sortOrder === 'desc' ? 'DESC' : 'ASC';

    // Get total count
    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const result = await this.pool.query<UserDbRow>(
      `SELECT * FROM users ${whereClause} 
       ORDER BY ${sortColumn} ${sortOrder} 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      users: result.rows.map(mapUserEntity),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async updateUser(id: string, data: UpdateUserData): Promise<UserEntity | null> {
    const updates: string[] = [];
    const values: (string | boolean | Date | null)[] = [];
    let paramIndex = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.passwordHash !== undefined) {
      updates.push(`passwordhash = $${paramIndex++}`);
      values.push(data.passwordHash);
    }
    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }
    if (data.emailVerified !== undefined) {
      updates.push(`email_verified = $${paramIndex++}`);
      values.push(data.emailVerified);
    }
    if (data.identityVerified !== undefined) {
      updates.push(`identity_verified = $${paramIndex++}`);
      values.push(data.identityVerified);
    }
    if (data.lastLogin !== undefined) {
      updates.push(`last_login = $${paramIndex++}`);
      values.push(data.lastLogin);
    }

    if (updates.length === 0) {
      return this.findUserById(id);
    }

    updates.push(`updatedat = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await this.pool.query<UserDbRow>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows.length > 0 ? mapUserEntity(result.rows[0]) : null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const query = excludeUserId
      ? 'SELECT 1 FROM users WHERE email = $1 AND id != $2'
      : 'SELECT 1 FROM users WHERE email = $1';
    const params = excludeUserId ? [email, excludeUserId] : [email];
    
    const result = await this.pool.query(query, params);
    return result.rows.length > 0;
  }

  // =========================================================================
  // User Profile Operations
  // =========================================================================

  async createUserProfile(profileData: CreateUserProfileData): Promise<UserProfileEntity> {
    const result = await this.pool.query<UserProfileDbRow>(
      `INSERT INTO user_profiles (user_id, title, first_name, last_name, birth_date, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        profileData.userId,
        profileData.title,
        profileData.firstName,
        profileData.lastName,
        profileData.birthDate,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create user profile');
    }

    return mapUserProfileEntity(result.rows[0]);
  }

  async findUserProfileByUserId(userId: string): Promise<UserProfileEntity | null> {
    const result = await this.pool.query<UserProfileDbRow>(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    return result.rows.length > 0 ? mapUserProfileEntity(result.rows[0]) : null;
  }

  // =========================================================================
  // User Address Operations
  // =========================================================================

  async createUserAddress(addressData: CreateUserAddressData): Promise<UserAddressEntity> {
    const result = await this.pool.query<UserAddressDbRow>(
      `INSERT INTO user_addresses 
       (user_id, countryid, postal_code, city, state, street, is_primary, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        addressData.userId,
        addressData.countryId,
        addressData.postalCode,
        addressData.city,
        addressData.state,
        addressData.street,
        addressData.isPrimary ?? true,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create user address');
    }

    return mapUserAddressEntity(result.rows[0]);
  }

  async findUserAddressByUserId(userId: string): Promise<UserAddressEntity | null> {
    const result = await this.pool.query<UserAddressDbRow>(
      'SELECT * FROM user_addresses WHERE user_id = $1 AND is_primary = true',
      [userId]
    );
    return result.rows.length > 0 ? mapUserAddressEntity(result.rows[0]) : null;
  }

  async findUserAddressesByUserId(userId: string): Promise<UserAddressEntity[]> {
    const result = await this.pool.query<UserAddressDbRow>(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_primary DESC, created_at DESC',
      [userId]
    );
    return result.rows.map(mapUserAddressEntity);
  }

  // Continued in part 2...
  // =========================================================================
  // Verification Status Operations
  // =========================================================================

  async createUserVerificationStatus(data: CreateVerificationStatusData): Promise<UserVerificationStatusEntity> {
    const result = await this.pool.query<UserVerificationStatusDbRow>(
      `INSERT INTO user_verification_status 
       (user_id, email_verification_status, email_verification_token, email_verification_expires_at,
        identity_verification_status, created_at, updated_at)
       VALUES ($1, 'pending', $2, $3, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [data.userId, data.emailVerificationToken, data.emailVerificationExpiresAt]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create user verification status');
    }

    return mapUserVerificationStatusEntity(result.rows[0]);
  }

  async findVerificationStatusByUserId(userId: string): Promise<UserVerificationStatusEntity | null> {
    const result = await this.pool.query<UserVerificationStatusDbRow>(
      'SELECT * FROM user_verification_status WHERE user_id = $1',
      [userId]
    );
    return result.rows.length > 0 ? mapUserVerificationStatusEntity(result.rows[0]) : null;
  }

  async updateVerificationStatus(userId: string, data: UpdateVerificationStatusData): Promise<void> {
    const updates: string[] = [];
    const values: (string | Date | null)[] = [];
    let paramIndex = 1;

    if (data.emailVerificationStatus !== undefined) {
      updates.push(`email_verification_status = $${paramIndex++}`);
      values.push(data.emailVerificationStatus);
    }
    if (data.emailVerificationToken !== undefined) {
      updates.push(`email_verification_token = $${paramIndex++}`);
      values.push(data.emailVerificationToken);
    }
    if (data.emailVerificationExpiresAt !== undefined) {
      updates.push(`email_verification_expires_at = $${paramIndex++}`);
      values.push(data.emailVerificationExpiresAt);
    }
    if (data.identityVerificationStatus !== undefined) {
      updates.push(`identity_verification_status = $${paramIndex++}`);
      values.push(data.identityVerificationStatus);
    }
    if (data.identityVerificationNotes !== undefined) {
      updates.push(`identity_verification_notes = $${paramIndex++}`);
      values.push(data.identityVerificationNotes);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    await this.pool.query(
      `UPDATE user_verification_status SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`,
      values
    );
  }

  // =========================================================================
  // Logging Operations
  // =========================================================================

  async logDocumentProcessing(data: CreateDocumentLogData): Promise<DocumentProcessingLogEntity> {
    const result = await this.pool.query<DocumentProcessingLogDbRow>(
      `INSERT INTO document_processing_log 
       (user_id, original_filename, processing_status, extracted_fields, was_processed, processed_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        data.userId,
        data.originalFilename,
        data.processingStatus,
        JSON.stringify(data.extractedFields),
        data.wasProcessed,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to log document processing');
    }

    return mapDocumentProcessingLogEntity(result.rows[0]);
  }

  async logConsent(data: CreateConsentLogData): Promise<ConsentLogEntity> {
    const result = await this.pool.query<ConsentLogDbRow>(
      `INSERT INTO consent_log 
       (user_id, consent_type, consent_given, terms_version, consent_timestamp, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        data.userId,
        data.consentType,
        data.consentGiven,
        data.termsVersion,
        data.consentTimestamp,
        data.ipAddress ?? null,
        data.userAgent ?? null,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to log consent');
    }

    return mapConsentLogEntity(result.rows[0]);
  }

  // =========================================================================
  // Transaction Support
  // =========================================================================

  async executeTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =========================================================================
  // Referential Integrity Checks
  // =========================================================================

  async hasOrders(userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM orders WHERE userid = $1 LIMIT 1',
      [userId]
    );
    return result.rows.length > 0;
  }

  async hasPortfolios(userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM portfolio WHERE ownerid = $1 LIMIT 1',
      [userId]
    );
    return result.rows.length > 0;
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private getSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      email: 'email',
      createdAt: 'createdat',
      updatedAt: 'updatedat',
      lastLogin: 'last_login',
    };
    return columnMap[sortBy] ?? 'email';
  }
}
