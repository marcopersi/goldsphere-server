/**
 * User Repository Mock Implementation
 * 
 * In-memory implementation for testing without database dependency.
 * Implements IRegistrationRepository for registration service testing.
 */

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
  UserTitle,
  EmailVerificationStatus,
  IdentityVerificationStatus,
  UserRole,
} from '../types';

export class UserRepositoryMock implements IRegistrationRepository {
  private users: Map<string, UserEntity> = new Map();
  private profiles: Map<string, UserProfileEntity> = new Map();
  private addresses: Map<string, UserAddressEntity> = new Map();
  private verificationStatuses: Map<string, UserVerificationStatusEntity> = new Map();
  private documentLogs: DocumentProcessingLogEntity[] = [];
  private consentLogs: ConsentLogEntity[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const now = new Date();
    const user1: UserEntity = {
      id: 'user-001',
      email: 'test@example.com',
      passwordHash: '$2b$10$hashedpassword',
      role: UserRole.CUSTOMER,
      emailVerified: true,
      identityVerified: false,
      termsVersion: '1.0',
      termsAcceptedAt: new Date('2024-01-01'),
      lastLogin: new Date('2024-12-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-12-01'),
      createdBy: null,
      updatedBy: null,
    };

    const profile1: UserProfileEntity = {
      id: 'profile-001',
      userId: 'user-001',
      title: UserTitle.HERR,
      firstName: 'Max',
      lastName: 'Mustermann',
      birthDate: new Date('1990-01-01'),
      createdAt: now,
      updatedAt: now,
    };

    const address1: UserAddressEntity = {
      id: 'address-001',
      userId: 'user-001',
      countryId: 'country-ch',
      postalCode: '8001',
      city: 'Zürich',
      state: 'Zürich',
      street: 'Bahnhofstrasse 1',
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user1.id, user1);
    this.profiles.set(profile1.userId, profile1);
    this.addresses.set(address1.userId, address1);
  }

  async createUser(userData: CreateUserData): Promise<UserEntity> {
    const id = `user-${Date.now()}`;
    const now = new Date();

    const user: UserEntity = {
      id,
      email: userData.email,
      passwordHash: userData.passwordHash,
      role: userData.role ?? UserRole.CUSTOMER,
      emailVerified: false,
      identityVerified: false,
      termsVersion: userData.termsVersion ?? null,
      termsAcceptedAt: userData.termsAcceptedAt ?? null,
      lastLogin: null,
      createdAt: now,
      updatedAt: now,
      createdBy: null,
      updatedBy: null,
    };

    this.users.set(id, user);
    return user;
  }

  async createUserProfile(profileData: CreateUserProfileData): Promise<UserProfileEntity> {
    const id = `profile-${Date.now()}`;
    const now = new Date();

    const profile: UserProfileEntity = {
      id,
      userId: profileData.userId,
      title: profileData.title,
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      birthDate: profileData.birthDate,
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(profileData.userId, profile);
    return profile;
  }

  async createUserAddress(addressData: CreateUserAddressData): Promise<UserAddressEntity> {
    const id = `address-${Date.now()}`;
    const now = new Date();

    const address: UserAddressEntity = {
      id,
      userId: addressData.userId,
      countryId: addressData.countryId,
      postalCode: addressData.postalCode,
      city: addressData.city,
      state: addressData.state,
      street: addressData.street,
      isPrimary: addressData.isPrimary ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.addresses.set(addressData.userId, address);
    return address;
  }

  async logDocumentProcessing(documentData: CreateDocumentLogData): Promise<DocumentProcessingLogEntity> {
    const log: DocumentProcessingLogEntity = {
      id: `doc-log-${Date.now()}`,
      userId: documentData.userId,
      originalFilename: documentData.originalFilename,
      processingStatus: documentData.processingStatus,
      extractedFields: documentData.extractedFields,
      wasProcessed: documentData.wasProcessed,
      processedAt: new Date(),
    };

    this.documentLogs.push(log);
    return log;
  }

  async logConsent(consentData: CreateConsentLogData): Promise<ConsentLogEntity> {
    const log: ConsentLogEntity = {
      id: `consent-log-${Date.now()}`,
      userId: consentData.userId,
      consentType: consentData.consentType,
      consentGiven: consentData.consentGiven,
      termsVersion: consentData.termsVersion,
      consentTimestamp: consentData.consentTimestamp,
      ipAddress: consentData.ipAddress ?? null,
      userAgent: consentData.userAgent ?? null,
      createdAt: new Date(),
    };

    this.consentLogs.push(log);
    return log;
  }

  async createUserVerificationStatus(data: CreateVerificationStatusData): Promise<UserVerificationStatusEntity> {
    const status: UserVerificationStatusEntity = {
      id: `verification-${Date.now()}`,
      userId: data.userId,
      emailVerificationStatus: EmailVerificationStatus.PENDING,
      emailVerificationToken: data.emailVerificationToken,
      emailVerificationExpiresAt: data.emailVerificationExpiresAt,
      identityVerificationStatus: IdentityVerificationStatus.PENDING,
      identityVerificationNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.verificationStatuses.set(data.userId, status);
    return status;
  }

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async findUserProfileByUserId(userId: string): Promise<UserProfileEntity | null> {
    return this.profiles.get(userId) ?? null;
  }

  async findUserAddressByUserId(userId: string): Promise<UserAddressEntity | null> {
    return this.addresses.get(userId) ?? null;
  }

  async executeTransaction<T>(callback: (client: unknown) => Promise<T>): Promise<T> {
    return callback(null);
  }

  // Test helper methods
  clear(): void {
    this.users.clear();
    this.profiles.clear();
    this.addresses.clear();
    this.verificationStatuses.clear();
    this.documentLogs = [];
    this.consentLogs = [];
  }

  getAllUsers(): UserEntity[] {
    return Array.from(this.users.values());
  }

  reset(): void {
    this.clear();
    this.initializeMockData();
  }
}
