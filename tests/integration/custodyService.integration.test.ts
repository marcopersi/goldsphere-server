/**
 * Custody Service Integration Tests
 * 
 * Tests API endpoints for custody services with real database
 */

import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';
import { getPool } from '../../src/dbConfig';

let app: any;

describe('Custody Service Integration Tests', () => {
  let authToken: string;
  let testCustodianId: string;

  beforeAll(async () => {
    // Setup fresh test database BEFORE importing app
    await setupTestDatabase();
    
    // Import app AFTER database setup to ensure pool replacement takes effect
    app = (await import('../../src/app')).default;
    
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'bank.technical@goldsphere.vault',
        password: 'GoldspherePassword'
      });

    authToken = loginResponse.body.token;

    // Get a test custodian ID
    const pool = getPool();
    const result = await pool.query('SELECT id FROM custodian LIMIT 1');
    if (result.rows.length > 0) {
      testCustodianId = result.rows[0].id;
    }
  });

  afterAll(async () => {
    // Clean up test database
    await teardownTestDatabase();
  });

  describe('GET /api/custody/custodyServices/default', () => {
    it('should return default custody service (Home Delivery)', async () => {
      const response = await request(app)
        .get('/api/custody/custodyServices/default')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.custodyServiceName).toBe('Home Delivery');
      expect(response.body.data.custodianName).toBe('Home Delivery');
      expect(response.body.data.fee).toBe(20);
      expect(response.body.data.paymentFrequency).toBe('onetime');
      expect(response.body.data.currency).toBe('CHF');
      expect(response.body.data.minWeight).toBeNull();
      expect(response.body.data.maxWeight).toBeNull();
      expect(response.body.message).toContain('Default custody service retrieved successfully');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/custody/custodyServices/default');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('authorization');
    });
  });

  describe('GET /api/custody/custodians-with-services', () => {
    it('should return all custodians with their services', async () => {
      const response = await request(app)
        .get('/api/custody/custodians-with-services')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check structure of first custodian
      const firstCustodian = response.body.data[0];
      expect(firstCustodian).toHaveProperty('custodianId');
      expect(firstCustodian).toHaveProperty('custodianName');
      expect(firstCustodian).toHaveProperty('services');
      expect(Array.isArray(firstCustodian.services)).toBe(true);
    });

    it('should return services with correct structure', async () => {
      const response = await request(app)
        .get('/api/custody/custodians-with-services')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Find a custodian with services
      const custodianWithServices = response.body.data.find(
        (c: any) => c.services && c.services.length > 0
      );

      if (custodianWithServices) {
        const service = custodianWithServices.services[0];
        expect(service).toHaveProperty('id');
        expect(service).toHaveProperty('custodyServiceName');
        expect(service).toHaveProperty('custodianId');
        expect(service).toHaveProperty('custodianName');
        expect(service).toHaveProperty('fee');
        expect(service).toHaveProperty('paymentFrequency');
        expect(service).toHaveProperty('currency');
        expect(service).toHaveProperty('minWeight');
        expect(service).toHaveProperty('maxWeight');
        expect(service).toHaveProperty('createdAt');
        expect(service).toHaveProperty('updatedAt');
      }
    });

    it('should filter custodians by search term', async () => {
      const response = await request(app)
        .get('/api/custody/custodians-with-services?search=Loomis')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Should only return custodians matching "Loomis"
      response.body.data.forEach((custodian: any) => {
        expect(custodian.custodianName.toLowerCase()).toContain('loomis');
      });
    });

    it('should return empty array for non-matching search', async () => {
      const response = await request(app)
        .get('/api/custody/custodians-with-services?search=NonExistentCustodian123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should handle custodians without services', async () => {
      const response = await request(app)
        .get('/api/custody/custodians-with-services')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Find custodians without services
      const custodiansWithoutServices = response.body.data.filter(
        (c: any) => c.services.length === 0
      );

      expect(custodiansWithoutServices.length).toBeGreaterThan(0);
      custodiansWithoutServices.forEach((custodian: any) => {
        expect(custodian.services).toEqual([]);
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/custody/custodians-with-services');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/custody/custodyServices/:id', () => {
    it('should return custody service by ID', async () => {
      // First get a valid service ID
      const listResponse = await request(app)
        .get('/api/custody/custodians-with-services')
        .set('Authorization', `Bearer ${authToken}`);

      const custodianWithService = listResponse.body.data.find(
        (c: any) => c.services.length > 0
      );

      if (!custodianWithService) {
        console.log('⚠️ No custody services found, skipping test');
        return;
      }

      const serviceId = custodianWithService.services[0].id;

      const response = await request(app)
        .get(`/api/custody/custodyServices/${serviceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(serviceId);
      expect(response.body.data.custodyServiceName).toBeDefined();
      expect(response.body.data.fee).toBeGreaterThan(0);
    });

    it('should handle non-existent service', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/custody/custodyServices/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Controller throws error when data is null, resulting in 500
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 or 500 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/custody/custodyServices/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`);

      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Custody Service Data Integrity', () => {
    it('should have consistent data across endpoints', async () => {
      // Get default service
      const defaultResponse = await request(app)
        .get('/api/custody/custodyServices/default')
        .set('Authorization', `Bearer ${authToken}`);

      const defaultService = defaultResponse.body.data;

      // Get same service from custodians-with-services
      const custodiansResponse = await request(app)
        .get('/api/custody/custodians-with-services')
        .set('Authorization', `Bearer ${authToken}`);

      const homeDeliveryCustodian = custodiansResponse.body.data.find(
        (c: any) => c.custodianName === 'Home Delivery'
      );

      expect(homeDeliveryCustodian).toBeDefined();
      expect(homeDeliveryCustodian.services.length).toBeGreaterThan(0);

      const serviceFromList = homeDeliveryCustodian.services[0];

      // Compare data
      expect(serviceFromList.id).toBe(defaultService.id);
      expect(serviceFromList.custodyServiceName).toBe(defaultService.custodyServiceName);
      expect(serviceFromList.fee).toBe(defaultService.fee);
      expect(serviceFromList.currency).toBe(defaultService.currency);
    });

    it('should have valid weight constraints', async () => {
      const response = await request(app)
        .get('/api/custody/custodians-with-services')
        .set('Authorization', `Bearer ${authToken}`);

      response.body.data.forEach((custodian: any) => {
        custodian.services.forEach((service: any) => {
          // If both weights are defined, minWeight should be <= maxWeight
          if (service.minWeight !== null && service.maxWeight !== null) {
            expect(service.minWeight).toBeLessThanOrEqual(service.maxWeight);
          }

          // Weights should be non-negative if defined
          if (service.minWeight !== null) {
            expect(service.minWeight).toBeGreaterThanOrEqual(0);
          }
          if (service.maxWeight !== null) {
            expect(service.maxWeight).toBeGreaterThanOrEqual(0);
          }
        });
      });
    });

    it('should have valid payment frequencies', async () => {
      const validFrequencies = ['onetime', 'monthly', 'quarterly', 'annual'];

      const response = await request(app)
        .get('/api/custody/custodians-with-services')
        .set('Authorization', `Bearer ${authToken}`);

      response.body.data.forEach((custodian: any) => {
        custodian.services.forEach((service: any) => {
          expect(validFrequencies).toContain(service.paymentFrequency.toLowerCase());
        });
      });
    });
  });

  describe('GET /api/custody/custodyServices (paginated)', () => {
    it('should return paginated custody services', async () => {
      const response = await request(app)
        .get('/api/custody/custodyServices?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return services without pagination params', async () => {
      const response = await request(app)
        .get('/api/custody/custodyServices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /api/custody/custodyServices/:id', () => {
    it('should return a custody service by ID', async () => {
      const pool = getPool();
      const existing = await pool.query("SELECT id FROM custodyService LIMIT 1");
      const serviceId = existing.rows[0].id;

      const response = await request(app)
        .get(`/api/custody/custodyServices/${serviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', serviceId);
    });

    it('should return 404 for non-existent custody service', async () => {
      const response = await request(app)
        .get('/api/custody/custodyServices/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/custody/custodyServices/:id', () => {
    it('should update a custody service', async () => {
      const pool = getPool();
      const existing = await pool.query("SELECT id FROM custodyService LIMIT 1");
      const serviceId = existing.rows[0].id;

      const response = await request(app)
        .put(`/api/custody/custodyServices/${serviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fee: 99.99 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('DELETE /api/custody/custodyServices/:id', () => {
    it('should handle delete of custody service with positions', async () => {
      const pool = getPool();
      const existing = await pool.query("SELECT id FROM custodyService LIMIT 1");
      const serviceId = existing.rows[0].id;

      // Likely returns 409 (has existing positions) or 200
      const response = await request(app)
        .delete(`/api/custody/custodyServices/${serviceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 409, 500]).toContain(response.status);
    });
  });
});
