/**
 * Market Data Repository Implementation
 * 
 * Implements IMarketDataRepository interface
 * Encapsulates all SQL queries and database access
 * Follows Single Responsibility Principle
 * 
 * Dependencies injected via constructor for testability
 */

import { Pool } from 'pg';
import type { IMarketDataRepository } from './IMarketDataRepository';
import type {
  MarketPrice,
  PriceHistory,
  MarketDataProvider,
  PriceData
} from '../types/MarketDataTypes';

export class MarketDataRepositoryImpl implements IMarketDataRepository {
  constructor(private readonly pool: Pool) {}

  async getCurrentPrice(metalId: string, currency: string): Promise<MarketPrice | null> {
    const result = await this.pool.query<{
      id: string;
      metal_id: string;
      metal_symbol: string;
      metal_name: string;
      provider_id: string;
      provider_name: string;
      price_per_troy_oz: number;
      currency: string;
      bid?: number;
      ask?: number;
      high_24h?: number;
      low_24h?: number;
      change_24h?: number;
      change_percent_24h?: number;
      timestamp: Date;
    }>(
      `SELECT 
        mp.id,
        mp.metal_id,
        m.symbol as metal_symbol,
        m.name as metal_name,
        mp.provider_id,
        mdp.name as provider_name,
        mp.price_per_troy_oz,
        mp.currency,
        mp.bid,
        mp.ask,
        mp.high_24h,
        mp.low_24h,
        mp.change_24h,
        mp.change_percent_24h,
        mp.timestamp
      FROM market_price mp
      JOIN metal m ON mp.metal_id = m.id
      JOIN market_data_provider mdp ON mp.provider_id = mdp.id
      WHERE mp.metal_id = $1 
        AND mp.currency = $2
        AND mdp.is_active = true
      ORDER BY mdp.priority ASC, mp.timestamp DESC
      LIMIT 1`,
      [metalId, currency]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToMarketPrice(result.rows[0]);
  }

  async getAllCurrentPrices(currency: string): Promise<MarketPrice[]> {
    const result = await this.pool.query<{
      id: string;
      metal_id: string;
      metal_symbol: string;
      metal_name: string;
      provider_id: string;
      provider_name: string;
      price_per_troy_oz: number;
      currency: string;
      bid?: number;
      ask?: number;
      timestamp: Date;
    }>(
      `SELECT DISTINCT ON (m.symbol)
        mp.id,
        mp.metal_id,
        m.symbol as metal_symbol,
        m.name as metal_name,
        mp.provider_id,
        mdp.name as provider_name,
        mp.price_per_troy_oz,
        mp.currency,
        mp.bid,
        mp.ask,
        mp.timestamp
      FROM market_price mp
      JOIN metal m ON mp.metal_id = m.id
      JOIN market_data_provider mdp ON mp.provider_id = mdp.id
      WHERE mp.currency = $1 AND mdp.is_active = true
      ORDER BY m.symbol, mdp.priority ASC, mp.timestamp DESC`,
      [currency]
    );

    return result.rows.map(row => this.mapToMarketPrice(row));
  }

  async getHistoricalPrices(
    metalId: string,
    startDate: Date,
    endDate: Date,
    currency: string,
    limit: number
  ): Promise<PriceHistory[]> {
    const result = await this.pool.query<{
      id: string;
      metal_id: string;
      metal_symbol: string;
      provider_id: string;
      price_per_troy_oz: number;
      currency: string;
      bid?: number;
      ask?: number;
      high?: number;
      low?: number;
      open?: number;
      close?: number;
      volume?: number;
      timestamp: Date;
    }>(
      `SELECT 
        ph.id,
        ph.metal_id,
        m.symbol as metal_symbol,
        ph.provider_id,
        ph.price_per_troy_oz,
        ph.currency,
        ph.bid,
        ph.ask,
        ph.high,
        ph.low,
        ph.open,
        ph.close,
        ph.volume,
        ph.timestamp
      FROM price_history ph
      JOIN metal m ON ph.metal_id = m.id
      WHERE ph.metal_id = $1
        AND ph.timestamp >= $2
        AND ph.timestamp <= $3
        AND ph.currency = $4
      ORDER BY ph.timestamp DESC
      LIMIT $5`,
      [metalId, startDate, endDate, currency, limit]
    );

    return result.rows.map(row => this.mapToPriceHistory(row));
  }

  async upsertPrice(priceData: PriceData): Promise<void> {
    await this.pool.query(
      `INSERT INTO market_price (
        metal_id, provider_id, price_per_troy_oz, currency, 
        bid, ask, high_24h, low_24h, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (metal_id, provider_id) 
      DO UPDATE SET
        price_per_troy_oz = EXCLUDED.price_per_troy_oz,
        currency = EXCLUDED.currency,
        bid = EXCLUDED.bid,
        ask = EXCLUDED.ask,
        high_24h = EXCLUDED.high_24h,
        low_24h = EXCLUDED.low_24h,
        timestamp = EXCLUDED.timestamp,
        updatedat = NOW()`,
      [
        priceData.metalId,
        priceData.providerId,
        priceData.price,
        priceData.currency,
        priceData.metadata?.bid,
        priceData.metadata?.ask,
        priceData.metadata?.high,
        priceData.metadata?.low
      ]
    );
  }

  async getActiveProviders(): Promise<MarketDataProvider[]> {
    const result = await this.pool.query<{
      id: string;
      name: string;
      api_key_env_var: string;
      base_url: string;
      is_active: boolean;
      rate_limit_per_minute: number;
      priority: number;
      last_success?: Date;
      last_failure?: Date;
      failure_count: number;
      createdat: Date;
      updatedat: Date;
    }>(
      `SELECT 
        id, name, api_key_env_var, base_url, is_active,
        rate_limit_per_minute, priority, last_success, last_failure,
        failure_count, createdat, updatedat
      FROM market_data_provider
      WHERE is_active = true
      ORDER BY priority ASC`
    );

    return result.rows.map(row => this.mapToMarketDataProvider(row));
  }

  async updateProviderSuccess(providerId: string, timestamp: Date): Promise<void> {
    await this.pool.query(
      `UPDATE market_data_provider
      SET last_success = $2, failure_count = 0, updatedat = NOW()
      WHERE id = $1`,
      [providerId, timestamp]
    );
  }

  async updateProviderFailure(providerId: string, error: string, timestamp: Date): Promise<void> {
    await this.pool.query(
      `UPDATE market_data_provider
      SET last_failure = $2, failure_count = failure_count + 1, updatedat = NOW()
      WHERE id = $1`,
      [providerId, timestamp]
    );
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    const result = await this.pool.query<{ data: T }>(
      `SELECT data FROM market_data_cache
      WHERE cache_key = $1 AND expires_at > NOW()`,
      [key]
    );

    return result.rows[0]?.data || null;
  }

  async setCachedData<T>(key: string, data: T, expirationMinutes: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO market_data_cache (cache_key, data, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '${expirationMinutes} minutes')
      ON CONFLICT (cache_key)
      DO UPDATE SET data = EXCLUDED.data, expires_at = EXCLUDED.expires_at`,
      [key, JSON.stringify(data)]
    );
  }

  async cleanupCache(): Promise<number> {
    const result = await this.pool.query('SELECT cleanup_expired_cache()');
    return result.rows[0]?.cleanup_expired_cache || 0;
  }

  async saveHistoricalPrice(priceData: PriceData, timestamp: Date): Promise<void> {
    await this.pool.query(
      `INSERT INTO price_history (
        metal_id, provider_id, price_per_troy_oz, currency,
        bid, ask, high, low, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        priceData.metalId,
        priceData.providerId,
        priceData.price,
        priceData.currency,
        priceData.metadata?.bid,
        priceData.metadata?.ask,
        priceData.metadata?.high,
        priceData.metadata?.low,
        timestamp
      ]
    );
  }

