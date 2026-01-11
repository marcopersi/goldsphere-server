/**
 * Market Data Service Interface
 * 
 * Domain Service for managing precious metal market data
 * Follows Interface Segregation Principle (ISP)
 * 
 * Responsibilities:
 * - Fetch current and historical prices
 * - Update prices from external providers
 * - Manage provider status
 * - Cache management
 */

import type {
  MarketPrice,
  PriceHistory,
  MarketDataQuery,
  PriceUpdateResult,
  MarketDataProvider
} from './types/MarketDataTypes';

export interface IMarketDataService {
  /**
   * Get current market price for a specific metal
   * @param metalSymbol - Metal symbol (AU, AG, PT, PD)
   * @param currency - Currency code (USD, EUR, CHF)
   * @returns Current price or null if not found
   */
  getCurrentPrice(metalSymbol: string, currency?: string): Promise<MarketPrice | null>;

  /**
   * Get all current prices
   * @param currency - Currency code
   * @returns Array of current prices
   */
  getAllCurrentPrices(currency?: string): Promise<MarketPrice[]>;

  /**
   * Get historical prices for a metal
   * @param query - Query parameters for filtering
   * @returns Array of historical prices
   */
  getHistoricalPrices(query: MarketDataQuery): Promise<PriceHistory[]>;

  /**
   * Update prices from external API providers
   * Uses provider fallback strategy
   * @returns Update result with success status and errors
   */
  updatePricesFromApi(): Promise<PriceUpdateResult>;

  /**
   * Get status of all registered providers
   * @returns Array of providers with their status
   */
  getProviderStatus(): Promise<MarketDataProvider[]>;

  /**
   * Clean up expired cache entries
   * @returns Number of deleted entries
   */
  cleanupCache(): Promise<number>;
}
