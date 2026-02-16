/**
 * Market Data Service Implementation
 * 
 * Implements IMarketDataService with Dependency Injection
 * Orchestrates between Repository and Provider layers
 * Follows SOLID principles and Clean Architecture
 * 
 * Dependencies:
 * - Repository for data persistence
 * - Providers array for external API access (Strategy Pattern)
 * - ReferenceService for metal symbol → ID resolution
 */

import type { IMarketDataService } from '../IMarketDataService';
import type { IMarketDataRepository } from '../repository/IMarketDataRepository';
import type { IMarketDataProvider } from '../providers/IMarketDataProvider';
import type { IReferenceService } from '../../reference/IReferenceService';
import type {
  MarketPrice,
  PriceHistory,
  MarketDataQuery,
  PriceUpdateResult,
  MarketDataProvider,
  PriceData
} from '../types/MarketDataTypes';
import { SUPPORTED_METALS, CACHE_DURATION_MINUTES } from '../types/MarketDataTypes';

export class MarketDataServiceImpl implements IMarketDataService {
  constructor(
    private readonly repository: IMarketDataRepository,
    private readonly providers: ReadonlyArray<IMarketDataProvider>,
    private readonly referenceService: IReferenceService
  ) {
    if (providers.length === 0) {
      console.warn('[MarketDataService] No providers configured');
    }
  }

  /**
   * Resolve metal symbol to ID using ReferenceService
   */
  private async resolveMetalId(metalSymbol: string): Promise<string | null> {
    const metal = await this.referenceService.getMetalBySymbol(metalSymbol);
    return metal?.id || null;
  }

  async getCurrentPrice(metalSymbol: string, currency = 'USD'): Promise<MarketPrice | null> {
    try {
      // Check cache first
      const cacheKey = `price:${metalSymbol}:${currency}`;
      const cached = await this.repository.getCachedData<MarketPrice>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Resolve metal ID via ReferenceService
      const metalId = await this.resolveMetalId(metalSymbol);
      if (!metalId) {
        console.warn(`[MarketDataService] Unknown metal symbol: ${metalSymbol}`);
        return null;
      }

      // Get from database
      const price = await this.repository.getCurrentPrice(metalId, currency);
      
      // Cache if found
      if (price) {
        await this.repository.setCachedData(cacheKey, price, CACHE_DURATION_MINUTES);
      }

      return price;
    } catch (error) {
      console.error(`[MarketDataService] Failed to get current price for ${metalSymbol}:`, error);
      throw new Error(`Failed to fetch market price for ${metalSymbol}`);
    }
  }

  async getAllCurrentPrices(currency = 'USD'): Promise<MarketPrice[]> {
    try {
      return await this.repository.getAllCurrentPrices(currency);
    } catch (error) {
      console.error('[MarketDataService] Failed to get all current prices:', error);
      throw new Error('Failed to fetch all market prices');
    }
  }

  async getHistoricalPrices(query: MarketDataQuery): Promise<PriceHistory[]> {
    try {
      if (!query.metalSymbol && !query.metalId) {
        throw new Error('Either metalSymbol or metalId must be provided');
      }

      let metalId: string | null = query.metalId || null;
      
      // Resolve metal ID via ReferenceService if symbol provided
      if (!metalId && query.metalSymbol) {
        metalId = await this.resolveMetalId(query.metalSymbol);
        if (!metalId) {
          console.warn(`[MarketDataService] Unknown metal symbol: ${query.metalSymbol}`);
          return [];
        }
      }

      const startDate = query.startDate || this.getDefaultStartDate();
      const endDate = query.endDate || new Date();
      const currency = query.currency || 'USD';
      const limit = query.limit || 100;

      if (!metalId) {
        throw new Error('Failed to resolve metalId');
      }

      return await this.repository.getHistoricalPrices(
        metalId,
        startDate,
        endDate,
        currency,
        limit
      );
    } catch (error) {
      console.error('[MarketDataService] Failed to get historical prices:', error);
      throw new Error('Failed to fetch historical price data');
    }
  }

