/**
 * IProductService Interface
 * 
 * Defines the contract for product-related operations including
 * validation, availability checking, and order item enrichment.
 */

export interface EnrichedOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  available: boolean;
}

export interface IProductService {
  /**
   * Get product by ID
   */
  getProductById(productId: string): Promise<any>;

  /**
   * Enrich order items with product data and validate availability
   */
  enrichOrderItems(items: Array<{ productId: string; quantity: number }>): Promise<EnrichedOrderItem[]>;

  /**
   * Validate product availability for order items
   */
  validateProductAvailability(items: Array<{ productId: string; quantity: number }>): Promise<boolean>;
}
