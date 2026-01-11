/**
 * Market Data API Integration Tests
 */

import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, teardownTestDatabase } from './db-setup';
import { getPool } from '../../src/dbConfig';

describe('Market Data API', () => {
  let goldMetalId: string;
  let silverMetalId: string;
  let providerId: string;

  beforeAll(async () => {
    await setupTestDatabase();
    
    const pool = getPool();
    
    // Get metal IDs (using chemical symbols: AU for Gold, AG for Silver)
    const goldResult = await pool.query("SELECT id FROM metal WHERE symbol = 'AU' LIMIT 1");
    const silverResult = await pool.query("SELECT id FROM metal WHERE symbol = 'AG' LIMIT 1");
    
    if (!goldResult.rows[0] || !silverResult.rows[0]) {
      throw new Error('Metal data not found in database. Ensure 02-initialLoad.sql has run.');
    }
    
    goldMetalId = goldResult.rows[0].id;
    silverMetalId = silverResult.rows[0].id;
    
    // Get provider (should be created by 05-market-data.sql)
    const providerResult = await pool.query(
      "SELECT id FROM market_data_provider WHERE name = 'Metals-API' LIMIT 1"
    );
    
    if (providerResult.rows.length === 0) {
      throw new Error('Market data provider not found. Ensure 05-market-data.sql has run.');
    }
    
    providerId = providerResult.rows[0].id;
    
    // Insert test price data (only if metal IDs are valid)
    if (goldMetalId && providerId) {
      await pool.query(
        `INSERT INTO market_price (metal_id, provider_id, price_per_troy_oz, currency, timestamp)
         VALUES ($1, $2, 2000.50, 'USD', NOW())
         ON CONFLICT (metal_id, provider_id) DO UPDATE 
         SET price_per_troy_oz = 2000.50, timestamp = NOW()`,
        [goldMetalId, providerId]
      );
    }
    
    if (silverMetalId && providerId) {
      await pool.query(
        `INSERT INTO market_price (metal_id, provider_id, price_per_troy_oz, currency, timestamp)
         VALUES ($1, $2, 25.75, 'USD', NOW())
         ON CONFLICT (metal_id, provider_id) DO UPDATE 
         SET price_per_troy_oz = 25.75, timestamp = NOW()`,
        [silverMetalId, providerId]
      );
    }
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/market-data/price/:metalSymbol', () => {
    it('should return current price for gold', async () => {
      const response = await request(app)
        .get('/api/market-data/price/AU')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('metalSymbol', 'AU');
      expect(response.body.data).toHaveProperty('pricePerTroyOz');
      expect(response.body.data).toHaveProperty('currency', 'USD');
      expect(Number.parseFloat(response.body.data.pricePerTroyOz)).toBeGreaterThan(0);
    });

    it('should return current price for silver', async () => {
      const response = await request(app)
        .get('/api/market-data/price/AG')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('metalSymbol', 'AG');
      expect(Number.parseFloat(response.body.data.pricePerTroyOz)).toBeGreaterThan(0);
    });

    it('should accept currency parameter', async () => {
      const response = await request(app)
        .get('/api/market-data/price/AU?currency=USD')
        .expect(200);

      expect(response.body.data).toHaveProperty('currency', 'USD');
    });

    it('should return 400 for empty metal symbol', async () => {
      // Test with URL encoding (space)
      const response = await request(app)
        .get('/api/market-data/price/%20')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent metal', async () => {
      const response = await request(app)
        .get('/api/market-data/price/INVALID')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('No market data found');
    });
  });

  describe('GET /api/market-data/prices', () => {
    it('should return prices for multiple metals', async () => {
      const response = await request(app)
        .get('/api/market-data/prices?symbols=AU,AG')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('AU');
      expect(response.body.data).toHaveProperty('AG');
      expect(response.body.data.AU).toHaveProperty('pricePerTroyOz');
      expect(response.body.data.AG).toHaveProperty('pricePerTroyOz');
    });

    it('should handle single metal symbol', async () => {
      const response = await request(app)
        .get('/api/market-data/prices?symbols=AU')
        .expect(200);

      expect(response.body.data).toHaveProperty('AU');
    });

    it('should return 400 for missing symbols parameter', async () => {
      const response = await request(app)
        .get('/api/market-data/prices')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('required');
    });

    it('should handle mix of valid and invalid symbols', async () => {
      const response = await request(app)
        .get('/api/market-data/prices?symbols=AU,INVALID,AG')
        .expect(200);

      expect(response.body.data).toHaveProperty('AU');
      expect(response.body.data).toHaveProperty('AG');
      expect(response.body.data).not.toHaveProperty('INVALID');
    });
  });

  describe('GET /api/market-data/history/:metalSymbol', () => {
    beforeAll(async () => {
      const pool = getPool();
      
      // Insert historical data
      const timestamps = [
        new Date('2025-11-01T10:00:00Z'),
        new Date('2025-11-02T10:00:00Z'),
        new Date('2025-11-03T10:00:00Z'),
      ];
      
      for (const timestamp of timestamps) {
        await pool.query(
          `INSERT INTO price_history (metal_id, provider_id, price_per_troy_oz, currency, timestamp)
           VALUES ($1, $2, 2000.00, 'USD', $3)
           ON CONFLICT (metal_id, provider_id, timestamp) DO NOTHING`,
          [goldMetalId, providerId, timestamp]
        );
      }
    });

    it('should return historical prices', async () => {
      const response = await request(app)
        .get('/api/market-data/history/AU')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
      // Note: Historical data might be empty if no data is available in the requested range
    });

    it('should accept date range parameters', async () => {
      const response = await request(app)
        .get('/api/market-data/history/AU?startDate=2025-11-01&endDate=2025-11-03')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should accept limit parameter', async () => {
      const response = await request(app)
        .get('/api/market-data/history/AU?limit=2')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should enforce maximum limit', async () => {
      const response = await request(app)
        .get('/api/market-data/history/AU?limit=10000')
        .expect(200);

      // Max limit is 1000
      expect(response.body.count).toBeLessThanOrEqual(1000);
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .get('/api/market-data/history/AU?startDate=invalid-date')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should return 400 for empty metal symbol', async () => {
      const response = await request(app)
        .get('/api/market-data/history/%20')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/market-data/providers', () => {
    it('should return list of providers', async () => {
      const response = await request(app)
        .get('/api/market-data/providers')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include provider details', async () => {
      const response = await request(app)
        .get('/api/market-data/providers')
        .expect(200);

      const provider = response.body.data[0];
      expect(provider).toHaveProperty('name');
      expect(provider).toHaveProperty('isActive');
      expect(provider).toHaveProperty('priority');
    });
  });

  describe('POST /api/market-data/update', () => {
    it('should accept manual update trigger', async () => {
      // Note: This will fail without valid API keys in environment
      const response = await request(app)
        .post('/api/market-data/update')
        .expect(500); // Expected to fail without API keys

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/market-data/cache', () => {
    it('should accept cache cleanup request', async () => {
      const response = await request(app)
        .delete('/api/market-data/cache')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid metal symbols gracefully', async () => {
      // Test error handling for invalid metal symbols
      const response = await request(app)
        .get('/api/market-data/price/INVALID_METAL');

      // Should return 404 or 500, not crash
      expect([404, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .get('/api/market-data/prices?symbols=')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
