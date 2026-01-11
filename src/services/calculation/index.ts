/**
 * Calculation Service - Barrel Export
 * 
 * Central export point for Calculation domain
 */

// Interfaces
export { ICalculationService } from './ICalculationService';

// Types
export {
  CalculationResult,
  CalculationConfig,
  CalculationItem,
  TaxLocation
} from './types/CalculationTypes';

// Implementations
export { CalculationServiceImpl } from './impl/CalculationServiceImpl';

// Mocks
export { CalculationServiceMock } from './mock/CalculationServiceMock';

// Factory
export { CalculationServiceFactory } from './CalculationServiceFactory';