  // Private mapping methods (DRY principle)
  private mapToMarketPrice(row: any): MarketPrice {
    return {
      id: row.id,
      metalId: row.metal_id,
      metalSymbol: row.metal_symbol,
      metalName: row.metal_name,
      providerId: row.provider_id,
      providerName: row.provider_name,
      pricePerTroyOz: row.price_per_troy_oz,
      currency: row.currency,
      bid: row.bid,
      ask: row.ask,
      high24h: row.high_24h,
      low24h: row.low_24h,
      change24h: row.change_24h,
      changePercent24h: row.change_percent_24h,
      timestamp: row.timestamp,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };
  }

  private mapToPriceHistory(row: any): PriceHistory {
    return {
      id: row.id,
      metalId: row.metal_id,
      metalSymbol: row.metal_symbol,
      providerId: row.provider_id,
      pricePerTroyOz: row.price_per_troy_oz,
      currency: row.currency,
      bid: row.bid,
      ask: row.ask,
      high: row.high,
      low: row.low,
      open: row.open,
      close: row.close,
      volume: row.volume,
      timestamp: row.timestamp,
      createdAt: row.createdat
    };
  }

  private mapToMarketDataProvider(row: any): MarketDataProvider {
    return {
      id: row.id,
      name: row.name,
      apiKeyEnvVar: row.api_key_env_var,
      baseUrl: row.base_url,
      isActive: row.is_active,
      rateLimitPerMinute: row.rate_limit_per_minute,
      priority: row.priority,
      lastSuccess: row.last_success,
      lastFailure: row.last_failure,
      failureCount: row.failure_count,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };
  }
}
