/**
 * Auth Service Unit Tests
 */

import bcrypt from 'bcrypt';
import { AuthServiceImpl } from '../../src/services/auth/impl/AuthServiceImpl';
import { AuthRepositoryMock } from '../../src/services/auth/mock/AuthRepositoryMock';
import { AuthUserRecord, AuthErrorCode } from '../../src/services/auth/types';

describe('AuthService', () => {
  let authService: AuthServiceImpl;
  let mockRepository: AuthRepositoryMock;
  const testSecret = 'test-jwt-secret';
  const testPassword = 'SecurePassword123';
  let hashedPassword: string;
  let compareSpy: jest.SpiedFunction<typeof bcrypt.compare>;

  const createTestUser = async (overrides: Partial<AuthUserRecord> = {}): Promise<AuthUserRecord> => {
    return {
      id: 'user-123',
      email: 'test@goldsphere.vault',
      passwordHash: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      status: 'active',
      ...overrides,
    };
  };

  beforeAll(() => {
    hashedPassword = bcrypt.hashSync(testPassword, 10);
    compareSpy = jest.spyOn(bcrypt, 'compare').mockImplementation(async (password, hash) => {
      return password === testPassword && hash === hashedPassword;
    });
  });

  afterAll(() => {
    compareSpy.mockRestore();
  });

  beforeEach(() => {
    mockRepository = new AuthRepositoryMock();
    authService = new AuthServiceImpl(mockRepository, testSecret, '1h');
  });

  afterEach(() => {
    mockRepository.clear();
  });

  describe('login', () => {
    it('should return success with canonical session payload for valid credentials', async () => {
      const testUser = await createTestUser();
      mockRepository.addUser(testUser);

      const result = await authService.login({
        email: 'test@goldsphere.vault',
        password: testPassword,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.data.accessToken).toBeDefined();
      expect(result.data!.data.tokenType).toBe('Bearer');
      expect(typeof result.data!.data.expiresIn).toBe('number');
      expect(typeof result.data!.data.expiresAt).toBe('string');
      expect(result.data!.data.user.email).toBe('test@goldsphere.vault');
      expect(result.data!.data.user.firstName).toBe('Test');
      expect(result.data!.data.user.lastName).toBe('User');
      expect(result.data!.data.user.role).toBe('user');
    });

    it('should update last login timestamp on successful login', async () => {
      const testUser = await createTestUser();
      mockRepository.addUser(testUser);

      await authService.login({
        email: 'test@goldsphere.vault',
        password: testPassword,
      });

      const lastLoginUpdate = mockRepository.getLastLoginUpdate('user-123');
      expect(lastLoginUpdate).toBeDefined();
    });

    it('should return error for non-existent user', async () => {
      const result = await authService.login({
        email: 'nonexistent@goldsphere.vault',
        password: testPassword,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    });

    it('should return error for wrong password', async () => {
      const testUser = await createTestUser();
      mockRepository.addUser(testUser);

      const result = await authService.login({
        email: 'test@goldsphere.vault',
        password: 'wrong-password',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    });

    it('should return error for inactive account', async () => {
      const testUser = await createTestUser({ status: 'inactive' });
      mockRepository.addUser(testUser);

      const result = await authService.login({
        email: 'test@goldsphere.vault',
        password: testPassword,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AuthErrorCode.USER_INACTIVE);
    });

    it('should return error for missing email', async () => {
      const result = await authService.login({
        email: '',
        password: testPassword,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    });

    it('should return error for missing password', async () => {
      const result = await authService.login({
        email: 'test@goldsphere.vault',
        password: '',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    });

    it('should keep persisted admin role', async () => {
      const adminUser = await createTestUser({
        email: 'admin@goldsphere.vault',
        role: 'admin',
      });
      mockRepository.addUser(adminUser);

      const result = await authService.login({
        email: 'admin@goldsphere.vault',
        password: testPassword,
      });

      expect(result.success).toBe(true);
      expect(result.data!.data.user.role).toBe('admin');
    });

    it('should return internal error when required names are missing', async () => {
      const namelessUser = await createTestUser({
        firstName: '',
        lastName: '   ',
      });
      mockRepository.addUser(namelessUser);

      const result = await authService.login({
        email: 'test@goldsphere.vault',
        password: testPassword,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AuthErrorCode.INTERNAL_ERROR);
      expect(result.error?.message).toBe('Internal server error');
    });
  });

  describe('validateToken', () => {
    it('should return payload for valid token', async () => {
      const testUser = await createTestUser();
      mockRepository.addUser(testUser);

      const loginResult = await authService.login({
        email: 'test@goldsphere.vault',
        password: testPassword,
      });

      const token = loginResult.data!.data.accessToken;
      const result = await authService.validateToken(token);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.email).toBe('test@goldsphere.vault');
    });

    it('should return error for invalid token', async () => {
      const result = await authService.validateToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AuthErrorCode.TOKEN_INVALID);
    });

    it('should return error for expired token', async () => {
      // Create service with short expiry (JWT expiration works at second precision)
      const shortExpiryService = new AuthServiceImpl(mockRepository, testSecret, '1s');
      const testUser = await createTestUser();
      mockRepository.addUser(testUser);

      const loginResult = await shortExpiryService.login({
        email: 'test@goldsphere.vault',
        password: testPassword,
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.data).toBeDefined();

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const result = await shortExpiryService.validateToken(loginResult.data!.data.accessToken);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AuthErrorCode.TOKEN_EXPIRED);
    });

    it('should return internal error when revocation lookup fails', async () => {
      const testUser = await createTestUser();
      mockRepository.addUser(testUser);

      const loginResult = await authService.login({
        email: 'test@goldsphere.vault',
        password: testPassword,
      });

      const token = loginResult.data!.data.accessToken;
      jest
        .spyOn(mockRepository, 'isTokenRevoked')
        .mockRejectedValueOnce(new Error('relation "auth_revoked_tokens" does not exist'));

      const result = await authService.validateToken(token);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AuthErrorCode.INTERNAL_ERROR);
      expect(result.error?.message).toContain('Failed to validate token revocation state');
    });
  });

  describe('refreshToken', () => {
    it('should return new token for valid token', async () => {
      const testUser = await createTestUser();
      mockRepository.addUser(testUser);

      const loginResult = await authService.login({
        email: 'test@goldsphere.vault',
        password: testPassword,
      });

      const originalToken = loginResult.data!.data.accessToken;
      
      // Wait a bit to ensure different iat timestamp
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result = await authService.refreshToken(originalToken);

      expect(result.success).toBe(true);
      expect(result.data!.data.accessToken).toBeDefined();
      expect(result.data!.data.accessToken).not.toBe(originalToken);
    });

    it('should return error if user is no longer active', async () => {
      const testUser = await createTestUser();
      mockRepository.addUser(testUser);

      const loginResult = await authService.login({
        email: 'test@goldsphere.vault',
        password: testPassword,
      });

      // Deactivate user after login
      mockRepository.removeUser('test@goldsphere.vault');
      mockRepository.addUser({ ...testUser, status: 'inactive' });

      const result = await authService.refreshToken(loginResult.data!.data.accessToken);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AuthErrorCode.USER_INACTIVE);
    });

    it('should return error for invalid token', async () => {
      const result = await authService.refreshToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AuthErrorCode.TOKEN_INVALID);
    });
  });

  describe('getCurrentUser', () => {
    it('should return user info for valid token', async () => {
      const testUser = await createTestUser();
      mockRepository.addUser(testUser);

      const loginResult = await authService.login({
        email: 'test@goldsphere.vault',
        password: testPassword,
      });

      const result = await authService.getCurrentUser(loginResult.data!.data.accessToken);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe('user-123');
      expect(result.data!.email).toBe('test@goldsphere.vault');
      expect(result.data!.firstName).toBe('Test');
      expect(result.data!.lastName).toBe('User');
      expect(result.data!.role).toBe('user');
    });

    it('should return error for invalid token', async () => {
      const result = await authService.getCurrentUser('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AuthErrorCode.TOKEN_INVALID);
    });
  });

  describe('logout', () => {
    it('should revoke token and return success', async () => {
      const testUser = await createTestUser();
      mockRepository.addUser(testUser);

      const loginResult = await authService.login({
        email: 'test@goldsphere.vault',
        password: testPassword,
      });

      const token = loginResult.data!.data.accessToken;
      const logoutResult = await authService.logout(token);

      expect(logoutResult.success).toBe(true);
      expect(logoutResult.data?.message).toBe('Logout successful');

      const validateAfterLogout = await authService.validateToken(token);
      expect(validateAfterLogout.success).toBe(false);
      expect(validateAfterLogout.error?.code).toBe(AuthErrorCode.TOKEN_INVALID);
    });

    it('should return error for invalid token logout', async () => {
      const result = await authService.logout('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AuthErrorCode.TOKEN_INVALID);
    });
  });
});
