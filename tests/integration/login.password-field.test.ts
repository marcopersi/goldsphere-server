/**
 * Password Field Migration Test
 * 
 * Tests that the login endpoint correctly accepts 'password' field
 * instead of 'passwordhash' after shared package 1.4.6 update
 */

import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';
import { getPool } from '../../src/dbConfig';
import bcrypt from 'bcrypt';

let app: any;

describe('Login with Password Field (Shared Package 1.4.6)', () => {
  
  beforeAll(async () => {
    await setupTestDatabase();
    
    // Import app AFTER database setup to ensure pool replacement takes effect
    app = (await import('../../src/app')).default;
    
    // Create a test user with hashed password
    const passwordHash = await bcrypt.hash('TestPassword123', 10);
    const userResult = await getPool().query(
      `INSERT INTO users (email, passwordhash, role) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO UPDATE SET passwordhash = EXCLUDED.passwordhash
       RETURNING id`,
      ['test.user@goldsphere.vault', passwordHash, 'user']
    );

    const userId = userResult.rows[0].id;
    await getPool().query(
      `INSERT INTO user_profiles (user_id, first_name, last_name, birth_date)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         birth_date = EXCLUDED.birth_date`,
      [userId, 'Test', 'User', '1990-01-01']
    );
  });

  afterAll(async () => {
    // Cleanup
    await getPool().query(
      `DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email = $1)`,
      ['test.user@goldsphere.vault']
    );
    await getPool().query(
      `DELETE FROM users WHERE email = $1`,
      ['test.user@goldsphere.vault']
    );
    await teardownTestDatabase();
  });

  describe('POST /api/auth/login', () => {
    
    it('should accept "password" field (not "passwordhash")', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.user@goldsphere.vault',
          password: 'TestPassword123' // ✅ Using 'password' field
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data.accessToken');
      expect(response.body).toHaveProperty('data.expiresIn');
      expect(response.body).toHaveProperty('data.expiresAt');
      expect(response.body).toHaveProperty('data.user.email', 'test.user@goldsphere.vault');
    });

    it('should reject request with old "passwordhash" field', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.user@goldsphere.vault',
          passwordhash: 'TestPassword123' // ❌ Old field name
        });

      // Should fail because 'password' field is missing
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should authenticate with existing admin user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@goldsphere.vault',
          password: 'admin123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('admin@goldsphere.vault');
      expect(response.body.data.user.role).toBe('admin');
    });

    it('should authenticate with bank technical user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bank.technical@goldsphere.vault',
          password: 'GoldspherePassword'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('bank.technical@goldsphere.vault');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.user@goldsphere.vault',
          password: 'WrongPassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
      expect(response.body).toHaveProperty('code', 'AUTH_INVALID_CREDENTIALS');
    });

    it('should require both email and password', async () => {
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.user@goldsphere.vault'
          // missing password
        })
        .expect(400);

      expect(response1.body).toHaveProperty('success', false);
      expect(response1.body).toHaveProperty('code', 'VALIDATION_ERROR');

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'TestPassword123'
          // missing email
        })
        .expect(400);

      expect(response2.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });
});
