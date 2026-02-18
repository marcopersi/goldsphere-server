/**
 * Enhanced User Registration Integration Tests
 */

import request from 'supertest';
import { getPool } from '../../src/dbConfig';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

let app: any;

beforeAll(async () => {
  // Setup fresh test database BEFORE importing app
  await setupTestDatabase();
  
  // Import app AFTER database setup to ensure pool replacement takes effect  
  app = (await import('../../src/app')).default;
});

afterAll(async () => {
  // Clean up test database
  await teardownTestDatabase();
});

// Helper function to get a valid country ID for testing
const getCountryIdByCode = async (isoCode: string): Promise<string> => {
  const query = `SELECT id FROM country WHERE isocode2 = $1 LIMIT 1`;
  const result = await getPool().query(query, [isoCode]);
  if (result.rows.length === 0) {
    throw new Error(`Country with ISO code ${isoCode} not found in test database`);
  }
  return result.rows[0].id;
};

// Helper function to generate unique test data for each test
const generateValidRegistrationData = async () => {
  const uniqueId = Date.now() + Math.random().toString(36).substr(2, 9);
  const germanyCountryId = await getCountryIdByCode('DE');
  
  return {
    personalInfo: {
      title: 'Herr' as const,
      firstName: 'Max',
      lastName: 'Mustermann',
      birthDate: '1990-05-15',
      email: `test.user.${uniqueId}@test.example`,
      password: 'SecurePassword123!',
      phone: '+41791234567',
      gender: 'prefer_not_to_say' as const,
      preferredCurrency: 'CHF' as const,
      preferredPaymentMethod: 'bank_transfer' as const,
    },
    address: {
      countryId: germanyCountryId,
      postalCode: '10115',
      city: 'Berlin',
      state: 'Berlin',
      street: 'Musterstraße',
      houseNumber: '123',
      addressLine2: '3. OG',
      poBox: 'Postfach 12',
    },
    consent: {
      agreeToTerms: true,
      termsVersion: 'v2.1',
      consentTimestamp: new Date().toISOString(),
    },
    documentInfo: {
      originalFilename: 'passport.pdf',
      wasProcessed: true,
      extractedFields: {
        documentType: 'passport',
        documentNumber: 'P123456789',
      },
    },
  };
};

