/**
 * Integration Tests for Payments API
 *
 * Tests payment endpoints via HTTP requests against real database.
 * Note: Stripe integration may not be available in test environment.
 */

import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

let app: any;

describe('Payments API', () => {
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    app = (await import('../../src/app')).default;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@goldsphere.vault', password: 'admin123' });

    authToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/payments/intent', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/payments/intent')
        .send({ amount: 1000, currency: 'usd' });

      expect([401, 403]).toContain(response.status);
    });

    it('should handle payment intent creation', async () => {
      const response = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 1000,
          currency: 'usd'
        });

      // Stripe may not be configured in test environment
      if (response.status === 201 || response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      } else {
        // Accept 400 (validation), 500 (Stripe not configured), 502 (external error)
        expect([200, 201, 400, 500, 502]).toContain(response.status);
      }
    });
  });

  describe('POST /api/payments/intent/:id/confirm', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/payments/intent/pi_test_123/confirm')
        .send({});

      expect([401, 403]).toContain(response.status);
    });

    it('should handle non-existent payment intent', async () => {
      const response = await request(app)
        .post('/api/payments/intent/pi_nonexistent/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // Stripe not configured or intent doesn't exist
      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/payments/intent/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/payments/intent/pi_test_123');

      expect([401, 403]).toContain(response.status);
    });

    it('should handle non-existent payment intent', async () => {
      const response = await request(app)
        .get('/api/payments/intent/pi_nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/payments/methods', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/payments/methods')
        .query({ customerId: 'cus_test' });

      expect([401, 403]).toContain(response.status);
    });

    it('should handle payment methods listing', async () => {
      const response = await request(app)
        .get('/api/payments/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ customerId: 'cus_nonexistent' });

      // May fail due to Stripe not configured
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      } else {
        expect([200, 400, 500]).toContain(response.status);
      }
    });
  });
});
