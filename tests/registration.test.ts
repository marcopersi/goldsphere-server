/**
 * Enhanced User Registration Integration Tests
 * 
 * Comprehensive test suite covering all registration scenarios,
 * error conditions, and business logic validation.
 */

import request from 'supertest';
import app from '../src/app';
import pool from '../src/dbConfig';

// Shared test data
const validRegistrationData = {
  personalInfo: {
    title: 'Herr' as const,
    firstName: 'Max',
    lastName: 'Mustermann',
    birthDate: '1990-05-15',
    email: 'max.mustermann@test.example',
    password: 'SecurePassword123!',
  },
  address: {
    country: 'DE',
    postalCode: '10115',
    city: 'Berlin',
    state: 'Berlin',
    street: 'Musterstraße 123',
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

describe('Enhanced User Registration API', () => {
  beforeAll(async () => {
    // Ensure test database is clean
    await cleanupTestData();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await pool.end();
  });

  describe('POST /api/auth/register', () => {
    describe('Successful Registration', () => {
      it('should register a new user with complete data', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send(validRegistrationData)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          user: {
            email: validRegistrationData.personalInfo.email,
            role: 'customer',
            profile: {
              title: validRegistrationData.personalInfo.title,
              firstName: validRegistrationData.personalInfo.firstName,
              lastName: validRegistrationData.personalInfo.lastName,
              birthDate: validRegistrationData.personalInfo.birthDate,
              address: {
                country: validRegistrationData.address.country,
                postalCode: validRegistrationData.address.postalCode,
                city: validRegistrationData.address.city,
                state: validRegistrationData.address.state,
                street: validRegistrationData.address.street,
              },
              verificationStatus: {
                email: 'pending',
                identity: 'pending',
              },
            },
          },
          token: expect.any(String),
          expiresAt: expect.any(String),
        });

        expect(response.body.user.id).toBeDefined();
        expect(response.body.user.profile.createdAt).toBeDefined();
        expect(new Date(response.body.expiresAt)).toBeInstanceOf(Date);
      });

      it('should register without optional document info', async () => {
        const registrationDataWithoutDoc = {
          ...validRegistrationData,
          personalInfo: {
            ...validRegistrationData.personalInfo,
            email: 'no.doc@test.example',
          },
        };
        delete (registrationDataWithoutDoc as any).documentInfo;

        const response = await request(app)
          .post('/api/auth/register')
          .send(registrationDataWithoutDoc)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe('no.doc@test.example');
      });

      it('should register with null title', async () => {
        const registrationDataNullTitle = {
          ...validRegistrationData,
          personalInfo: {
            ...validRegistrationData.personalInfo,
            title: null,
            email: 'null.title@test.example',
          },
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(registrationDataNullTitle)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.user.profile.title).toBeNull();
      });

      it('should create all related database records', async () => {
        const testEmail = 'db.records@test.example';
        const testData = {
          ...validRegistrationData,
          personalInfo: {
            ...validRegistrationData.personalInfo,
            email: testEmail,
          },
        };

        await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(201);

        // Verify user record
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [testEmail]);
        expect(userResult.rows).toHaveLength(1);
        const user = userResult.rows[0];
        expect(user.email).toBe(testEmail);
        expect(user.role).toBe('customer');
        expect(user.termsacceptedat).toBeDefined();

        // Verify user profile
        const profileResult = await pool.query('SELECT * FROM user_profiles WHERE userid = $1', [user.id]);
        expect(profileResult.rows).toHaveLength(1);
        const profile = profileResult.rows[0];
        expect(profile.firstname).toBe(testData.personalInfo.firstName);
        expect(profile.lastname).toBe(testData.personalInfo.lastName);

        // Verify user address
        const addressResult = await pool.query('SELECT * FROM user_addresses WHERE userid = $1', [user.id]);
        expect(addressResult.rows).toHaveLength(1);
        const address = addressResult.rows[0];
        expect(address.country).toBe(testData.address.country);
        expect(address.isprimary).toBe(true);

        // Verify document processing log
        const docLogResult = await pool.query('SELECT * FROM document_processing_log WHERE userid = $1', [user.id]);
        expect(docLogResult.rows).toHaveLength(1);
        const docLog = docLogResult.rows[0];
        expect(docLog.originalfilename).toBe(testData.documentInfo!.originalFilename);
        expect(docLog.wasprocessed).toBe(true);

        // Verify consent log
        const consentResult = await pool.query('SELECT * FROM consent_log WHERE userid = $1', [user.id]);
        expect(consentResult.rows).toHaveLength(1);
        const consent = consentResult.rows[0];
        expect(consent.consenttype).toBe('terms_and_conditions');
        expect(consent.consentgiven).toBe(true);

        // Verify verification status
        const verificationResult = await pool.query('SELECT * FROM user_verification_status WHERE userid = $1', [user.id]);
        expect(verificationResult.rows).toHaveLength(1);
        const verification = verificationResult.rows[0];
        expect(verification.emailverificationtoken).toBeDefined();
        expect(verification.emailverificationexpiresat).toBeDefined();
      });
    });

    describe('Validation Errors', () => {
      it('should reject invalid email format', async () => {
        const invalidEmailData = {
          ...validRegistrationData,
          personalInfo: {
            ...validRegistrationData.personalInfo,
            email: 'invalid-email',
          },
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidEmailData)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: {
            validationErrors: expect.arrayContaining([
              expect.objectContaining({
                field: expect.stringContaining('email'),
                code: 'VALIDATION_ERROR',
              }),
            ]),
          },
        });
      });

      it('should reject weak password', async () => {
        const weakPasswordData = {
          ...validRegistrationData,
          personalInfo: {
            ...validRegistrationData.personalInfo,
            password: '123',
            email: 'weak.password@test.example',
          },
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(weakPasswordData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject invalid birth date', async () => {
        const invalidBirthDateData = {
          ...validRegistrationData,
          personalInfo: {
            ...validRegistrationData.personalInfo,
            birthDate: '2030-01-01', // Future date
            email: 'future.birth@test.example',
          },
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidBirthDateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject invalid country code', async () => {
        const invalidCountryData = {
          ...validRegistrationData,
          address: {
            ...validRegistrationData.address,
            country: 'INVALID',
          },
          personalInfo: {
            ...validRegistrationData.personalInfo,
            email: 'invalid.country@test.example',
          },
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidCountryData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('VALIDATION_ERROR');
      });

      it('should reject missing required fields', async () => {
        const incompleteData = {
          personalInfo: {
            firstName: 'John',
            // Missing lastName, birthDate, email, password
          },
          // Missing address and consent
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(incompleteData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('VALIDATION_ERROR');
        expect(response.body.details.validationErrors.length).toBeGreaterThan(0);
      });

      it('should reject consent disagreement', async () => {
        const noConsentData = {
          ...validRegistrationData,
          consent: {
            ...validRegistrationData.consent,
            agreeToTerms: false,
          },
          personalInfo: {
            ...validRegistrationData.personalInfo,
            email: 'no.consent@test.example',
          },
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(noConsentData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('Business Logic Errors', () => {
      it('should reject duplicate email registration', async () => {
        // First registration
        await request(app)
          .post('/api/auth/register')
          .send(validRegistrationData)
          .expect(201);

        // Attempt duplicate registration
        const duplicateData = {
          ...validRegistrationData,
          personalInfo: {
            ...validRegistrationData.personalInfo,
            firstName: 'Different',
            lastName: 'Person',
          },
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(duplicateData)
          .expect(409);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Email address already registered',
          code: 'EMAIL_ALREADY_EXISTS',
          details: {
            field: 'personalInfo.email',
            message: 'An account with this email address already exists',
          },
        });
      });
    });

    describe('Security Features', () => {
      it('should hash the password (not stored in plain text)', async () => {
        const testEmail = 'password.hash@test.example';
        const testPassword = 'TestPassword123!';
        const testData = {
          ...validRegistrationData,
          personalInfo: {
            ...validRegistrationData.personalInfo,
            email: testEmail,
            password: testPassword,
          },
        };

        await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(201);

        const userResult = await pool.query('SELECT passwordhash FROM users WHERE email = $1', [testEmail]);
        const storedHash = userResult.rows[0].passwordhash;
        
        expect(storedHash).toBeDefined();
        expect(storedHash).not.toBe(testPassword);
        expect(storedHash.startsWith('$2b$')).toBe(true); // bcrypt hash format
      });

      it('should generate unique verification tokens', async () => {
        const testData1 = {
          ...validRegistrationData,
          personalInfo: {
            ...validRegistrationData.personalInfo,
            email: 'user1@test.example',
          },
        };

        const testData2 = {
          ...validRegistrationData,
          personalInfo: {
            ...validRegistrationData.personalInfo,
            email: 'user2@test.example',
          },
        };

        await request(app).post('/api/auth/register').send(testData1).expect(201);
        await request(app).post('/api/auth/register').send(testData2).expect(201);

        const tokens = await pool.query('SELECT emailverificationtoken FROM user_verification_status');
        const tokenValues = tokens.rows.map(extractTokenFromRow);
        const tokenSet = new Set(tokenValues);
        
        expect(tokenSet.size).toBe(tokens.rows.length); // All tokens should be unique
      });

      it('should set verification token expiration', async () => {
        const testEmail = 'token.expiry@test.example';
        const testData = {
          ...validRegistrationData,
          personalInfo: {
            ...validRegistrationData.personalInfo,
            email: testEmail,
          },
        };

        const beforeRegistration = new Date();
        await request(app)
          .post('/api/auth/register')
          .send(testData)
          .expect(201);
        const afterRegistration = new Date();

        const verificationResult = await pool.query(
          'SELECT emailverificationexpiresat FROM user_verification_status u JOIN users usr ON u.userid = usr.id WHERE usr.email = $1',
          [testEmail]
        );
        
        const expiresAt = new Date(verificationResult.rows[0].emailverificationexpiresat);
        const expectedMinExpiry = new Date(beforeRegistration.getTime() + 23.5 * 60 * 60 * 1000); // 23.5 hours
        const expectedMaxExpiry = new Date(afterRegistration.getTime() + 24.5 * 60 * 60 * 1000); // 24.5 hours

        expect(expiresAt.getTime()).toBeGreaterThan(expectedMinExpiry.getTime());
        expect(expiresAt.getTime()).toBeLessThan(expectedMaxExpiry.getTime());
      });
    });

    describe('Response Format', () => {
      it('should return JWT token with proper structure', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send(validRegistrationData)
          .expect(201);

        expect(response.body.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/); // JWT format
        
        const tokenParts = response.body.token.split('.');
        expect(tokenParts).toHaveLength(3);
      });

      it('should include complete user profile in response', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send(validRegistrationData)
          .expect(201);

        const { user } = response.body;
        expect(user).toMatchObject({
          id: expect.any(String),
          email: validRegistrationData.personalInfo.email,
          role: 'customer',
          profile: {
            title: validRegistrationData.personalInfo.title,
            firstName: validRegistrationData.personalInfo.firstName,
            lastName: validRegistrationData.personalInfo.lastName,
            birthDate: validRegistrationData.personalInfo.birthDate,
            address: validRegistrationData.address,
            createdAt: expect.any(String),
            verificationStatus: {
              email: 'pending',
              identity: 'pending',
            },
          },
        });
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
      await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      const response = await request(app)
        .get(`/api/auth/register/check-email/${encodeURIComponent(validRegistrationData.personalInfo.email)}`)
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

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL_FORMAT',
      });
    });
  });

  describe('POST /api/auth/register/resend-verification', () => {
    it('should always return success for security', async () => {
      const response = await request(app)
        .post('/api/auth/register/resend-verification')
        .send({ email: 'nonexistent@test.example' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'If the email address is registered, a verification email has been sent.',
      });
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register/resend-verification')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Valid email address is required',
        code: 'INVALID_EMAIL',
      });
    });

    it('should update verification token for existing user', async () => {
      const testEmail = 'resend.test@test.example';
      const testData = {
        ...validRegistrationData,
        personalInfo: {
          ...validRegistrationData.personalInfo,
          email: testEmail,
        },
      };

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(testData)
        .expect(201);

      // Get original token
      const originalTokenResult = await pool.query(
        `SELECT u.emailverificationtoken 
         FROM user_verification_status u 
         JOIN users usr ON u.userid = usr.id 
         WHERE usr.email = $1`,
        [testEmail]
      );
      const originalToken = originalTokenResult.rows[0].emailverificationtoken;

      // Request resend
      await request(app)
        .post('/api/auth/register/resend-verification')
        .send({ email: testEmail })
        .expect(200);

      // Get new token
      const newTokenResult = await pool.query(
        `SELECT u.emailverificationtoken 
         FROM user_verification_status u 
         JOIN users usr ON u.userid = usr.id 
         WHERE usr.email = $1`,
        [testEmail]
      );
      const newToken = newTokenResult.rows[0].emailverificationtoken;

      // Tokens should be different
      expect(newToken).not.toBe(originalToken);
    });
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function extractTokenFromRow(row: any): string {
  return row.emailverificationtoken;
}

async function cleanupTestData(): Promise<void> {
  // Clean up in reverse dependency order
  await pool.query("DELETE FROM user_verification_status WHERE userid IN (SELECT id FROM users WHERE email LIKE '%@test.example')");
  await pool.query("DELETE FROM consent_log WHERE userid IN (SELECT id FROM users WHERE email LIKE '%@test.example')");
  await pool.query("DELETE FROM document_processing_log WHERE userid IN (SELECT id FROM users WHERE email LIKE '%@test.example')");
  await pool.query("DELETE FROM user_addresses WHERE userid IN (SELECT id FROM users WHERE email LIKE '%@test.example')");
  await pool.query("DELETE FROM user_profiles WHERE userid IN (SELECT id FROM users WHERE email LIKE '%@test.example')");
  await pool.query("DELETE FROM users WHERE email LIKE '%@test.example'");
}
