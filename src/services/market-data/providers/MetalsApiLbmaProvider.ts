/**
 * LBMA Provider - Metals-API Historical LBMA Endpoint
 * 
 * Fetches official LBMA benchmark prices via Metals-API
 * Historical data available since 1968 for Gold, 2010 for Silver
 * 
 * @see https://metals-api.com/documentation#historical-rates-lbma
 */

import type { IMarketDataProvider } from './IMarketDataProvider';
import type { 
  MetalPrice, 
  LbmaPrice, 
  LbmaApiResponse,
  PriceTypeCode 
} from '../types/MarketDataTypes';
import { LBMA_SYMBOL_MAP, LBMA_FIXING_TIMES } from '../types/MarketDataTypes';

/**
 * Interface for LBMA-specific provider capabilities
 */
export interface ILbmaProvider extends IMarketDataProvider {
  fetchLbmaPrices(
    metalSymbol: string, 
    date: Date, 
    currencies?: string[]
  ): Promise<LbmaPrice[]>;
  
  fetchLbmaHistorical(
    metalSymbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<LbmaPrice[]>;
}

export class MetalsApiLbmaProvider implements ILbmaProvider {
  private readonly baseUrl = 'https://metals-api.com/api';
  private readonly priority = 1;
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.METALS_API_KEY;
  }

  getName(): string {
    return 'Metals-API-LBMA';
  }

