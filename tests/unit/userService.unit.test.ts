/**
 * Unit Tests for UserServiceImpl
 * 
 * Tests CRUD operations, validation, and password hashing
 * using mock repository for isolation.
 */

const MOCK_PASSWORD = 'SecurePass123';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async () => '$2b$10$mockedhash'),
  compare: jest.fn(async (password: string) => password === MOCK_PASSWORD),
}));

import { UserServiceImpl } from '../../src/services/user/service/UserServiceImpl';
import { 
  IUserRepository,
  UserEntity,
  UserProfileEntity,
  UserAddressEntity,
  UserVerificationStatusEntity,
  CreateUserData,
  UpdateUserData,
  UpdateUserProfileData,
  ListUsersOptions,
  GetUsersResult,
  UserRole,
  UserTitle,
  EmailVerificationStatus,
  IdentityVerificationStatus,
  AccountStatus,
  UserErrorCode,
} from '../../src/services/user';

// Mock repository for testing
class UserRepositoryMock implements IUserRepository {
  private users: Map<string, UserEntity> = new Map();
  private profiles: Map<string, UserProfileEntity> = new Map();
  private addresses: Map<string, UserAddressEntity> = new Map();
  private verificationStatuses: Map<string, UserVerificationStatusEntity> = new Map();

  constructor() {
    this.seedTestData();
  }

  private seedTestData(): void {
    const existingUser: UserEntity = {
      id: 'existing-user-id',
      email: 'existing@example.com',
      passwordHash: '$2b$10$hashedpassword123',
      role: UserRole.CUSTOMER,
      emailVerified: true,
      identityVerified: false,
      termsVersion: '1.0',
      termsAcceptedAt: new Date(),
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      updatedBy: null,
      accountStatus: AccountStatus.ACTIVE,
      blockedAt: null,
      blockedBy: null,
      blockReason: null,
      phoneNumber: null,
      gender: null,
      preferredCurrencyId: null,
      preferredLanguage: null,
    };
    this.users.set(existingUser.id, existingUser);

    const profile: UserProfileEntity = {
      id: 'profile-1',
      userId: 'existing-user-id',
      title: UserTitle.HERR,
      firstName: 'Max',
      lastName: 'Mustermann',
      birthDate: new Date('1990-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.profiles.set(profile.userId, profile);
  }

  async createUser(userData: CreateUserData): Promise<UserEntity> {
    const id = `user-${Date.now()}`;
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
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      updatedBy: null,
      accountStatus: AccountStatus.ACTIVE,
      blockedAt: null,
      blockedBy: null,
      blockReason: null,
      phoneNumber: null,
      gender: null,
      preferredCurrencyId: null,
      preferredLanguage: null,
    };
    this.users.set(id, user);
    return user;
  }

  async findUserById(id: string): Promise<UserEntity | null> {
    return this.users.get(id) ?? null;
  }

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async getUsers(options: ListUsersOptions): Promise<GetUsersResult> {
    let users = Array.from(this.users.values());
    
    if (options.search) {
      users = users.filter(u => u.email.includes(options.search!));
    }
    if (options.role) {
      users = users.filter(u => u.role === options.role);
    }

    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const totalCount = users.length;
    const start = (page - 1) * limit;
    const paginatedUsers = users.slice(start, start + limit);

    return {
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async updateUser(id: string, data: UpdateUserData): Promise<UserEntity | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const updated: UserEntity = {
      ...user,
      ...data,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        if (excludeUserId && user.id === excludeUserId) continue;
        return true;
      }
    }
    return false;
  }

  async blockUser(userId: string, blockedBy: string, reason: string): Promise<UserEntity | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const blocked: UserEntity = {
      ...user,
      accountStatus: AccountStatus.BLOCKED,
      blockedAt: new Date(),
      blockedBy,
      blockReason: reason,
      updatedAt: new Date(),
    };
    this.users.set(userId, blocked);
    return blocked;
  }

