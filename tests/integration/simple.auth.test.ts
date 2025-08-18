import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/dbConfig';

describe('Simple Order Test', () => {
  let authToken: string;
  
  beforeAll(async () => {
    // Get auth token
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@goldsphere.vault',
        password: 'admin123'
      });
    
    if (authResponse.status === 200 && authResponse.body.token) {
      authToken = authResponse.body.token;
      console.log('✓ Authentication successful');
    } else {
      throw new Error(`Auth failed: ${authResponse.status} ${JSON.stringify(authResponse.body)}`);
    }
  });

  it('should be able to call auth endpoint', async () => {
    expect(authToken).toBeDefined();
  });
  
  it('should be able to query database', async () => {
    const result = await pool.query('SELECT 1 as test');
    expect(result.rows[0].test).toBe(1);
    console.log('✓ Database connection working');
  });
  
  it('should be able to find existing products', async () => {
    const result = await pool.query('SELECT * FROM product LIMIT 1');
    console.log(`Found ${result.rows.length} products in database`);
    if (result.rows.length > 0) {
      console.log('Sample product:', result.rows[0]);
    }
  });
});
