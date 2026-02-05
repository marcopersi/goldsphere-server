/**
 * Market Data Module - Barrel Export
 * 
 * Clean export of all public interfaces and implementations
 * Follows Facade Pattern for simplified module access
 */

// Service Interfaces
export { IMarketDataService } from './IMarketDataService';
export { ILbmaPriceService } from './ILbmaPriceService';

// Service Implementations
export { MarketDataServiceImpl } from './impl/MarketDataServiceImpl';
export { LbmaPriceServiceImpl } from './impl/LbmaPriceServiceImpl';

// Repository Interfaces
export { IMarketDataRepository } from './repository/IMarketDataRepository';
export { ILbmaPriceRepository } from './repository/ILbmaPriceRepository';

// Repository Implementations  
export { MarketDataRepositoryImpl } from './repository/MarketDataRepositoryImpl';
export { LbmaPriceRepositoryImpl } from './repository/LbmaPriceRepositoryImpl';
export { MarketDataRepositoryMock } from './mock/MarketDataRepositoryMock';

// Provider Interfaces and Implementations
export { IMarketDataProvider } from './providers/IMarketDataProvider';
export { SIXSwissExchangeProvider } from './providers/SIXSwissExchangeProvider';
export { MetalsApiLbmaProvider } from './providers/MetalsApiLbmaProvider';
export type { ILbmaProvider } from './providers/MetalsApiLbmaProvider';
export { GoldApiProvider } from './providers/GoldApiProvider';

// Factory for Service Creation
export { MarketDataServiceFactory } from './MarketDataServiceFactory';

// Types
export * from './types/MarketDataTypes';

// Legacy compatibility (deprecated - use MarketDataServiceFactory.create() instead)
export { MarketDataServiceImpl as MarketDataService } from './impl/MarketDataServiceImpl';
