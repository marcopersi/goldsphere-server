/**
 * Calculation Service Factory
 * 
 * Factory for CalculationService (stateless service, no DB dependencies)
 */

import { ICalculationService } from './ICalculationService';
import { CalculationServiceImpl } from './impl/CalculationServiceImpl';
import { CalculationServiceMock } from './mock/CalculationServiceMock';
import { CalculationConfig } from './types/CalculationTypes';

export class CalculationServiceFactory {
  /**
   * Create production CalculationService instance
   * @param config Optional configuration for rates and fees
   */
  static create(config?: Partial<CalculationConfig>): ICalculationService {
    return new CalculationServiceImpl(config);
  }

  /**
   * Create mock CalculationService for testing
   */
  static createMock(): ICalculationService {
    return new CalculationServiceMock();
  }
}
