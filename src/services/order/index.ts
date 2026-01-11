/**
 * Order Service Module
 * 
 * Barrel export (Facade Pattern) for clean module access
 * Central export point for all Order domain types and services
 */

// ============================================================================
// Service Interface
// ============================================================================
export { IOrderService } from './IOrderService';

// ============================================================================
// Repository Interface
// ============================================================================
export { IOrderRepository } from './repository/IOrderRepository';

// ============================================================================
// Types
// ============================================================================
export type {
  Order,
  OrderType,
  OrderStatus,
  OrderItem,
  CreateOrderRequest,
  OrderCalculation,
  CreateOrderResult,
  OrderPagination,
  GetOrdersOptions,
  GetOrdersResult
} from './types/OrderTypes';

// ============================================================================
// Validators
// ============================================================================
export {
  isValidOrderType,
  isValidOrderStatus,
  isValidStatusTransition,
  validateCreateOrderRequest,
  parseOrderType
} from './utils/OrderValidator';

// ============================================================================
// Factory (Primary entry point)
// ============================================================================
export { OrderServiceFactory } from './OrderServiceFactory';

// ============================================================================
// Implementations (for advanced usage or direct instantiation)
// ============================================================================
export { OrderServiceImpl } from './impl/OrderServiceImpl';
export { OrderRepositoryImpl } from './repository/OrderRepositoryImpl';
export { OrderRepositoryMock } from './mock/OrderRepositoryMock';
