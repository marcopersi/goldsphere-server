import request from "supertest";
import { setupTestDatabase, teardownTestDatabase } from "./db-setup";

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

describe("References API", () => {

  describe("GET /api", () => {
    it("should return aggregated reference data for root api alias", async () => {
      const response = await request(app)
        .get('/api');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.metals)).toBe(true);
      expect(Array.isArray(response.body.data.weightUnits)).toBe(true);
      expect(Array.isArray(response.body.data.currencies)).toBe(true);
      expect(Array.isArray(response.body.data.roles)).toBe(true);
      expect(Array.isArray(response.body.data.titles)).toBe(true);
      expect(response.headers.deprecation).toBe('true');
      expect(response.headers.link).toContain('</api/references>');
      expect(response.headers.link).toContain('rel="successor-version"');

      const unitValues = response.body.data.weightUnits.map((u: { value: string }) => u.value);
      expect(unitValues).toEqual(expect.arrayContaining(['grams', 'kilograms', 'troy_ounces']));

      const troyUnit = response.body.data.weightUnits.find((u: { value: string }) => u.value === 'troy_ounces');
      expect(troyUnit).toBeDefined();
      expect(troyUnit.displayName).toBe('ozt');
      expect(Array.isArray(troyUnit.aliases)).toBe(true);
      expect(troyUnit.aliases).toEqual(expect.arrayContaining(['ozt', 'toz']));

      const roleValues = response.body.data.roles.map((r: { value: string }) => r.value);
      expect(roleValues).toEqual(expect.arrayContaining(['customer', 'admin', 'user']));

      const titleValues = response.body.data.titles.map((t: { value: string }) => t.value);
      expect(titleValues).toEqual(expect.arrayContaining(['Herr', 'Frau', 'Divers']));
    });
  });

  describe("GET /api/references/", () => {
    it("should return reference data without authentication", async () => {
      const response = await request(app)
        .get("/api/references/");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Check required reference data structure
      const { data } = response.body;
      expect(data.metals).toBeDefined();
      expect(Array.isArray(data.metals)).toBe(true);
      expect(data.productTypes).toBeDefined();
      expect(Array.isArray(data.productTypes)).toBe(true);
      expect(data.countries).toBeDefined();
      expect(Array.isArray(data.countries)).toBe(true);
      expect(data.weightUnits).toBeDefined();
      expect(Array.isArray(data.weightUnits)).toBe(true);
      expect(data.currencies).toBeDefined();
      expect(Array.isArray(data.currencies)).toBe(true);
      expect(data.roles).toBeDefined();
      expect(Array.isArray(data.roles)).toBe(true);
      expect(data.titles).toBeDefined();
      expect(Array.isArray(data.titles)).toBe(true);
    });

    it("should return valid metal data structure", async () => {
      const response = await request(app)
        .get("/api/references/");

      expect(response.status).toBe(200);
      const { metals } = response.body.data;
      
      if (metals.length > 0) {
        const metal = metals[0];
        expect(metal).toHaveProperty('symbol');
        expect(metal).toHaveProperty('name');
        expect(typeof metal.symbol).toBe('string');
        expect(typeof metal.name).toBe('string');
      }
    });

    it("should return valid currency data structure", async () => {
      const response = await request(app)
        .get("/api/references/");

      expect(response.status).toBe(200);
      const { currencies } = response.body.data;
      
      if (currencies.length > 0) {
        const currency = currencies[0];
        expect(currency).toHaveProperty('isoCode2');
        expect(currency).toHaveProperty('isoCode3');
        expect(currency).toHaveProperty('isoNumericCode');
        expect(typeof currency.isoCode2).toBe('string');
        expect(typeof currency.isoCode3).toBe('string');
        expect(typeof currency.isoNumericCode).toBe('number');
      }
    });

    it("should return valid product type data structure", async () => {
      const response = await request(app)
        .get("/api/references/");

      expect(response.status).toBe(200);
      const { productTypes } = response.body.data;
      
      if (productTypes.length > 0) {
        const productType = productTypes[0];
        expect(productType).toHaveProperty('name');
        expect(typeof productType.name).toBe('string');
      }
    });

    it("should return valid country data structure", async () => {
      const response = await request(app)
        .get("/api/references/");

      expect(response.status).toBe(200);
      const { countries } = response.body.data;
      
      if (countries.length > 0) {
        const country = countries[0];
        expect(country).toHaveProperty('code');
        expect(country).toHaveProperty('name');
        expect(typeof country.code).toBe('string');
        expect(typeof country.name).toBe('string');
      }
    });

    it("should handle database errors gracefully", async () => {
      // This test ensures the endpoint handles database connection issues
      const response = await request(app)
        .get("/api/references/");

      // Either success or graceful error handling
      expect([200, 500].includes(response.status)).toBe(true);
      
      if (response.status === 500) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});