describe('Enhanced User Registration API', () => {
  describe('POST /api/auth/register', () => {
    describe('Successful Registration', () => {
      it('should register a new user with complete data', async () => {
        const testData = await generateValidRegistrationData();
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          user: {
            email: testData.personalInfo.email,
            role: 'customer',
            firstName: testData.personalInfo.firstName,
            lastName: testData.personalInfo.lastName,
            profile: {
              title: testData.personalInfo.title,
              firstName: testData.personalInfo.firstName,
              lastName: testData.personalInfo.lastName,
              phone: testData.personalInfo.phone,
              gender: testData.personalInfo.gender,
              preferredCurrency: testData.personalInfo.preferredCurrency,
              preferredPaymentMethod: testData.personalInfo.preferredPaymentMethod,
              address: {
                countryId: testData.address.countryId,
                postalCode: testData.address.postalCode,
                city: testData.address.city,
                state: testData.address.state,
                street: testData.address.street,
                houseNumber: testData.address.houseNumber,
                addressLine2: testData.address.addressLine2,
                poBox: testData.address.poBox,
              },
              verificationStatus: {
                email: 'pending',
                identity: 'pending',
              },
            },
          },
          token: expect.any(String),
          expiresIn: expect.any(Number),
          expiresAt: expect.any(String),
        });

        expect(response.body.user.id).toBeDefined();
        expect(response.body.expiresIn).toBeGreaterThan(0);
        expect(response.body.user.profile.birthDate).toMatch(/^1990-05-1[45]$/);
        expect(response.body.user.profile.createdAt).toBeDefined();
        expect(new Date(response.body.expiresAt)).toBeInstanceOf(Date);
      });

      it('should register without optional document info', async () => {
        const testData = await generateValidRegistrationData();
        delete (testData as any).documentInfo;

        const response = await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe(testData.personalInfo.email);
      });

      it('should register with null title', async () => {
        const testData = await generateValidRegistrationData();
        testData.personalInfo.title = null as any;

        const response = await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.user.profile.title).toBeNull();
      });

      it('should support autonomous register-login-logout flow', async () => {
        const testData = await generateValidRegistrationData();

        await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(201);

        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: testData.personalInfo.email,
            password: testData.personalInfo.password,
          })
          .expect(200);

        const token = loginResponse.body.data.accessToken;
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(20);

        const logoutResponse = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(logoutResponse.body).toHaveProperty('success', true);
        expect(logoutResponse.body).toHaveProperty('data.message', 'Logout successful');

        await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      });
    });

    describe('Validation Errors', () => {
      it('should reject invalid email format', async () => {
        const testData = await generateValidRegistrationData();
        testData.personalInfo.email = 'invalid-email';

        const response = await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('VALIDATION_ERROR');
        expect(Array.isArray(response.body.details?.fields)).toBe(true);
        expect(response.body.details.fields.length).toBeGreaterThan(0);
        expect(response.body.details.fields[0]).toHaveProperty('path');
        expect(response.body.details.fields[0]).toHaveProperty('message');
      });

      it('should reject weak password', async () => {
        const testData = await generateValidRegistrationData();
        testData.personalInfo.password = '123';

        const response = await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject missing required fields', async () => {
        const testData = await generateValidRegistrationData();
        (testData.personalInfo as any).email = undefined;

        const response = await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        // code field may be undefined if tsoa validation catches it first
      });

      it('should reject consent disagreement', async () => {
        const testData = await generateValidRegistrationData();
        testData.consent.agreeToTerms = false;

        const response = await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('Business Logic Errors', () => {
      it('should reject duplicate email registration', async () => {
        // First registration
        const testData1 = await generateValidRegistrationData();
        await request(app)
          .post('/api/auth/register')
          .send(testData1)
          .expect(201);

        // Attempt duplicate registration with same email
        const testData2 = await generateValidRegistrationData();
        testData2.personalInfo.email = testData1.personalInfo.email; // Same email
        testData2.personalInfo.firstName = 'Different';
        testData2.personalInfo.lastName = 'Person';

        const response = await request(app)
          .post('/api/auth/register')
          .send(testData2)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('EMAIL_ALREADY_EXISTS');
      });
    });

    describe('Security Features', () => {
      it('should hash the password (not stored in plain text)', async () => {
        const testData = await generateValidRegistrationData();
        const testEmail = testData.personalInfo.email;
        const testPassword = testData.personalInfo.password;

        await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(201);

        const userResult = await getPool().query('SELECT passwordhash FROM users WHERE email = $1', [testEmail]);
        const storedHash = userResult.rows[0].passwordhash;
        
        expect(storedHash).toBeDefined();
        expect(storedHash).not.toBe(testPassword);
        expect(storedHash.startsWith('$2b$')).toBe(true); // bcrypt hash format
      });

      it('should generate unique verification tokens', async () => {
        const testData1 = await generateValidRegistrationData();
        const testData2 = await generateValidRegistrationData();

        await request(app).post('/api/auth/register').send(testData1).expect(201);
        await request(app).post('/api/auth/register').send(testData2).expect(201);

        const tokens = await getPool().query('SELECT email_verification_token FROM user_verification_status');
        const tokenValues = tokens.rows
          .map((row: any) => row.email_verification_token)
          .filter((token: unknown): token is string => typeof token === 'string' && token.trim().length > 0);
        const tokenSet = new Set(tokenValues);

        expect(tokenSet.size).toBe(tokenValues.length); // All non-null tokens should be unique
      });
    });

    describe('Response Format', () => {
      it('should return JWT token with proper structure', async () => {
        const testData = await generateValidRegistrationData();
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(201);

        expect(response.body.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/); // JWT format

        const tokenParts = response.body.token.split('.');
        expect(tokenParts).toHaveLength(3);
      });
    });
  });

  describe('GET /api/auth/register/check-email/:email', () => {
    it('should return exists=false for new email', async () => {
      const response = await request(app)
        .get('/api/auth/register/check-email/new@test.example')
        .expect(200);

      expect(response.body).toEqual({ exists: false });
    });

    it('should return exists=true for registered email', async () => {
      // Register a user first
      const testData = await generateValidRegistrationData();
      await request(app)
        .post('/api/auth/register')
        .send(testData)
        .expect(201);

      const response = await request(app)
        .get(`/api/auth/register/check-email/${encodeURIComponent(testData.personalInfo.email)}`)
        .expect(200);

      expect(response.body).toEqual({ exists: true });
    });

    it('should handle URL-encoded email addresses', async () => {
      const emailWithSpecialChars = 'test+user@test.example';
      
      const response = await request(app)
        .get(`/api/auth/register/check-email/${encodeURIComponent(emailWithSpecialChars)}`)
        .expect(200);

      expect(response.body).toEqual({ exists: false });
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .get('/api/auth/register/check-email/invalid-email')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_EMAIL_FORMAT');
    });
  });

  describe('POST /api/auth/register/resend-verification', () => {
    it('should always return success for security', async () => {
      const response = await request(app)
        .post('/api/auth/register/resend-verification')
        .send({ email: 'nonexistent@test.example' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verification email has been sent');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register/resend-verification')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_EMAIL');
    });

    it('should update verification token for existing user', async () => {
      // Register a user first
      const testData = await generateValidRegistrationData();

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(testData)
        .expect(201);

      // Get original token
      const originalTokenResult = await getPool().query(
        `SELECT u.email_verification_token 
         FROM user_verification_status u 
         JOIN users usr ON u.user_id = usr.id 
         WHERE usr.email = $1`,
        [testData.personalInfo.email]
      );
      const originalToken = originalTokenResult.rows[0].email_verification_token;

      // Request resend
      await request(app)
        .post('/api/auth/register/resend-verification')
        .send({ email: testData.personalInfo.email })
        .expect(200);

      // Get new token
      const newTokenResult = await getPool().query(
        `SELECT u.email_verification_token 
         FROM user_verification_status u 
         JOIN users usr ON u.user_id = usr.id 
         WHERE usr.email = $1`,
        [testData.personalInfo.email]
      );
      const newToken = newTokenResult.rows[0].email_verification_token;

      // Tokens should be different
      expect(newToken).not.toBe(originalToken);
    });
  });
});
