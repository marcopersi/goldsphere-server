import request from 'supertest';
import { getPool } from '../../src/dbConfig';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

let app: any;

type LoginResult = {
  userId: string;
  token: string;
};

async function login(email: string, password: string): Promise<LoginResult> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    userId: response.body.data.user.id,
    token: response.body.data.accessToken,
  };
}

describe('Positions API Security', () => {
  let admin: LoginResult;
  let technicalUser: LoginResult;

  let adminPortfolioId: string;
  let technicalPortfolioId: string;
  let adminPositionId: string;
  let technicalPositionId: string;

  beforeAll(async () => {
    await setupTestDatabase();
    app = (await import('../../src/app')).default;

    admin = await login('admin@goldsphere.vault', 'admin123');
    technicalUser = await login('bank.technical@goldsphere.vault', 'GoldspherePassword');

    const pool = getPool();
    const productResult = await pool.query('SELECT id FROM product LIMIT 1');
    if (!productResult.rows[0]?.id) {
      throw new Error('No product found for positions security test setup');
    }
    const productId = productResult.rows[0].id;

    const technicalPortfolio = await pool.query(
      `INSERT INTO portfolio (portfolioname, ownerid, description, isactive)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['SECURITY_TEST_TECH_PORTFOLIO', technicalUser.userId, 'security test', true]
    );
    technicalPortfolioId = technicalPortfolio.rows[0].id;

    const adminPortfolio = await pool.query(
      `INSERT INTO portfolio (portfolioname, ownerid, description, isactive)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['SECURITY_TEST_ADMIN_PORTFOLIO', admin.userId, 'security test', true]
    );
    adminPortfolioId = adminPortfolio.rows[0].id;

    const technicalPosition = await pool.query(
      `INSERT INTO position (userid, productid, portfolioid, purchasedate, purchaseprice, marketprice, quantity, status)
       VALUES ($1, $2, $3, NOW(), 1000, 1100, 1, 'active')
       RETURNING id`,
      [technicalUser.userId, productId, technicalPortfolioId]
    );
    technicalPositionId = technicalPosition.rows[0].id;

    const adminPosition = await pool.query(
      `INSERT INTO position (userid, productid, portfolioid, purchasedate, purchaseprice, marketprice, quantity, status)
       VALUES ($1, $2, $3, NOW(), 2000, 2100, 1, 'active')
       RETURNING id`,
      [admin.userId, productId, adminPortfolioId]
    );
    adminPositionId = adminPosition.rows[0].id;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should return only authenticated user positions for GET /api/positions', async () => {
    const response = await request(app)
      .get('/api/positions?status=all&page=1&limit=100')
      .set('Authorization', `Bearer ${technicalUser.token}`)
      .expect(200);

    expect(Array.isArray(response.body.positions)).toBe(true);
    expect(response.body.positions.length).toBeGreaterThan(0);

    const uniqueUserIds = [...new Set(response.body.positions.map((position: { userId: string }) => position.userId))];
    expect(uniqueUserIds).toEqual([technicalUser.userId]);
    expect(uniqueUserIds).not.toContain(admin.userId);
  });

  it('should not allow access to another user position by id', async () => {
    const response = await request(app)
      .get(`/api/positions/${adminPositionId}`)
      .set('Authorization', `Bearer ${technicalUser.token}`)
      .expect(404);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error', 'Position not found');
  });

  it('should not allow access to another user portfolio positions', async () => {
    const response = await request(app)
      .get(`/api/positions/portfolios/${adminPortfolioId}/positions`)
      .set('Authorization', `Bearer ${technicalUser.token}`)
      .expect(200);

    expect(Array.isArray(response.body.positions)).toBe(true);
    expect(response.body.positions).toHaveLength(0);
    expect(response.body.pagination.total).toBe(0);
  });

  it('should allow admin to list cross-user positions', async () => {
    const response = await request(app)
      .get('/api/positions?status=all&page=1&limit=100')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    const positionIds = response.body.positions.map((position: { id: string }) => position.id);
    expect(positionIds).toContain(adminPositionId);
    expect(positionIds).toContain(technicalPositionId);
  });
});