  async updatePricesFromApi(): Promise<PriceUpdateResult> {
    const result: PriceUpdateResult = {
      success: false,
      provider: 'none',
      updatedMetals: [],
      errors: [],
      timestamp: new Date()
    };

    try {
      // Get available providers sorted by priority
      const availableProviders = this.providers
        .filter(p => p.isAvailable())
        .sort((a, b) => a.getPriority() - b.getPriority());

      if (availableProviders.length === 0) {
        result.errors.push('No providers available');
        return result;
      }

      // Try each provider until one succeeds
      for (const provider of availableProviders) {
        try {
          console.log(`[MarketDataService] Fetching prices from ${provider.getName()}`);
          
          const prices = await provider.fetchPrices(SUPPORTED_METALS, 'USD');
          
          if (prices.length > 0) {
            await this.savePrices(provider.getName(), prices);
            
            result.success = true;
            result.provider = provider.getName();
            result.updatedMetals = prices.map(p => p.symbol);
            
            console.log(`[MarketDataService] Successfully updated ${prices.length} prices from ${provider.getName()}`);
            break;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`[MarketDataService] Provider ${provider.getName()} failed: ${errorMsg}`);
          result.errors.push(`${provider.getName()}: ${errorMsg}`);
        }
      }

      if (!result.success) {
        console.error('[MarketDataService] All providers failed to fetch prices');
      }

      return result;
    } catch (error) {
      console.error('[MarketDataService] Fatal error updating prices:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  async getProviderStatus(): Promise<MarketDataProvider[]> {
    try {
      return await this.repository.getActiveProviders();
    } catch (error) {
      console.error('[MarketDataService] Failed to get provider status:', error);
      throw new Error('Failed to fetch provider status');
    }
  }

  async cleanupCache(): Promise<number> {
    try {
      const deleted = await this.repository.cleanupCache();
      console.log(`[MarketDataService] Cleaned up ${deleted} expired cache entries`);
      return deleted;
    } catch (error) {
      console.error('[MarketDataService] Failed to cleanup cache:', error);
      return 0;
    }
  }

  /**
   * Private helper: Save fetched prices to database
   * Follows Single Responsibility Principle
   */
  private async savePrices(
    providerName: string,
    prices: ReadonlyArray<{ symbol: string; price: number; currency: string; bid?: number; ask?: number }>
  ): Promise<void> {
    try {
      // Get provider from database
      const providers = await this.repository.getActiveProviders();
      const provider = providers.find(p => p.name === providerName);
      
      if (!provider) {
        throw new Error(`Provider ${providerName} not found in database`);
      }

      // Save each price
      for (const priceData of prices) {
        const metalId = await this.resolveMetalId(priceData.symbol);
        
        if (!metalId) {
          console.warn(`[MarketDataService] Metal ${priceData.symbol} not found, skipping`);
          continue;
        }

        const dataToSave: PriceData = {
          metalId,
          providerId: provider.id,
          price: priceData.price,
          currency: priceData.currency,
          metadata: {
            bid: priceData.bid,
            ask: priceData.ask
          }
        };

        await this.repository.upsertPrice(dataToSave);

        // Also save to history for archiving
        await this.repository.saveHistoricalPrice(dataToSave, new Date());

        // Invalidate cache
        const cacheKey = `price:${priceData.symbol}:${priceData.currency}`;
        await this.repository.setCachedData(cacheKey, null, 0);
      }

      // Update provider success status
      await this.repository.updateProviderSuccess(provider.id, new Date());
    } catch (error) {
      console.error('[MarketDataService] Failed to save prices:', error);
      
      // Update provider failure status
      const providers = await this.repository.getActiveProviders();
      const provider = providers.find(p => p.name === providerName);
      if (provider) {
        await this.repository.updateProviderFailure(
          provider.id,
          error instanceof Error ? error.message : 'Unknown error',
          new Date()
        );
      }
      
      throw error;
    }
  }

  /**
   * Private helper: Get default start date (7 days ago)
   */
  private getDefaultStartDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  }
}
