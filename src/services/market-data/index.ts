/**
 * Market Data Module - Barrel Export
 * 
 * Clean export of all public interfaces and implementations
 * Follows Facade Pattern for simplified module access
 */

// Service Interfaces
export { IMarketDataService } from './IMarketDataService';

// Service Implementations
export { MarketDataServiceImpl } from './impl/MarketDataServiceImpl';

// Repository Interfaces
export { IMarketDataRepository } from './repository/IMarketDataRepository';

// Repository Implementations  
export { MarketDataRepositoryImpl } from './repository/MarketDataRepositoryImpl';
export { MarketDataRepositoryMock } from './mock/MarketDataRepositoryMock';

// Provider Interfaces and Implementations
export { IMarketDataProvider } from './providers/IMarketDataProvider';
export { SIXSwissExchangeProvider } from './providers/SIXSwissExchangeProvider';
export { GoldApiProvider } from './providers/GoldApiProvider';

// Factory for Service Creation
export { MarketDataServiceFactory } from './MarketDataServiceFactory';

// Types
export * from './types/MarketDataTypes';

// Legacy compatibility (deprecated - use MarketDataServiceFactory.create() instead)
export { MarketDataServiceImpl as MarketDataService } from './impl/MarketDataServiceImpl';