  async unblockUser(userId: string): Promise<UserEntity | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const unblocked: UserEntity = {
      ...user,
      accountStatus: AccountStatus.ACTIVE,
      blockedAt: null,
      blockedBy: null,
      blockReason: null,
      updatedAt: new Date(),
    };
    this.users.set(userId, unblocked);
    return unblocked;
  }

  async softDeleteUser(userId: string): Promise<UserEntity | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const deleted: UserEntity = {
      ...user,
      accountStatus: AccountStatus.DELETED,
      updatedAt: new Date(),
    };
    this.users.set(userId, deleted);
    return deleted;
  }

  async findBlockedUsers(): Promise<UserEntity[]> {
    return Array.from(this.users.values()).filter(
      user => user.accountStatus === AccountStatus.BLOCKED || 
              user.accountStatus === AccountStatus.SUSPENDED
    );
  }

  async findUserProfileByUserId(userId: string): Promise<UserProfileEntity | null> {
    return this.profiles.get(userId) ?? null;
  }

  async updateUserProfile(userId: string, data: UpdateUserProfileData): Promise<UserProfileEntity | null> {
    const profile = this.profiles.get(userId);
    if (!profile) return null;

    const updated: UserProfileEntity = {
      ...profile,
      ...data,
      updatedAt: new Date(),
    };
    this.profiles.set(userId, updated);
    return updated;
  }

  async findUserAddressByUserId(userId: string): Promise<UserAddressEntity | null> {
    return this.addresses.get(userId) ?? null;
  }

  async findVerificationStatusByUserId(userId: string): Promise<UserVerificationStatusEntity | null> {
    return this.verificationStatuses.get(userId) ?? null;
  }

  async hasOrders(userId: string): Promise<boolean> {
    return false; // No orders in test
  }

  async hasPortfolios(userId: string): Promise<boolean> {
    return false; // No portfolios in test
  }

  // Stub methods for interface compliance
  async createUserProfile(): Promise<UserProfileEntity> { throw new Error('Not implemented'); }
  async createUserAddress(): Promise<UserAddressEntity> { throw new Error('Not implemented'); }
  async findUserAddressesByUserId(): Promise<UserAddressEntity[]> { return []; }
  async createUserVerificationStatus(): Promise<UserVerificationStatusEntity> { throw new Error('Not implemented'); }
  async updateVerificationStatus(): Promise<void> {}
  async logDocumentProcessing(): Promise<any> { throw new Error('Not implemented'); }
  async logConsent(): Promise<any> { throw new Error('Not implemented'); }
  async executeTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    return callback(null);
  }
}

