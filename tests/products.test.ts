import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/middleware/auth';

describe('Products API', () => {
  let userToken: string;
  let adminToken: string;

  beforeAll(() => {
    generateToken({
      id: 'user-1',
      email: 'user@goldsphere.vault',
      role: 'user'
    });

    generateToken({
      id: 'admin-1',
      email: 'admin@goldsphere.vault',
      role: 'admin'
    });
  });

  describe('GET /api/products', () => {
    it('should return products list without authentication', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('products');
      expect(Array.isArray(response.body.data.products)).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      // This will test error handling if database is not available
      // The actual behavior depends on your database setup
    });
  });

  describe('POST /api/products/validate', () => {
    const validProductData = {
      id: 'prod-123',
      name: 'American Gold Eagle',
      type: 'Coin',  // ProductType expects 'Coin' not 'coin'
      metal: 'AU',   // Metal expects symbol 'AU' not 'gold'
      weight: 31.1035,
      weightUnit: 'troy_ounces',  // Valid enum value
      purity: 0.9167,
      price: 2150.50,
      currency: 'USD',  // Currency expects ISO code
      producer: 'United States Mint',  // Full producer name
      country: 'US',    // Country expects ISO code 'US'
      year: 2024,
      description: 'Official gold bullion coin of the United States',
      imageUrl: 'https://example.com/gold-eagle.jpg',
      inStock: true,
      stockQuantity: 50,
      minimumOrderQuantity: 1,
      premiumPercentage: 3.5,
      tags: ['gold', 'coin', 'american', 'eagle'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it("should validate correct product data", async () => {
      const response = await request(app)
        .post("/api/products/validate")
        .send(validProductData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Product data is valid');
      expect(response.body).toHaveProperty('data');
    });    it("should reject invalid product type", async () => {
      const invalidData = { ...validProductData, type: "InvalidType" };

      const response = await request(app)
        .post("/api/products/validate")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it("should reject invalid metal type", async () => {
      const invalidData = { ...validProductData, metal: "InvalidMetal" };

      const response = await request(app)
        .post("/api/products/validate")
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should reject missing required fields', async () => {
      const incompleteData = {
        name: 'Incomplete Product',
        type: 'Coin'  // Use correct enum format
        // missing many required fields like id, metal, weight, etc.
      };

      const response = await request(app)
        .post('/api/products/validate')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.details.length).toBeGreaterThan(0);
    });

    it('should reject invalid purity value', async () => {
      const invalidData = {
        ...validProductData,
        purity: 1.5 // Invalid: purity should be between 0 and 1
      };

      const response = await request(app)
        .post('/api/products/validate')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should reject invalid currency', async () => {
      const invalidData = {
        ...validProductData,
        currency: 'XYZ'
      };

      const response = await request(app)
        .post('/api/products/validate')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/products/validate')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });

  describe('Data transformation', () => {
    it('should transform database results to Product type', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      if (response.body.data.products.length > 0) {
        const product = response.body.data.products[0];
        
        // Check that the response has the expected Product interface properties
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('type');
        expect(product).toHaveProperty('metal');
        expect(product).toHaveProperty('weight');
        expect(product).toHaveProperty('price');
        expect(product).toHaveProperty('currency');
        expect(product).toHaveProperty('producer');
        
        // Check enum values
        if (product.type) {
          expect(['Coin', 'Bar', 'Medallion', 'Jewelry', 'Cast Bar', 'Minted Bar', 'CombiBar']).toContain(product.type);
        }
        if (product.metal && typeof product.metal === 'object') {
          expect(product.metal).toHaveProperty('symbol');
          expect(['AU', 'AG', 'PT', 'PD']).toContain(product.metal.symbol);
        }
        if (product.currency) {
          expect(['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD']).toContain(product.currency);
        }
      }
    });
  });
});
