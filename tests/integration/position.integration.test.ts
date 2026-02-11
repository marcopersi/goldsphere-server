import request from 'supertest';
import { getPool } from '../../src/dbConfig';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

let app: any;

describe('Position API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Setup fresh test database BEFORE importing app
    await setupTestDatabase();
    
    // Import app AFTER database setup to ensure pool replacement takes effect
    app = (await import('../../src/app')).default;
    
    // Get auth token for protected endpoints
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "bank.technical@goldsphere.vault",
        password: "GoldspherePassword"
      });
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    }
  });

  afterAll(async () => {
    // Clean up test database
    await teardownTestDatabase();
  });

  describe('GET /api/positions', () => {
    it('should return positions with custody information', async () => {
      const response = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('positions');
      expect(Array.isArray(response.body.positions)).toBe(true);
      
      // Check if positions have custody information
      if (response.body.positions.length > 0) {
        const position = response.body.positions[0];
        expect(position).toHaveProperty('id');
        expect(position).toHaveProperty('custodyServiceId');
        
        // If position has custody, check structure
        if (position.custody) {
          expect(position.custody).toHaveProperty('custodyServiceId');
          expect(position.custody).toHaveProperty('custodyServiceName');
          expect(position.custody).toHaveProperty('custodianId');
          expect(position.custody).toHaveProperty('custodianName');
        }
      }
    });

    it('should handle positions without custody service', async () => {
      const response = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('positions');
      
      // All positions should have custodyServiceId field (can be null)
      response.body.positions.forEach((position: any) => {
        expect(position).toHaveProperty('custodyServiceId');
        // custodyServiceId can be null, but field must exist
      });
    });
  });

  describe('GET /api/positions/portfolios/:portfolioId/positions', () => {
    it('should return positions for a specific portfolio', async () => {
      const pool = getPool();
      const portfolioResult = await pool.query("SELECT id FROM portfolio LIMIT 1");

      if (portfolioResult.rows.length === 0) {
        // No portfolios in test data — skip gracefully
        return;
      }

      const portfolioId = portfolioResult.rows[0].id;

      const response = await request(app)
        .get(`/api/positions/portfolios/${portfolioId}/positions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('positions');
      expect(Array.isArray(response.body.positions)).toBe(true);
    });

    it('should return empty positions for non-existent portfolio', async () => {
      const response = await request(app)
        .get('/api/positions/portfolios/00000000-0000-0000-0000-000000000000/positions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.positions).toEqual([]);
    });
  });

  describe('GET /api/positions/:id', () => {
    it('should return a position by ID', async () => {
      const pool = getPool();
      const posResult = await pool.query("SELECT id FROM position LIMIT 1");

      if (posResult.rows.length === 0) {
        return;
      }

      const positionId = posResult.rows[0].id;

      const response = await request(app)
        .get(`/api/positions/${positionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', positionId);
      expect(response.body).toHaveProperty('product');
    });

    it('should return 404 for non-existent position', async () => {
      const response = await request(app)
        .get('/api/positions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });
});
