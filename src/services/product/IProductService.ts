/**
 * IProductService Interface
 * 
 * Defines the contract for product-related operations including
 * validation, availability checking, and order item enrichment.
 */

import { EnrichedOrderItem, OrderItem, Product } from './types/ProductTypes';

export interface IProductService {
  /**
   * Get product by ID
   */
  getProductById(productId: string): Promise<Product | null>;

  /**
   * Enrich order items with product data and validate availability
   */
  enrichOrderItems(items: OrderItem[]): Promise<EnrichedOrderItem[]>;

  /**
   * Validate product availability for order items
   */
  validateProductAvailability(items: OrderItem[]): Promise<boolean>;
}


