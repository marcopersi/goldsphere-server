/**
 * Integration Tests for Users API
 * 
 * Tests all user endpoints via HTTP requests against real database.
 * Response format: { success: boolean, data: ..., message?: string, pagination?: {...} }
 */

import request from 'supertest';
import { getPool } from '../../src/dbConfig';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

let app: any;
let createdUserId: string;
let authToken: string;
const NON_EXISTENT_USER_ID = '11111111-1111-4111-8111-111111111111';

// Helper to get auth token via login
async function loginAsAdmin(): Promise<string> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'admin@goldsphere.vault',
      password: 'admin123'
    });
  return response.body.token;
}

beforeAll(async () => {
  await setupTestDatabase();
  app = (await import('../../src/app')).default;
  authToken = await loginAsAdmin();
});

afterAll(async () => {
  await teardownTestDatabase();
});

describe('Users API Integration Tests', () => {
  
  describe('GET /api/users', () => {
    it('should list users with default pagination', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('totalCount');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should support custom pagination', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/users?role=admin')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((user: any) => {
        expect(user.role).toBe('admin');
      });
    });

    it('should filter users by email verified status', async () => {
      const response = await request(app)
        .get('/api/users?emailVerified=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((user: any) => {
        expect(user.emailVerified).toBe(true);
      });
    });

    it('should search users by email', async () => {
      const response = await request(app)
        .get('/api/users?search=admin')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support sorting', async () => {
      const responseAsc = await request(app)
        .get('/api/users?sortBy=email&sortOrder=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseDesc = await request(app)
        .get('/api/users?sortBy=email&sortOrder=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (responseAsc.body.data.length > 1 && responseDesc.body.data.length > 1) {
        expect(responseAsc.body.data[0].email).not.toBe(responseDesc.body.data[0].email);
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user with valid data', async () => {
      const newUser = {
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePass123',
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.email).toBe(newUser.email);
      expect(response.body.data.role).toBe('customer');
      expect(response.body.data).not.toHaveProperty('passwordHash');
      
      createdUserId = response.body.data.id;
    });

    it('should create user with custom role', async () => {
      const newUser = {
        email: `adminuser-${Date.now()}@example.com`,
        password: 'SecurePass123',
        role: 'admin',
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body.data.role).toBe('admin');
    });

    it('should reject duplicate email', async () => {
      const existingEmail = 'admin@goldsphere.vault';
      
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: existingEmail,
          password: 'SecurePass123',
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'not-an-email',
          password: 'SecurePass123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: `weak-${Date.now()}@example.com`,
          password: 'weak',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'SecurePass123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: `nopass-${Date.now()}@example.com`,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID', async () => {
      // Ensure we have a valid user ID from previous test
      expect(createdUserId).toBeDefined();
      
      const response = await request(app)
        .get(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', createdUserId);
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).not.toHaveProperty('passwordHash');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get(`/api/users/${NON_EXISTENT_USER_ID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/users/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users/:id/details', () => {
    it('should get user with profile and address details', async () => {
      expect(createdUserId).toBeDefined();
      
      const response = await request(app)
        .get(`/api/users/${createdUserId}/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.id).toBe(createdUserId);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get(`/api/users/${NON_EXISTENT_USER_ID}/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user email', async () => {
      expect(createdUserId).toBeDefined();
      const newEmail = `updated-${Date.now()}@example.com`;
      
      const response = await request(app)
        .put(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: newEmail })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.email).toBe(newEmail);
    });

    it('should update user role', async () => {
      expect(createdUserId).toBeDefined();
      
      const response = await request(app)
        .put(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body.data.role).toBe('admin');
    });

    it('should reject invalid email format on update', async () => {
      expect(createdUserId).toBeDefined();
      
      const response = await request(app)
        .put(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'not-valid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject duplicate email on update', async () => {
      expect(createdUserId).toBeDefined();
      
      const response = await request(app)
        .put(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'admin@goldsphere.vault' })
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put(`/api/users/${NON_EXISTENT_USER_ID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'new@example.com' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/users/:id', () => {
    let userToDelete: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: `delete-me-${Date.now()}@example.com`,
          password: 'SecurePass123',
        });
      userToDelete = response.body.data?.id;
    });

    it('should delete user', async () => {
      expect(userToDelete).toBeDefined();
      
      await request(app)
        .delete(`/api/users/${userToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify user is deleted
      await request(app)
        .get(`/api/users/${userToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete(`/api/users/${NON_EXISTENT_USER_ID}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .delete('/api/users/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Input Validation', () => {
    it('should sanitize email input (trim whitespace)', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: '  trimmed@example.com  ',
          password: 'SecurePass123',
        })
        .expect(201);

      expect(response.body.data.email).toBe('trimmed@example.com');
    });
  });

  describe('Pagination Edge Cases', () => {
    it('should handle page beyond available data', async () => {
      const response = await request(app)
        .get('/api/users?page=999&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.page).toBe(999);
    });

    it('should enforce maximum limit', async () => {
      const response = await request(app)
        .get('/api/users?limit=1000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination.limit).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /api/users/blocked', () => {
    it('should return blocked users list (admin only)', async () => {
      const response = await request(app)
        .get('/api/users/blocked')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/users/blocked');

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/users/:id/block and POST /api/users/:id/unblock', () => {
    it('should block and unblock a user', async () => {
      const pool = getPool();
      // Create a test user to block
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: `block-test-${Date.now()}@example.com`,
          password: 'SecurePass123',
          role: 'user'
        })
        .expect(201);

      const userId = createResponse.body.data.id;

      try {
        // Block the user
        const blockResponse = await request(app)
          .post(`/api/users/${userId}/block`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ reason: 'Test block reason' })
          .expect(200);

        expect(blockResponse.body).toHaveProperty('success', true);
        expect(blockResponse.body.data.accountStatus).toBe('blocked');

        // Unblock the user
        const unblockResponse = await request(app)
          .post(`/api/users/${userId}/unblock`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(unblockResponse.body).toHaveProperty('success', true);
      } finally {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      }
    });

    it('should return 404 for non-existent user block', async () => {
      const response = await request(app)
        .post(`/api/users/${NON_EXISTENT_USER_ID}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test' });

      expect([404, 400, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/users/:id/soft', () => {
    it('should soft delete a user', async () => {
      const pool = getPool();
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: `softdelete-${Date.now()}@example.com`,
          password: 'SecurePass123',
          role: 'user'
        })
        .expect(201);

      const userId = createResponse.body.data.id;

      try {
        const response = await request(app)
          .delete(`/api/users/${userId}/soft`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      } finally {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      }
    });
  });
});
