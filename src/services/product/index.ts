/**
 * Product Service Module
 * 
 * Barrel export (Facade Pattern) for clean module access
 * Central export point for all Product domain types and services
 */

// ============================================================================
// Service Interfaces
// ============================================================================
export { IProductService } from './IProductService';
export { IProductManagementService } from './IProductManagementService';

// ============================================================================
// Repository Interface
// ============================================================================
export { IProductRepository } from './repository/IProductRepository';

// ============================================================================
// Types
// ============================================================================
export type {
  CreateProductRequest,
  ProductManagementResponse,
  Product,
  EnrichedOrderItem,
  OrderItem,
  ProductLookupIds,
  ProductAvailability,
} from './types/ProductTypes';

// ============================================================================
// Factory (Primary entry point)
// ============================================================================
export { ProductServiceFactory } from './ProductServiceFactory';

// ============================================================================
// Implementations (for advanced usage or direct instantiation)
// ============================================================================
export { ProductServiceImpl } from './impl/ProductServiceImpl';
export { ProductManagementService } from './impl/ProductManagementService';
export { ProductRepositoryImpl } from './repository/ProductRepositoryImpl';
export { ProductRepositoryMock } from './mock/ProductRepositoryMock';
