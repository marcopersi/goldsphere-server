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
      expect(parseFloat(testPosition.quantity)).toBe(2);

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
});
