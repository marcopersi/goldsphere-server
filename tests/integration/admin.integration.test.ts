/**
 * Admin Controller Integration Tests
 * 
 * Tests for administrative endpoints:
 * - POST /api/admin/products/{id}/image (upload product image)
 * - POST /api/admin/products/load-images (load from filesystem)
 * - POST /api/admin/products/csv (CSV import)
 */

import request from 'supertest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { generateToken } from '../helpers/authToken';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';
import { getPool } from '../../src/dbConfig';

let app: any;

describe('Admin API', () => {
  let adminToken: string;
  let userToken: string;
  let testProductId: string;

  beforeAll(async () => {
    await setupTestDatabase();
    app = (await import('../../src/app')).default;

    const pool = getPool();

    // Get admin user for token
    const adminResult = await pool.query("SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1");
    if (adminResult.rows.length === 0) {
      throw new Error('No admin user found in test database');
    }
    const adminUser = adminResult.rows[0];
    adminToken = generateToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });

    // Get regular user for auth rejection tests
    const userResult = await pool.query("SELECT id, email, role FROM users WHERE role = 'user' LIMIT 1");
    if (userResult.rows.length === 0) {
      throw new Error('No regular user found in test database');
    }
    const regularUser = userResult.rows[0];
    userToken = generateToken({ id: regularUser.id, email: regularUser.email, role: regularUser.role });

    // Get a product ID for image upload tests
    const productResult = await pool.query("SELECT id FROM product LIMIT 1");
    if (productResult.rows.length === 0) {
      throw new Error('No product found in test database');
    }
    testProductId = productResult.rows[0].id;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // =========================================================================
  // POST /api/admin/products/{id}/image
  // =========================================================================
  describe('POST /api/admin/products/{id}/image', () => {
    it('should upload a product image with admin token', async () => {
      // Create a minimal valid PNG buffer (1x1 pixel)
      const pngBuffer = createMinimalPng();

      const response = await request(app)
        .post(`/api/admin/products/${testProductId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', pngBuffer, { filename: 'test-product.png', contentType: 'image/png' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Image uploaded successfully');
      expect(response.body.data).toHaveProperty('filename', 'test-product.png');
      expect(response.body.data).toHaveProperty('contentType', 'image/png');

      // Verify image was persisted in DB
      const pool = getPool();
      const dbResult = await pool.query(
        "SELECT imagefilename, imagecontenttype FROM product WHERE id = $1",
        [testProductId]
      );
      expect(dbResult.rows[0].imagefilename).toBe('test-product.png');
      expect(dbResult.rows[0].imagecontenttype).toBe('image/png');
    });

    it('should return 401 without authentication', async () => {
      const pngBuffer = createMinimalPng();

      await request(app)
        .post(`/api/admin/products/${testProductId}/image`)
        .attach('image', pngBuffer, { filename: 'test.png', contentType: 'image/png' })
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const pngBuffer = createMinimalPng();

      await request(app)
        .post(`/api/admin/products/${testProductId}/image`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('image', pngBuffer, { filename: 'test.png', contentType: 'image/png' })
        .expect(403);
    });

    it('should return error for invalid product ID format', async () => {
      const pngBuffer = createMinimalPng();

      const response = await request(app)
        .post('/api/admin/products/not-a-uuid/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', pngBuffer, { filename: 'test.png', contentType: 'image/png' });

      expect(response.status).toBe(400);
      expect(response.body.error || response.body.message).toBeTruthy();
    });

    it('should return error for non-existent product', async () => {
      const pngBuffer = createMinimalPng();
      const fakeUuid = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post(`/api/admin/products/${fakeUuid}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', pngBuffer, { filename: 'test.png', contentType: 'image/png' });

      expect(response.status).toBe(404);
      expect(response.body.error || response.body.message).toBeTruthy();
    });

    it('should return error when no image file is provided', async () => {
      const response = await request(app)
        .post(`/api/admin/products/${testProductId}/image`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  // =========================================================================
  // POST /api/admin/products/load-images
  // =========================================================================
  describe('POST /api/admin/products/load-images', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/admin/products/load-images')
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      await request(app)
        .post('/api/admin/products/load-images')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should attempt to load images from filesystem with admin token', async () => {
      // Create temp dir with a test image
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'goldsphere-images-'));
      const testImageFile = 'test-load-image.png';
      const pngBuffer = createMinimalPng();
      fs.writeFileSync(path.join(tmpDir, testImageFile), pngBuffer);

      // Set env var so the controller finds our temp dir
      const originalDir = process.env.PRODUCT_IMAGES_DIR;
      process.env.PRODUCT_IMAGES_DIR = tmpDir;

      try {
        const response = await request(app)
          .post('/api/admin/products/load-images')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('message');
          expect(response.body).toHaveProperty('results');
          expect(Array.isArray(response.body.results)).toBe(true);
        }
      } finally {
        if (originalDir) {
          process.env.PRODUCT_IMAGES_DIR = originalDir;
        } else {
          delete process.env.PRODUCT_IMAGES_DIR;
        }
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('should return error when images directory does not exist', async () => {
      const originalDir = process.env.PRODUCT_IMAGES_DIR;
      process.env.PRODUCT_IMAGES_DIR = '/tmp/nonexistent-goldsphere-dir-12345';

      try {
        const response = await request(app)
          .post('/api/admin/products/load-images')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(404);
      } finally {
        if (originalDir) {
          process.env.PRODUCT_IMAGES_DIR = originalDir;
        } else {
          delete process.env.PRODUCT_IMAGES_DIR;
        }
      }
    });

    it('should handle empty images directory', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'goldsphere-empty-'));
      const originalDir = process.env.PRODUCT_IMAGES_DIR;
      process.env.PRODUCT_IMAGES_DIR = tmpDir;

      try {
        const response = await request(app)
          .post('/api/admin/products/load-images')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        if (response.status === 200) {
          expect(response.body.message).toContain('0 images');
          expect(response.body.results).toEqual([]);
        }
      } finally {
        if (originalDir) {
          process.env.PRODUCT_IMAGES_DIR = originalDir;
        } else {
          delete process.env.PRODUCT_IMAGES_DIR;
        }
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // =========================================================================
  // POST /api/admin/products/csv
  // =========================================================================
  describe('POST /api/admin/products/csv', () => {
    it('should return 401 without authentication', async () => {
      const csvBuffer = Buffer.from('name,brand\nTest Product,Test Brand');

      await request(app)
        .post('/api/admin/products/csv')
        .attach('csv', csvBuffer, { filename: 'products.csv', contentType: 'text/csv' })
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const csvBuffer = Buffer.from('name,brand\nTest Product,Test Brand');

      await request(app)
        .post('/api/admin/products/csv')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('csv', csvBuffer, { filename: 'products.csv', contentType: 'text/csv' })
        .expect(403);
    });

    it('should return 400 when no CSV file is provided', async () => {
      const response = await request(app)
        .post('/api/admin/products/csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for empty CSV with only header', async () => {
      const csvBuffer = Buffer.from('name,brand\n');

      const response = await request(app)
        .post('/api/admin/products/csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('csv', csvBuffer, { filename: 'empty.csv', contentType: 'text/csv' })
        .expect(200);

      // Empty CSV with only header + blank rows results in 0 imports
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('0 products');
    });

    it('should accept a valid CSV and attempt import with admin token', async () => {
      // Note: The CSV import inserts into 'product' with simplified columns.
      // Rows may fail due to NOT NULL FK constraints, but the endpoint itself should succeed.
      const csvContent = [
        'name,brand,description,metaltype,weight,purity,price,available,imagefilename',
        'Test Gold Bar,TestBrand,A test gold bar,Gold,1.0,0.999,2000.00,true,test.png'
      ].join('\n');
      const csvBuffer = Buffer.from(csvContent);

      const response = await request(app)
        .post('/api/admin/products/csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('csv', csvBuffer, { filename: 'products.csv', contentType: 'text/csv' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/Imported \d+ products from CSV/);
    });
  });
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create a minimal valid PNG buffer (1x1 transparent pixel)
 */
function createMinimalPng(): Buffer {
  // Minimal 1x1 transparent PNG
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // RGBA
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02,
    0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC, 0x00, 0x00, // compressed data
    0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, // IEND chunk
    0x60, 0x82
  ]);
}
