/**
 * ProductService Implementation
 * 
 * Handles product-related business logic including validation,
 * availability checking, and order item enrichment using DI.
 */

import { IProductService } from "../IProductService";
import { IProductRepository } from "../repository/IProductRepository";
import { EnrichedOrderItem, OrderItem, Product } from "../types/ProductTypes";

export class ProductServiceImpl implements IProductService {
  constructor(private readonly repository: IProductRepository) {}
  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<Product | null> {
    const product = await this.repository.findById(productId);
    
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }
    
    // Map ProductManagementResponse to Product
    // Convert Enums to their string names
    return {
      id: product.id,
      name: product.name,
      productTypeId: product.productType.name,  // Enum → string
      metalId: product.metal.name,              // Enum → string
      weight: product.weight,
      weightUnit: product.weightUnit,
      purity: product.purity,
      price: product.price,
      currency: product.currency,
      producerId: product.producer,
      countryId: product.country || undefined,
      year: product.year || undefined,
      description: product.description || undefined,
      imageUrl: product.imageUrl || undefined,
      stockQuantity: product.stockQuantity,
      minOrderQuantity: product.minimumOrderQuantity,
      premiumPercentage: product.premiumPercentage || 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Enrich order items with product data and validate availability
   */
  async enrichOrderItems(items: OrderItem[]): Promise<EnrichedOrderItem[]> {
    const enrichedItems: EnrichedOrderItem[] = [];
    
    for (const item of items) {
      try {
        const product = await this.getProductById(item.productId);
        
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        
        // Check availability
        const stockQuantity = product.stockQuantity || 0;
        const available = stockQuantity >= item.quantity;
        const productName = product.name || `Product ${item.productId}`;
        
        if (!available) {
          throw new Error(`Insufficient stock for ${productName}. Available: ${stockQuantity}, Requested: ${item.quantity}`);
        }
        
        const unitPrice = product.price;
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
  async validateProductAvailability(items: OrderItem[]): Promise<boolean> {
    for (const item of items) {
      const product = await this.getProductById(item.productId);
      if (!product || product.stockQuantity < item.quantity) {
        return false;
      }
    }
    return true;
  }
}
