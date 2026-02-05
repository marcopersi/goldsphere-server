/**
 * Custody Service Factory
 * Dependency Injection setup
 */

import { Pool } from 'pg';
import { ICustodyService } from './ICustodyService';
import { CustodyServiceImpl } from './impl/CustodyServiceImpl';
import { ICustodyRepository } from './repository/ICustodyRepository';
import { CustodyRepositoryImpl } from './repository/CustodyRepositoryImpl';
import { CustodyRepositoryMock } from './mock/CustodyRepositoryMock';

export class CustodyServiceFactory {
  /**
   * Create a custody service with real database repository
   */
  static createService(pool: Pool): ICustodyService {
    const repository: ICustodyRepository = new CustodyRepositoryImpl(pool);
    return new CustodyServiceImpl(repository);
  }

  /**
   * Create a custody service with mock repository (for testing)
   */
  static createMockService(): ICustodyService {
    const repository: ICustodyRepository = new CustodyRepositoryMock();
    return new CustodyServiceImpl(repository);
  }

  /**
   * Create repository only (useful for complex scenarios)
   */
  static createRepository(pool: Pool): ICustodyRepository {
    return new CustodyRepositoryImpl(pool);
  }

  /**
   * Create mock repository only
   */
  static createMockRepository(): ICustodyRepository {
    return new CustodyRepositoryMock();
  }
}