  getPriority(): number {
    return this.priority;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Fetch standard spot prices (IMarketDataProvider interface)
   */
  async fetchPrices(metalSymbols: readonly string[], currency = 'USD'): Promise<MetalPrice[]> {
    if (!this.apiKey) {
      throw new Error('METALS_API_KEY not configured');
    }

    const symbols = metalSymbols.map(s => this.mapToApiSymbol(s)).join(',');
    const url = `${this.baseUrl}/latest?access_key=${this.apiKey}&base=${currency}&symbols=${symbols}`;

    try {
      const response = await fetch(url);
      const data = (await response.json()) as LbmaApiResponse;

      if (!data.success) {
        throw new Error(data.error?.info || 'API request failed');
      }

      const prices: MetalPrice[] = [];
      for (const metalSymbol of metalSymbols) {
        const apiSymbol = this.mapToApiSymbol(metalSymbol);
        const rate = data.rates?.[apiSymbol];
        
        if (rate) {
          // Metals-API returns inverse rate when base is USD
          const price = currency === 'USD' ? 1 / rate : rate;
          prices.push({
            symbol: metalSymbol,
            price,
            currency,
            timestamp: new Date(data.timestamp ? data.timestamp * 1000 : Date.now())
          });
        }
      }

      return prices;
    } catch (error) {
      console.error('[MetalsApiLbmaProvider] fetchPrices error:', error);
      throw error;
    }
  }

  /**
   * Fetch LBMA benchmark prices for a specific date
   */
  async fetchLbmaPrices(
    metalSymbol: string, 
    date: Date,
    currencies: string[] = ['USD', 'GBP', 'EUR']
  ): Promise<LbmaPrice[]> {
    if (!this.apiKey) {
      throw new Error('METALS_API_KEY not configured');
    }

    const lbmaSymbols = this.getLbmaSymbols(metalSymbol);
    if (lbmaSymbols.length === 0) {
      throw new Error(`No LBMA symbols found for ${metalSymbol}`);
    }

    const dateStr = this.formatDate(date);
    const prices: LbmaPrice[] = [];

    for (const lbmaSymbol of lbmaSymbols) {
      for (const currency of currencies) {
        try {
          const url = `${this.baseUrl}/historical-lbma/${dateStr}?access_key=${this.apiKey}&symbols=${lbmaSymbol}&base=${currency}`;
          const response = await fetch(url);
          const data = (await response.json()) as LbmaApiResponse;

          if (!data.success) {
            console.warn(`[MetalsApiLbmaProvider] LBMA fetch failed for ${lbmaSymbol}:`, data.error?.info);
            continue;
          }

          const rate = data.rates?.[lbmaSymbol];
          if (rate) {
            const priceTypeCode = this.getPriceTypeCode(lbmaSymbol);
            const fixingTime = this.getFixingTime(metalSymbol, priceTypeCode);
            
            // Find existing price for this date/metal or create new
            let existingPrice = prices.find(
              p => p.fixingDate.getTime() === date.getTime() && 
                   p.priceTypeCode === priceTypeCode
            );

            if (existingPrice) {
              // Update with additional currency
              existingPrice = {
                ...existingPrice,
                ...(currency === 'USD' && { priceUsd: rate }),
                ...(currency === 'GBP' && { priceGbp: rate }),
                ...(currency === 'EUR' && { priceEur: rate }),
              };
              const idx = prices.findIndex(
                p => p.fixingDate.getTime() === date.getTime() && 
                     p.priceTypeCode === priceTypeCode
              );
              prices[idx] = existingPrice;
            } else {
              prices.push({
                id: '', // Will be assigned by database
                metalId: '', // Will be resolved by service
                metalSymbol,
                priceTypeId: '', // Will be resolved by service
                priceTypeCode,
                fixingDate: date,
                fixingTime,
                priceUsd: currency === 'USD' ? rate : undefined,
                priceGbp: currency === 'GBP' ? rate : undefined,
                priceEur: currency === 'EUR' ? rate : undefined,
                source: 'METALS_API'
              } as LbmaPrice);
            }
          }
        } catch (error) {
          console.error(`[MetalsApiLbmaProvider] Error fetching ${lbmaSymbol}:`, error);
        }
      }
    }

    return prices;
  }

  /**
   * Fetch historical LBMA prices for a date range
   */
  async fetchLbmaHistorical(
    metalSymbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<LbmaPrice[]> {
    const allPrices: LbmaPrice[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Skip weekends
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        try {
          const prices = await this.fetchLbmaPrices(metalSymbol, new Date(currentDate));
          allPrices.push(...prices);
        } catch (error) {
          console.warn(`[MetalsApiLbmaProvider] Failed to fetch ${metalSymbol} for ${this.formatDate(currentDate)}`);
        }
        
        // Rate limiting - wait 100ms between requests
        await this.delay(100);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return allPrices;
  }

  /**
   * Map our metal symbol to Metals-API symbol
   */
  private mapToApiSymbol(metalSymbol: string): string {
    const map: Record<string, string> = {
      'AU': 'XAU',
      'AG': 'XAG', 
      'PT': 'XPT',
      'PD': 'XPD'
    };
    return map[metalSymbol] || metalSymbol;
  }

  /**
   * Get LBMA symbols for a metal
   */
  private getLbmaSymbols(metalSymbol: string): string[] {
    const mapping = LBMA_SYMBOL_MAP[metalSymbol as keyof typeof LBMA_SYMBOL_MAP];
    if (!mapping) return [];

    const symbols: string[] = [];
    if (mapping.am) symbols.push(mapping.am);
    if (mapping.pm) symbols.push(mapping.pm);
    if (mapping.single) symbols.push(mapping.single);
    
    return symbols;
  }

  /**
   * Map LBMA symbol to price type code
   */
  private getPriceTypeCode(lbmaSymbol: string): PriceTypeCode {
    const map: Record<string, PriceTypeCode> = {
      'LBXAUAM': 'LBMA_AM',
      'LBXAUPM': 'LBMA_PM',
      'LBXAG': 'LBMA_SILVER',
      'LBXPTAM': 'LBMA_PLATINUM_AM',
      'LBXPTPM': 'LBMA_PLATINUM_PM',
      'LBXPDAM': 'LBMA_PALLADIUM_AM',
      'LBXPDPM': 'LBMA_PALLADIUM_PM'
    };
    return map[lbmaSymbol] || 'SPOT';
  }

  /**
   * Get fixing time for a metal and price type
   */
  private getFixingTime(metalSymbol: string, priceTypeCode: PriceTypeCode): string {
    switch (priceTypeCode) {
      case 'LBMA_AM': return LBMA_FIXING_TIMES.GOLD_AM;
      case 'LBMA_PM': return LBMA_FIXING_TIMES.GOLD_PM;
      case 'LBMA_SILVER': return LBMA_FIXING_TIMES.SILVER;
      case 'LBMA_PLATINUM_AM': return LBMA_FIXING_TIMES.PLATINUM_AM;
      case 'LBMA_PLATINUM_PM': return LBMA_FIXING_TIMES.PLATINUM_PM;
      case 'LBMA_PALLADIUM_AM': return LBMA_FIXING_TIMES.PALLADIUM_AM;
      case 'LBMA_PALLADIUM_PM': return LBMA_FIXING_TIMES.PALLADIUM_PM;
      default: return '12:00';
    }
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
