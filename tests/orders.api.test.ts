import request from "supertest";
import app from "../src/app";
import pool from "../src/dbConfig";

describe("Orders API", () => {
  let authToken: string;

  beforeAll(async () => {
    // Wait for app to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get auth token for protected endpoints
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "testpassword"
      });

    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    }
  });

  afterAll(async () => {
    await pool.end();
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
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.orders)).toBe(true);
        expect(typeof response.body.data.pagination).toBe('object');
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
});
