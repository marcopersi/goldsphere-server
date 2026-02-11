/**
 * GoldAPI Provider
 * 
 * Real-time and historical gold, silver, platinum, palladium prices
 * Supports FOREX data sources for precious metals
 * 
 * @see https://www.goldapi.io/
 */

import type { IMarketDataProvider } from './IMarketDataProvider';
import type { MetalPrice } from '../types/MarketDataTypes';

/**
 * GoldAPI Response Interface
 */
interface GoldApiResponse {
  readonly timestamp: number;
  readonly metal: string;
  readonly currency: string;
  readonly exchange: string;
  readonly symbol: string;
  readonly prev_close_price?: number;
  readonly open_price?: number;
  readonly low_price?: number;
  readonly high_price?: number;
  readonly open_time?: string;
  readonly price: number;
  readonly ch: number;
  readonly chp: number;
  readonly ask: number;
  readonly bid: number;
  readonly price_gram_24k?: number;
  readonly price_gram_22k?: number;
  readonly price_gram_21k?: number;
  readonly price_gram_18k?: number;
  readonly error?: string;
}

/**
 * Metal symbol mapping: Our format -> GoldAPI format
 */
const METAL_SYMBOL_MAP: Record<string, string> = {
  'AU': 'XAU',
  'AG': 'XAG',
  'PT': 'XPT',
  'PD': 'XPD',
};

export class GoldApiProvider implements IMarketDataProvider {
  private readonly baseUrl = 'https://www.goldapi.io/api';
  private readonly priority = 2;
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GOLD_API_KEY;
  }

  getName(): string {
    return 'GoldAPI';
  }

  getPriority(): number {
    return this.priority;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Fetch current prices for multiple metals
   */
  async fetchPrices(metalSymbols: readonly string[], currency = 'USD'): Promise<MetalPrice[]> {
    if (!this.apiKey) {
      throw new Error('GOLD_API_KEY not configured');
    }

    const prices: MetalPrice[] = [];

    for (const metalSymbol of metalSymbols) {
      try {
        const price = await this.fetchSinglePrice(metalSymbol, currency);
        if (price) {
          prices.push(price);
        }
      } catch (error) {
        console.error(`[GoldApiProvider] Failed to fetch ${metalSymbol}:`, error);
      }
    }

    return prices;
  }

  /**
   * Fetch price for a single metal
   */
  async fetchSinglePrice(metalSymbol: string, currency = 'USD'): Promise<MetalPrice | null> {
    if (!this.apiKey) {
      throw new Error('GOLD_API_KEY not configured');
    }

    const apiSymbol = METAL_SYMBOL_MAP[metalSymbol];
    if (!apiSymbol) {
      console.warn(`[GoldApiProvider] Unknown metal symbol: ${metalSymbol}`);
      return null;
    }

    const url = `${this.baseUrl}/${apiSymbol}/${currency}`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-access-token': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as GoldApiResponse;

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        symbol: metalSymbol,
        price: data.price,
        currency,
        bid: data.bid,
        ask: data.ask,
        timestamp: new Date(data.timestamp * 1000)
      };
    } catch (error) {
      console.error(`[GoldApiProvider] Error fetching ${metalSymbol}/${currency}:`, error);
      throw error;
    }
  }

  /**
   * Fetch historical price for a specific date
   */
  async fetchHistoricalPrice(
    metalSymbol: string, 
    date: Date, 
    currency = 'USD'
  ): Promise<MetalPrice | null> {
    if (!this.apiKey) {
      throw new Error('GOLD_API_KEY not configured');
    }

    const apiSymbol = METAL_SYMBOL_MAP[metalSymbol];
    if (!apiSymbol) {
      console.warn(`[GoldApiProvider] Unknown metal symbol: ${metalSymbol}`);
      return null;
    }

    const dateStr = this.formatDate(date);
    const url = `${this.baseUrl}/${apiSymbol}/${currency}/${dateStr}`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-access-token': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as GoldApiResponse;

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        symbol: metalSymbol,
        price: data.price,
        currency,
        bid: data.bid,
        ask: data.ask,
        timestamp: date
      };
    } catch (error) {
      console.error(`[GoldApiProvider] Error fetching historical ${metalSymbol}/${currency}/${dateStr}:`, error);
      throw error;
    }
  }

  /**
   * Get price breakdown by karat (gold only)
   */
  async fetchGoldKaratPrices(currency = 'USD'): Promise<Record<string, number> | null> {
    if (!this.apiKey) {
      throw new Error('GOLD_API_KEY not configured');
    }

    const url = `${this.baseUrl}/XAU/${currency}`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-access-token': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as GoldApiResponse;

      return {
        '24k': data.price_gram_24k || 0,
        '22k': data.price_gram_22k || 0,
        '21k': data.price_gram_21k || 0,
        '18k': data.price_gram_18k || 0
      };
    } catch (error) {
      console.error('[GoldApiProvider] Error fetching karat prices:', error);
      return null;
    }
  }

  /**
   * Format date as YYYYMMDD for GoldAPI
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}
