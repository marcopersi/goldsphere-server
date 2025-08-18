import request from 'supertest';
import app from '../../src/app';

/**
 * Contract tests to ensure critical endpoints exist and respond.
 * These are lightweight checks that run before each commit.
 */

describe('Endpoint contracts', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bank.technical@goldsphere.vault', password: 'GoldspherePassword' })
      .expect(200);
    token = res.body.token;
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
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('ownerId');
    expect(Array.isArray(data.positions)).toBe(true);
  });
});
