/**
 * User Repository Implem  async createUser(userData: CreateUserData): Promise<UserEntity> {
    const result = await pool.query(
      `INSERT INTO users (email, passwordhash, role, email_verified, terms_version, terms_accepted_at) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, username, email, createdat, updatedat, role, email_verified, terms_version, terms_accepted_at`,
      [userData.email, userData.passwordHash, userData.role, false, userData.termsVersion, userData.termsAcceptedAt]
    );* Handles all database operations for user registration
 * with proper transaction support and error handling.
 */

import pool from '../dbConfig';
import {
  IUserRepository,
  CreateUserData,
  CreateUserProfileData,
  CreateUserAddressData,
  CreateDocumentLogData,
  CreateConsentLogData,
  CreateVerificationStatusData,
  TransactionCallback,
} from '../interfaces/IUserRegistrationService';
import {
  UserEntity,
  UserProfileEntity,
  UserAddressEntity,
  DocumentProcessingLogEntity,
  ConsentLogEntity,
  UserVerificationStatusEntity,
} from '../types/registration';

export class UserRepository implements IUserRepository {
  async createUser(userData: CreateUserData): Promise<UserEntity> {
    const result = await pool.query(
      `INSERT INTO users (email, passwordhash, role, email_verified, terms_version, terms_accepted_at) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, username, email, createdat, updatedat, role, email_verified, terms_version, terms_accepted_at`,
      [userData.email, userData.passwordHash, userData.role, false, userData.termsVersion, userData.termsAcceptedAt]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create user');
    }

    return this.mapUserEntity(result.rows[0]);
  }

  async createUserProfile(profileData: CreateUserProfileData): Promise<UserProfileEntity> {
    const query = `
      INSERT INTO user_profiles (
        user_id, 
        title, 
        first_name, 
        last_name, 
        birth_date,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      profileData.userId,
      profileData.title,
      profileData.firstName,
      profileData.lastName,
      profileData.birthDate,
    ];

    try {
      const result = await pool.query(query, values);
      return this.mapUserProfileEntity(result.rows[0]);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error(`Failed to create user profile: ${(error as Error).message}`);
    }
  }

  async createUserAddress(addressData: CreateUserAddressData): Promise<UserAddressEntity> {
    const query = `
      INSERT INTO user_addresses (
        user_id, 
        country, 
        postal_code, 
        city, 
        state, 
        street, 
        is_primary,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      addressData.userId,
      addressData.country,
      addressData.postalCode,
      addressData.city,
      addressData.state,
      addressData.street,
      addressData.isPrimary,
    ];

    try {
      const result = await pool.query(query, values);
      return this.mapUserAddressEntity(result.rows[0]);
    } catch (error) {
      console.error('Error creating user address:', error);
      throw new Error(`Failed to create user address: ${(error as Error).message}`);
    }
  }

  async logDocumentProcessing(documentData: CreateDocumentLogData): Promise<DocumentProcessingLogEntity> {
    const query = `
      INSERT INTO document_processing_log (
        user_id, 
        original_filename, 
        processing_status, 
        extracted_fields, 
        was_processed,
        processed_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      documentData.userId,
      documentData.originalFilename,
      documentData.processingStatus,
      JSON.stringify(documentData.extractedFields),
      documentData.wasProcessed,
    ];

    try {
      const result = await pool.query(query, values);
      return this.mapDocumentProcessingLogEntity(result.rows[0]);
    } catch (error) {
      console.error('Error logging document processing:', error);
      throw new Error(`Failed to log document processing: ${(error as Error).message}`);
    }
  }

  async logConsent(consentData: CreateConsentLogData): Promise<ConsentLogEntity> {
    const query = `
      INSERT INTO consent_log (
        user_id, 
        consent_type, 
        consent_given, 
        terms_version, 
        consent_timestamp, 
        ip_address, 
        user_agent,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      consentData.userId,
      consentData.consentType,
      consentData.consentGiven,
      consentData.termsVersion,
      consentData.consentTimestamp,
      consentData.ipAddress || null,
      consentData.userAgent || null,
    ];

    try {
      const result = await pool.query(query, values);
      return this.mapConsentLogEntity(result.rows[0]);
    } catch (error) {
      console.error('Error logging consent:', error);
      throw new Error(`Failed to log consent: ${(error as Error).message}`);
    }
  }

