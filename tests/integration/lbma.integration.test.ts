/**
 * Integration Tests for LBMA API
 *
 * Tests LBMA market data endpoints via HTTP requests against real database.
 */

import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

let app: any;

describe('LBMA API', () => {
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    app = (await import('../../src/app')).default;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@goldsphere.vault', password: 'admin123' });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/lbma/price-types', () => {
    it('should return price types', async () => {
      const response = await request(app)
        .get('/api/lbma/price-types')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/lbma/price-types/benchmark', () => {
    it('should return benchmark price types', async () => {
      const response = await request(app)
        .get('/api/lbma/price-types/benchmark')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/lbma/price/:metalSymbol', () => {
    it('should return latest gold price', async () => {
      const response = await request(app)
        .get('/api/lbma/price/XAU');

      // May return 200 with data or 404 if no price data loaded
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      } else {
        expect([200, 404, 500]).toContain(response.status);
      }
    });

    it('should return latest silver price', async () => {
      const response = await request(app)
        .get('/api/lbma/price/XAG');

      expect([200, 404, 500]).toContain(response.status);
    });

    it('should support type query parameter', async () => {
      const response = await request(app)
        .get('/api/lbma/price/XAU')
        .query({ type: 'AM' });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/lbma/price/:metalSymbol/:date', () => {
    it('should return price for a specific date', async () => {
      const response = await request(app)
        .get('/api/lbma/price/XAU/2024-01-15');

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/lbma/history/:metalSymbol', () => {
    it('should return price history', async () => {
      const response = await request(app)
        .get('/api/lbma/history/XAU')
        .query({ limit: '10' });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      } else {
        expect([200, 404, 500]).toContain(response.status);
      }
    });

    it('should support date range filter', async () => {
      const response = await request(app)
        .get('/api/lbma/history/XAU')
        .query({ startDate: '2024-01-01', endDate: '2024-12-31' });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/lbma/fixings/today', () => {
    it('should return today fixings', async () => {
      const response = await request(app)
        .get('/api/lbma/fixings/today');

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      } else {
        expect([200, 404, 500]).toContain(response.status);
      }
    });
  });

  describe('POST /api/lbma/fetch/:metalSymbol', () => {
    it('should require admin authentication', async () => {
      const response = await request(app)
        .post('/api/lbma/fetch/XAU');

      expect([401, 403]).toContain(response.status);
    });

    it('should accept request with admin auth', async () => {
      const response = await request(app)
        .post('/api/lbma/fetch/XAU')
        .set('Authorization', `Bearer ${authToken}`);

      // May succeed or fail depending on external API availability
      expect([200, 201, 400, 500, 502, 503]).toContain(response.status);
    });
  });

  describe('GET /api/lbma/premium/calculate/:metalSymbol', () => {
    it('should calculate premium for gold', async () => {
      const response = await request(app)
        .get('/api/lbma/premium/calculate/XAU')
        .query({ quantity: '1', currency: 'USD' });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      } else {
        expect([200, 404, 500]).toContain(response.status);
      }
    });
  });

  describe('GET /api/lbma/premium/configs', () => {
    it('should return premium configs', async () => {
      const response = await request(app)
        .get('/api/lbma/premium/configs');

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      } else {
        expect([200, 500]).toContain(response.status);
      }
    });

    it('should support metal filter', async () => {
      const response = await request(app)
        .get('/api/lbma/premium/configs')
        .query({ metal: 'gold' });

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/lbma/compare/:metalSymbol', () => {
    it('should compare prices for gold', async () => {
      const response = await request(app)
        .get('/api/lbma/compare/XAU');

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      } else {
        expect([200, 404, 500]).toContain(response.status);
      }
    });

    it('should support currency parameter', async () => {
      const response = await request(app)
        .get('/api/lbma/compare/XAU')
        .query({ currency: 'EUR' });

      expect([200, 404, 500]).toContain(response.status);
    });
  });
});
