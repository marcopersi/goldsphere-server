/**
 * Portfolio Service Factory
 * 
 * Creates Portfolio service instances with proper dependency injection
 */

import { Pool } from 'pg';
import { IPortfolioService } from './IPortfolioService';
import { IPortfolioRepository } from './repository/IPortfolioRepository';
import { PortfolioServiceImpl } from './impl/PortfolioServiceImpl';
import { PortfolioRepositoryImpl } from './repository/PortfolioRepositoryImpl';
import { PortfolioRepositoryMock } from './mock/PortfolioRepositoryMock';

export class PortfolioServiceFactory {
  /**
   * Create production Portfolio service with PostgreSQL
   */
  static create(pool: Pool): IPortfolioService {
    const repository = this.createRepository(pool);
    return new PortfolioServiceImpl(repository);
  }

  /**
   * Create mock Portfolio service for testing
   */
  static createMock(): IPortfolioService {
    const repository = this.createRepositoryMock();
    return new PortfolioServiceImpl(repository);
  }

  /**
   * Create Portfolio repository with PostgreSQL
   */
  static createRepository(pool: Pool): IPortfolioRepository {
    return new PortfolioRepositoryImpl(pool);
  }

  /**
   * Create mock Portfolio repository for testing
   */
  static createRepositoryMock(): IPortfolioRepository {
    return new PortfolioRepositoryMock();
  }
}
