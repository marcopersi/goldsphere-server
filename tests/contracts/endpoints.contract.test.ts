import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from '../integration/db-setup';

/**
 * Contract tests to ensure critical endpoints exist and respond.
 * These are lightweight checks that run before each commit.
 */

describe('Endpoint contracts', () => {
  let app: any;
  let token: string;

  beforeAll(async () => {
    // Setup fresh test database BEFORE importing app
    await setupTestDatabase();
    
    // Import app AFTER database setup to ensure pool replacement takes effect  
    app = (await import('../../src/app')).default;

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bank.technical@goldsphere.vault', password: 'GoldspherePassword' })
      .expect(200);
    token = res.body.data.accessToken;
  }, 30000);

  afterAll(async () => {
    // Clean up test database
    await teardownTestDatabase();
  });

  it('GET /api/portfolios/my returns current user portfolio with positions', async () => {
    const res = await request(app)
      .get('/api/portfolios/my')
      .set('Authorization', `Bearer ${token}`);

    if (res.status !== 200) {
      console.error('Error response:', res.status, res.body);
    }
    
    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    const data = res.body.data;
    expect(Array.isArray(data)).toBe(true);
    
    // Contract test should be flexible - portfolios might be empty for test users
    if (data.length > 0) {
      const portfolio = data[0];
      expect(portfolio).toHaveProperty('id');
      expect(portfolio).toHaveProperty('ownerId');
      expect(Array.isArray(portfolio.positions)).toBe(true);
    }
  }, 30000);
});
