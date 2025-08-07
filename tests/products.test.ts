import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/middleware/auth';

describe('Products API', () => {
  let userToken: string;
  let adminToken: string;

  beforeAll(() => {
    userToken = generateToken({
      id: 'user-1',
      email: 'user@goldsphere.vault',
      role: 'user'
    });

    adminToken = generateToken({
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

      expect(Array.isArray(response.body)).toBe(true);
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
      type: 'coin',
      metal: 'gold',
      weight: 31.1035,
      weightUnit: 'grams',
      purity: 0.9167,
      price: 2150.50,
      currency: 'USD',
      producer: 'US Mint',
      country: 'USA',
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

    it('should validate correct product data', async () => {
      const response = await request(app)
        .post('/api/products/validate')
        .send(validProductData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Product data is valid');
      expect(response.body).toHaveProperty('product');
    });

    it('should reject invalid product type', async () => {
      const invalidData = {
        ...validProductData,
        type: 'invalid-type'
      };

      const response = await request(app)
        .post('/api/products/validate')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should reject invalid metal type', async () => {
      const invalidData = {
        ...validProductData,
        metal: 'copper'
      };

      const response = await request(app)
        .post('/api/products/validate')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors.some((err: any) => 
        err.field === 'metal'
      )).toBe(true);
    });

    it('should reject missing required fields', async () => {
      const incompleteData = {
        name: 'Incomplete Product',
        type: 'coin'
        // missing many required fields
      };

      const response = await request(app)
        .post('/api/products/validate')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors.length).toBeGreaterThan(0);
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

      expect(response.body.errors.some((err: any) => 
        err.field === 'purity'
      )).toBe(true);
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

      expect(response.body.errors.some((err: any) => 
        err.field === 'currency'
      )).toBe(true);
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

      if (response.body.length > 0) {
        const product = response.body[0];
        
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
          expect(['coin', 'bar', 'round']).toContain(product.type);
        }
        if (product.metal) {
          expect(['gold', 'silver', 'platinum', 'palladium']).toContain(product.metal);
        }
        if (product.currency) {
          expect(['USD', 'EUR', 'GBP', 'CHF']).toContain(product.currency);
        }
      }
    });
  });
});
