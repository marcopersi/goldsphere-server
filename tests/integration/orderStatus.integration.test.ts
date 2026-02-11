import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

let app: any;

describe('OrderStatus API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    app = (await import('../../src/app')).default;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/orderstatus', () => {
    it('should return order status enum values', async () => {
      const response = await request(app)
        .get('/api/orderstatus')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const statuses = response.body.map((r: any) => r.orderstatus);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('confirmed');
    });
  });
});
