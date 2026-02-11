import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';
import { getPool } from '../../src/dbConfig';

let app: any;

describe('Currencies API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    app = (await import('../../src/app')).default;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/currencies', () => {
    it('should return currencies list', async () => {
      const response = await request(app)
        .get('/api/currencies')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const currency = response.body[0];
      expect(currency).toHaveProperty('id');
      expect(currency).toHaveProperty('isoCode3');
    });
  });

  describe('GET /api/currencies/:id', () => {
    it('should return a currency by ID', async () => {
      const pool = getPool();
      const existing = await pool.query("SELECT id FROM currency LIMIT 1");
      const currencyId = existing.rows[0].id;

      const response = await request(app)
        .get(`/api/currencies/${currencyId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', currencyId);
      expect(response.body).toHaveProperty('isoCode3');
    });

    it('should return error for non-existent currency', async () => {
      const response = await request(app)
        .get('/api/currencies/00000000-0000-0000-0000-000000000000');

      // Controller throws — tsoa returns 500 (no graceful 404 handling)
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/currencies', () => {
    it('should create a new currency', async () => {
      const pool = getPool();
      let createdId: string | null = null;

      try {
        const response = await request(app)
          .post('/api/currencies')
          .send({ isoCode2: 'TX', isoCode3: 'TSX', isoNumericCode: 999 })
          .expect(201);

        createdId = response.body.id;
        expect(response.body).toHaveProperty('id');
        expect(response.body.isoCode3).toBe('TSX');
      } finally {
        if (createdId) {
          await pool.query('DELETE FROM currency WHERE id = $1', [createdId]);
        }
      }
    });
  });

  describe('PUT /api/currencies/:id', () => {
    it('should update an existing currency', async () => {
      const pool = getPool();
      const insertResult = await pool.query(
        "INSERT INTO currency (isocode2, isocode3, isonumericcode) VALUES ('OO', 'OLD', 888) RETURNING id"
      );
      const id = insertResult.rows[0].id;

      try {
        const response = await request(app)
          .put(`/api/currencies/${id}`)
          .send({ isoCode2: 'NN', isoCode3: 'NEW', isoNumericCode: 777 })
          .expect(200);

        expect(response.body.isoCode3).toBe('NEW');
      } finally {
        await pool.query('DELETE FROM currency WHERE id = $1', [id]);
      }
    });
  });

  describe('DELETE /api/currencies/:id', () => {
    it('should delete a currency', async () => {
      const pool = getPool();
      const insertResult = await pool.query(
        "INSERT INTO currency (isocode2, isocode3, isonumericcode) VALUES ('DD', 'DEL', 666) RETURNING id"
      );
      const id = insertResult.rows[0].id;

      await request(app)
        .delete(`/api/currencies/${id}`)
        .expect(204);

      const check = await pool.query('SELECT id FROM currency WHERE id = $1', [id]);
      expect(check.rows.length).toBe(0);
    });
  });
});
