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
import { Order } from '@marcopersi/shared';

describe('Orders Integration Tests', () => {
  let testUserId: string;
  let testProductId: string;
  let testCustodianId: string;
  let testCustodyServiceId: string;
  let createdOrderIds: string[] = [];

  // Setup: Create test data
  beforeAll(async () => {
    // Create test user
    const userResult = await pool.query(
      'INSERT INTO users (userName, email, passwordHash) VALUES ($1, $2, $3) RETURNING id',
      ['testuser', 'test@orders.com', 'hashedpassword']
    );
    testUserId = userResult.rows[0].id;

    // Create test metal, producer, product type
    const metalResult = await pool.query(
      'INSERT INTO metal (metalName) VALUES ($1) RETURNING id',
      ['Gold']
    );
    
    const producerResult = await pool.query(
      'INSERT INTO producer (producerName) VALUES ($1) RETURNING id', 
      ['Test Mint']
    );
    
    const productTypeResult = await pool.query(
      'INSERT INTO productType (productTypeName) VALUES ($1) RETURNING id',
      ['Coin']
    );

    // Create test product
    const productResult = await pool.query(
      `INSERT INTO product (
        productName, productTypeId, metalId, producerId, 
        fineWeight, unitOfMeasure, purity, price, currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        'Test Gold Coin',
        productTypeResult.rows[0].id,
        metalResult.rows[0].id,
        producerResult.rows[0].id,
        31.1030,
        'grams',
        0.9999,
        2000.00,
        'USD'
      ]
    );
    testProductId = productResult.rows[0].id;

    // Create test custodian and custody service
    const custodianResult = await pool.query(
      'INSERT INTO custodian (custodianName) VALUES ($1) RETURNING id',
      ['Test Custodian']
    );
    testCustodianId = custodianResult.rows[0].id;

    // Create currency for custody service
    const currencyResult = await pool.query(
      'INSERT INTO currency (isoCode2, isoCode3, isoNumericCode) VALUES ($1, $2, $3) RETURNING id',
      ['US', 'USD', 840]
    );

    const custodyServiceResult = await pool.query(
      `INSERT INTO custodyService (
        custodianId, custodyServiceName, fee, paymentFrequency, currencyId
      ) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [testCustodianId, 'Test Storage', 50.00, 'monthly', currencyResult.rows[0].id]
    );
    testCustodyServiceId = custodyServiceResult.rows[0].id;
  });

  // Cleanup: Remove test data
  afterAll(async () => {
    // Clean up in reverse order due to foreign key constraints
    if (createdOrderIds.length > 0) {
      await pool.query(
        'DELETE FROM orders WHERE id = ANY($1)',
        [createdOrderIds]
      );
    }
    
    await pool.query('DELETE FROM custodyService WHERE id = $1', [testCustodyServiceId]);
    await pool.query('DELETE FROM custodian WHERE id = $1', [testCustodianId]);
    await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    
    // Clean up lookup tables
    await pool.query('DELETE FROM productType WHERE productTypeName = $1', ['Coin']);
    await pool.query('DELETE FROM producer WHERE producerName = $1', ['Test Mint']);
    await pool.query('DELETE FROM metal WHERE metalName = $1', ['Gold']);
    await pool.query('DELETE FROM currency WHERE isoCode3 = $1', ['USD']);
  });

  describe('POST /orders', () => {
    it('should create a new order with modern Order type', async () => {
      const orderData: Order = {
        id: '', // Will be generated
        userId: testUserId,
        type: 'buy',
        status: 'pending',
        items: [
          {
            productId: testProductId,
            productName: 'Test Gold Coin',
            quantity: 2,
            unitPrice: 2000.00,
            totalPrice: 4000.00,
            specifications: {}
          }
        ],
        subtotal: 4000.00,
        fees: {
          processing: 50.00,
          shipping: 25.00,
          insurance: 15.00
        },
        taxes: 320.00,
        totalAmount: 4410.00,
        currency: 'USD',
        shippingAddress: {
          type: 'shipping',
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zipCode: '90210',
          country: 'USA'
        },
        paymentMethod: {
          type: 'card'
        },
        notes: 'Test order',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveLength(1);
      const createdOrder = response.body[0];
      
      expect(createdOrder).toMatchObject({
        userId: testUserId,
        type: 'buy',
        status: 'pending',
        totalAmount: 4410.00,
        currency: 'USD'
      });
      
      expect(createdOrder.items).toHaveLength(1);
      expect(createdOrder.items[0]).toMatchObject({
        productId: testProductId,
        quantity: 2,
        totalPrice: 4000.00
      });

      // Store for cleanup
      createdOrderIds.push(createdOrder.id);
    });

    it('should create multiple orders when array is provided', async () => {
      const orderData1: Order = {
        id: '',
        userId: testUserId,
        type: 'buy',
        status: 'pending',
        items: [
          {
            productId: testProductId,
            productName: 'Test Gold Coin',
            quantity: 1,
            unitPrice: 2000.00,
            totalPrice: 2000.00,
            specifications: {}
          }
        ],
        subtotal: 2000.00,
        fees: { processing: 25.00, shipping: 15.00, insurance: 10.00 },
        taxes: 160.00,
        totalAmount: 2210.00,
        currency: 'USD',
        shippingAddress: {
          type: 'shipping',
          firstName: 'Jane',
          lastName: 'Smith',
          street: '456 Test Ave',
          city: 'Test Town',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        paymentMethod: { type: 'card' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const orderData2 = { ...orderData1, items: [{ ...orderData1.items[0], quantity: 3, totalPrice: 6000.00 }] };

      const response = await request(app)
        .post('/api/orders')
        .send([orderData1, orderData2])
        .expect(201);

      expect(response.body).toHaveLength(2);
      
      // Store for cleanup
      response.body.forEach((order: any) => {
        createdOrderIds.push(order.id);
      });
    });
  });

  describe('GET /orders', () => {
    let setupOrderId: string;

    beforeEach(async () => {
      // Create a test order for retrieval tests
      const orderData: Order = {
        id: '',
        userId: testUserId,
        type: 'buy',
        status: 'pending',
        items: [
          {
            productId: testProductId,
            productName: 'Setup Test Coin',
            quantity: 1,
            unitPrice: 1500.00,
            totalPrice: 1500.00,
            specifications: {}
          }
        ],
        subtotal: 1500.00,
        fees: { processing: 20.00, shipping: 10.00, insurance: 5.00 },
        taxes: 120.00,
        totalAmount: 1655.00,
        currency: 'USD',
        shippingAddress: {
          type: 'shipping',
          firstName: 'Setup',
          lastName: 'User',
          street: '789 Setup Rd',
          city: 'Setup City',
          state: 'TX',
          zipCode: '75001',
          country: 'USA'
        },
        paymentMethod: { type: 'card' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData);
      
      setupOrderId = response.body[0].id;
      createdOrderIds.push(setupOrderId);
    });

    it('should retrieve all orders with proper Order structure', async () => {
      const response = await request(app)
        .get('/api/orders')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const order = response.body.find((o: any) => o.id === setupOrderId);
      expect(order).toBeDefined();
      expect(order).toMatchObject({
        id: setupOrderId,
        userId: testUserId,
        type: 'buy',
        status: 'pending',
        totalAmount: 1655.00,
        currency: 'USD'
      });

      expect(order.items).toHaveLength(1);
      expect(order.items[0]).toMatchObject({
        productId: testProductId,
        quantity: 1,
        totalPrice: 1500.00
      });
    });
  });

  describe('PUT /orders/process/:id', () => {
    let processOrderId: string;

    beforeEach(async () => {
      // Create a test order for processing tests
      const orderData: Order = {
        id: '',
        userId: testUserId,
        type: 'buy',
        status: 'pending',
        items: [
          {
            productId: testProductId,
            productName: 'Process Test Coin',
            quantity: 2,
            unitPrice: 1800.00,
            totalPrice: 3600.00,
            specifications: {}
          }
        ],
        subtotal: 3600.00,
        fees: { processing: 40.00, shipping: 20.00, insurance: 12.00 },
        taxes: 288.00,
        totalAmount: 3960.00,
        currency: 'USD',
        shippingAddress: {
          type: 'shipping',
          firstName: 'Process',
          lastName: 'Test',
          street: '321 Process St',
          city: 'Process City',
          state: 'FL',
          zipCode: '33101',
          country: 'USA'
        },
        paymentMethod: { type: 'card' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData);
      
      processOrderId = response.body[0].id;
      createdOrderIds.push(processOrderId);
    });

    it('should process order from pending to processing', async () => {
      const response = await request(app)
        .put(`/api/orders/process/${processOrderId}`)
        .expect(200);

      expect(response.body.orderstatus).toBe('processing');
      expect(response.body.id).toBe(processOrderId);
    });

    it('should process order from processing to shipped', async () => {
      // First move to processing
      await request(app)
        .put(`/api/orders/process/${processOrderId}`)
        .expect(200);

      // Then move to shipped
      const response = await request(app)
        .put(`/api/orders/process/${processOrderId}`)
        .expect(200);

      expect(response.body.orderstatus).toBe('shipped');
    });

    it('should process order to delivered and create positions', async () => {
      // Move through states: pending -> processing -> shipped -> delivered
      await request(app).put(`/api/orders/process/${processOrderId}`); // processing
      await request(app).put(`/api/orders/process/${processOrderId}`); // shipped
      
      const response = await request(app)
        .put(`/api/orders/process/${processOrderId}`)
        .expect(200);

      expect(response.body.orderstatus).toBe('delivered');

      // Verify positions were created
      const positionsResult = await pool.query(
        'SELECT * FROM positions WHERE userId = $1',
        [testUserId]
      );
      
      expect(positionsResult.rows.length).toBeGreaterThan(0);
      
      // Find our test position
      const testPosition = positionsResult.rows.find(
        (pos: any) => pos.productid === testProductId
      );
      expect(testPosition).toBeDefined();
      expect(parseFloat(testPosition.quantity)).toBe(2); // From our test order
      expect(parseFloat(testPosition.purchaseprice)).toBe(1800.00);

      // Cleanup positions
      await pool.query('DELETE FROM positions WHERE userId = $1', [testUserId]);
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .put(`/api/orders/process/${fakeId}`)
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
        .send(invalidOrder)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const incompleteOrder = {
        userId: testUserId
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/orders')
        .send(incompleteOrder)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });
});
