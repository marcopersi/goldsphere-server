/**
 * Market Data Module - Barrel Export
 * 
 * Clean export of all public interfaces and implementations
 * Follows Facade Pattern for simplified module access
 */

// Service Interface and Implementation
export { IMarketDataService } from './IMarketDataService';
export { MarketDataServiceImpl } from './impl/MarketDataServiceImpl';

// Repository Interfaces and Implementations  
export { IMarketDataRepository } from './repository/IMarketDataRepository';
export { MarketDataRepositoryImpl } from './repository/MarketDataRepositoryImpl';
export { MarketDataRepositoryMock } from './mock/MarketDataRepositoryMock';

// Provider Interface and Implementations
export { IMarketDataProvider } from './providers/IMarketDataProvider';
export { SIXSwissExchangeProvider } from './providers/SIXSwissExchangeProvider';

// Factory for Service Creation
export { MarketDataServiceFactory } from './MarketDataServiceFactory';

// Types
export * from './types/MarketDataTypes';

// Legacy compatibility (deprecated - use MarketDataServiceFactory.create() instead)
export { MarketDataServiceImpl as MarketDataService } from './impl/MarketDataServiceImpl';