  async createUserVerificationStatus(verificationData: CreateVerificationStatusData): Promise<UserVerificationStatusEntity> {
    const query = `
      INSERT INTO user_verification_status (
        user_id, 
        email_verification_status,
        email_verification_token, 
        email_verification_expires_at,
        identity_verification_status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      verificationData.userId,
      'pending', // emailverificationstatus
      verificationData.emailVerificationToken,
      verificationData.emailVerificationExpiresAt,
      'pending', // identityverificationstatus
    ];

    try {
      const result = await pool.query(query, values);
      return this.mapUserVerificationStatusEntity(result.rows[0]);
    } catch (error) {
      console.error('Error creating user verification status:', error);
      throw new Error(`Failed to create user verification status: ${(error as Error).message}`);
    }
  }

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    const query = 'SELECT * FROM users WHERE email = $1';

    try {
      const result = await pool.query(query, [email]);
      return result.rows.length > 0 ? this.mapUserEntity(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw new Error(`Failed to find user by email: ${(error as Error).message}`);
    }
  }

  async findUserProfileByUserId(userId: string): Promise<UserProfileEntity | null> {
    const query = 'SELECT * FROM user_profiles WHERE user_id = $1';

    try {
      const result = await pool.query(query, [userId]);
      return result.rows.length > 0 ? this.mapUserProfileEntity(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding user profile:', error);
      throw new Error(`Failed to find user profile: ${(error as Error).message}`);
    }
  }

  async findUserAddressByUserId(userId: string): Promise<UserAddressEntity | null> {
    const query = 'SELECT * FROM user_addresses WHERE user_id = $1 AND is_primary = true';

    try {
      const result = await pool.query(query, [userId]);
      return result.rows.length > 0 ? this.mapUserAddressEntity(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding user address:', error);
      throw new Error(`Failed to find user address: ${(error as Error).message}`);
    }
  }

  async executeTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // =============================================================================
  // PRIVATE MAPPING METHODS
  // =============================================================================

  private mapUserEntity(row: any): UserEntity {
    return {
      id: row.id,
      email: row.email,
      passwordhash: row.passwordhash,
      role: row.role,
      emailverified: row.email_verified,
      identityverified: row.identity_verified,
      termsversion: row.terms_version,
      termsacceptedat: row.terms_accepted_at,
      lastlogin: row.last_login,
      createdat: row.createdat,
      updatedat: row.updatedat,
    };
  }

  private mapUserProfileEntity(row: any): UserProfileEntity {
    return {
      id: row.id,
      userid: row.user_id,
      title: row.title,
      firstname: row.first_name,
      lastname: row.last_name,
      birthdate: row.birth_date,
      createdat: row.created_at,
      updatedat: row.updated_at,
    };
  }

  private mapUserAddressEntity(row: any): UserAddressEntity {
    return {
      id: row.id,
      userid: row.user_id,
      country: row.country,
      postalcode: row.postal_code,
      city: row.city,
      state: row.state,
      street: row.street,
      isprimary: row.is_primary,
      createdat: row.created_at,
      updatedat: row.updated_at,
    };
  }

  private mapDocumentProcessingLogEntity(row: any): DocumentProcessingLogEntity {
    return {
      id: row.id,
      userid: row.user_id,
      originalfilename: row.original_filename,
      processingstatus: row.processing_status,
      extractedfields: Array.isArray(row.extracted_fields) ? row.extracted_fields : JSON.parse(row.extracted_fields || '[]'),
      wasprocessed: row.was_processed,
      processedat: row.processed_at,
    };
  }

  private mapConsentLogEntity(row: any): ConsentLogEntity {
    return {
      id: row.id,
      userid: row.user_id,
      consenttype: row.consent_type,
      consentgiven: row.consent_given,
      termsversion: row.terms_version,
      consenttimestamp: row.consent_timestamp,
      ipaddress: row.ip_address,
      useragent: row.user_agent,
      createdat: row.created_at,
    };
  }

  private mapUserVerificationStatusEntity(row: any): UserVerificationStatusEntity {
    return {
      id: row.id,
      userid: row.user_id,
      emailverificationstatus: row.email_verification_status,
      emailverificationtoken: row.email_verification_token,
      emailverificationexpiresat: row.email_verification_expires_at,
      identityverificationstatus: row.identity_verification_status,
      identityverificationnotes: row.identity_verification_notes,
      createdat: row.created_at,
      updatedat: row.updated_at,
    };
  }

  /**
   * Update email verification token for a user
   */
  async updateEmailVerificationStatus(
    userId: string,
    verificationToken?: string,
    expiresAt?: Date,
    verified?: boolean
  ): Promise<void> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (verificationToken !== undefined) {
      updateFields.push(`email_verification_token = $${paramIndex}`);
      values.push(verificationToken);
      paramIndex++;
    }

    if (expiresAt !== undefined) {
      updateFields.push(`email_verification_expires_at = $${paramIndex}`);
      values.push(expiresAt);
      paramIndex++;
    }

    if (verified !== undefined) {
      updateFields.push(`email_verification_status = $${paramIndex}`);
      values.push(verified ? 'verified' : 'pending');
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return; // Nothing to update
    }

    const query = `
      UPDATE user_verification_status
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $${paramIndex}
    `;
    values.push(userId);

    await pool.query(query, values);
  }

  /**
   * Update email verification token (convenience method)
   */
  async updateEmailVerificationToken(
    userId: string,
    verificationToken: string,
    expiresAt: Date
  ): Promise<void> {
    await this.updateEmailVerificationStatus(userId, verificationToken, expiresAt);
  }
}
