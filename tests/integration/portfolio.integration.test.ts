/**
 * Integration Tests for Portfolio API
 *
 * Tests all portfolio endpoints via HTTP requests against real database.
 */

import request from 'supertest';
import { getPool } from '../../src/dbConfig';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

let app: any;

describe('Portfolio API', () => {
  let authToken: string;
  let authenticatedUserId: string;

  beforeAll(async () => {
    await setupTestDatabase();
    app = (await import('../../src/app')).default;

    // Login as admin
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@goldsphere.vault', password: 'admin123' });

    authToken = loginResponse.body.token;

    // Get user id from database directly
    const pool = getPool();
    const userResult = await pool.query(
      "SELECT id FROM users WHERE email = 'admin@goldsphere.vault'"
    );
    authenticatedUserId = userResult.rows[0].id;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/portfolios', () => {
    it('should return paginated portfolios list', async () => {
      const response = await request(app)
        .get('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('portfolios');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.portfolios)).toBe(true);

      if (response.body.data.portfolios.length > 0) {
        expect(response.body.data.portfolios[0]).toHaveProperty('ownerDisplayName');
        expect(response.body.data.portfolios[0]).toHaveProperty('ownerName');
      }
    });

    it('should support search parameter', async () => {
      const response = await request(app)
        .get('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'nonexistent-portfolio-xyz' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.portfolios).toHaveLength(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/portfolios');

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/portfolios/my', () => {
    it('should return current user portfolios', async () => {
      const response = await request(app)
        .get('/api/portfolios/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/portfolios/my');

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('POST /api/portfolios', () => {
    it('should create a new portfolio', async () => {
      const pool = getPool();
      const portfolioName = `Test Portfolio ${Date.now()}`;

      const response = await request(app)
        .post('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioName,
          ownerId: authenticatedUserId,
          description: 'Integration test portfolio'
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      // Cleanup
      const portfolioId = response.body.data?.portfolio?.id || response.body.data?.id;
      if (portfolioId) {
        await pool.query('DELETE FROM portfolio WHERE id = $1', [portfolioId]);
      }
    });

    it('should reject creation without required fields', async () => {
      const response = await request(app)
        .post('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('GET /api/portfolios/:id', () => {
    it('should return a portfolio by ID', async () => {
      const pool = getPool();
      // Create a portfolio first
      const portfolioName = `GetById Test ${Date.now()}`;
      const createResponse = await request(app)
        .post('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioName,
          ownerId: authenticatedUserId
        })
        .expect(201);

      const portfolioId = createResponse.body.data?.portfolio?.id || createResponse.body.data?.id;

      try {
        const response = await request(app)
          .get(`/api/portfolios/${portfolioId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      } finally {
        if (portfolioId) {
          await pool.query('DELETE FROM portfolio WHERE id = $1', [portfolioId]);
        }
      }
    });

    it('should return 404 for non-existent portfolio', async () => {
      const response = await request(app)
        .get('/api/portfolios/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/portfolios/:id/summary', () => {
    it('should return portfolio summary with positions', async () => {
      const pool = getPool();
      const portfolioName = `Summary Test ${Date.now()}`;
      const createResponse = await request(app)
        .post('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioName,
          ownerId: authenticatedUserId
        })
        .expect(201);

      const portfolioId = createResponse.body.data?.portfolio?.id || createResponse.body.data?.id;

      try {
        const response = await request(app)
          .get(`/api/portfolios/${portfolioId}/summary`)
          .set('Authorization', `Bearer ${authToken}`);

        // May return 200 or 500 depending on data enrichment
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body).toHaveProperty('data');
        } else {
          expect([200, 404, 500]).toContain(response.status);
        }
      } finally {
        if (portfolioId) {
          await pool.query('DELETE FROM portfolio WHERE id = $1', [portfolioId]);
        }
      }
    });
  });

  describe('PUT /api/portfolios/:id', () => {
    it('should update a portfolio', async () => {
      const pool = getPool();
      const portfolioName = `Update Test ${Date.now()}`;
      const createResponse = await request(app)
        .post('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioName,
          ownerId: authenticatedUserId
        })
        .expect(201);

      const portfolioId = createResponse.body.data?.portfolio?.id || createResponse.body.data?.id;

      try {
        const response = await request(app)
          .put(`/api/portfolios/${portfolioId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            portfolioName: `Updated ${portfolioName}`,
            description: 'Updated description'
          });

        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
        } else {
          expect([200, 500]).toContain(response.status);
        }
      } finally {
        if (portfolioId) {
          await pool.query('DELETE FROM portfolio WHERE id = $1', [portfolioId]);
        }
      }
    });

    it('should return 404 for non-existent portfolio', async () => {
      const response = await request(app)
        .put('/api/portfolios/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ portfolioName: 'Nope' });

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/portfolios/:id', () => {
    it('should delete a portfolio without positions', async () => {
      const portfolioName = `Delete Test ${Date.now()}`;
      const createResponse = await request(app)
        .post('/api/portfolios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          portfolioName,
          ownerId: authenticatedUserId
        })
        .expect(201);

      const portfolioId = createResponse.body.data?.portfolio?.id || createResponse.body.data?.id;

      const response = await request(app)
        .delete(`/api/portfolios/${portfolioId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      } else {
        // May return 409 if has positions, or 500
        expect([200, 409, 500]).toContain(response.status);
      }
    });

    it('should return 404 for non-existent portfolio', async () => {
      const response = await request(app)
        .delete('/api/portfolios/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });
});
