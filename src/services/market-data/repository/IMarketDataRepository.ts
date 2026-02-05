/**
 * Market Data Repository Interface
 * 
 * Data Access Layer Interface following Repository Pattern
 * Abstracts all database operations for market data
 * Follows Dependency Inversion Principle (DIP)
 * 
 * Implementation should handle:
 * - SQL queries and transactions
 * - Data mapping (DB rows to domain models)
 * - Error handling at data layer
 */

import type {
  MarketPrice,
  PriceHistory,
  MarketDataProvider,
  PriceData
} from '../types/MarketDataTypes';

export interface IMarketDataRepository {
  /**
   * Get current price for a metal
   */
  getCurrentPrice(metalId: string, currency: string): Promise<MarketPrice | null>;

  /**
   * Get all current prices
   */
  getAllCurrentPrices(currency: string): Promise<MarketPrice[]>;

  /**
   * Get historical prices with filters
   */
  getHistoricalPrices(
    metalId: string,
    startDate: Date,
    endDate: Date,
    currency: string,
    limit: number
  ): Promise<PriceHistory[]>;

  /**
   * Upsert (Insert or Update) price data
   */
  upsertPrice(priceData: PriceData): Promise<void>;

  /**
   * Get all active providers ordered by priority
   */
  getActiveProviders(): Promise<MarketDataProvider[]>;

  /**
   * Update provider success status
   */
  updateProviderSuccess(providerId: string, timestamp: Date): Promise<void>;

  /**
   * Update provider failure status
   */
  updateProviderFailure(providerId: string, error: string, timestamp: Date): Promise<void>;

  /**
   * Get cached data by key
   */
  getCachedData<T>(key: string): Promise<T | null>;

  /**
   * Set cached data with expiration
   */
  setCachedData<T>(key: string, data: T, expirationMinutes: number): Promise<void>;

  /**
   * Clean up expired cache entries
   * @returns Number of deleted entries
   */
  cleanupCache(): Promise<number>;

  /**
   * Save historical price (for archiving)
   */
  saveHistoricalPrice(priceData: PriceData, timestamp: Date): Promise<void>;
}