describe('UserServiceImpl Unit Tests', () => {
  let service: UserServiceImpl;
  let mockRepo: UserRepositoryMock;

  beforeEach(() => {
    mockRepo = new UserRepositoryMock();
    service = new UserServiceImpl(mockRepo);
  });

  describe('createUser()', () => {
    it('should create a new user with valid data', async () => {
      const result = await service.createUser({
        email: 'newuser@example.com',
        password: 'SecurePass123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.email).toBe('newuser@example.com');
      expect(result.data!.role).toBe(UserRole.CUSTOMER);
    });

    it('should hash the password', async () => {
      const result = await service.createUser({
        email: 'hashtest@example.com',
        password: 'SecurePass123',
      });

      expect(result.success).toBe(true);
      // Password hash should not equal plain password
      expect(result.data!.passwordHash).not.toBe('SecurePass123');
      expect(result.data!.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it('should reject duplicate email', async () => {
      const result = await service.createUser({
        email: 'existing@example.com',
        password: 'SecurePass123',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(UserErrorCode.EMAIL_ALREADY_EXISTS);
    });

    it('should reject invalid email format', async () => {
      const result = await service.createUser({
        email: 'not-an-email',
        password: 'SecurePass123',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(UserErrorCode.INVALID_EMAIL_FORMAT);
    });

    it('should reject weak password (too short)', async () => {
      const result = await service.createUser({
        email: 'test@example.com',
        password: 'Short1',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(UserErrorCode.INVALID_PASSWORD);
    });

    it('should reject password without letters', async () => {
      const result = await service.createUser({
        email: 'test@example.com',
        password: '12345678',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(UserErrorCode.INVALID_PASSWORD);
    });

    it('should reject password without numbers', async () => {
      const result = await service.createUser({
        email: 'test@example.com',
        password: 'NoNumbers',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(UserErrorCode.INVALID_PASSWORD);
    });

    it('should create user with custom role', async () => {
      const result = await service.createUser({
        email: 'admin@example.com',
        password: 'SecurePass123',
        role: UserRole.ADMIN,
      });

      expect(result.success).toBe(true);
      expect(result.data!.role).toBe(UserRole.ADMIN);
    });
  });

  describe('getUserById()', () => {
    it('should return user by ID', async () => {
      const result = await service.getUserById('existing-user-id');

      expect(result.success).toBe(true);
      expect(result.data!.id).toBe('existing-user-id');
      expect(result.data!.email).toBe('existing@example.com');
    });

    it('should return error for non-existent user', async () => {
      const result = await service.getUserById('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(UserErrorCode.USER_NOT_FOUND);
    });
  });

  describe('getUserByEmail()', () => {
    it('should find user by email (case insensitive)', async () => {
      const result = await service.getUserByEmail('EXISTING@EXAMPLE.COM');

      expect(result.success).toBe(true);
      expect(result.data!.email).toBe('existing@example.com');
    });

    it('should return error for non-existent email', async () => {
      const result = await service.getUserByEmail('notfound@example.com');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(UserErrorCode.USER_NOT_FOUND);
    });
  });

  describe('getUserWithDetails()', () => {
    it('should return user with profile', async () => {
      const result = await service.getUserWithDetails('existing-user-id');

      expect(result.success).toBe(true);
      expect(result.data!.user.id).toBe('existing-user-id');
      expect(result.data!.profile).not.toBeNull();
      expect(result.data!.profile!.firstName).toBe('Max');
    });

    it('should return error for non-existent user', async () => {
      const result = await service.getUserWithDetails('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(UserErrorCode.USER_NOT_FOUND);
    });
  });

  describe('getUsers()', () => {
    it('should list users with default pagination', async () => {
      const result = await service.getUsers({});

      expect(result.success).toBe(true);
      expect(result.data!.users.length).toBeGreaterThan(0);
      expect(result.data!.pagination.page).toBe(1);
    });

    it('should filter users by role', async () => {
      const result = await service.getUsers({ role: UserRole.CUSTOMER });

      expect(result.success).toBe(true);
      result.data!.users.forEach(user => {
        expect(user.role).toBe(UserRole.CUSTOMER);
      });
    });
  });

  describe('updateUser()', () => {
    it('should update user email', async () => {
      const result = await service.updateUser('existing-user-id', {
        email: 'updated@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.data!.email).toBe('updated@example.com');
    });

    it('should reject duplicate email on update', async () => {
      // First create another user
      await service.createUser({
        email: 'another@example.com',
        password: 'SecurePass123',
      });

      // Try to update existing user to use same email
      const result = await service.updateUser('existing-user-id', {
        email: 'another@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(UserErrorCode.EMAIL_ALREADY_EXISTS);
    });

    it('should return error for non-existent user', async () => {
      const result = await service.updateUser('non-existent-id', {
        email: 'new@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(UserErrorCode.USER_NOT_FOUND);
    });
  });

  describe('deleteUser()', () => {
    it('should delete user without dependencies', async () => {
      const result = await service.deleteUser('existing-user-id');

      expect(result.success).toBe(true);
    });

    it('should return error for non-existent user', async () => {
      const result = await service.deleteUser('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(UserErrorCode.USER_NOT_FOUND);
    });
  });

  describe('validateCredentials()', () => {
    it('should validate correct credentials', async () => {
      // First create a user with known password
      await service.createUser({
        email: 'login@example.com',
        password: 'SecurePass123',
      });

      const result = await service.validateCredentials('login@example.com', 'SecurePass123');

      expect(result.success).toBe(true);
      expect(result.data!.email).toBe('login@example.com');
    });

    it('should reject wrong password', async () => {
      await service.createUser({
        email: 'wrongpass@example.com',
        password: 'SecurePass123',
      });

      const result = await service.validateCredentials('wrongpass@example.com', 'WrongPassword1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(UserErrorCode.UNAUTHORIZED);
    });

    it('should reject non-existent email', async () => {
      const result = await service.validateCredentials('notfound@example.com', 'AnyPass123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(UserErrorCode.UNAUTHORIZED);
    });
  });

  describe('isEmailAvailable()', () => {
    it('should return false for existing email', async () => {
      const available = await service.isEmailAvailable('existing@example.com');
      expect(available).toBe(false);
    });

    it('should return true for new email', async () => {
      const available = await service.isEmailAvailable('new@example.com');
      expect(available).toBe(true);
    });

    it('should exclude specified user ID', async () => {
      const available = await service.isEmailAvailable('existing@example.com', 'existing-user-id');
      expect(available).toBe(true);
    });
  });

  describe('validateEmailFormat()', () => {
    it('should accept valid emails', () => {
      expect(service.validateEmailFormat('test@example.com')).toBe(true);
      expect(service.validateEmailFormat('user.name@domain.co.uk')).toBe(true);
      expect(service.validateEmailFormat('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(service.validateEmailFormat('not-an-email')).toBe(false);
      expect(service.validateEmailFormat('@nodomain.com')).toBe(false);
      expect(service.validateEmailFormat('missing@')).toBe(false);
      expect(service.validateEmailFormat('')).toBe(false);
    });
  });

  describe('validatePassword()', () => {
    it('should accept strong passwords', () => {
      expect(service.validatePassword('SecurePass123').valid).toBe(true);
      expect(service.validatePassword('MyP@ssw0rd!').valid).toBe(true);
    });

    it('should reject short passwords', () => {
      const result = service.validatePassword('Short1');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('8 characters');
    });

    it('should reject passwords without letters', () => {
      const result = service.validatePassword('12345678');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('letter');
    });

    it('should reject passwords without numbers', () => {
      const result = service.validatePassword('NoNumbers');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('number');
    });
  });
});
