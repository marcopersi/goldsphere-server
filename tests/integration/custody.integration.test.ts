import request from "supertest";
import { setupTestDatabase, teardownTestDatabase } from './db-setup';
import { getPool } from '../../src/dbConfig';

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
      authToken = loginResponse.body.data.accessToken;
    }
  });

  describe("Custodians API", () => {
    it("should require authentication for GET /custodians", async () => {
      const response = await request(app)
        .get("/api/custodians");
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
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

      // Should either succeed or fail with a meaningful error (not internal server error)
      expect([200, 201, 400, 409]).toContain(validResponse.status);
    });
  });

  describe("Custody Services API", () => {
    it("should require authentication for GET /custody", async () => {
      const response = await request(app)
        .get("/api/custody");
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it("should return custody services list with valid auth", async () => {
      if (!authToken) {
        console.log("Skipping auth test - no valid login credentials");
        return;
      }

      const response = await request(app)
        .get("/api/custody")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it("should validate custody service creation schema", async () => {
      if (!authToken) {
        console.log("Skipping auth test - no valid login credentials");
        return;
      }

      // Test invalid request (missing required fields)
      const invalidResponse = await request(app)
        .post("/api/custody")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(invalidResponse.status).toBe(400); // Should be validation error

      // Test valid request structure
      const validResponse = await request(app)
        .post("/api/custody")
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

      // Should either succeed or fail with a meaningful error (not internal server error)
      expect([200, 201, 400, 409]).toContain(validResponse.status);
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

  describe('GET /api/custodians/custodians (paginated)', () => {
    it('should return paginated custodians list', async () => {
      const response = await request(app)
        .get('/api/custodians/custodians?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return custodians without pagination params', async () => {
      const response = await request(app)
        .get('/api/custodians/custodians')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /api/custodians/custodians/:id', () => {
    it('should return a specific custodian by ID', async () => {
      const pool = getPool();
      const existing = await pool.query("SELECT id FROM custodian LIMIT 1");
      const custodianId = existing.rows[0].id;

      const response = await request(app)
        .get(`/api/custodians/custodians/${custodianId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', custodianId);
    });

    it('should return 404 for non-existent custodian', async () => {
      const response = await request(app)
        .get('/api/custodians/custodians/11111111-1111-4111-8111-111111111111')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/custodians/custodians/:id', () => {
    it('should update a custodian', async () => {
      const pool = getPool();
      const insertResult = await pool.query(
        "INSERT INTO custodian (custodianName) VALUES ('TestCustodian') RETURNING id"
      );
      const id = insertResult.rows[0].id;

      try {
        const response = await request(app)
          .put(`/api/custodians/custodians/${id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'UpdatedCustodian' })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      } finally {
        await pool.query('DELETE FROM custodian WHERE id = $1', [id]);
      }
    });
  });

  describe('DELETE /api/custodians/custodians/:id', () => {
    it('should delete a custodian without services', async () => {
      const pool = getPool();
      const insertResult = await pool.query(
        "INSERT INTO custodian (custodianName) VALUES ('ToDeleteCustodian') RETURNING id"
      );
      const id = insertResult.rows[0].id;

      const response = await request(app)
        .delete(`/api/custodians/custodians/${id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });
});
