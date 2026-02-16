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
    .set('Authorization', `Bearer ${baseAdminLogin.body.data.accessToken}`)
    .send({
      email,
      password,
      role: 'admin',
    })
    .expect(201);

  const userId = createResponse.body.data.id;

  const pool = getPool();
  await pool.query(
    `INSERT INTO user_profiles (user_id, first_name, last_name, birth_date)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       birth_date = EXCLUDED.birth_date`,
    [userId, 'Temp', 'Admin', '1990-01-01']
  );

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    userId,
    email,
    password,
    token: loginResponse.body.data.accessToken,
  };
}

describe('Authentication Endpoints', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    app = (await import('../../src/app')).default;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate with canonical contract payload', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bank.technical@goldsphere.vault',
          password: 'GoldspherePassword',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data.accessToken');
      expect(response.body).toHaveProperty('data.tokenType', 'Bearer');
      expect(response.body).toHaveProperty('data.expiresIn');
      expect(typeof response.body.data.expiresIn).toBe('number');
      expect(response.body).toHaveProperty('data.expiresAt');
      expect(response.body).toHaveProperty('data.user.id');
      expect(response.body).toHaveProperty('data.user.email', 'bank.technical@goldsphere.vault');
      expect(response.body).toHaveProperty('data.user.firstName');
      expect(response.body).toHaveProperty('data.user.lastName');
      expect(response.body).toHaveProperty('data.user.role');
      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('user');
      expect(typeof response.body.data.user.firstName).toBe('string');
      expect(typeof response.body.data.user.lastName).toBe('string');
      expect(response.body.data.user.firstName.trim().length).toBeGreaterThan(0);
      expect(response.body.data.user.lastName.trim().length).toBeGreaterThan(0);
    });

    it('should reject invalid credentials with code', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@goldsphere.vault',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'AUTH_INVALID_CREDENTIALS');
    });

    it('should return validation error when password missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@goldsphere.vault',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body).toHaveProperty('details.fields');
      expect(Array.isArray(response.body.details.fields)).toBe(true);
    });
  });

  describe('GET /api/auth/validate', () => {
    let validToken: string;

    beforeEach(async () => {
      const userResult = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bank.technical@goldsphere.vault',
          password: 'GoldspherePassword',
        })
        .expect(200);

      validToken = userResult.body.data.accessToken;
    });

    it('should validate valid token', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data.user.email', 'bank.technical@goldsphere.vault');
    });

    it('should reject request without token with code', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'AUTH_TOKEN_INVALID');
    });

    it('should reject invalid token with code', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code');
      expect(response.body.code).toMatch(/AUTH_TOKEN_INVALID|AUTH_TOKEN_EXPIRED/);
    });

    it('should reject token for non-existent user with user inactive code', async () => {
      const fakeToken = generateToken({
        id: '11111111-1111-4111-8111-111111111111',
        email: 'fake@example.com',
        role: 'user',
      });

      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'AUTH_USER_INACTIVE');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh a valid token with canonical payload', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bank.technical@goldsphere.vault', password: 'GoldspherePassword' })
        .expect(200);

      const token = loginResponse.body.data.accessToken;

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data.accessToken');
      expect(response.body).toHaveProperty('data.tokenType', 'Bearer');
      expect(response.body).toHaveProperty('data.expiresIn');
      expect(response.body).toHaveProperty('data.expiresAt');
    });

    it('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'AUTH_TOKEN_INVALID');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info in data envelope', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bank.technical@goldsphere.vault', password: 'GoldspherePassword' })
        .expect(200);

      const token = loginResponse.body.data.accessToken;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data.user.id');
      expect(response.body).toHaveProperty('data.user.email', 'bank.technical@goldsphere.vault');
      expect(response.body).toHaveProperty('data.user.role');
      expect(response.body).not.toHaveProperty('user');
    });

    it('should reject without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'AUTH_TOKEN_INVALID');
    });

    it('should reject with expired token using stable code', async () => {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret || jwtSecret.trim().length === 0) {
        throw new Error('JWT_SECRET is required for auth integration tests');
      }

      const expiredToken = jwt.sign(
        {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'expired@goldsphere.vault',
          role: 'user',
        },
        jwtSecret,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'AUTH_TOKEN_EXPIRED');
    });
  });

  describe('tsoa protected route security checks', () => {
    it('should reject token when user role changed since token issuance', async () => {
      const tempAdmin = await createTemporaryAdmin();
      const pool = getPool();

      await pool.query(`UPDATE users SET role = 'customer' WHERE id = $1`, [tempAdmin.userId]);

      try {
        const response = await request(app)
          .get('/api/users/blocked')
          .set('Authorization', `Bearer ${tempAdmin.token}`)
          .expect(401);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('code', 'AUTH_STALE_ROLE_CLAIM');
      } finally {
        await pool.query(`DELETE FROM users WHERE id = $1`, [tempAdmin.userId]);
      }
    });

    it('should reject token when user account is inactive', async () => {
      const tempAdmin = await createTemporaryAdmin();
      const pool = getPool();

      await pool.query(`UPDATE users SET account_status = 'deleted' WHERE id = $1`, [tempAdmin.userId]);

      try {
        const response = await request(app)
          .get('/api/users/blocked')
          .set('Authorization', `Bearer ${tempAdmin.token}`)
          .expect(401);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('code', 'AUTH_USER_INACTIVE');
      } finally {
        await pool.query(`DELETE FROM users WHERE id = $1`, [tempAdmin.userId]);
      }
    });
  });
});
