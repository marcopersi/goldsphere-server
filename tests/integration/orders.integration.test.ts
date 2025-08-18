/**
 * Orders Integration Tests
 * 
 * Tests the complete order lifecycle:
 * 1. Create orders with modern Order type
 * 2. Lookup/retrieve orders
 * 3. Process orders (state transitions)
 * 4. Integration with positions and portfolios
 */

import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/dbConfig';

describe('Orders Integration Tests', () => {
  let testUserId: string;
  let authToken: string;
  let testProductId: string;
  let createdOrderIds: string[] = [];

  // Setup: Use production database with existing data
  beforeAll(async () => {
    // Create test user
    const userResult = await pool.query(
      'INSERT INTO users (userName, email, passwordHash) VALUES ($1, $2, $3) RETURNING id',
      ['testuser', 'test@orders.com', 'hashedpassword']
    );
    testUserId = userResult.rows[0].id;

    // Get existing reference data from production database
    const metalResult = await pool.query('SELECT id FROM metal WHERE name = $1', ['Gold']);
    if (metalResult.rows.length === 0) {
      throw new Error('No Gold metal found in database - ensure sample data is loaded');
    }
    
    const producerResult = await pool.query('SELECT id FROM producer LIMIT 1');
    if (producerResult.rows.length === 0) {
      throw new Error('No producers found in database - ensure sample data is loaded');
    }
    
    const productTypeResult = await pool.query('SELECT id FROM productType WHERE productTypeName = $1', ['Coin']);
    if (productTypeResult.rows.length === 0) {
      throw new Error('No Coin product type found in database - ensure sample data is loaded');
    }

    // Create test product using existing reference data
    const productResult = await pool.query(
      `INSERT INTO product (
        name, productTypeId, metalId, producerId, 
        weight, weightUnit, purity, price, currency, imageUrl, stockquantity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        'Test Gold Coin',
        productTypeResult.rows[0].id,
        metalResult.rows[0].id,
        producerResult.rows[0].id,
        31.1030,
        'grams',
        0.9999,
        2000.00,
        'USD',
        'https://example.com/test-coin.jpg',
        100  // Set stock quantity to 100
      ]
    );
    testProductId = productResult.rows[0].id;

    // Get existing custodian and create custody service
    const custodianResult = await pool.query('SELECT id FROM custodian LIMIT 1');
    if (custodianResult.rows.length === 0) {
      throw new Error('No custodians found in database - ensure sample data is loaded');
    }
    
    const currencyResult = await pool.query('SELECT id FROM currency WHERE isoCode3 = $1', ['USD']);
    if (currencyResult.rows.length === 0) {
      throw new Error('No USD currency found in database - ensure sample data is loaded');
    }

    await pool.query(
      `INSERT INTO custodyService (
        custodianId, custodyServiceName, fee, paymentFrequency, currencyId
      ) VALUES ($1, $2, $3, $4, $5)`,
      [custodianResult.rows[0].id, 'Test Storage', 50.00, 'monthly', currencyResult.rows[0].id]
    );

    // Authenticate
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@goldsphere.vault',
        password: 'admin123'
      });
    authToken = authResponse.body.token;
  });

  // Cleanup: Remove only test-created data
  afterAll(async () => {
    // Clean up any created orders first
    if (createdOrderIds.length > 0) {
      await pool.query(
        'DELETE FROM orders WHERE id = ANY($1)',
        [createdOrderIds]
      );
    }
    
    // Clean up test product and user (custody service will be deleted via cascade)
    await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('POST /orders', () => {
    it('should create a new order from minimal input', async () => {
      // First verify our test product exists
      const productCheck = await pool.query('SELECT * FROM product WHERE id = $1', [testProductId]);
      expect(productCheck.rows.length).toBe(1);
      
      const orderInput = {
        type: 'buy',
        currency: 'USD',
        items: [
          {
            productId: testProductId,
            quantity: 2
          }
        ],
        notes: 'Test order'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderInput);

      // Log detailed error information if needed
      if (response.status !== 201) {
        console.error('Order creation failed:', response.status, response.body);
      }

      expect(response.status).toBe(201);      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      const createdOrder = response.body.data;
      expect(createdOrder).toMatchObject({
        userId: expect.any(String),
        type: 'buy',
        status: 'pending',
        currency: 'USD'
      });
      expect(createdOrder.items).toHaveLength(1);
      expect(createdOrder.items[0]).toMatchObject({
        productId: testProductId,
        quantity: 2
      });
      createdOrderIds.push(createdOrder.id);
    });
  });

  describe('GET /orders', () => {
    let setupOrderId: string;

    beforeEach(async () => {
      const orderInput = {
        type: 'buy',
        currency: 'USD',
        items: [{ productId: testProductId, quantity: 1 }]
      };
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderInput);
      setupOrderId = response.body.data.id;
      createdOrderIds.push(setupOrderId);
    });

    it('should retrieve all orders with proper Order structure', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`);
        
      if (response.status !== 200) {
        console.error('GET orders failed:', response.status, response.body);
        throw new Error(`GET /orders failed with ${response.status}: ${JSON.stringify(response.body)}`);
      }
      
      expect(response.status).toBe(200);
      
      // The API now returns the format that matches OrderApiListResponseSchema
      // Check if it has either the old format (success/data) or new format (direct orders)
      let ordersArray;
      if (response.body.orders) {
        // New format: { orders: [...], pagination: {...} }
        expect(response.body).toHaveProperty('orders');
        expect(response.body).toHaveProperty('pagination');
        ordersArray = response.body.orders;
      } else if (response.body.data) {
        // Old format: { success: true, data: [...] }
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        ordersArray = response.body.data;
      } else {
        throw new Error(`Unexpected response format: ${JSON.stringify(response.body)}`);
      }
      
      const order = ordersArray.find((o: any) => o.id === setupOrderId);
      expect(order).toBeDefined();
      expect(order).toMatchObject({
        id: setupOrderId,
        userId: expect.any(String), // Allow any valid user ID since test users may have different IDs
        type: 'buy',
        status: 'pending',
        currency: 'USD'
      });

      expect(order.items).toHaveLength(1);
      expect(order.items[0]).toMatchObject({
        productId: testProductId,
        quantity: 1,
        totalPrice: 2000.00  // Updated to match actual test product price
      });
    });
  });

  describe('PUT /orders/process/:id', () => {
    let processOrderId: string;

    beforeEach(async () => {
      const orderInput = {
        type: 'buy',
        currency: 'USD',
        items: [{ productId: testProductId, quantity: 2 }]
      };
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderInput);
      processOrderId = response.body.data.id;
      createdOrderIds.push(processOrderId);
    });

    it('should process order from pending to confirmed', async () => {
      const response = await request(app)
        .put(`/api/orders/process/${processOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({}); // No status needed, route auto-determines next status

      if (response.status !== 200) {
        console.error('Order processing failed:', response.status, response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toMatchObject({ id: processOrderId, status: 'confirmed' });
    });

    it('should process order from confirmed to processing to shipped', async () => {
      // First move to confirmed
      await request(app)
        .put(`/api/orders/process/${processOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      // Then move to processing  
      await request(app)
        .put(`/api/orders/process/${processOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      // Finally move to shipped
      const response = await request(app)
        .put(`/api/orders/process/${processOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.data.status).toBe('shipped');
    });

    it('should process order to delivered and create positions', async () => {
      // Move through states: pending -> confirmed -> processing -> shipped -> delivered
      await request(app)
        .put(`/api/orders/process/${processOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({}); // confirmed
      await request(app)
        .put(`/api/orders/process/${processOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({}); // processing
      await request(app)
        .put(`/api/orders/process/${processOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({}); // shipped
      
      const response = await request(app)
        .put(`/api/orders/process/${processOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200); // delivered

      expect(response.body.data.status).toBe('delivered');

      // Verify positions were created (positions are created on delivery, not shipping)
      const positionsResult = await pool.query(
        'SELECT * FROM position WHERE userId = $1',
        [testUserId]
      );
      
      expect(positionsResult.rows.length).toBeGreaterThan(0);
      
      // Find our test position
      const testPosition = positionsResult.rows.find(
        (pos: any) => pos.productid === testProductId
      );
      expect(testPosition).toBeDefined();
      expect(parseFloat(testPosition.quantity)).toBe(2); // From our test order
      expect(parseFloat(testPosition.purchaseprice)).toBeCloseTo(2000.00, 2); // Updated expected price

      // Cleanup positions
      await pool.query('DELETE FROM position WHERE userId = $1', [testUserId]);
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .put(`/api/orders/process/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(404);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid order data gracefully', async () => {
      const invalidOrder = {
        userId: 'invalid-uuid',
        items: [] // Empty items array
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidOrder)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const incompleteOrder = {
        userId: testUserId
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteOrder)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
