/**
 * Market Data Provider Interface
 * Strategy pattern for different market data sources
 */

export interface MetalPrice {
  symbol: string;
  price: number;
  currency: string;
  bid?: number;
  ask?: number;
  timestamp: Date;
}

export interface IMarketDataProvider {
  /**
   * Get the provider name
   */
  getName(): string;

  /**
   * Check if provider is configured and ready
   */
  isAvailable(): boolean;

  /**
   * Fetch current prices for precious metals
   * @param symbols Metal symbols (e.g., ['AU', 'AG', 'PT', 'PD'])
   * @param currency Target currency (default: 'USD')
   */
  fetchPrices(symbols: string[], currency: string): Promise<MetalPrice[]>;

  /**
   * Get rate limit per minute
   */
  getRateLimit(): number;

  /**
   * Get provider priority (lower = higher priority)
   */
  getPriority(): number;
}
