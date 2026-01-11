/**
 * Order Service Factory
 * 
 * Factory for creating Order services with proper dependency injection
 * Implements Factory Pattern (GoF) for flexible service instantiation
 */

import { Pool } from 'pg';
import { IOrderService } from './IOrderService';
import { IOrderRepository } from './repository/IOrderRepository';
import { OrderRepositoryImpl } from './repository/OrderRepositoryImpl';
import { OrderRepositoryMock } from './mock/OrderRepositoryMock';
import { OrderServiceImpl } from './impl/OrderServiceImpl';
import { IProductService } from '../product/IProductService';
import { ICalculationService } from '../calculation/ICalculationService';

/**
 * Factory class for creating Order services with DI
 */
export class OrderServiceFactory {
  /**
   * Create OrderService with real PostgreSQL database
   */
  static create(
    pool: Pool,
    productService: IProductService,
    calculationService: ICalculationService
  ): IOrderService {
    const repository: IOrderRepository = new OrderRepositoryImpl(pool);
    return new OrderServiceImpl(repository, productService, calculationService);
  }

  /**
   * Create OrderService with mock repository for testing
   */
  static createMock(
    productService: IProductService,
    calculationService: ICalculationService
  ): IOrderService {
    const repository: IOrderRepository = new OrderRepositoryMock();
    return new OrderServiceImpl(repository, productService, calculationService);
  }

  /**
   * Create repository directly (for advanced usage)
   */
  static createRepository(pool: Pool): IOrderRepository {
    return new OrderRepositoryImpl(pool);
  }

  /**
   * Create mock repository directly (for testing)
   */
  static createRepositoryMock(): IOrderRepository {
    return new OrderRepositoryMock();
  }
}
