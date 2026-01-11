/**
 * Product Service Factory
 * 
 * Factory for creating Product services with proper dependency injection
 * Implements Factory Pattern (GoF) for flexible service instantiation
 */

import { Pool } from 'pg';
import { IProductService } from './IProductService';
import { IProductManagementService } from './IProductManagementService';
import { ProductServiceImpl } from './impl/ProductServiceImpl';
import { ProductManagementService } from './impl/ProductManagementService';
import { IProductRepository } from './repository/IProductRepository';
import { ProductRepositoryImpl } from './repository/ProductRepositoryImpl';
import { ProductRepositoryMock } from './mock/ProductRepositoryMock';

/**
 * Factory class for creating Product services with DI
 */
export class ProductServiceFactory {
  /**
   * Create ProductService with real PostgreSQL database
   */
  static createProductService(pool: Pool): IProductService {
    const repository: IProductRepository = new ProductRepositoryImpl(pool);
    return new ProductServiceImpl(repository);
  }

  /**
   * Create ProductManagementService with real PostgreSQL database
   */
  static createProductManagementService(pool: Pool): IProductManagementService {
    const repository: IProductRepository = new ProductRepositoryImpl(pool);
    return new ProductManagementService(repository);
  }

  /**
   * Create ProductService with mock repository for testing
   */
  static createProductServiceMock(): IProductService {
    const repository: IProductRepository = new ProductRepositoryMock();
    return new ProductServiceImpl(repository);
  }

  /**
   * Create ProductManagementService with mock repository for testing
   */
  static createProductManagementServiceMock(): IProductManagementService {
    const repository: IProductRepository = new ProductRepositoryMock();
    return new ProductManagementService(repository);
  }

  /**
   * Create repository directly (for advanced usage)
   */
  static createRepository(pool: Pool): IProductRepository {
    return new ProductRepositoryImpl(pool);
  }

  /**
   * Create mock repository directly (for testing)
   */
  static createRepositoryMock(): IProductRepository {
    return new ProductRepositoryMock();
  }
}
