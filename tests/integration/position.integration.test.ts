import request from 'supertest';
import app from '../../src/app';
import { generateToken } from '../../src/middleware/auth';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

describe('Position API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Setup fresh test database with complete schema and data
    await setupTestDatabase();
    
    authToken = generateToken({
      id: 'test-user',
      email: 'test@goldsphere.vault',
      role: 'user'
    });
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
});
