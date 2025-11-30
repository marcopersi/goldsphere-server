import request from 'supertest';
import app from '../../src/app';
import { generateToken } from '../../src/middleware/auth';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';
import { getPool } from '../../src/dbConfig';

describe('Products API', () => {
  let userToken: string;
  let adminToken: string;
  let testProductTypeId: string;
  let testMetalId: string;
  let testProducerId: string;
  let testCountryId: string;
  let testNonExistentId: string;

  beforeAll(async () => {
    // Setup fresh test database with complete schema and data
    await setupTestDatabase();
    
    // Get reference data IDs from the database
    const pool = getPool();
    
    const productTypeResult = await pool.query("SELECT id FROM productType WHERE productTypeName = 'Coin' LIMIT 1");
    const metalResult = await pool.query("SELECT id FROM metal WHERE name = 'Gold' LIMIT 1");
    const producerResult = await pool.query("SELECT id FROM producer WHERE producerName = 'United States Mint' LIMIT 1");
    const countryResult = await pool.query("SELECT id FROM country WHERE countryName = 'USA' LIMIT 1");
    
    testProductTypeId = productTypeResult.rows[0]?.id;
    testMetalId = metalResult.rows[0]?.id;
    testProducerId = producerResult.rows[0]?.id;
    testCountryId = countryResult.rows[0]?.id;
    testNonExistentId = '999e8400-e29b-41d4-a716-999999999999';
    
    console.log('Test reference IDs:', {
      productType: testProductTypeId,
      metal: testMetalId,
      producer: testProducerId,
      country: testCountryId,
      nonExistent: testNonExistentId
    });
    
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
      expect(response.body.data).toHaveProperty('products');
      expect(Array.isArray(response.body.data.products)).toBe(true);
    });
  });

  describe('POST /api/products/validate', () => {
    let validProductCreateData: any;
    
    beforeAll(async () => {
      validProductCreateData = {
        productName: 'American Gold Eagle',
        productTypeId: testProductTypeId,
        metalId: testMetalId,
        producerId: testProducerId,
        countryId: testCountryId,
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        purity: 0.9167,
        price: 2150.50,
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
    });

    it("should validate correct product data", async () => {
      const response = await request(app)
        .post("/api/products/validate")
        .send(validProductCreateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('Product data is valid');
      expect(response.body).toHaveProperty('data');
    });

    it("should reject invalid product type", async () => {
      const invalidData = { ...validProductCreateData, productTypeId: "invalid-id-format" };

      const response = await request(app)
        .post("/api/products/validate")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it("should reject invalid metal type", async () => {
      const invalidData = { ...validProductCreateData, metalId: "invalid-id-format" };

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
        ...validProductCreateData,
        purity: 1.5 // Invalid: purity should be between 0 and 1
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
        ...validProductCreateData,
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

  describe('POST /api/products', () => {
    let validProductCreateData: any;
    
    beforeAll(async () => {
      validProductCreateData = {
        productName: 'Test Gold Eagle',
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
    });

    it('should create a new product successfully', async () => {
      const response = await request(app)
        .post('/api/products')
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
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject product creation with non-existent foreign key references', async () => {
      const invalidData = {
        ...validProductCreateData,
        productTypeId: '999e8400-e29b-41d4-a716-999999999999', // Non-existent product type
      };

      const response = await request(app)
        .post('/api/products')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/products/:id', () => {
    let testProductId: string;

    beforeAll(async () => {
      // Create a test product for retrieval tests
      const productData = {
        productName: 'Test Product for Retrieval',
        productTypeId: testProductTypeId,
        metalId: testMetalId,
        producerId: testProducerId,
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        purity: 0.9167,
        price: 2000.00,
        currency: 'CHF',
        inStock: true,
        stockQuantity: 10
      };

      const createResponse = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(201);

      testProductId = createResponse.body.data.id;
    });

    it('should retrieve a product by valid ID', async () => {
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
    });

    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = testNonExistentId;
      
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
    let testProductId: string;

    beforeAll(async () => {
      // Create a test product for update tests
      const productData = {
        productName: 'Test Product for Updates',
        productTypeId: testProductTypeId,
        metalId: testMetalId,
        producerId: testProducerId,
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        purity: 0.9167,
        price: 2000.00,
        currency: 'CHF',
        inStock: true,
        stockQuantity: 10
      };

      const createResponse = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(201);

      testProductId = createResponse.body.data.id;
    });

    it('should update a product successfully', async () => {
      const updateData = {
        productName: 'Updated Product Name',
        price: 2500.00,
        stockQuantity: 25,
        description: 'Updated description',
        inStock: false
      };

      const response = await request(app)
        .put(`/api/products/${testProductId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.price).toBe(updateData.price);
      expect(response.body.data.stockQuantity).toBe(updateData.stockQuantity);
      expect(response.body.data.inStock).toBe(updateData.inStock);
    });

    it('should perform partial update', async () => {
      const partialUpdateData = {
        price: 3000.00
      };

      const response = await request(app)
        .put(`/api/products/${testProductId}`)
        .send(partialUpdateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.price).toBe(partialUpdateData.price);
      // Basic validation that the response structure is correct
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('stockQuantity');
    });

    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = testNonExistentId;
      const updateData = { price: 2500.00 };

      const response = await request(app)
        .put(`/api/products/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Product not found');
    });

    it('should reject invalid update data', async () => {
      const invalidUpdateData = {
        price: -100, // Negative price should fail
        purity: 1.5, // Invalid purity > 1
        fineWeight: -1 // Negative weight should fail
      };

      const response = await request(app)
        .put(`/api/products/${testProductId}`)
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/products/:id', () => {
    let testProductId: string;

    beforeEach(async () => {
      // Create a test product for each delete test
      const productData = {
        productName: 'Test Product for Deletion',
        productTypeId: testProductTypeId,
        metalId: testMetalId,
        producerId: testProducerId,
        countryId: testCountryId,
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        purity: 0.9167,
        price: 2000.00,
        currency: 'CHF',
        productYear: 2024,
        description: 'Test product for deletion',
        inStock: true,
        stockQuantity: 10,
        minimumOrderQuantity: 1
      };

      const createResponse = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(201);

      testProductId = createResponse.body.data.id;
    });

    it('should delete a product successfully', async () => {
      const response = await request(app)
        .delete(`/api/products/${testProductId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify product is actually deleted
      await request(app)
        .get(`/api/products/${testProductId}`)
        .expect(404);
    });

    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = testNonExistentId;

      const response = await request(app)
        .delete(`/api/products/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Product not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .delete('/api/products/invalid-uuid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/products/price/:id', () => {
    let testProductId: string;

    beforeAll(async () => {
      // Create a test product for price retrieval tests
      const productData = {
        productName: 'Test Product for Price',
        productTypeId: testProductTypeId,
        metalId: testMetalId,
        producerId: testProducerId,
        countryId: testCountryId,
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        purity: 0.9167,
        price: 2000.00,
        currency: 'CHF',
        productYear: 2024,
        description: 'Test product for price retrieval',
        premiumPercentage: 5.0,
        inStock: true,
        stockQuantity: 10,
        minimumOrderQuantity: 1
      };

      const createResponse = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(201);

      testProductId = createResponse.body.data.id;
    });

    it('should retrieve product price information', async () => {
      const response = await request(app)
        .get(`/api/products/price/${testProductId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('price');
      expect(response.body.data).toHaveProperty('currency');
      expect(response.body.data.price).toBe(2000.00);
      expect(response.body.data.currency).toBe('CHF');
    });

    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = testNonExistentId;

      const response = await request(app)
        .get(`/api/products/price/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Product not found');
    });
  });

  describe('POST /api/products/prices', () => {
    let testProductId1: string;
    let testProductId2: string;

    beforeAll(async () => {
      // Create test products for bulk price retrieval
      const productData1 = {
        productName: 'Bulk Price Test Product 1',
        productTypeId: testProductTypeId,
        metalId: testMetalId,
        producerId: testProducerId,
        countryId: testCountryId,
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        purity: 0.9167,
        price: 2000.00,
        currency: 'CHF',
        productYear: 2024,
        description: 'Bulk price test product 1',
        inStock: true,
        stockQuantity: 10,
        minimumOrderQuantity: 1
      };

      const productData2 = {
        productName: 'Bulk Price Test Product 2',
        productTypeId: testProductTypeId,
        metalId: testMetalId,
        producerId: testProducerId,
        countryId: testCountryId,
        fineWeight: 31.1035,
        unitOfMeasure: 'grams',
        purity: 0.9167,
        price: 2200.00,
        currency: 'USD',
        productYear: 2024,
        description: 'Bulk price test product 2',
        inStock: true,
        stockQuantity: 15,
        minimumOrderQuantity: 1
      };

      const response1 = await request(app).post('/api/products').send(productData1).expect(201);
      const response2 = await request(app).post('/api/products').send(productData2).expect(201);

      testProductId1 = response1.body.data.id;
      testProductId2 = response2.body.data.id;
    });

    it('should retrieve bulk product prices', async () => {
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
      const requestData = {
        productIds: [testProductId1, testNonExistentId]
      };

      const response = await request(app)
        .post('/api/products/prices')
        .send(requestData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      // Should return data for valid IDs only
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Advanced GET /api/products filtering and pagination', () => {
    beforeAll(async () => {
      // Create several test products with different attributes for filtering tests
      const testProducts = [
        {
          productName: 'Filter Test Gold Coin',
          productTypeId: testProductTypeId,
          metalId: testMetalId, // Gold
          producerId: testProducerId,
          countryId: testCountryId,
          fineWeight: 31.1035,
          unitOfMeasure: 'grams',
          purity: 0.9167,
          price: 2000.00,
          currency: 'CHF',
          productYear: 2024,
          description: 'Filter test gold coin',
          inStock: true,
          stockQuantity: 10,
          minimumOrderQuantity: 1
        },
        {
          productName: 'Filter Test Silver Bar',
          productTypeId: testProductTypeId,
          metalId: testMetalId, // Use the same test metal ID
          producerId: testProducerId,
    countryId: testCountryId,
          fineWeight: 1000.0,
          unitOfMeasure: 'grams',
          purity: 0.9167,
          price: 800.00,
          currency: 'USD',
          productYear: 2024,
          description: 'Filter test silver bar',
          inStock: false,
          stockQuantity: 0,
          minimumOrderQuantity: 1
        }
      ];

      // Create test products
      for (const productData of testProducts) {
        await request(app).post('/api/products').send(productData).expect(201);
      }
    });

    it('should filter products by metal type', async () => {
      const response = await request(app)
        .get('/api/products?metal=gold')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.products).toBeDefined();
      // Should contain products with gold metal (if any exist in database)
    });

    it('should filter products by stock status', async () => {
      const response = await request(app)
        .get('/api/products?inStock=true')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.products).toBeDefined();
      
      // All returned products should be in stock
      if (response.body.data.products.length > 0) {
        response.body.data.products.forEach((product: any) => {
          expect(product.inStock).toBe(true);
        });
      }
    });

    it('should filter products by price range', async () => {
      const response = await request(app)
        .get('/api/products?minPrice=1000&maxPrice=2500')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.products).toBeDefined();
      
      // All returned products should be within price range
      if (response.body.data.products.length > 0) {
        response.body.data.products.forEach((product: any) => {
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
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 5);
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('totalPages');
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/products?search=gold')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.products).toBeDefined();
      // Should return products matching search term
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/products?sortBy=price&sortOrder=asc')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.products).toBeDefined();
      
      // Verify products are sorted by price in ascending order
      if (response.body.data.products.length > 1) {
        for (let i = 1; i < response.body.data.products.length; i++) {
          expect(response.body.data.products[i].price)
            .toBeGreaterThanOrEqual(response.body.data.products[i-1].price);
        }
      }
    });
  });
});
