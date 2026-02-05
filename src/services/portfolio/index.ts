/**
 * Portfolio Service - Barrel Export
 * 
 * Central export point for Portfolio domain
 */

// Interfaces
export { IPortfolioService } from './IPortfolioService';
export { IPortfolioRepository } from './repository/IPortfolioRepository';

// Types
export {
  PortfolioSummary,
  PortfolioWithPositions,
  ListPortfoliosOptions,
  GetPortfoliosResult,
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  PortfolioResult,
  PortfolioError,
  PortfolioErrorCode,
  validateCreateRequest,
  validateUpdateRequest
} from './types/PortfolioTypes';

// Implementations
export { PortfolioServiceImpl } from './impl/PortfolioServiceImpl';
export { PortfolioRepositoryImpl } from './repository/PortfolioRepositoryImpl';

// Mocks
export { PortfolioRepositoryMock } from './mock/PortfolioRepositoryMock';

// Factory
export { PortfolioServiceFactory } from './PortfolioServiceFactory';
