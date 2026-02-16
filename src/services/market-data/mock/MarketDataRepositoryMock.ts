/**
 * Market Data Repository Mock Implementation
 * 
 * In-memory mock for testing without database
 * Implements same interface as real repository
 * Useful for unit tests and development
 */

import type { IMarketDataRepository } from '../repository/IMarketDataRepository';
import type {
  MarketPrice,
  PriceHistory,
  MarketDataProvider,
  PriceData
} from '../types/MarketDataTypes';

export class MarketDataRepositoryMock implements IMarketDataRepository {
  private prices: Map<string, MarketPrice> = new Map();
  private history: PriceHistory[] = [];
  private providers: MarketDataProvider[] = [];
  private cache: Map<string, { data: any; expiresAt: Date }> = new Map();
  private metals: Map<string, string> = new Map([
    ['AU', 'metal-au-id'],
    ['AG', 'metal-ag-id'],
    ['PT', 'metal-pt-id'],
    ['PD', 'metal-pd-id']
  ]);

  constructor() {
    // Initialize with mock data
    this.initializeMockData();
  }

  async getCurrentPrice(metalId: string, currency: string): Promise<MarketPrice | null> {
    const key = `${metalId}-${currency}`;
    return this.prices.get(key) || null;
  }

  async getAllCurrentPrices(currency: string): Promise<MarketPrice[]> {
    return Array.from(this.prices.values())
      .filter(p => p.currency === currency);
  }

  async getHistoricalPrices(
    metalId: string,
    startDate: Date,
    endDate: Date,
    currency: string,
    limit: number
  ): Promise<PriceHistory[]> {
    return this.history
      .filter(h => 
        h.metalId === metalId &&
        h.currency === currency &&
        h.timestamp >= startDate &&
        h.timestamp <= endDate
      )
      .slice(0, limit);
  }

  async upsertPrice(priceData: PriceData): Promise<void> {
    const key = `${priceData.metalId}-${priceData.currency}`;
    const existingPrice = this.prices.get(key);
    
    const newPrice: MarketPrice = {
      id: existingPrice?.id || `price-${Date.now()}`,
      metalId: priceData.metalId,
      metalSymbol: this.getSymbolByMetalId(priceData.metalId),
      metalName: this.getNameByMetalId(priceData.metalId),
      providerId: priceData.providerId,
      providerName: 'Mock Provider',
      pricePerTroyOz: priceData.price,
      currency: priceData.currency,
      bid: priceData.metadata?.bid,
      ask: priceData.metadata?.ask,
      high24h: priceData.metadata?.high,
      low24h: priceData.metadata?.low,
      timestamp: new Date(),
      createdAt: existingPrice?.createdAt || new Date(),
      updatedAt: new Date()
    };

    this.prices.set(key, newPrice);
  }

  async getActiveProviders(): Promise<MarketDataProvider[]> {
    return this.providers.filter(p => p.isActive);
  }

  async updateProviderSuccess(providerId: string, timestamp: Date): Promise<void> {
    const provider = this.providers.find(p => p.id === providerId);
    if (provider) {
      (provider as any).lastSuccess = timestamp;
      (provider as any).failureCount = 0;
    }
  }

  async updateProviderFailure(providerId: string, error: string, timestamp: Date): Promise<void> {
    const provider = this.providers.find(p => p.id === providerId);
    if (provider) {
      (provider as any).lastFailure = timestamp;
      (provider as any).failureCount++;
    }
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (cached.expiresAt < new Date()) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  async setCachedData<T>(key: string, data: T, expirationMinutes: number): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
    this.cache.set(key, { data, expiresAt });
  }

  async cleanupCache(): Promise<number> {
    const now = new Date();
    let deleted = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt < now) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    return deleted;
  }

  async saveHistoricalPrice(priceData: PriceData, timestamp: Date): Promise<void> {
    const historyEntry: PriceHistory = {
      id: `history-${Date.now()}`,
      metalId: priceData.metalId,
      metalSymbol: this.getSymbolByMetalId(priceData.metalId),
      providerId: priceData.providerId,
      pricePerTroyOz: priceData.price,
      currency: priceData.currency,
      bid: priceData.metadata?.bid,
      ask: priceData.metadata?.ask,
      high: priceData.metadata?.high,
      low: priceData.metadata?.low,
      timestamp,
      createdAt: new Date()
    };

    this.history.push(historyEntry);
  }

  // Helper methods
  private initializeMockData(): void {
    // Initialize mock providers
    this.providers = [
      {
        id: 'provider-six-swiss',
        name: 'SIX-Swiss-Exchange',
        apiKeyEnvVar: 'NONE',
        baseUrl: 'https://www.six-group.com',
        isActive: true,
        rateLimitPerMinute: 60,
        priority: 1,
        failureCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Initialize mock prices
    const mockPrices: Array<{ symbol: string; price: number }> = [
      { symbol: 'AU', price: 2000.50 },
      { symbol: 'AG', price: 25.30 },
      { symbol: 'PT', price: 950.00 },
      { symbol: 'PD', price: 1050.00 }
    ];

    for (const { symbol, price } of mockPrices) {
      const metalId = this.metals.get(symbol);
      if (!metalId) {
        continue;
      }
      const key = `${metalId}-USD`;
      
      this.prices.set(key, {
        id: `price-${symbol}`,
        metalId,
        metalSymbol: symbol,
        metalName: this.getNameBySymbol(symbol),
        providerId: 'provider-six-swiss',
        providerName: 'SIX-Swiss-Exchange',
        pricePerTroyOz: price,
        currency: 'USD',
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  private getSymbolByMetalId(metalId: string): string | undefined {
    for (const [symbol, id] of this.metals.entries()) {
      if (id === metalId) return symbol;
    }
    return undefined;
  }

  private getNameByMetalId(metalId: string): string | undefined {
    const symbol = this.getSymbolByMetalId(metalId);
    return symbol ? this.getNameBySymbol(symbol) : undefined;
  }

  private getNameBySymbol(symbol: string): string {
    const names: Record<string, string> = {
      'AU': 'Gold',
      'AG': 'Silver',
      'PT': 'Platinum',
      'PD': 'Palladium'
    };
    return names[symbol] || 'Unknown';
  }

  // Public methods for test manipulation
  public clearAll(): void {
    this.prices.clear();
    this.history = [];
    this.cache.clear();
  }

  public addMockPrice(price: MarketPrice): void {
    const key = `${price.metalId}-${price.currency}`;
    this.prices.set(key, price);
  }

  public addMockProvider(provider: MarketDataProvider): void {
    this.providers.push(provider);
  }
}
