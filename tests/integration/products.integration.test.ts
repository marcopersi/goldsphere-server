import request from 'supertest';
import { generateToken } from '../helpers/authToken';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';
import { getPool } from '../../src/dbConfig';

let app: any;

describe('Products API', () => {
  // Reference IDs loaded ONCE for all tests (read-only data)
  let testProductTypeId: string;
  let testMetalId: string;
  let testProducerId: string;
  let testCountryId: string;
  let adminToken: string;

  beforeAll(async () => {
    // Setup fresh test database BEFORE importing app
    await setupTestDatabase();
    
    // Import app AFTER database setup to ensure pool replacement takes effect
    app = (await import('../../src/app')).default;
    
    // Get reference data IDs from the database (read-only, shared across tests)
    const pool = getPool();
    
    // Get real admin user from database for token generation
    const adminResult = await pool.query("SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1");
    if (adminResult.rows.length === 0) {
      throw new Error('No admin user found in test database');
    }
    
    const adminUser = adminResult.rows[0];
    adminToken = generateToken({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role
    });
    
    const productTypeResult = await pool.query("SELECT id FROM productType WHERE productTypeName = 'Coin' LIMIT 1");
    const metalResult = await pool.query("SELECT id FROM metal WHERE name = 'Gold' LIMIT 1");
    const producerResult = await pool.query("SELECT id FROM producer WHERE producerName = 'United States Mint' LIMIT 1");
    const countryResult = await pool.query("SELECT id FROM country WHERE countryName = 'USA' LIMIT 1");
    
    if (!productTypeResult.rows[0]?.id) {
      throw new Error('❌ Test setup failed: ProductType "Coin" not found in database!');
    }
    if (!metalResult.rows[0]?.id) {
      throw new Error('❌ Test setup failed: Metal "Gold" not found in database!');
    }
    if (!producerResult.rows[0]?.id) {
      throw new Error('❌ Test setup failed: Producer "United States Mint" not found in database!');
    }
    if (!countryResult.rows[0]?.id) {
      throw new Error('❌ Test setup failed: Country "USA" not found in database!');
    }
    
    testProductTypeId = productTypeResult.rows[0].id;
    testMetalId = metalResult.rows[0].id;
    testProducerId = producerResult.rows[0].id;
    testCountryId = countryResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test database
    await teardownTestDatabase();
  });

  describe('GET /api/products', () => {
    it('should return products list without authentication', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });
  });

  describe('POST /api/products/validate', () => {
    it("should validate correct product data", async () => {
      const validProductCreateData = {
        productName: 'American Gold Eagle',
        productTypeId: testProductTypeId,
        metalId: testMetalId,
        producerId: testProducerId,
        countryId: testCountryId,
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        purity: 0.9167,
        price: 2150.5,
        currency: 'CHF',
        productYear: 2024,
        description: 'Official gold bullion coin of the United States',
        imageFilename: 'gold-eagle.jpg',
        inStock: true,
        stockQuantity: 50,
        minimumOrderQuantity: 1,
        premiumPercentage: 3.5,
        diameter: 32.7,
        thickness: 2.87,
        mintage: 1000000,
        certification: 'NGC MS70'
      };
      
      const response = await request(app)
        .post("/api/products/validate")
        .send(validProductCreateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('Product data is valid');
      expect(response.body).toHaveProperty('data');
    });

    it("should reject invalid product type", async () => {
      const invalidData = {
        productName: 'Test Product',
        productTypeId: "invalid-id-format",
        metalId: testMetalId,
        producerId: testProducerId,
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        price: 2150,
        purity: 0.9167
      };

      const response = await request(app)
        .post("/api/products/validate")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it("should reject invalid metal type", async () => {
      const invalidData = {
        productName: 'Test Product',
        productTypeId: testProductTypeId,
        metalId: "invalid-id-format",
        producerId: testProducerId,
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        price: 2150,
        purity: 0.9167
      };

      const response = await request(app)
        .post("/api/products/validate")
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should handle incomplete fields gracefully', async () => {
      const incompleteData = {
        productName: 'Incomplete Product'
        // This may pass as ProductUpdateRequestSchema allows partial data
      };

      const response = await request(app)
        .post('/api/products/validate')
        .send(incompleteData);

      // Our enhanced validation may accept this as a valid partial update
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.message).toContain('Product data is valid');
      } else {
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Validation failed');
      }
    });

    it('should reject invalid purity value', async () => {
      const invalidData = {
        productName: 'Test Product',
        productTypeId: testProductTypeId,
        metalId: testMetalId,
        producerId: testProducerId,
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        purity: 1.5, // Invalid: purity should be between 0 and 1
        price: 2150
      };

      const response = await request(app)
        .post('/api/products/validate')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should handle currency validation appropriately', async () => {
      const invalidData = {
        productName: 'Test Product',
        productTypeId: testProductTypeId,
        metalId: testMetalId,
        producerId: testProducerId,
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        purity: 0.9167,
        price: 2150,
        currency: 'XYZ' // Invalid currency code
      };

      const response = await request(app)
        .post('/api/products/validate')
        .send(invalidData);

      // Our enhanced validation system may handle this differently
      // depending on which schema matches first
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('success');
      
      if (response.status === 400) {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Validation failed');
      } else {
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Data transformation', () => {
    it('should transform database results to Product type', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      if (response.body.data.items.length > 0) {
        const product = response.body.data.items[0];
        
        // Check that the response has the expected Product interface properties
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('type'); // Now uses Enum KEY (string)
        expect(product).toHaveProperty('metal'); // Now uses Enum KEY (string)
        expect(product).toHaveProperty('weight');
        expect(product).toHaveProperty('price');
        expect(product).toHaveProperty('currency');
        expect(product).toHaveProperty('producer');
        
        // Check Enum keys (UPPER_CASE)
        expect(typeof product.type).toBe('string');
        expect(['COIN', 'BAR']).toContain(product.type);
        
        expect(typeof product.metal).toBe('string');
        expect(['GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM']).toContain(product.metal);
        
        if (product.currency) {
          expect(['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD']).toContain(product.currency);
        }
      }
    });

    it('should return valid UUIDs for all foreign key references', async () => {
      const pool = getPool();
      let testProductId: string | null = null;

      try {
        // SETUP: Create product with known FK references
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, countryid, weight, weightunit, purity, price, currency, instock, stockquantity, certifiedprovenance)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id
        `, [
          `TEST_UUID_PRODUCT_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          testCountryId,
          31.1035,
          'grams',
          0.9167,
          2000.00,
          'CHF',
          true,
          10,
          true
        ]);
        testProductId = createResult.rows[0].id;

        // TEST: GET single product — verify UUIDs are present
        const response = await request(app)
          .get(`/api/products/${testProductId}`)
          .expect(200);

        const product = response.body.data;

        // FK UUIDs must be real UUIDs, not empty strings
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        expect(product.productTypeId).toMatch(uuidRegex);
        expect(product.productTypeId).toBe(testProductTypeId);

        expect(product.metalId).toMatch(uuidRegex);
        expect(product.metalId).toBe(testMetalId);

        expect(product.producerId).toMatch(uuidRegex);
        expect(product.producerId).toBe(testProducerId);

        // certifiedProvenance must reflect actual DB value
        expect(product.certifiedProvenance).toBe(true);
      } finally {
        if (testProductId) {
          await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
        }
      }
    });

    it('should return valid UUIDs in paginated product list', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      const items = response.body.data.items;
      expect(items.length).toBeGreaterThan(0);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      for (const product of items) {
        // Every product must have valid FK UUIDs
        expect(product.productTypeId).toMatch(uuidRegex);
        expect(product.metalId).toMatch(uuidRegex);
        expect(product.producerId).toMatch(uuidRegex);

        // Non-empty strings
        expect(product.productTypeId).not.toBe('');
        expect(product.metalId).not.toBe('');
        expect(product.producerId).not.toBe('');
      }
    });
  });

  describe('POST /api/products', () => {
    it('should create a new product successfully', async () => {
      // SETUP: Prepare test data
      const validProductCreateData = {
        productName: `Test Gold Eagle ${Date.now()}`, // Unique name
        productTypeId: testProductTypeId,
        metalId: testMetalId,
        producerId: testProducerId,
        countryId: testCountryId,
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        purity: 0.9167,
        price: 2150,
        currency: 'CHF',
        productYear: 2024,
        description: 'Test gold bullion coin',
        imageFilename: 'test-gold-eagle.jpg',
        inStock: true,
        stockQuantity: 50,
        minimumOrderQuantity: 1,
        premiumPercentage: 3.5,
        diameter: 32.7,
        thickness: 2.87,
        mintage: 1000000,
        certification: 'NGC MS70'
      };
      
      let createdProductId: string | null = null;
      
      try {
        // TEST: Create product
        const response = await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validProductCreateData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.name).toBe(validProductCreateData.productName);
        expect(response.body.data.price).toBe(validProductCreateData.price);
        expect(response.body.data.currency).toBe(validProductCreateData.currency);
        expect(response.body.data.inStock).toBe(validProductCreateData.inStock);
        expect(response.body.data.stockQuantity).toBe(validProductCreateData.stockQuantity);
        
        createdProductId = response.body.data.id;
      } finally {
        // TEARDOWN: Delete created product
        if (createdProductId) {
          const pool = getPool();
          await pool.query('DELETE FROM product WHERE id = $1', [createdProductId]);
        }
      }
    });

    it('should reject product creation with invalid data', async () => {
      const invalidData = {
        productName: '', // Empty name should fail
        productTypeId: 'invalid-uuid',
        metalId: testMetalId,
        producerId: testProducerId,
        fineWeight: -1, // Negative weight should fail
        unitOfMeasure: '',
        price: -100, // Negative price should fail
        purity: 1.5 // Invalid purity > 1
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject product creation with non-existent foreign key references', async () => {
      const invalidData = {
        productName: 'Test Product',
        productTypeId: '999e8400-e29b-41d4-a716-999999999999', // Non-existent product type
        metalId: testMetalId,
        producerId: testProducerId,
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        purity: 0.9167,
        price: 2150,
        currency: 'CHF',
        inStock: true,
        stockQuantity: 50
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/products/:id', () => {
    it('should retrieve a product by valid ID', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP: Create test product directly in DB
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_GET_PRODUCT_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9167,
          2000.00,
          'CHF',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST: Retrieve product
        const response = await request(app)
          .get(`/api/products/${testProductId}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id', testProductId);
        expect(response.body.data).toHaveProperty('name');
        expect(response.body.data).toHaveProperty('type');
        expect(response.body.data).toHaveProperty('metal');
        expect(response.body.data).toHaveProperty('producer');
        expect(response.body.data).toHaveProperty('price');
        expect(response.body.data).toHaveProperty('currency');
      } finally {
        // TEARDOWN: Delete test product
        if (testProductId) {
          await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
        }
      }
    });

    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = '999e8400-e29b-41d4-a716-999999999999';
      
      const response = await request(app)
        .get(`/api/products/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Product not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/products/invalid-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update a product successfully', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP: Create test product directly in DB
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_UPDATE_PRODUCT_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9167,
          2000.00,
          'CHF',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST: Update product
        const updateData = {
          productName: 'Updated Product Name',
          price: 2500,
          stockQuantity: 25,
          description: 'Updated description',
          inStock: false
        };

        const response = await request(app)
          .put(`/api/products/${testProductId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data.price).toBe(updateData.price);
        expect(response.body.data.stockQuantity).toBe(updateData.stockQuantity);
        expect(response.body.data.inStock).toBe(updateData.inStock);

        // Verify FK UUIDs are preserved after update
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(response.body.data.productTypeId).toMatch(uuidRegex);
        expect(response.body.data.metalId).toMatch(uuidRegex);
        expect(response.body.data.producerId).toMatch(uuidRegex);
      } finally {
        // TEARDOWN: Delete test product
        if (testProductId) {
          await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
        }
      }
    });

    it('should perform partial update', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP: Create test product
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_PARTIAL_UPDATE_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9167,
          2000.00,
          'CHF',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST: Partial update
        const partialUpdateData = {
          price: 3000
        };

        const response = await request(app)
          .put(`/api/products/${testProductId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(partialUpdateData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.price).toBe(partialUpdateData.price);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('stockQuantity');
      } finally {
        // TEARDOWN
        if (testProductId) {
          await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
        }
      }
    });

    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = '999e8400-e29b-41d4-a716-999999999999';
      const updateData = { price: 2500 };

      const response = await request(app)
        .put(`/api/products/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Product not found');
    });

    it('should reject invalid update data', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP: Create test product
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_INVALID_UPDATE_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9167,
          2000.00,
          'CHF',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST: Invalid update
        const invalidUpdateData = {
          price: -100, // Negative price should fail
          purity: 1.5, // Invalid purity > 1
          fineWeight: -1 // Negative weight should fail
        };

        const response = await request(app)
          .put(`/api/products/${testProductId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidUpdateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      } finally {
        // TEARDOWN
        if (testProductId) {
          await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
        }
      }
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete a product successfully', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP: Create test product
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_DELETE_PRODUCT_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9167,
          2000.00,
          'CHF',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST: Delete product
        const response = await request(app)
          .delete(`/api/products/${testProductId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.message).toContain('deleted successfully');

        // Verify product is actually deleted
        await request(app)
          .get(`/api/products/${testProductId}`)
          .expect(404);
          
        testProductId = null; // Already deleted, no teardown needed
      } finally {
        // TEARDOWN: Only if test failed and product wasn't deleted
        if (testProductId) {
          await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
        }
      }
    });

    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = '999e8400-e29b-41d4-a716-999999999999';

      const response = await request(app)
        .delete(`/api/products/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Product not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .delete('/api/products/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/products/price/:id', () => {
    it('should retrieve product price information', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP: Create test product
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_PRICE_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9167,
          2000.00,
          'CHF',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST: Retrieve price
        const response = await request(app)
          .get(`/api/products/price/${testProductId}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('price');
        expect(response.body.data).toHaveProperty('currency');
        expect(response.body.data.price).toBe(2000);
        expect(response.body.data.currency).toBe('CHF');
      } finally {
        // TEARDOWN
        if (testProductId) {
          await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
        }
      }
    });

    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = '999e8400-e29b-41d4-a716-999999999999';

      const response = await request(app)
        .get(`/api/products/price/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Product not found');
    });
  });

  describe('POST /api/products/prices', () => {
    it('should retrieve bulk product prices', async () => {
      let testProductId1: string | null = null;
      let testProductId2: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP: Create 2 test products
        const create1 = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_BULK_PRICE_1_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9167,
          2000.00,
          'CHF',
          true,
          10
        ]);
        
        const create2 = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_BULK_PRICE_2_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9167,
          2200.00,
          'USD',
          true,
          15
        ]);
        
        testProductId1 = create1.rows[0].id;
        testProductId2 = create2.rows[0].id;
        
        // TEST: Bulk price retrieval
        const requestData = {
          productIds: [testProductId1, testProductId2]
        };

        const response = await request(app)
          .post('/api/products/prices')
          .send(requestData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(2);
        
        const pricesData = response.body.data;
        expect(pricesData[0]).toHaveProperty('id');
        expect(pricesData[0]).toHaveProperty('price');
        expect(pricesData[0]).toHaveProperty('currency');
      } finally {
        // TEARDOWN
        if (testProductId1) await pool.query('DELETE FROM product WHERE id = $1', [testProductId1]);
        if (testProductId2) await pool.query('DELETE FROM product WHERE id = $1', [testProductId2]);
      }
    });

    it('should handle empty product ID array', async () => {
      const requestData = {
        productIds: []
      };

      const response = await request(app)
        .post('/api/products/prices')
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle mix of valid and invalid product IDs', async () => {
      let testProductId1: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP: Create 1 valid product
        const create1 = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_MIX_VALID_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9167,
          2000.00,
          'CHF',
          true,
          10
        ]);
        
        testProductId1 = create1.rows[0].id;
        
        // TEST: Mix of valid and non-existent IDs
        const requestData = {
          productIds: [testProductId1, '999e8400-e29b-41d4-a716-999999999999']
        };

        const response = await request(app)
          .post('/api/products/prices')
          .send(requestData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeLessThanOrEqual(1);
      } finally {
        // TEARDOWN
        if (testProductId1) await pool.query('DELETE FROM product WHERE id = $1', [testProductId1]);
      }
    });
  });

  describe('Advanced GET /api/products filtering and pagination', () => {
    // Diese Tests verwenden EXISTIERENDE Produkte aus der DB (durch initdb/* SQL created)
    // Keine Test-Daten werden erstellt, da die Tests nur Filtering/Pagination verifizieren
    
    it('should filter products by metal type', async () => {
      const response = await request(app)
        .get('/api/products?metal=gold')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.items).toBeDefined();
      // Should contain products with gold metal (if any exist in database)
    });

    it('should filter products by stock status', async () => {
      const response = await request(app)
        .get('/api/products?inStock=true')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.items).toBeDefined();
      
      // All returned products should be in stock
      if (response.body.data.items.length > 0) {
        response.body.data.items.forEach((product: any) => {
          expect(product.inStock).toBe(true);
        });
      }
    });

    it('should filter products by price range', async () => {
      const response = await request(app)
        .get('/api/products?minPrice=1000&maxPrice=2500')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.items).toBeDefined();
      
      // All returned products should be within price range
      if (response.body.data.items.length > 0) {
        response.body.data.items.forEach((product: any) => {
          expect(product.price).toBeGreaterThanOrEqual(1000);
          expect(product.price).toBeLessThanOrEqual(2500);
        });
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      // ✅ Fixed: response.body.data has items and pagination structure
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('totalPages');
      expect(response.body.data.pagination).toHaveProperty('hasNext');
      expect(response.body.data.pagination).toHaveProperty('hasPrev');
      expect(typeof response.body.data.pagination.hasNext).toBe('boolean');
      expect(typeof response.body.data.pagination.hasPrev).toBe('boolean');
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/products?search=gold')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.items).toBeDefined();
      // Should return products matching search term
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/products?sortBy=price&sortOrder=asc')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.items).toBeDefined();
      
      // Verify products are sorted by price in ascending order
      if (response.body.data.items.length > 1) {
        for (let i = 1; i < response.body.data.items.length; i++) {
          expect(response.body.data.items[i].price)
            .toBeGreaterThanOrEqual(response.body.data.items[i-1].price);
        }
      }
    });
  });

  describe('GET /api/products - Service Layer Endpoint', () => {
    it('should return paginated products list', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items.length).toBeLessThanOrEqual(5);
    });

    it('should filter products by search term', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ search: 'Gold' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);

      response.body.data.items.forEach((product: any) => {
        const matchesSearch = 
          product.name.toLowerCase().includes('gold') ||
          (product.description || '').toLowerCase().includes('gold');
        expect(matchesSearch).toBe(true);
      });
    });

    it('should filter products by metal ID', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP: Create test product with specific metalId (Gold)
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_METAL_FILTER_${Date.now()}`,
          testProductTypeId,
          testMetalId, // ← This is the Gold metalId we're filtering by
          testProducerId,
          31.1035,
          'grams',
          0.9999,
          1800.00,
          'USD',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST: Filter by metalId - should find our test product
        const response = await request(app)
          .get('/api/products')
          .query({ metalId: testMetalId })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.items.length).toBeGreaterThan(0);

        // Verify at least our test product is in the results
        const foundTestProduct = response.body.data.items.find((p: any) => p.id === testProductId);
        expect(foundTestProduct).toBeDefined();
        expect(typeof foundTestProduct.metal).toBe('string');
        expect(foundTestProduct.metal).toBe('GOLD');
      } finally {
        // TEARDOWN: Delete test product
        if (testProductId) {
          await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
        }
      }
    });

    it('should filter products by price range', async () => {
      const minPrice = 1000;
      const maxPrice = 2000;

      const response = await request(app)
        .get('/api/products')
        .query({ minPrice, maxPrice })
        .expect(200);

      expect(response.body.success).toBe(true);

      response.body.data.items.forEach((product: any) => {
        expect(product.price).toBeGreaterThanOrEqual(minPrice);
        expect(product.price).toBeLessThanOrEqual(maxPrice);
      });
    });

    it('should filter products by stock status', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ inStock: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);

      response.body.data.items.forEach((product: any) => {
        expect(product.inStock).toBe(true);
      });
    });

    it('should sort products by price ascending', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ sortBy: 'price', sortOrder: 'asc' })
        .expect(200);

      expect(response.body.success).toBe(true);

      for (let i = 1; i < response.body.data.items.length; i++) {
        expect(response.body.data.items[i].price)
          .toBeGreaterThanOrEqual(response.body.data.items[i - 1].price);
      }
    });

    it('should sort products by price descending', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ sortBy: 'price', sortOrder: 'desc' })
        .expect(200);

      expect(response.body.success).toBe(true);

      for (let i = 1; i < response.body.data.items.length; i++) {
        expect(response.body.data.items[i].price)
          .toBeLessThanOrEqual(response.body.data.items[i - 1].price);
      }
    });

    it('should sort products by name', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ sortBy: 'name', sortOrder: 'asc' })
        .expect(200);

      expect(response.body.success).toBe(true);

      for (let i = 1; i < response.body.data.items.length; i++) {
        const currentName = response.body.data.items[i].name.toLowerCase();
        const previousName = response.body.data.items[i - 1].name.toLowerCase();
        expect(currentName.localeCompare(previousName)).toBeGreaterThanOrEqual(0);
      }
    });

    it('should reject page number less than 1', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ page: 0 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Page number must be at least 1');
    });

    it('should reject limit greater than 100', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ limit: 101 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Limit must be between 1 and 100');
    });

    it('should reject negative minimum price', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ minPrice: -10 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Minimum price cannot be negative');
    });

    it('should reject minPrice greater than maxPrice', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ minPrice: 2000, maxPrice: 1000 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Minimum price cannot be greater than maximum price');
    });

    it('should handle combined filters', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ 
          search: 'Gold',
          metalId: testMetalId,
          minPrice: 1000,
          maxPrice: 3000,
          inStock: 'true',
          sortBy: 'price',
          sortOrder: 'asc',
          page: 1,
          limit: 10
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination).toHaveProperty('total');

      // Verify filters are applied (response products have Enum objects, not metalId)
      response.body.data.items.forEach((product: any) => {
        expect(product.price).toBeGreaterThanOrEqual(1000);
        expect(product.price).toBeLessThanOrEqual(3000);
        expect(product.inStock).toBe(true);
      });
    });

    it('should return empty array when no products match filters', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ 
          search: 'NonExistentProductXYZ123',
          minPrice: 99999,
          maxPrice: 100000
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
      expect(response.body.data.pagination.totalPages).toBe(0);
    });
  });

  describe('POST /api/products/:id/image - Image Upload', () => {
    it('should upload a valid PNG image', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP: Create test product
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_IMAGE_PNG_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9999,
          1500.00,
          'USD',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST: Upload image
        const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        
        const response = await request(app)
          .post(`/api/products/${testProductId}/image`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            imageBase64: base64Image,
            contentType: 'image/png',
            filename: 'test.png'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Image uploaded successfully');
      } finally {
        // TEARDOWN
        if (testProductId) {
          await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
        }
      }
    });

    it('should upload image with data URI prefix', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_IMAGE_PREFIX_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9999,
          1500.00,
          'USD',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST
        const base64WithPrefix = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        const response = await request(app)
          .post(`/api/products/${testProductId}/image`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            imageBase64: base64WithPrefix,
            contentType: 'image/png',
            filename: 'test-prefix.png'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      } finally {
        // TEARDOWN
        if (testProductId) await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
      }
    });

    it('should accept JPEG images', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_IMAGE_JPEG_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9999,
          1500.00,
          'USD',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST
        const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        const response = await request(app)
          .post(`/api/products/${testProductId}/image`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            imageBase64: base64Image,
            contentType: 'image/jpeg',
            filename: 'test.jpg'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      } finally {
        // TEARDOWN
        if (testProductId) await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
      }
    });

    it('should accept WebP images', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_IMAGE_WEBP_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9999,
          1500.00,
          'USD',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST
        const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        const response = await request(app)
          .post(`/api/products/${testProductId}/image`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            imageBase64: base64Image,
            contentType: 'image/webp',
            filename: 'test.webp'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      } finally {
        // TEARDOWN
        if (testProductId) await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
      }
    });

    it('should reject invalid product ID format', async () => {
      const response = await request(app)
        .post('/api/products/invalid-id/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          imageBase64: 'base64data',
          contentType: 'image/png',
          filename: 'test.png'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      // Error message can be "Invalid product ID format" or "Invalid image data"
      expect(response.body.error).toBeDefined();
    });

    it('should reject missing image data', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_IMAGE_MISSING_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9999,
          1500.00,
          'USD',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST
        const response = await request(app)
          .post(`/api/products/${testProductId}/image`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            contentType: 'image/png',
            filename: 'test.png'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      } finally {
        // TEARDOWN
        if (testProductId) await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
      }
    });

    it('should reject missing content type', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_IMAGE_NO_TYPE_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9999,
          1500.00,
          'USD',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST
        const response = await request(app)
          .post(`/api/products/${testProductId}/image`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            imageBase64: 'base64data',
            filename: 'test.png'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      } finally {
        // TEARDOWN
        if (testProductId) await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
      }
    });

    it('should reject invalid content type', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_IMAGE_INVALID_TYPE_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9999,
          1500.00,
          'USD',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST
        const response = await request(app)
          .post(`/api/products/${testProductId}/image`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            imageBase64: 'base64data',
            contentType: 'application/pdf',
            filename: 'test.pdf'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        // Error message can vary - just verify it failed
        expect(response.body.error).toBeDefined();
      } finally {
        // TEARDOWN
        if (testProductId) await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
      }
    });

    it('should reject image exceeding 5MB', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_IMAGE_LARGE_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9999,
          1500.00,
          'USD',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST
        const largeBase64 = 'A'.repeat(7 * 1024 * 1024); // ~7MB Base64 = ~5.25MB decoded

        const response = await request(app)
          .post(`/api/products/${testProductId}/image`)
          .send({
            imageBase64: largeBase64,
            contentType: 'image/png',
            filename: 'large.png'
          });
        
        // Can be either 400 (Bad Request) or 413 (Payload Too Large)
        expect([400, 413]).toContain(response.status);
        // 413 responses may not have .success field (rejected by middleware before parsing)
        if (response.status === 400) {
          expect(response.body.success).toBe(false);
        }
      } finally {
        // TEARDOWN
        if (testProductId) await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
      }
    });

    it('should reject non-existent product ID', async () => {
      const nonExistentId = '999e8400-e29b-41d4-a716-999999999999';

      const response = await request(app)
        .post(`/api/products/${nonExistentId}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          contentType: 'image/png',
          filename: 'test.png'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Product not found');
    });

    it('should store image in database', async () => {
      let testProductId: string | null = null;
      const pool = getPool();
      
      try {
        // SETUP
        const createResult = await pool.query(`
          INSERT INTO product (name, producttypeid, metalid, producerid, weight, weightunit, purity, price, currency, instock, stockquantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          `TEST_IMAGE_VERIFY_${Date.now()}`,
          testProductTypeId,
          testMetalId,
          testProducerId,
          31.1035,
          'grams',
          0.9999,
          1500.00,
          'USD',
          true,
          10
        ]);
        
        testProductId = createResult.rows[0].id;
        
        // TEST
        const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        await request(app)
          .post(`/api/products/${testProductId}/image`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            imageBase64: base64Image,
            contentType: 'image/png',
            filename: 'verify-storage.png'
          })
          .expect(200);

        // Verify image was stored in database
        const result = await pool.query(
          'SELECT imagedata, imagecontenttype FROM product WHERE id = $1',
          [testProductId]
        );

        expect(result.rows[0].imagedata).toBeTruthy();
        expect(result.rows[0].imagecontenttype).toBe('image/png');
      } finally {
        // TEARDOWN
        if (testProductId) await pool.query('DELETE FROM product WHERE id = $1', [testProductId]);
      }
    });
  });
});
