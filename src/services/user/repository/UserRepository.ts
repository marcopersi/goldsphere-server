/**
 * Legacy User Repository
 * 
 * Implements IRegistrationRepository for backward compatibility.
 * Uses getPool() for DB access. For new code, prefer UserRepositoryImpl with DI.
 */

import { getPool } from '../../../dbConfig';
import { IRegistrationRepository } from '../IRegistrationService';
import {
  UserEntity,
  UserProfileEntity,
  UserAddressEntity,
  DocumentProcessingLogEntity,
  ConsentLogEntity,
  UserVerificationStatusEntity,
  CreateUserData,
  CreateUserProfileData,
  CreateUserAddressData,
  CreateDocumentLogData,
  CreateConsentLogData,
  CreateVerificationStatusData,
  mapUserEntity,
  mapUserProfileEntity,
  mapUserAddressEntity,
  mapDocumentProcessingLogEntity,
  mapConsentLogEntity,
  mapUserVerificationStatusEntity,
  UserDbRow,
  UserProfileDbRow,
  UserAddressDbRow,
  DocumentProcessingLogDbRow,
  ConsentLogDbRow,
  UserVerificationStatusDbRow,
} from '../types';

export class UserRepository implements IRegistrationRepository {
  async createUser(userData: CreateUserData): Promise<UserEntity> {
    const result = await getPool().query<UserDbRow>(
      `INSERT INTO users (email, passwordhash, role, email_verified, terms_version, terms_accepted_at) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [userData.email, userData.passwordHash, userData.role ?? 'customer', false, userData.termsVersion, userData.termsAcceptedAt]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create user');
    }
    return mapUserEntity(result.rows[0]);
  }

  async createUserProfile(profileData: CreateUserProfileData): Promise<UserProfileEntity> {
    const result = await getPool().query<UserProfileDbRow>(
      `INSERT INTO user_profiles (user_id, title, first_name, last_name, birth_date, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *`,
      [profileData.userId, profileData.title, profileData.firstName, profileData.lastName, profileData.birthDate]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create user profile');
    }
    return mapUserProfileEntity(result.rows[0]);
  }

  async createUserAddress(addressData: CreateUserAddressData): Promise<UserAddressEntity> {
    const result = await getPool().query<UserAddressDbRow>(
      `INSERT INTO user_addresses 
       (user_id, countryId, postal_code, city, state, street, is_primary, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
      [
        addressData.userId, addressData.countryId, addressData.postalCode,
        addressData.city, addressData.state, addressData.street, addressData.isPrimary ?? true
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create user address');
    }
    return mapUserAddressEntity(result.rows[0]);
  }

  async logDocumentProcessing(documentData: CreateDocumentLogData): Promise<DocumentProcessingLogEntity> {
    const result = await getPool().query<DocumentProcessingLogDbRow>(
      `INSERT INTO document_processing_log 
       (user_id, original_filename, processing_status, extracted_fields, was_processed, processed_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *`,
      [
        documentData.userId, documentData.originalFilename, documentData.processingStatus,
        JSON.stringify(documentData.extractedFields), documentData.wasProcessed
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to log document processing');
    }
    return mapDocumentProcessingLogEntity(result.rows[0]);
  }

  async logConsent(consentData: CreateConsentLogData): Promise<ConsentLogEntity> {
    const result = await getPool().query<ConsentLogDbRow>(
      `INSERT INTO consent_log 
       (user_id, consent_type, consent_given, terms_version, consent_timestamp, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *`,
      [
        consentData.userId, consentData.consentType, consentData.consentGiven,
        consentData.termsVersion, consentData.consentTimestamp,
        consentData.ipAddress ?? null, consentData.userAgent ?? null
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to log consent');
    }
    return mapConsentLogEntity(result.rows[0]);
  }

  async createUserVerificationStatus(data: CreateVerificationStatusData): Promise<UserVerificationStatusEntity> {
    const result = await getPool().query<UserVerificationStatusDbRow>(
      `INSERT INTO user_verification_status 
       (user_id, email_verification_status, email_verification_token, email_verification_expires_at,
        identity_verification_status, created_at, updated_at)
       VALUES ($1, 'pending', $2, $3, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
      [data.userId, data.emailVerificationToken, data.emailVerificationExpiresAt]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create user verification status');
    }
    return mapUserVerificationStatusEntity(result.rows[0]);
  }

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    const result = await getPool().query<UserDbRow>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows.length > 0 ? mapUserEntity(result.rows[0]) : null;
  }

  async findUserProfileByUserId(userId: string): Promise<UserProfileEntity | null> {
    const result = await getPool().query<UserProfileDbRow>(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    return result.rows.length > 0 ? mapUserProfileEntity(result.rows[0]) : null;
  }

  async findUserAddressByUserId(userId: string): Promise<UserAddressEntity | null> {
    const result = await getPool().query<UserAddressDbRow>(
      'SELECT * FROM user_addresses WHERE user_id = $1 AND is_primary = true',
      [userId]
    );
    return result.rows.length > 0 ? mapUserAddressEntity(result.rows[0]) : null;
  }

  async executeTransaction<T>(callback: (client: unknown) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
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

  /**
   * Update email verification token (utility method for resend flow)
   */
  async updateEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await getPool().query(
      `UPDATE user_verification_status 
       SET email_verification_token = $1, email_verification_expires_at = $2, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3`,
      [token, expiresAt, userId]
    );
  }
}
