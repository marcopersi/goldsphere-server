import request from 'supertest';
import { getPool } from '../../src/dbConfig';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

let app: any;

describe('Orders Workflow Integration', () => {
  let authToken: string;
  let testUserId: string;
  let testProductId1: string;
  let testProductId2: string;

  const createdOrderIds: string[] = [];

  const processOrderToDelivered = async (orderId: string): Promise<void> => {
    const expectedStatuses = ['confirmed', 'processing', 'shipped', 'delivered'];

    for (const expectedStatus of expectedStatuses) {
      const response = await request(app)
        .post(`/api/orders/${orderId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(expectedStatus);
    }
  };

  const createBuyOrder = async (productId: string, quantity: number): Promise<string> => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: testUserId,
        type: 'buy',
        items: [{ productId, quantity }],
      });

    expect(response.status).toBe(201);
    const orderId = response.body.data.id as string;
    createdOrderIds.push(orderId);
    return orderId;
  };

  beforeAll(async () => {
    await setupTestDatabase();
    app = (await import('../../src/app')).default;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@goldsphere.vault',
        password: 'admin123',
      });

    if (loginResponse.status !== 200) {
      throw new Error(`Auth failed: ${loginResponse.status} ${JSON.stringify(loginResponse.body)}`);
    }

    authToken = loginResponse.body.token;

    const pool = getPool();
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@goldsphere.vault']);
    testUserId = userResult.rows[0].id;

    const productTypeResult = await pool.query("SELECT id FROM productType WHERE productTypeName = 'Coin' LIMIT 1");
    const metalResult = await pool.query("SELECT id FROM metal WHERE name = 'Gold' LIMIT 1");
    const producerResult = await pool.query("SELECT id FROM producer WHERE producerName = 'United States Mint' LIMIT 1");

    const product1 = await pool.query(
      `INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        `TEST_WORKFLOW_PRODUCT_1_${Date.now()}`,
        productTypeResult.rows[0].id,
        metalResult.rows[0].id,
        producerResult.rows[0].id,
        31.1035,
        'grams',
        0.9999,
        1500,
        'USD',
        true,
        100,
      ]
    );
    testProductId1 = product1.rows[0].id;

    const product2 = await pool.query(
      `INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        `TEST_WORKFLOW_PRODUCT_2_${Date.now()}`,
        productTypeResult.rows[0].id,
        metalResult.rows[0].id,
        producerResult.rows[0].id,
        31.1035,
        'grams',
        0.9999,
        1600,
        'USD',
        true,
        100,
      ]
    );
    testProductId2 = product2.rows[0].id;
  });

  afterEach(async () => {
    const pool = getPool();

    while (createdOrderIds.length > 0) {
      const orderId = createdOrderIds.pop();
      if (!orderId) {
        continue;
      }

      await pool.query('DELETE FROM order_items WHERE orderid = $1', [orderId]);
      await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    }

    await pool.query('DELETE FROM transactions WHERE userid = $1', [testUserId]);
    await pool.query(
      'DELETE FROM position WHERE userid = $1 AND (productid = $2 OR productid = $3)',
      [testUserId, testProductId1, testProductId2]
    );
    await pool.query('DELETE FROM portfolio WHERE ownerid = $1', [testUserId]);
  });

  afterAll(async () => {
    const pool = getPool();

    await pool.query('DELETE FROM product WHERE id = $1', [testProductId1]);
    await pool.query('DELETE FROM product WHERE id = $1', [testProductId2]);

    await teardownTestDatabase();
  });

  it('creates portfolio automatically when none exists', async () => {
    const pool = getPool();

    const beforePortfolioCount = await pool.query('SELECT COUNT(*) as count FROM portfolio WHERE ownerid = $1', [testUserId]);
    expect(Number.parseInt(beforePortfolioCount.rows[0].count, 10)).toBe(0);

    const orderId = await createBuyOrder(testProductId1, 2);
    await processOrderToDelivered(orderId);

    const createdPortfolio = await pool.query('SELECT id FROM portfolio WHERE ownerid = $1', [testUserId]);
    expect(createdPortfolio.rows.length).toBe(1);

    const createdPosition = await pool.query(
      'SELECT quantity, portfolioid FROM position WHERE userid = $1 AND productid = $2',
      [testUserId, testProductId1]
    );

    expect(createdPosition.rows.length).toBe(1);
    expect(Number.parseFloat(createdPosition.rows[0].quantity)).toBe(2);
    expect(createdPosition.rows[0].portfolioid).toBe(createdPortfolio.rows[0].id);
  });

  it('adds a new position into existing portfolio when product position does not exist', async () => {
    const pool = getPool();

    const existingPortfolio = await pool.query(
      `INSERT INTO portfolio (ownerid, portfolioname, description, isactive, createdBy, updatedBy)
       VALUES ($1, $2, $3, $4, $1, $1)
       RETURNING id`,
      [testUserId, 'Existing Portfolio', 'Integration test portfolio', true]
    );

    const existingPortfolioId = existingPortfolio.rows[0].id as string;

    const orderId = await createBuyOrder(testProductId2, 3);
    await processOrderToDelivered(orderId);

    const positions = await pool.query(
      'SELECT productid, quantity, portfolioid FROM position WHERE userid = $1 AND productid = $2',
      [testUserId, testProductId2]
    );

    expect(positions.rows.length).toBe(1);
    expect(Number.parseFloat(positions.rows[0].quantity)).toBe(3);
    expect(positions.rows[0].portfolioid).toBe(existingPortfolioId);
  });

  it('increases existing position quantity when same product is ordered again', async () => {
    const pool = getPool();

    const firstOrderId = await createBuyOrder(testProductId1, 2);
    await processOrderToDelivered(firstOrderId);

    const secondOrderId = await createBuyOrder(testProductId1, 4);
    await processOrderToDelivered(secondOrderId);

    const positions = await pool.query(
      `SELECT id, quantity, status
       FROM position
       WHERE userid = $1 AND productid = $2
       ORDER BY updatedat DESC`,
      [testUserId, testProductId1]
    );

    expect(positions.rows.length).toBeGreaterThan(0);
    expect(positions.rows[0].status).toBe('active');
    expect(Number.parseFloat(positions.rows[0].quantity)).toBe(6);

    const transactions = await pool.query(
      "SELECT type, quantity FROM transactions WHERE userid = $1 AND type = 'buy' ORDER BY createdat ASC",
      [testUserId]
    );

    expect(transactions.rows.length).toBe(2);
    expect(Number.parseFloat(transactions.rows[0].quantity)).toBe(2);
    expect(Number.parseFloat(transactions.rows[1].quantity)).toBe(4);
  });
});
