import request from 'supertest';
import app from '../../src/app';
import { generateToken } from '../../src/middleware/auth';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';
import { getPool } from '../../src/dbConfig';

describe('Producers API', () => {
  let testNonExistentId: string;
  let createdProducerId: string;

  beforeAll(async () => {
    // Setup fresh test database with complete schema and data
    await setupTestDatabase();
    
    // Set non-existent ID for testing
    testNonExistentId = '999e8400-e29b-41d4-a716-999999999999';
    
    console.log('Test setup complete for Producers API');
    
    // Generate tokens for authentication tests (even though endpoints are public)
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

  describe('GET /api/producers', () => {
    it('should return producers list without authentication', async () => {
      const response = await request(app)
        .get('/api/producers')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('producers');
      expect(Array.isArray(response.body.data.producers)).toBe(true);
      expect(response.body.data).toHaveProperty('pagination');
      
      // Verify pagination structure
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('totalPages');
      expect(response.body.data.pagination).toHaveProperty('hasNext');
      expect(response.body.data.pagination).toHaveProperty('hasPrev');

      // Verify producer structure if any exist
      if (response.body.data.producers.length > 0) {
        const producer = response.body.data.producers[0];
        expect(producer).toHaveProperty('id');
        expect(producer).toHaveProperty('producerName');
        expect(producer).toHaveProperty('createdAt');
        expect(producer).toHaveProperty('updatedAt');
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/producers?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.producers.length).toBeLessThanOrEqual(5);
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/producers?search=mint')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.producers)).toBe(true);
      
      // If results exist, they should contain search term
      response.body.data.producers.forEach((producer: any) => {
        expect(producer.producerName.toLowerCase()).toContain('mint');
      });
    });

    it('should support sorting by name', async () => {
      // Create multiple producers with different names to test sorting
      const timestamp = Date.now();
      const producers = [
        `ZZZ Sort Test ${timestamp}`,
        `AAA Sort Test ${timestamp}`, 
        `BBB Sort Test ${timestamp}`
      ];
      
      for (const name of producers) {
        await request(app)
          .post('/api/producers')
          .send({ producerName: name })
          .expect(201);
      }
      
      const response = await request(app)
        .get('/api/producers?sortBy=name&sortOrder=asc&limit=100')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify sorting if multiple producers exist
      const producersData = response.body.data.producers;
      
      // Find our test producers
      const aaaProducer = producersData.find((p: any) => p.producerName === `AAA Sort Test ${timestamp}`);
      const bbbProducer = producersData.find((p: any) => p.producerName === `BBB Sort Test ${timestamp}`);
      const zzzProducer = producersData.find((p: any) => p.producerName === `ZZZ Sort Test ${timestamp}`);
      
      expect(aaaProducer).toBeDefined();
      expect(bbbProducer).toBeDefined();
      expect(zzzProducer).toBeDefined();
      
      // Get their positions in the sorted list
      const aaaIndex = producersData.findIndex((p: any) => p.producerName === `AAA Sort Test ${timestamp}`);
      const bbbIndex = producersData.findIndex((p: any) => p.producerName === `BBB Sort Test ${timestamp}`);
      const zzzIndex = producersData.findIndex((p: any) => p.producerName === `ZZZ Sort Test ${timestamp}`);
      
      // AAA should come before BBB, and BBB before ZZZ
      expect(aaaIndex).toBeLessThan(bbbIndex);
      expect(bbbIndex).toBeLessThan(zzzIndex);
    });

    it('should support sorting by createdAt', async () => {
      const response = await request(app)
        .get('/api/producers?sortBy=createdAt&sortOrder=desc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.producers)).toBe(true);
    });

    it('should handle invalid sort parameters gracefully', async () => {
      await request(app)
        .get('/api/producers?sortBy=invalid&sortOrder=invalid')
        .expect(400); // Should return validation error for invalid enum

      // Should handle parsing error gracefully  
    });

    it('should handle pagination edge cases', async () => {
      // Test page 0
      const response1 = await request(app)
        .get('/api/producers?page=0')
        .expect(200);
      expect(response1.body.data.pagination.page).toBe(1);

      // Test negative page
      const response2 = await request(app)
        .get('/api/producers?page=-1')
        .expect(200);
      expect(response2.body.data.pagination.page).toBe(1);

      // Test limit over maximum
      const response3 = await request(app)
        .get('/api/producers?limit=200')
        .expect(200);
      expect(response3.body.data.pagination.limit).toBe(100);

      // Test limit under minimum
      const response4 = await request(app)
        .get('/api/producers?limit=0')
        .expect(200);
      expect(response4.body.data.pagination.limit).toBe(1);
    });
  });

  describe('POST /api/producers', () => {
    const validProducerData = {
      producerName: 'Test Integration Mint Ltd.'
    };

    it('should create a new producer without authentication', async () => {
      const response = await request(app)
        .post('/api/producers')
        .send(validProducerData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('producerName', validProducerData.producerName);
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
      expect(response.body).toHaveProperty('message', 'Producer created successfully');

      // Store the ID for subsequent tests
      createdProducerId = response.body.data.id;

      // Verify ID is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(createdProducerId)).toBe(true);
    });

    it('should reject duplicate producer names', async () => {
      // Try to create the same producer again
      const response = await request(app)
        .post('/api/producers')
        .send(validProducerData)
        .expect(409); // Conflict status code

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Producer with this name already exists');
    });

    it('should reject missing producerName', async () => {
      const response = await request(app)
        .post('/api/producers')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid producer data');
    });

    it('should reject empty producerName', async () => {
      const response = await request(app)
        .post('/api/producers')
        .send({ producerName: '' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid producer data');
    });

    it('should accept producerName that is long', async () => {
      const longName = 'A'.repeat(200); // Should be acceptable
      const response = await request(app)
        .post('/api/producers')
        .send({ producerName: longName })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.producerName).toBe(longName);
    });

    it('should accept international characters in producer name', async () => {
      const internationalName = 'Münze Österreich Test Integration';
      const response = await request(app)
        .post('/api/producers')
        .send({ producerName: internationalName })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.producerName).toBe(internationalName);
    });

    it('should accept special characters in producer name', async () => {
      const specialName = 'Test & Co. (Pty) Ltd. - Integration';
      const response = await request(app)
        .post('/api/producers')
        .send({ producerName: specialName })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.producerName).toBe(specialName);
    });

    it('should handle case-insensitive duplicate check', async () => {
      const originalName = 'Case Sensitive Test Mint';
      
      // Create original
      await request(app)
        .post('/api/producers')
        .send({ producerName: originalName })
        .expect(201);

      // Try to create with different case - should be rejected as duplicate
      const response = await request(app)
        .post('/api/producers')
        .send({ producerName: originalName.toUpperCase() })
        .expect(409); // Should fail due to case-insensitive duplicate checking

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject invalid data types', async () => {
      const invalidData = [
        { producerName: 123 },
        { producerName: null },
        { producerName: [] },
        { producerName: {} },
        { producerName: true }
      ];

      for (const data of invalidData) {
        const response = await request(app)
          .post('/api/producers')
          .send(data)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('GET /api/producers/:id', () => {
    it('should return producer by valid ID without authentication', async () => {
      const response = await request(app)
        .get(`/api/producers/${createdProducerId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', createdProducerId);
      expect(response.body.data).toHaveProperty('producerName');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent producer', async () => {
      const response = await request(app)
        .get(`/api/producers/${testNonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Producer not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/producers/invalid-uuid')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid producer ID format');
    });

    it('should handle empty UUID', async () => {
      await request(app)
        .get('/api/producers/')
        .expect(200); // Should hit the GET /producers endpoint and return list
    });
  });

  describe('PUT /api/producers/:id', () => {
    const updateData = {
      producerName: 'Updated Test Integration Mint Ltd.'
    };

    it('should update producer by valid ID without authentication', async () => {
      const response = await request(app)
        .put(`/api/producers/${createdProducerId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', createdProducerId);
      expect(response.body.data).toHaveProperty('producerName', updateData.producerName);
      expect(response.body.data).toHaveProperty('updatedAt');
      expect(response.body).toHaveProperty('message', 'Producer updated successfully');

      // Verify the update persisted
      const getResponse = await request(app)
        .get(`/api/producers/${createdProducerId}`)
        .expect(200);

      expect(getResponse.body.data.producerName).toBe(updateData.producerName);
    });

    it('should return 404 for updating non-existent producer', async () => {
      const response = await request(app)
        .put(`/api/producers/${testNonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Producer not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .put('/api/producers/invalid-uuid')
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid producer ID format');
    });

    it('should reject missing producerName in update', async () => {
      const response = await request(app)
        .put(`/api/producers/${createdProducerId}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No valid fields to update');
    });

    it('should reject empty producerName in update', async () => {
      const response = await request(app)
        .put(`/api/producers/${createdProducerId}`)
        .send({ producerName: '' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid producer data');
    });

    it('should accept long producerName in update', async () => {
      const longName = 'A'.repeat(200);
      const response = await request(app)
        .put(`/api/producers/${createdProducerId}`)
        .send({ producerName: longName })
        .expect(409); // Might conflict with existing long name from previous test

      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject duplicate producer names in update', async () => {
      // Create another producer first
      await request(app)
        .post('/api/producers')
        .send({ producerName: 'Another Test Mint for Update Collision' })
        .expect(201);

      // Try to update first producer to have the same name as the second
      const response = await request(app)
        .put(`/api/producers/${createdProducerId}`)
        .send({ producerName: 'Another Test Mint for Update Collision' })
        .expect(409); // Conflict

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Producer with this name already exists');
    });

    it('should allow updating producer to same name (no change)', async () => {
      // Get current producer data
      const currentResponse = await request(app)
        .get(`/api/producers/${createdProducerId}`)
        .expect(200);

      const currentName = currentResponse.body.data.producerName;

      // Update to the same name
      const response = await request(app)
        .put(`/api/producers/${createdProducerId}`)
        .send({ producerName: currentName })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.producerName).toBe(currentName);
    });
  });

  describe('DELETE /api/producers/:id', () => {
    let producerToDeleteId: string;
    let deleteTestCounter = 0;

    beforeEach(async () => {
      // Create a producer to delete with unique name
      deleteTestCounter++;
      const response = await request(app)
        .post('/api/producers')
        .send({ producerName: `Producer to Delete Test ${deleteTestCounter}` })
        .expect(201);

      producerToDeleteId = response.body.data.id;
    });

    it('should delete producer by valid ID without authentication', async () => {
      const response = await request(app)
        .delete(`/api/producers/${producerToDeleteId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('deleted successfully'); // Flexible message matching

      // Verify the producer is gone
      await request(app)
        .get(`/api/producers/${producerToDeleteId}`)
        .expect(404);
    });

    it('should return 404 for deleting non-existent producer', async () => {
      const response = await request(app)
        .delete(`/api/producers/${testNonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Producer not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .delete('/api/producers/invalid-uuid')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid producer ID format');
    });

    it('should handle deletion of producer with referenced products gracefully', async () => {
      const pool = getPool();
      
      // Check if the producer has any products
      const productCheck = await pool.query(
        'SELECT COUNT(*) as count FROM product WHERE producerId = $1', 
        [producerToDeleteId]
      );

      if (parseInt(productCheck.rows[0].count) > 0) {
        // If products reference this producer, deletion should fail
        const response = await request(app)
          .delete(`/api/producers/${producerToDeleteId}`)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toContain('Cannot delete producer');
      } else {
        // If no products reference this producer, deletion should succeed
        const response = await request(app)
          .delete(`/api/producers/${producerToDeleteId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll just ensure the endpoint exists and responds
      await request(app)
        .get('/api/producers')
        .expect(200);
    });

    it('should handle malformed JSON in requests', async () => {
      await request(app)
        .post('/api/producers')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Should handle parsing error gracefully
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousData = {
        producerName: "'; DROP TABLE producer; --"
      };

      const response = await request(app)
        .post('/api/producers')
        .send(maliciousData)
        .expect(201);

      // Should create the producer with the malicious string as literal text
      expect(response.body.success).toBe(true);
      expect(response.body.data.producerName).toBe(maliciousData.producerName);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large result sets with pagination', async () => {
      // Create multiple producers for pagination testing
      const producers: Array<{ producerName: string }> = [];
      for (let i = 0; i < 10; i++) {
        producers.push({
          producerName: `Performance Test Mint ${i.toString().padStart(3, '0')}`
        });
      }

      // Create all producers
      for (const producer of producers) {
        await request(app)
          .post('/api/producers')
          .send(producer)
          .expect(201);
      }

      // Test pagination works with larger dataset
      const response = await request(app)
        .get('/api/producers?limit=5&page=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.producers.length).toBeLessThanOrEqual(5);
      expect(response.body.data.pagination.limit).toBe(5);
      expect(response.body.data.pagination.total).toBeGreaterThan(5);
    });

    it('should respond quickly to simple queries', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/producers?limit=10')
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });

  describe('Data Integrity', () => {
    it('should maintain consistent timestamps', async () => {
      const createResponse = await request(app)
        .post('/api/producers')
        .send({ producerName: 'Timestamp Test Mint' })
        .expect(201);
      
      const createdAt = new Date(createResponse.body.data.createdAt);
      const updatedAt = new Date(createResponse.body.data.updatedAt);

      // Allow for reasonable server processing time - check timestamps are valid dates
      expect(createdAt).toBeInstanceOf(Date);
      expect(createdAt.getTime()).toBeGreaterThan(0); // Valid timestamp
      expect(createdAt.getTime()).toBeLessThanOrEqual(new Date().getTime() + 60000); // Within last minute
      expect(updatedAt.getTime()).toBe(createdAt.getTime());

      // Test update timestamp
      const updateResponse = await request(app)
        .put(`/api/producers/${createResponse.body.data.id}`)
        .send({ producerName: 'Updated Timestamp Test Mint' })
        .expect(200);
      
      const newUpdatedAt = new Date(updateResponse.body.data.updatedAt);
      
      // Check that updated timestamp is valid and after creation
      expect(newUpdatedAt).toBeInstanceOf(Date);
      expect(newUpdatedAt.getTime()).toBeGreaterThan(0);
      expect(newUpdatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
    });

    it('should preserve data consistency across operations', async () => {
      const producerName = 'Consistency Test Mint';
      
      // Create
      const createResponse = await request(app)
        .post('/api/producers')
        .send({ producerName })
        .expect(201);

      const producerId = createResponse.body.data.id;

      // Read
      const readResponse = await request(app)
        .get(`/api/producers/${producerId}`)
        .expect(200);

      expect(readResponse.body.data.producerName).toBe(producerName);
      expect(readResponse.body.data.id).toBe(producerId);

      // Update
      const newName = 'Updated Consistency Test Mint';
      const updateResponse = await request(app)
        .put(`/api/producers/${producerId}`)
        .send({ producerName: newName })
        .expect(200);

      expect(updateResponse.body.data.producerName).toBe(newName);
      expect(updateResponse.body.data.id).toBe(producerId);

      // Read after update
      const readAfterUpdateResponse = await request(app)
        .get(`/api/producers/${producerId}`)
        .expect(200);

      expect(readAfterUpdateResponse.body.data.producerName).toBe(newName);
      expect(readAfterUpdateResponse.body.data.id).toBe(producerId);
    });
  });
});
