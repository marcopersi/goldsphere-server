import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';
import { getPool } from '../../src/dbConfig';

let app: any;

describe('ProductTypes API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    app = (await import('../../src/app')).default;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/productTypes', () => {
    it('should return product types list with pagination', async () => {
      const response = await request(app)
        .get('/api/productTypes')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should support search parameter', async () => {
      const response = await request(app)
        .get('/api/productTypes?search=Coin')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/productTypes/:id', () => {
    it('should return a product type by ID', async () => {
      const pool = getPool();
      const existing = await pool.query("SELECT id FROM productType WHERE productTypeName = 'Coin' LIMIT 1");
      const id = existing.rows[0].id;

      const response = await request(app)
        .get(`/api/productTypes/${id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', id);
    });

    it('should return error for non-existent product type', async () => {
      const response = await request(app)
        .get('/api/productTypes/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/productTypes', () => {
    it('should create a new product type', async () => {
      const pool = getPool();
      let createdId: string | null = null;

      try {
        const response = await request(app)
          .post('/api/productTypes')
          .send({ productTypeName: 'TestType' })
          .expect(201);

        createdId = response.body.id;
        expect(response.body).toHaveProperty('id');
        expect(response.body.producttypename).toBe('TestType');
      } finally {
        if (createdId) {
          await pool.query('DELETE FROM productType WHERE id = $1', [createdId]);
        }
      }
    });
  });

  describe('PUT /api/productTypes/:id', () => {
    it('should update an existing product type', async () => {
      const pool = getPool();
      const insertResult = await pool.query(
        "INSERT INTO productType (productTypeName) VALUES ('OldType') RETURNING id"
      );
      const id = insertResult.rows[0].id;

      try {
        const response = await request(app)
          .put(`/api/productTypes/${id}`)
          .send({ productTypeName: 'UpdatedType' })
          .expect(200);

        expect(response.body.producttypename).toBe('UpdatedType');
      } finally {
        await pool.query('DELETE FROM productType WHERE id = $1', [id]);
      }
    });
  });

  describe('DELETE /api/productTypes/:id', () => {
    it('should delete a product type without references', async () => {
      const pool = getPool();
      const insertResult = await pool.query(
        "INSERT INTO productType (productTypeName) VALUES ('DeleteMe') RETURNING id"
      );
      const id = insertResult.rows[0].id;

      await request(app)
        .delete(`/api/productTypes/${id}`)
        .expect(204);

      const check = await pool.query('SELECT id FROM productType WHERE id = $1', [id]);
      expect(check.rows.length).toBe(0);
    });
  });
});
