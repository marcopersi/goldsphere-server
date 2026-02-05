/**
 * Custodian Service Factory
 * Dependency Injection setup
 */

import { Pool } from 'pg';
import { ICustodianService } from './ICustodianService';
import { CustodianServiceImpl } from './impl/CustodianServiceImpl';
import { ICustodianRepository } from './repository/ICustodianRepository';
import { CustodianRepositoryImpl } from './repository/CustodianRepositoryImpl';
import { CustodianRepositoryMock } from './mock/CustodianRepositoryMock';

export class CustodianServiceFactory {
  /**
   * Create a custodian service with real database repository
   */
  static createService(pool: Pool): ICustodianService {
    const repository: ICustodianRepository = new CustodianRepositoryImpl(pool);
    return new CustodianServiceImpl(repository);
  }

  /**
   * Create a custodian service with mock repository (for testing)
   */
  static createMockService(): ICustodianService {
    const repository: ICustodianRepository = new CustodianRepositoryMock();
    return new CustodianServiceImpl(repository);
  }

  /**
   * Create repository only (useful for complex scenarios)
   */
  static createRepository(pool: Pool): ICustodianRepository {
    return new CustodianRepositoryImpl(pool);
  }

  /**
   * Create mock repository only
   */
  static createMockRepository(): ICustodianRepository {
    return new CustodianRepositoryMock();
  }
}
