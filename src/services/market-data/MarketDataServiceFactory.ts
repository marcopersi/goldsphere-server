/**
 * Market Data Service Factory
 * 
 * Creates and configures MarketDataService with all dependencies
 * Follows Factory Pattern and Dependency Injection
 * 
 * Responsibilities:
 * - Wire up all dependencies (Repository, Providers)
 * - Configure Strategy Pattern for providers
 * - Provide single entry point for service creation
 */

import { Pool } from 'pg';
import type { IMarketDataService } from './IMarketDataService';
import type { IMarketDataRepository } from './repository/IMarketDataRepository';
import type { IMarketDataProvider } from './providers/IMarketDataProvider';
import { MarketDataServiceImpl } from './impl/MarketDataServiceImpl';
import { MarketDataRepositoryImpl } from './repository/MarketDataRepositoryImpl';
import { MarketDataRepositoryMock } from './mock/MarketDataRepositoryMock';
import { SIXSwissExchangeProvider } from './providers/SIXSwissExchangeProvider';
import { MarketDataScheduler } from './marketDataScheduler';

export class MarketDataServiceFactory {
  /**
   * Create production service instance with real database
   */
  static create(pool: Pool): IMarketDataService {
    const repository: IMarketDataRepository = new MarketDataRepositoryImpl(pool);
    const providers: IMarketDataProvider[] = this.createProviders();

    console.log(`[MarketDataFactory] Creating service with ${providers.length} provider(s)`);

    return new MarketDataServiceImpl(repository, providers);
  }

  /**
   * Create mock service instance for testing (no database required)
   */
  static createMock(): IMarketDataService {
    const repository: IMarketDataRepository = new MarketDataRepositoryMock();
    const providers: IMarketDataProvider[] = this.createProviders();

    console.log(`[MarketDataFactory] Creating MOCK service with ${providers.length} provider(s)`);

    return new MarketDataServiceImpl(repository, providers);
  }

  /**
   * Create and configure all providers (Strategy Pattern)
   * Add new providers here in priority order (lower number = higher priority)
   */
  private static createProviders(): IMarketDataProvider[] {
    const providers: IMarketDataProvider[] = [
      new SIXSwissExchangeProvider(),
      // Add more providers here:
      // new MetalsAPIProvider(),
      // new GoldAPIProvider(),
    ];

    return providers.filter(p => p.isAvailable());
  }

  /**
   * Create scheduler with service dependency
   */
  static createScheduler(service: IMarketDataService): MarketDataScheduler {
    return new MarketDataScheduler(service);
  }
}
