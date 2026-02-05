/**
 * Reference Service Factory
 * 
 * Factory for creating ReferenceService instances with proper dependency injection
 * Follows the Factory Pattern for centralized object creation
 */

import { Pool } from 'pg';
import { IReferenceService } from './IReferenceService';
import { IReferenceRepository } from './repository/IReferenceRepository';
import { ReferenceServiceImpl } from './impl/ReferenceServiceImpl';
import { ReferenceRepositoryImpl } from './repository/ReferenceRepositoryImpl';

export class ReferenceServiceFactory {
  /**
   * Create a ReferenceService instance with real database implementation
   * 
   * @param pool - PostgreSQL connection pool
   * @returns Fully configured ReferenceService instance
   */
  static createService(pool: Pool): IReferenceService {
    // Create repository with database pool (DI)
    const repository: IReferenceRepository = new ReferenceRepositoryImpl(pool);
    
    // Create service with repository (DI)
    const service: IReferenceService = new ReferenceServiceImpl(repository);
    
    return service;
  }

  /**
   * Create a ReferenceService instance with mock implementation (for testing)
   * 
   * @param mockRepository - Mock repository for testing
   * @returns ReferenceService instance with mock data
   */
  static createMockService(mockRepository: IReferenceRepository): IReferenceService {
    return new ReferenceServiceImpl(mockRepository);
  }
}
