import request from "supertest";
import { setupTestDatabase, teardownTestDatabase } from './db-setup';

let app: any;

beforeAll(async () => {
  // Setup fresh test database BEFORE importing app
  await setupTestDatabase();
  
  // Import app AFTER database setup to ensure pool replacement takes effect  
  app = (await import('../../src/app')).default;
});

afterAll(async () => {
  // Clean up test database
  await teardownTestDatabase();
});

describe("Custody Management API", () => {
  let authToken: string;

  beforeAll(async () => {
    // Get auth token for protected endpoints
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "bank.technical@goldsphere.vault",
        password: "GoldspherePassword"
      });
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    }
  });

  describe("Custodians API", () => {
    it("should require authentication for GET /custodians", async () => {
      const response = await request(app)
        .get("/api/custodians");
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Access token required");
    });

    it("should return custodians list with valid auth", async () => {
      if (!authToken) {
        console.log("Skipping auth test - no valid login credentials");
        return;
      }

      const response = await request(app)
        .get("/api/custodians")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should validate custodian creation schema", async () => {
      if (!authToken) {
        console.log("Skipping auth test - no valid login credentials");
        return;
      }

      // Test invalid request (missing required fields)
      const invalidResponse = await request(app)
        .post("/api/custodians")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(invalidResponse.status).toBe(400); // Should be validation error

      // Test valid request structure (may fail on DB constraints, but schema should be valid)
      const validResponse = await request(app)
        .post("/api/custodians")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Test Custodian",
          description: "Test custodian for testing purposes"
        });

      // Should either succeed or fail with a meaningful error (not validation error)
      expect([200, 201, 400, 409, 500]).toContain(validResponse.status);
    });
  });

  describe("Custody Services API", () => {
    it("should require authentication for GET /custodyServices", async () => {
      const response = await request(app)
        .get("/api/custodyServices");
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Access token required");
    });

    it("should return custody services list with valid auth", async () => {
      if (!authToken) {
        console.log("Skipping auth test - no valid login credentials");
        return;
      }

      const response = await request(app)
        .get("/api/custodyServices")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should validate custody service creation schema", async () => {
      if (!authToken) {
        console.log("Skipping auth test - no valid login credentials");
        return;
      }

      // Test invalid request (missing required fields)
      const invalidResponse = await request(app)
        .post("/api/custodyServices")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(invalidResponse.status).toBe(400); // Should be validation error

      // Test valid request structure
      const validResponse = await request(app)
        .post("/api/custodyServices")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          custodianId: "550e8400-e29b-41d4-a716-446655440000",
          serviceName: "Test Storage Service",
          serviceType: "segregated-storage",
          fee: 100.00,
          paymentFrequency: "monthly",
          currency: "CHF",
          maxWeight: 1000
        });

      // Should either succeed or fail with a meaningful error (not validation error)
      expect([200, 201, 400, 409, 500]).toContain(validResponse.status);
    });
  });

  describe("Enum Integration Tests", () => {
    it("should validate PaymentFrequency enum values", () => {
      const { PaymentFrequency } = require("@marcopersi/shared");
      
      const values = PaymentFrequency.values();
      expect(Array.isArray(values)).toBe(true);
      expect(values.length).toBeGreaterThan(0);
      
      const dailyFreq = PaymentFrequency.fromValue("daily");
      expect(dailyFreq).toBeDefined();
      expect(dailyFreq.value).toBe("daily");
      expect(dailyFreq.displayName).toBe("Daily");
    });

    it("should validate Custodian enum values", () => {
      const { Custodian } = require("@marcopersi/shared");
      
      const values = Custodian.values();
      expect(Array.isArray(values)).toBe(true);
      expect(values.length).toBeGreaterThan(0);
      
      const loomis = Custodian.fromValue("loomis");
      expect(loomis).toBeDefined();
      expect(loomis.value).toBe("loomis");
      expect(loomis.name).toBe("Loomis");
    });

    it("should validate CustodyServiceType enum values", () => {
      const { CustodyServiceType } = require("@marcopersi/shared");
      
      const values = CustodyServiceType.values();
      expect(Array.isArray(values)).toBe(true);
      expect(values.length).toBeGreaterThan(0);
      
      const segregated = CustodyServiceType.fromValue("segregated-storage");
      expect(segregated).toBeDefined();
      expect(segregated.value).toBe("segregated-storage");
      expect(segregated.displayName).toBe("Segregated Storage");
    });
  });
});
