import request from 'supertest';
import app from '../../src/app';
import { generateToken } from '../../src/middleware/auth';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

describe('Authentication Endpoints', () => {
  
  beforeAll(async () => {
    // Setup fresh test database with complete schema and data
    await setupTestDatabase();
  });

  afterAll(async () => {
    // Clean up test database
    await teardownTestDatabase();
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate with valid bank technical user credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bank.technical@goldsphere.vault',
          password: 'GoldspherePassword'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'bank.technical@goldsphere.vault');
    });

    it('should authenticate with valid admin credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@goldsphere.vault',
          password: 'admin123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'admin@goldsphere.vault');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@goldsphere.vault',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should require email and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@goldsphere.vault'
          // missing password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Email and password are required');
    });

    it('should handle non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@goldsphere.vault',
          password: 'password123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('GET /api/auth/validate', () => {
    let validToken: string;

    beforeEach(async () => {
      // Use a real user from the database for token validation tests
      // Get the bank technical user that we know exists in test database
      const userResult = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bank.technical@goldsphere.vault',
          password: 'GoldspherePassword'
        })
        .expect(200);

      validToken = userResult.body.token;
    });

    it('should validate valid token', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'bank.technical@goldsphere.vault');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token');
    });

    it('should reject malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('should reject token for non-existent user (security fix)', async () => {
      // Create a token for a user that doesn't exist in database
      const fakeToken = generateToken({
        id: 'fake-user-id',
        email: 'fake@example.com', 
        role: 'user'
      });

      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token');
      expect(response.body).toHaveProperty('details', 'User not found or has been deactivated');
    });
  });

  describe('JWT Token Generation and Validation', () => {
    it('should generate valid JWT tokens', () => {
      const payload = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user'
      };

      const token = generateToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });
  });
});
