/**
 * Product Image Integration Tests
 * 
 * Tests the binary image endpoint for products
 */

import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';
import { getPool } from '../../src/dbConfig';

let app: any;

describe('Product Image Integration Tests', () => {
  let authToken: string;
  let testProductId: string;

  beforeAll(async () => {
    // Setup fresh test database BEFORE importing app
    await setupTestDatabase();
    
    // Import app AFTER database setup to ensure pool replacement takes effect
    app = (await import('../../src/app')).default;
    
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'bank.technical@goldsphere.vault',
        password: 'GoldspherePassword'
      });

    authToken = loginResponse.body.token;

    // Get a product that has an image
    const pool = getPool();
    const result = await pool.query(
      `SELECT id FROM product WHERE imagedata IS NOT NULL LIMIT 1`
    );
    
    if (result.rows.length > 0) {
      testProductId = result.rows[0].id;
    }
  });

  afterAll(async () => {
    // Clean up test database
    await teardownTestDatabase();
  });

  describe('GET /api/products/:id/image', () => {
    it('should return product image as binary data', async () => {
      if (!testProductId) {
        console.log('⚠️ No product with image found, skipping test');
        return;
      }

      const response = await request(app)
        .get(`/api/products/${testProductId}/image`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\/(jpeg|png|webp)/);
      expect(response.headers['content-disposition']).toContain('inline');
      expect(response.headers['content-length']).toBeDefined();
      expect(parseInt(response.headers['content-length'])).toBeGreaterThan(0);
      
      // Check that response body is a Buffer (binary data)
      expect(Buffer.isBuffer(response.body)).toBe(true);
      
      // Check for JPEG magic number (FF D8 FF) or PNG magic number (89 50 4E 47)
      const firstBytes = response.body.slice(0, 4);
      const isJPEG = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8 && firstBytes[2] === 0xFF;
      const isPNG = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47;
      
      expect(isJPEG || isPNG).toBe(true);
    });

    it('should return 404 for product without image', async () => {
      const pool = getPool();
      const result = await pool.query(
        `SELECT id FROM product WHERE imagedata IS NULL LIMIT 1`
      );

      if (result.rows.length === 0) {
        console.log('⚠️ All products have images, skipping 404 test');
        return;
      }

      const productWithoutImage = result.rows[0].id;

      const response = await request(app)
        .get(`/api/products/${productWithoutImage}/image`);

      console.log('Response status:', response.status);
      console.log('Response body:', response.body);
      
      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/products/${fakeId}/image`);

      expect(response.status).toBe(404);
    });

    it('should have correct Content-Type header for JPEG', async () => {
      if (!testProductId) {
        console.log('⚠️ No product with image found, skipping test');
        return;
      }

      const response = await request(app)
        .get(`/api/products/${testProductId}/image`);

      // Content-Type should be image/jpeg (without charset)
      expect(response.headers['content-type']).not.toContain('charset');
      expect(response.headers['content-type']).toMatch(/^image\/(jpeg|png|webp)$/);
    });

    it('should have Content-Disposition inline header', async () => {
      if (!testProductId) {
        console.log('⚠️ No product with image found, skipping test');
        return;
      }

      const response = await request(app)
        .get(`/api/products/${testProductId}/image`);

      expect(response.headers['content-disposition']).toContain('inline');
      expect(response.headers['content-disposition']).toContain('filename=');
    });
  });

  describe('Product List includes imageUrl', () => {
    it('should return imageUrl in product list response', async () => {
      const response = await request(app)
        .get('/api/products?limit=5');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeDefined();
      expect(Array.isArray(response.body.data.items)).toBe(true);

      // Check that products with images have imageUrl field
      const productsWithImages = response.body.data.items.filter(
        (p: any) => p.imageUrl !== null
      );

      if (productsWithImages.length > 0) {
        const product = productsWithImages[0];
        expect(product.imageUrl).toMatch(/^\/api\/products\/[a-f0-9-]+\/image$/);
      }
    });
  });
});
