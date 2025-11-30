/**
 * Market Data Service
 * Handles real-time and historical precious metal market data
 * Supports multiple API providers with fallback and caching
 */

import axios, { AxiosError } from 'axios';
import { getPool } from '../dbConfig';
import type {
  MarketDataProvider,
  MarketPrice,
  PriceHistory,
  MarketDataQuery,
  PriceUpdateResult,
  ProviderApiResponse
} from '../types/marketData';

export class MarketDataService {
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Get current market price for a specific metal
   */
  async getCurrentPrice(metalSymbol: string, currency = 'USD'): Promise<MarketPrice | null> {
    const pool = getPool();
    
    try {
      // Check cache first
      const cached = await this.getCachedPrice(metalSymbol, currency);
      if (cached) {
        return cached;
      }

      // Query database for latest price
      const result = await pool.query<MarketPrice>(
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
          mp.timestamp,
          mp.createdat,
          mp.updatedat
        FROM market_price mp
        JOIN metal m ON mp.metal_id = m.id
        JOIN market_data_provider mdp ON mp.provider_id = mdp.id
        WHERE m.symbol = $1 
          AND mp.currency = $2
          AND mdp.is_active = true
        ORDER BY mdp.priority ASC, mp.timestamp DESC
        LIMIT 1`,
        [metalSymbol, currency]
      );

      if (result.rows.length === 0) {
        // No price in database, fetch from API
        await this.updatePricesFromApi();
        
        // Try again after update
        const retryResult = await pool.query<MarketPrice>(
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
          WHERE m.symbol = $1 AND mp.currency = $2
          ORDER BY mdp.priority ASC, mp.timestamp DESC
          LIMIT 1`,
          [metalSymbol, currency]
        );
        
        return retryResult.rows[0] || null;
      }

      const price = result.rows[0];
      
      // Cache the result
      await this.cachePrice(metalSymbol, currency, price);
      
      return price;
    } catch (error) {
      console.error('Error fetching current price:', error);
      throw new Error(`Failed to fetch market price for ${metalSymbol}`);
    }
  }

  /**
   * Get historical price data for a metal
   */
  async getHistoricalPrices(query: MarketDataQuery): Promise<PriceHistory[]> {
    const pool = getPool();
    
    try {
      let whereConditions = ['1=1'];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (query.metalSymbol) {
        whereConditions.push(`m.symbol = $${paramIndex}`);
        params.push(query.metalSymbol);
        paramIndex++;
      }

      if (query.metalId) {
        whereConditions.push(`ph.metal_id = $${paramIndex}`);
        params.push(query.metalId);
        paramIndex++;
      }

      if (query.startDate) {
        whereConditions.push(`ph.timestamp >= $${paramIndex}`);
        params.push(query.startDate);
        paramIndex++;
      }

      if (query.endDate) {
        whereConditions.push(`ph.timestamp <= $${paramIndex}`);
        params.push(query.endDate);
        paramIndex++;
      }

      if (query.currency) {
        whereConditions.push(`ph.currency = $${paramIndex}`);
        params.push(query.currency);
        paramIndex++;
      }

      const limit = query.limit || 100;
      params.push(limit);

      const result = await pool.query<PriceHistory>(
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
          ph.timestamp,
          ph.createdat
        FROM price_history ph
        JOIN metal m ON ph.metal_id = m.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ph.timestamp DESC
        LIMIT $${paramIndex}`,
        params
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching historical prices:', error);
      throw new Error('Failed to fetch historical price data');
    }
  }

  /**
   * Update prices from external API providers
   */
  async updatePricesFromApi(): Promise<PriceUpdateResult> {
    const pool = getPool();
    const result: PriceUpdateResult = {
      success: false,
      provider: '',
      updatedMetals: [],
      errors: [],
      timestamp: new Date()
    };

    try {
      // Get active providers ordered by priority
      const providersResult = await pool.query<MarketDataProvider>(
        `SELECT * FROM market_data_provider 
         WHERE is_active = true 
         ORDER BY priority ASC`
      );

      if (providersResult.rows.length === 0) {
        result.errors.push('No active market data providers configured');
        return result;
      }

      // Get all metals to update
      const metalsResult = await pool.query<{ id: string; symbol: string }>(
        'SELECT id, symbol FROM metal'
      );

      // Try each provider in priority order
      for (const provider of providersResult.rows) {
        try {
          const apiKey = process.env[provider.api_key_env_var];
          
          if (!apiKey) {
            result.errors.push(`API key not found for ${provider.name} (${provider.api_key_env_var})`);
            continue;
          }

          // Fetch data from provider (provider-specific implementation)
          const prices = await this.fetchFromProvider(provider, metalsResult.rows, apiKey);
          
          if (prices && Object.keys(prices).length > 0) {
            // Update prices in database
            for (const metal of metalsResult.rows) {
              const price = prices[metal.symbol];
              if (price) {
                await this.savePriceToDatabase(metal.id, provider.id, price);
                result.updatedMetals.push(metal.symbol);
              }
            }

            // Update provider success timestamp
            await pool.query(
              `UPDATE market_data_provider 
               SET last_success = NOW(), failure_count = 0 
               WHERE id = $1`,
              [provider.id]
            );

            result.success = true;
            result.provider = provider.name;
            break; // Success, no need to try other providers
          }
        } catch (providerError) {
          const errorMessage = providerError instanceof Error ? providerError.message : 'Unknown error';
          result.errors.push(`${provider.name}: ${errorMessage}`);
          
          // Update provider failure count
          await pool.query(
            `UPDATE market_data_provider 
             SET last_failure = NOW(), failure_count = failure_count + 1 
             WHERE id = $1`,
            [provider.id]
          );
          
          // Continue to next provider
        }
      }

      return result;
    } catch (error) {
      console.error('Error updating prices from API:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Fetch prices from a specific provider
   */
  private async fetchFromProvider(
    provider: MarketDataProvider,
    metals: Array<{ id: string; symbol: string }>,
    apiKey: string
  ): Promise<Record<string, number>> {
    try {
      // Provider-specific API implementations
      if (provider.name === 'Metals-API') {
        return await this.fetchFromMetalsApi(provider.base_url, apiKey, metals);
      } else if (provider.name === 'GoldAPI') {
        return await this.fetchFromGoldApi(provider.base_url, apiKey, metals);
      }
      
      throw new Error(`Unknown provider: ${provider.name}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw new Error(`API request failed: ${axiosError.message}`);
      }
      throw error;
    }
  }

  /**
   * Fetch from Metals-API provider
   */
  private async fetchFromMetalsApi(
    baseUrl: string,
    apiKey: string,
    metals: Array<{ symbol: string }>
  ): Promise<Record<string, number>> {
    const symbols = metals.map(m => m.symbol).join(',');
    const url = `${baseUrl}/latest?access_key=${apiKey}&base=USD&symbols=${symbols}`;
    
    const response = await axios.get<ProviderApiResponse>(url, {
      timeout: 10000
    });

    if (!response.data.success || !response.data.rates) {
      throw new Error('Invalid API response from Metals-API');
    }

    // Metals-API returns rates as USD per unit, convert to price per troy oz
    const prices: Record<string, number> = {};
    for (const [symbol, rate] of Object.entries(response.data.rates)) {
      if (typeof rate === 'number') {
        prices[symbol] = 1 / rate; // Convert rate to price
      }
    }

    return prices;
  }

  /**
   * Fetch from GoldAPI provider
   */
  private async fetchFromGoldApi(
    baseUrl: string,
    apiKey: string,
    metals: Array<{ symbol: string }>
  ): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    
    // GoldAPI requires individual requests per metal
    for (const metal of metals) {
      try {
        const url = `${baseUrl}/${metal.symbol}/USD`;
        const response = await axios.get(url, {
          headers: { 'x-access-token': apiKey },
          timeout: 10000
        });

        if (response.data && response.data.price) {
          prices[metal.symbol] = Number.parseFloat(response.data.price);
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching ${metal.symbol} from GoldAPI:`, error);
      }
    }

    return prices;
  }

  /**
   * Save price to database (both current and historical)
   */
  private async savePriceToDatabase(
    metalId: string,
    providerId: string,
    price: number,
    currency = 'USD'
  ): Promise<void> {
    const pool = getPool();
    const timestamp = new Date();

    try {
      await pool.query('BEGIN');

      // Update current price (upsert)
      await pool.query(
        `INSERT INTO market_price 
          (metal_id, provider_id, price_per_troy_oz, currency, timestamp)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (metal_id, provider_id)
         DO UPDATE SET 
           price_per_troy_oz = $3,
           timestamp = $5,
           updatedat = NOW()`,
        [metalId, providerId, price, currency, timestamp]
      );

      // Insert into price history
      await pool.query(
        `INSERT INTO price_history 
          (metal_id, provider_id, price_per_troy_oz, currency, timestamp)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (metal_id, provider_id, timestamp) DO NOTHING`,
        [metalId, providerId, price, currency, timestamp]
      );

      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get cached price
   */
  private async getCachedPrice(metalSymbol: string, currency: string): Promise<MarketPrice | null> {
    const pool = getPool();
    const cacheKey = `price:${metalSymbol}:${currency}`;
    
    try {
      const result = await pool.query(
        `SELECT data FROM market_data_cache 
         WHERE cache_key = $1 AND expires_at > NOW()`,
        [cacheKey]
      );

      if (result.rows.length > 0) {
        return result.rows[0].data as MarketPrice;
      }
      
      return null;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  /**
   * Cache price data
   */
  private async cachePrice(metalSymbol: string, currency: string, price: MarketPrice): Promise<void> {
    const pool = getPool();
    const cacheKey = `price:${metalSymbol}:${currency}`;
    const expiresAt = new Date(Date.now() + this.cacheTimeout);
    
    try {
      await pool.query(
        `INSERT INTO market_data_cache (cache_key, data, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (cache_key) 
         DO UPDATE SET data = $2, expires_at = $3, createdat = NOW()`,
        [cacheKey, JSON.stringify(price), expiresAt]
      );
    } catch (error) {
      console.error('Error caching price:', error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupCache(): Promise<void> {
    const pool = getPool();
    
    try {
      await pool.query('SELECT cleanup_expired_cache()');
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }

  /**
   * Get provider status
   */
  async getProviderStatus(): Promise<MarketDataProvider[]> {
    const pool = getPool();
    
    try {
      const result = await pool.query<MarketDataProvider>(
        `SELECT 
          id, name, base_url, is_active, rate_limit_per_minute,
          priority, last_success, last_failure, failure_count
         FROM market_data_provider
         ORDER BY priority ASC`
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching provider status:', error);
      throw new Error('Failed to fetch provider status');
    }
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();
