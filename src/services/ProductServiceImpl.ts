/**
 * ProductService Implementation
 * 
 * Handles product-related business logic including validation,
 * availability checking, and order item enrichment.
 */

import pool from "../dbConfig";
import { IProductService, EnrichedOrderItem } from "../interfaces/IProductService";

export class ProductServiceImpl implements IProductService {
  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<any> {
    const query = `
      SELECT * FROM product 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [productId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Product not found: ${productId}`);
    }
    
    return result.rows[0];
  }

  /**
   * Enrich order items with product data and validate availability
   */
  async enrichOrderItems(items: Array<{ productId: string; quantity: number }>): Promise<EnrichedOrderItem[]> {
    const enrichedItems: EnrichedOrderItem[] = [];
    
    for (const item of items) {
      try {
        const product = await this.getProductById(item.productId);
        
        // Check availability using correct column name
        const stockQuantity = product.stockquantity || 0;
        const available = stockQuantity >= item.quantity;
        const productName = product.name || `Product ${item.productId}`;
        
        if (!available) {
          throw new Error(`Insufficient stock for ${productName}. Available: ${stockQuantity}, Requested: ${item.quantity}`);
        }
        
        const unitPrice = parseFloat(product.price);
        const totalPrice = unitPrice * item.quantity;
        
        enrichedItems.push({
          productId: item.productId,
          productName: product.name || `Product ${item.productId}`,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
          available,
        });
      } catch (error) {
        throw new Error(`Failed to enrich product ${item.productId}: ${(error as Error).message}`);
      }
    }
    
    return enrichedItems;
  }

  /**
   * Validate product availability for order items
   */
  async validateProductAvailability(items: Array<{ productId: string; quantity: number }>): Promise<boolean> {
    for (const item of items) {
      const product = await this.getProductById(item.productId);
      if (product.stock < item.quantity) {
        return false;
      }
    }
    return true;
  }
}
