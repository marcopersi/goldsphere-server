/**
 * Market Data Provider Interface
 * 
 * Strategy Pattern for different external API providers
 * Each provider implements this interface
 * Allows easy addition of new providers without modifying existing code (Open/Closed Principle)
 */

import type { MetalPrice } from '../types/MarketDataTypes';

export interface IMarketDataProvider {
  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Get provider priority (lower number = higher priority)
   */
  getPriority(): number;

  /**
   * Check if provider is available (has API key, etc.)
   */
  isAvailable(): boolean;

  /**
   * Fetch prices for multiple metals
   * @param metalSymbols - Array of metal symbols (AU, AG, PT, PD)
   * @param currency - Currency code
   * @returns Array of metal prices
   */
  fetchPrices(metalSymbols: readonly string[], currency: string): Promise<MetalPrice[]>;
}
