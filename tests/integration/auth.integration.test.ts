import request from 'supertest';
import jwt from 'jsonwebtoken';
import { generateToken } from '../helpers/authToken';
import { getPool } from '../../src/dbConfig';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

let app: any;

async function createTemporaryAdmin(): Promise<{ userId: string; email: string; password: string; token: string }> {
  const baseAdminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@goldsphere.vault', password: 'admin123' })
    .expect(200);

  const email = `temp-admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = 'SecurePass123';

  const createResponse = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${baseAdminLogin.body.token}`)
    .send({
      email,
      password,
      role: 'admin',
    })
    .expect(201);

  const userId = createResponse.body.data.id;

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    userId,
    email,
    password,
    token: loginResponse.body.token,
  };
}

describe('Authentication Endpoints', () => {
  
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

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid|expired/i);
    });

    it('should reject malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toHaveProperty('error');
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

      expect(response.body).toHaveProperty('error');
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

  describe('POST /api/auth/refresh', () => {
    it('should refresh a valid token', async () => {
      // First login to get a valid token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bank.technical@goldsphere.vault', password: 'GoldspherePassword' })
        .expect(200);

      const token = loginResponse.body.token;

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
    });

    it('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'No token provided');
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid token');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bank.technical@goldsphere.vault', password: 'GoldspherePassword' })
        .expect(200);

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', 'bank.technical@goldsphere.vault');
      expect(response.body).toHaveProperty('role');
    });

    it('should reject without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'No token provided');
    });

    it('should reject with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid token');
    });

    it('should reject with expired token', async () => {
      const expiredToken = jwt.sign(
        {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'expired@goldsphere.vault',
          role: 'user',
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Token has expired');
    });
  });

  describe('tsoa protected route security checks', () => {
    it('should reject token when user role changed since token issuance', async () => {
      const tempAdmin = await createTemporaryAdmin();
      const pool = getPool();

      await pool.query(
        `UPDATE users SET role = 'customer' WHERE id = $1`,
        [tempAdmin.userId]
      );

      try {
        const response = await request(app)
          .get('/api/users/blocked')
          .set('Authorization', `Bearer ${tempAdmin.token}`)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      } finally {
        await pool.query(
          `DELETE FROM users WHERE id = $1`,
          [tempAdmin.userId]
        );
      }
    });

    it('should reject token when user account is inactive', async () => {
      const tempAdmin = await createTemporaryAdmin();
      const pool = getPool();

      await pool.query(
        `UPDATE users SET account_status = 'deleted' WHERE id = $1`,
        [tempAdmin.userId]
      );

      try {
        const response = await request(app)
          .get('/api/users/blocked')
          .set('Authorization', `Bearer ${tempAdmin.token}`)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      } finally {
        await pool.query(
          `DELETE FROM users WHERE id = $1`,
          [tempAdmin.userId]
        );
      }
    });
  });
});
