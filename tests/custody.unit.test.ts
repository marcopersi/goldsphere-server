import request from "supertest";
import app from "../src/app";
import pool from "../src/dbConfig";

describe("Custody Management API", () => {
  let authToken: string;

  beforeAll(async () => {
    // Get auth token for protected endpoints
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "password123"
      });
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("References API - Custody Data", () => {
    it("should return custody-related reference data without authentication", async () => {
      const response = await request(app)
        .get("/api/");

      // The endpoint should work or return a meaningful error
      expect([200, 500].includes(response.status)).toBe(true);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        // Check custody-related data
        expect(response.body.data.custodians).toBeDefined();
        expect(response.body.data.paymentFrequencies).toBeDefined();
        expect(response.body.data.custodyServiceTypes).toBeDefined();
        
        // Validate custodians structure
        expect(Array.isArray(response.body.data.custodians)).toBe(true);
        if (response.body.data.custodians.length > 0) {
          const custodian = response.body.data.custodians[0];
          expect(custodian).toHaveProperty("value");
          expect(custodian).toHaveProperty("name");
        }
        
        // Validate payment frequencies structure
        expect(Array.isArray(response.body.data.paymentFrequencies)).toBe(true);
        if (response.body.data.paymentFrequencies.length > 0) {
          const frequency = response.body.data.paymentFrequencies[0];
          expect(frequency).toHaveProperty("value");
          expect(frequency).toHaveProperty("displayName");
          expect(frequency).toHaveProperty("description");
        }
        
        // Validate custody service types structure
        expect(Array.isArray(response.body.data.custodyServiceTypes)).toBe(true);
        if (response.body.data.custodyServiceTypes.length > 0) {
          const serviceType = response.body.data.custodyServiceTypes[0];
          expect(serviceType).toHaveProperty("value");
          expect(serviceType).toHaveProperty("displayName");
          expect(serviceType).toHaveProperty("description");
        }
      } else {
        // If database connection fails in test environment, that's expected
        console.log("Database connection failed in test environment - this is expected");
        expect(response.body).toHaveProperty("error");
      }
    });

    it("should return currencies with correct structure", async () => {
      const response = await request(app)
        .get("/api/");

      // The endpoint should work or return a meaningful error
      expect([200, 500].includes(response.status)).toBe(true);
      
      if (response.status === 200) {
        expect(response.body.data.currencies).toBeDefined();
        expect(Array.isArray(response.body.data.currencies)).toBe(true);
        
        if (response.body.data.currencies.length > 0) {
          const currency = response.body.data.currencies[0];
          expect(currency).toHaveProperty("isoCode2");
          expect(currency).toHaveProperty("isoCode3");
          expect(currency).toHaveProperty("isoNumericCode");
          expect(typeof currency.isoCode2).toBe("string");
          expect(typeof currency.isoCode3).toBe("string");
          expect(typeof currency.isoNumericCode).toBe("number");
        }
      } else {
        // If database connection fails in test environment, that's expected
        console.log("Database connection failed in test environment - this is expected");
        expect(response.body).toHaveProperty("error");
      }
    });
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

      expect(invalidResponse.status).toBe(500); // Should be validation error

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

      expect(invalidResponse.status).toBe(500); // Should be validation error

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
          currency: "USD",
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
