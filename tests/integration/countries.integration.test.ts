import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';
import { getPool } from '../../src/dbConfig';

let app: any;

describe('Countries API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    app = (await import('../../src/app')).default;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/countries', () => {
    it('should return countries list', async () => {
      const response = await request(app)
        .get('/api/countries')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const country = response.body[0];
      expect(country).toHaveProperty('id');
      expect(country).toHaveProperty('countryname');
    });
  });

  describe('GET /api/countries/:id', () => {
    it('should return a country by ID', async () => {
      const pool = getPool();
      const existing = await pool.query("SELECT id FROM country LIMIT 1");
      const countryId = existing.rows[0].id;

      const response = await request(app)
        .get(`/api/countries/${countryId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', countryId);
      expect(response.body).toHaveProperty('countryname');
    });
  });

  describe('POST /api/countries', () => {
    it('should create a new country', async () => {
      const pool = getPool();
      let createdId: string | null = null;

      try {
        const response = await request(app)
          .post('/api/countries')
          .send({ countryName: 'Testland', isoCode2: 'TL' })
          .expect(201);

        createdId = response.body.id;
        expect(response.body).toHaveProperty('id');
        expect(response.body.countryname).toBe('Testland');
      } finally {
        if (createdId) {
          await pool.query('DELETE FROM country WHERE id = $1', [createdId]);
        }
      }
    });
  });

  describe('PUT /api/countries/:id', () => {
    it('should update an existing country', async () => {
      const pool = getPool();
      const insertResult = await pool.query(
        "INSERT INTO country (countryName, isoCode2) VALUES ('OldName', 'ON') RETURNING id"
      );
      const id = insertResult.rows[0].id;

      try {
        const response = await request(app)
          .put(`/api/countries/${id}`)
          .send({ countryName: 'NewName', isoCode2: 'NN' })
          .expect(200);

        expect(response.body.countryname).toBe('NewName');
      } finally {
        await pool.query('DELETE FROM country WHERE id = $1', [id]);
      }
    });
  });

  describe('DELETE /api/countries/:id', () => {
    it('should delete a country', async () => {
      const pool = getPool();
      const insertResult = await pool.query(
        "INSERT INTO country (countryName, isoCode2) VALUES ('ToDelete', 'TD') RETURNING id"
      );
      const id = insertResult.rows[0].id;

      await request(app)
        .delete(`/api/countries/${id}`)
        .expect(204);

      const check = await pool.query('SELECT id FROM country WHERE id = $1', [id]);
      expect(check.rows.length).toBe(0);
    });
  });
});
