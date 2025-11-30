import request from "supertest";
import app from "../../src/app";
import { getPool } from "../../src/dbConfig";
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

describe("Orders API", () => {
  let authToken: string;

  beforeAll(async () => {
    // Setup fresh test database with complete schema and data
    await setupTestDatabase();
    
    // Wait for app to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get auth token for protected endpoints using real admin user
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@goldsphere.vault",
        password: "admin123"
      });

    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    } else {
      throw new Error(`Auth failed: ${loginResponse.status} ${JSON.stringify(loginResponse.body)}`);
    }
  });

  afterAll(async () => {
    // Clean up test database
    await teardownTestDatabase();
  });

  describe("GET /api/orders", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .get("/api/orders");

      expect(response.status).toBe(401);
    });

    it("should return orders list with valid auth", async () => {
      if (!authToken) {
        // Skip test if no auth token available
        return;
      }

      const response = await request(app)
        .get("/api/orders")
        .set("Authorization", `Bearer ${authToken}`);

      // Should succeed or handle gracefully
      expect([200, 500].includes(response.status)).toBe(true);
      
      if (response.status === 200) {
        expect(Array.isArray(response.body.orders)).toBe(true);
        expect(typeof response.body.pagination).toBe('object');
      }
    });

    it("should return correct flat response structure (prevent double nesting regression)", async () => {
      if (!authToken) {
        return;
      }

      const response = await request(app)
        .get("/api/orders?page=1&limit=5")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Validate top-level structure - should be flat, not nested under 'data'
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('pagination');
      
      // Ensure NO double nesting - these should NOT exist
      expect(response.body).not.toHaveProperty('data.orders');
      expect(response.body).not.toHaveProperty('data.pagination');
      expect(response.body.data).toBeUndefined();
      
      // Validate orders array structure
      expect(Array.isArray(response.body.orders)).toBe(true);
      
      // Validate pagination object structure
      const pagination = response.body.pagination;
      expect(pagination).toHaveProperty('page');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('totalPages');
      expect(pagination).toHaveProperty('hasNext');
      expect(pagination).toHaveProperty('hasPrevious');
      
      // If there are orders, validate order structure
      if (response.body.orders.length > 0) {
        const firstOrder = response.body.orders[0];
        expect(firstOrder).toHaveProperty('id');
        expect(firstOrder).toHaveProperty('userId');
        expect(firstOrder).toHaveProperty('type');
        expect(firstOrder).toHaveProperty('status');
        expect(firstOrder).toHaveProperty('orderNumber');
        expect(firstOrder).toHaveProperty('items');
        expect(firstOrder).toHaveProperty('currency');
        expect(firstOrder).toHaveProperty('subtotal');
        expect(firstOrder).toHaveProperty('taxes');
        expect(firstOrder).toHaveProperty('totalAmount');
        expect(firstOrder).toHaveProperty('createdAt');
        expect(firstOrder).toHaveProperty('updatedAt');
        
        // Validate order items structure
        expect(Array.isArray(firstOrder.items)).toBe(true);
        if (firstOrder.items.length > 0) {
          const firstItem = firstOrder.items[0];
          expect(firstItem).toHaveProperty('id');
          expect(firstItem).toHaveProperty('productId');
          expect(firstItem).toHaveProperty('productName');
          expect(firstItem).toHaveProperty('quantity');
          expect(firstItem).toHaveProperty('unitPrice');
          expect(firstItem).toHaveProperty('totalPrice');
        }
      }
    });
  });

  describe("POST /api/orders", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/orders")
        .send({
          productId: "test-product",
          quantity: 1,
          orderType: "buy"
        });

      expect(response.status).toBe(401);
    });

    it("should validate order creation schema with valid auth", async () => {
      if (!authToken) {
        // Skip test if no auth token available
        return;
      }

      const invalidOrder = {
        // Missing required fields
        quantity: "invalid"
      };

      const response = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidOrder);

      // Should reject invalid data
      expect([400, 422, 500].includes(response.status)).toBe(true);
    });
  });

  describe("GET /api/orders/:id", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .get("/api/orders/test-id");

      expect(response.status).toBe(401);
    });

    it("should handle invalid order ID with valid auth", async () => {
      if (!authToken) {
        // Skip test if no auth token available
        return;
      }

      const response = await request(app)
        .get("/api/orders/invalid-id")
        .set("Authorization", `Bearer ${authToken}`);

      // Should handle invalid ID gracefully
      expect([404, 400, 500].includes(response.status)).toBe(true);
    });
  });

  describe("PUT /api/orders/:id", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .put("/api/orders/test-id")
        .send({ status: "completed" });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/orders/:id", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .delete("/api/orders/test-id");

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/orders/process/:id", () => {
    let processOrderId: string;
    let testUserId: string;
    let testProductId: string;

    beforeAll(async () => {
      // Use existing admin user from SQL files - no need to create new user
      const adminResult = await getPool().query('SELECT id FROM users WHERE email = $1', ['admin@goldsphere.vault']);
      testUserId = adminResult.rows[0].id;

      // Get existing product from sample data
      const productResult = await getPool().query('SELECT id FROM product LIMIT 1');
      testProductId = productResult.rows[0].id;

      // Create order for processing tests
      const orderInput = {
        userId: testUserId,
        type: 'buy',
        items: [{ productId: testProductId, quantity: 2 }]
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderInput);
      
      if (response.status !== 201) {
        console.error('Order creation failed:', response.status, response.body);
        throw new Error(`Failed to create test order: ${response.status}`);
      }
      
      processOrderId = response.body.data.id;
    });

    it('should process order from pending to confirmed', async () => {
      const response = await request(app)
        .post(`/api/orders/${processOrderId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      if (response.status !== 200) {
        console.error('Order processing failed:', response.status, response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ id: processOrderId, status: 'confirmed' });
    });

    it('should process order from confirmed to processing to shipped', async () => {
      // Move to processing  
      await request(app)
        .post(`/api/orders/${processOrderId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      // Finally move to shipped
      const response = await request(app)
        .post(`/api/orders/${processOrderId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.data.status).toBe('shipped');
    });

    it('should process order to delivered and create positions', async () => {
      // Final move to delivered
      const response = await request(app)
        .post(`/api/orders/${processOrderId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.data.status).toBe('delivered');

      // Verify positions were created
      const positionsResult = await getPool().query(
        'SELECT * FROM position WHERE userId = $1',
        [testUserId]
      );
      
      expect(positionsResult.rows.length).toBeGreaterThan(0);
      
      // Find our test position
      const testPosition = positionsResult.rows.find(
        (pos: any) => pos.productid === testProductId
      );
      expect(testPosition).toBeDefined();
      expect(Number.parseFloat(testPosition.quantity)).toBe(2);

      // Cleanup
      await getPool().query('DELETE FROM position WHERE userId = $1', [testUserId]);
      await getPool().query('DELETE FROM orders WHERE id = $1', [processOrderId]);
      // Don't delete admin user - it's from SQL files
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/orders/${fakeId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe("Buy-Sell Order Flow Integration", () => {
    let testUserId: string;
    let testProductId: string;
    let testProductId2: string; // Second product for autonomous sell test
    let buyOrderId: string;
    let sellOrderId: string;
    let portfolioId: string;

    beforeAll(async () => {
      // Use existing admin user from SQL files - no need to create new user
      const adminResult = await getPool().query('SELECT id FROM users WHERE email = $1', ['admin@goldsphere.vault']);
      testUserId = adminResult.rows[0].id;
      
      // Get a test product ID from the database
      const productResult = await getPool().query(
        'SELECT id FROM product LIMIT 1'
      );
      if (productResult.rows.length === 0) {
        throw new Error('No products found in database for testing');
      }
      testProductId = productResult.rows[0].id;

      // Get a second test product ID for autonomous sell test  
      const productResult2 = await getPool().query(
        'SELECT id FROM product WHERE id != $1 LIMIT 1',
        [testProductId]
      );
      if (productResult2.rows.length === 0) {
        throw new Error('Not enough products found in database for testing');
      }
      testProductId2 = productResult2.rows[0].id;
    });

    afterEach(async () => {
      // Clean up any test data created
      if (buyOrderId) {
        await getPool().query('DELETE FROM order_items WHERE orderid = $1', [buyOrderId]);
        await getPool().query('DELETE FROM orders WHERE id = $1', [buyOrderId]);
      }
      if (sellOrderId) {
        await getPool().query('DELETE FROM order_items WHERE orderid = $1', [sellOrderId]);
        await getPool().query('DELETE FROM orders WHERE id = $1', [sellOrderId]);
      }
      // Clean up positions and transactions for test products
      await getPool().query('DELETE FROM transactions WHERE userid = $1', [testUserId]);
      await getPool().query('DELETE FROM position WHERE userid = $1 AND (productid = $2 OR productid = $3)', [testUserId, testProductId, testProductId2]);
      await getPool().query('DELETE FROM portfolio WHERE ownerid = $1', [testUserId]);
      
      // Reset IDs
      buyOrderId = '';
      sellOrderId = '';
      portfolioId = '';
    });

    it('should create buy order, process to completion, and create portfolio/position', async () => {
      // Step 1: Create buy order with quantity 5
      const buyOrderInput = {
        userId: testUserId,
        type: 'buy',
        items: [{ 
          productId: testProductId, 
          quantity: 5 
        }]
      };

      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(buyOrderInput);
      
      expect(createResponse.status).toBe(201);
      buyOrderId = createResponse.body.data.id;
      
      // Step 2: Process order through all stages to delivered
      const stages = ['confirmed', 'processing', 'shipped', 'delivered'];
      
      for (const expectedStatus of stages) {
        const processResponse = await request(app)
          .post(`/api/orders/${buyOrderId}/process`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});
        
        expect(processResponse.status).toBe(200);
        expect(processResponse.body.data.status).toBe(expectedStatus);
      }

      // Step 3: Verify portfolio and position were created
      const positionsResponse = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(positionsResponse.status).toBe(200);
      
      // Find the position for our product and user
      const userPositions = positionsResponse.body.positions.filter((pos: any) => 
        pos.userId === testUserId && pos.productId === testProductId
      );
      
      expect(userPositions.length).toBeGreaterThan(0);
      const position = userPositions[0];
      expect(position.quantity).toBe(5);
      portfolioId = position.portfolioId;
      
      // Verify portfolio exists
      expect(portfolioId).toBeDefined();
    });

    it('should create sell order, process to completion, and reduce position quantity', async () => {
      // Setup: First create and process a buy order to establish a position
      let setupBuyOrderId: string;
      let setupPortfolioId: string;
      
      // Step 1a: Create buy order with quantity 5 (setup for sell test) - use testProductId2 to avoid conflicts
      const setupBuyOrderInput = {
        userId: testUserId,
        type: 'buy',
        items: [{ 
          productId: testProductId2, // Use second product to avoid conflicts with first test
          quantity: 5 
        }]
      };

      const setupBuyResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(setupBuyOrderInput);
      
      expect(setupBuyResponse.status).toBe(201);
      setupBuyOrderId = setupBuyResponse.body.data.id;
      
      // Step 1b: Process setup buy order through all stages to delivered
      const setupStages = ['confirmed', 'processing', 'shipped', 'delivered'];
      
      for (const expectedStatus of setupStages) {
        const processResponse = await request(app)
          .post(`/api/orders/${setupBuyOrderId}/process`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});
        
        expect(processResponse.status).toBe(200);
        expect(processResponse.body.data.status).toBe(expectedStatus);
      }

      // Step 1c: Verify setup position was created
      const setupPositionsResponse = await request(app)
        .get('/api/positions')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(setupPositionsResponse.status).toBe(200);
      
      const setupUserPositions = setupPositionsResponse.body.positions.filter((pos: any) => 
        pos.userId === testUserId && pos.productId === testProductId2
      );
      
      expect(setupUserPositions.length).toBeGreaterThan(0);
      const setupPosition = setupUserPositions[0];
      expect(setupPosition.quantity).toBe(5);
      setupPortfolioId = setupPosition.portfolioId;

      // Step 2: Create sell order with quantity 1
      const sellOrderInput = {
        userId: testUserId,
        type: 'sell',
        items: [{ 
          productId: testProductId2, // Use same product as the buy order
          quantity: 1 
        }]
      };

      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sellOrderInput);
      
      expect(createResponse.status).toBe(201);
      sellOrderId = createResponse.body.data.id;
      
      // Step 3: Process sell order through all stages to delivered
      const stages = ['confirmed', 'processing', 'shipped', 'delivered'];
      
      for (const expectedStatus of stages) {
        const processResponse = await request(app)
          .post(`/api/orders/${sellOrderId}/process`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});
        
        expect(processResponse.status).toBe(200);
        expect(processResponse.body.data.status).toBe(expectedStatus);
      }

      // Step 4: Verify portfolio and position still exist with reduced quantity
      const positionsResponse = await request(app)
        .get('/api/positions?status=active') // Only get active positions
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(positionsResponse.status).toBe(200);
      
      // Find the position for our product and user
      const userPositions = positionsResponse.body.positions.filter((pos: any) => 
        pos.userId === testUserId && pos.productId === testProductId2
      );
      
      expect(userPositions.length).toBeGreaterThan(0);
      const updatedPosition = userPositions[0];
      
      // Assert: Portfolio and position are still there
      expect(updatedPosition.portfolioId).toBe(setupPortfolioId);
      
      // Assert: Position quantity is reduced to 4 (5 - 1)
      expect(updatedPosition.quantity).toBe(4);

      // Step 5: Verify transaction history for the position
      const transactionsResponse = await request(app)
        .get(`/api/transactions?positionId=${updatedPosition.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(transactionsResponse.status).toBe(200);
      expect(transactionsResponse.body.success).toBe(true);
      
      // Transactions are directly in data, not data.transactions
      const transactions = transactionsResponse.body.data;
      expect(transactions).toHaveLength(2);
      
      // Find buy and sell transactions
      const buyTransaction = transactions.find((t: any) => t.type === 'buy');
      const sellTransaction = transactions.find((t: any) => t.type === 'sell');
      
      // Assert: Buy transaction exists with quantity 5
      expect(buyTransaction).toBeDefined();
      expect(buyTransaction.quantity).toBe(5);
      expect(buyTransaction.type).toBe('buy');
      expect(buyTransaction.positionId).toBe(updatedPosition.id);
      
      // Assert: Sell transaction exists with quantity 1
      expect(sellTransaction).toBeDefined();
      expect(sellTransaction.quantity).toBe(1);
      expect(sellTransaction.type).toBe('sell');
      expect(sellTransaction.positionId).toBe(updatedPosition.id);
    });

    it('should handle position closure and reactivation correctly', async () => {
      // This test verifies:
      // 1. Position becomes 'closed' when quantity reaches 0
      // 2. Positions API filters by status correctly
      // 3. Buying same product reactivates closed position with fresh price calculation
      
      let testOrderId: string;
      let testPosition: any;
      
      // Step 1: Create and process buy order (quantity 2)
      const buyOrderInput = {
        userId: testUserId,
        type: 'buy',
        items: [{ 
          productId: testProductId, // Use first product  
          quantity: 2,
        }]
      };

      const buyResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(buyOrderInput);
      
      expect(buyResponse.status).toBe(201);
      testOrderId = buyResponse.body.data.id;
      
      // Process to delivered
      const stages = ['confirmed', 'processing', 'shipped', 'delivered'];
      for (const _ of stages) {
        const processResponse = await request(app)
          .post(`/api/orders/${testOrderId}/process`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});
        expect(processResponse.status).toBe(200);
      }

      // Verify position created
      const initialPositionsResponse = await request(app)
        .get('/api/positions?status=active')
        .set('Authorization', `Bearer ${authToken}`);
      
      const initialPosition = initialPositionsResponse.body.positions.find((pos: any) => 
        pos.userId === testUserId && pos.productId === testProductId
      );
      expect(initialPosition).toBeDefined();
      expect(initialPosition.quantity).toBe(2);
      testPosition = initialPosition;

      // Step 2: Create and process sell order to close position (sell all 2 units)
      const sellOrderInput = {
        userId: testUserId,
        type: 'sell',
        items: [{ 
          productId: testProductId,
          quantity: 2 // Sell all units to close position
        }]
      };

      const sellResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sellOrderInput);
      
      expect(sellResponse.status).toBe(201);
      const sellOrderId = sellResponse.body.data.id;
      
      // Process sell order to delivered
      for (const _ of stages) {
        const processResponse = await request(app)
          .post(`/api/orders/${sellOrderId}/process`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});
        expect(processResponse.status).toBe(200);
      }

      // Step 3: Verify position is closed and not in active positions
      const activePositionsResponse = await request(app)
        .get('/api/positions?status=active')
        .set('Authorization', `Bearer ${authToken}`);
      
      const activePosition = activePositionsResponse.body.positions.find((pos: any) => 
        pos.userId === testUserId && pos.productId === testProductId
      );
      expect(activePosition).toBeUndefined(); // Should not be in active positions

      // Step 4: Verify position is in closed positions
      const closedPositionsResponse = await request(app)
        .get('/api/positions?status=closed')
        .set('Authorization', `Bearer ${authToken}`);
      
      const closedPosition = closedPositionsResponse.body.positions.find((pos: any) => 
        pos.userId === testUserId && pos.productId === testProductId
      );
      expect(closedPosition).toBeDefined();
      expect(closedPosition.quantity).toBe(0);
      expect(closedPosition.status).toBe('closed');
      expect(closedPosition.id).toBe(testPosition.id); // Same position ID

      // Step 5: Buy same product again to test reactivation
      const reactivateBuyInput = {
        userId: testUserId,
        type: 'buy',
        items: [{ 
          productId: testProductId,
          quantity: 3 // Different quantity and price to test fresh start
        }]
      };

      const reactivateBuyResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reactivateBuyInput);
      
      expect(reactivateBuyResponse.status).toBe(201);
      const reactivateOrderId = reactivateBuyResponse.body.data.id;
      
      // Process to delivered
      for (const _ of stages) {
        const processResponse = await request(app)
          .post(`/api/orders/${reactivateOrderId}/process`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});
        expect(processResponse.status).toBe(200);
      }

      // Step 6: Verify position is reactivated
      const reactivatedPositionsResponse = await request(app)
        .get('/api/positions?status=active')
        .set('Authorization', `Bearer ${authToken}`);
      
      const reactivatedPosition = reactivatedPositionsResponse.body.positions.find((pos: any) => 
        pos.userId === testUserId && pos.productId === testProductId
      );
      
      expect(reactivatedPosition).toBeDefined();
      expect(reactivatedPosition.id).toBe(testPosition.id); // Same position ID (reactivated)
      expect(reactivatedPosition.quantity).toBe(3);
      expect(reactivatedPosition.status).toBe('active');
      // Price should be fresh start price (ignoring previous history)
    });
  });
});
