/**
 * ProductService
 * 
 * Handles all product-related business logic including retrieval,
 * validation, and enrichment of product data.
 */

import pool from "../dbConfig";
import { PoolClient } from "pg";

export interface ProductInfo {
  id: string;
  name: string;
  price: number;
  weight: number;
  weightUnit: string;
  inStock: boolean;
  stockQuantity: number;
  minimumOrderQuantity: number;
}

export interface EnrichedOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weight: number;
  weightUnit: string;
}

export class ProductService {
  /**
   * Get product by ID
   */
  async getProductById(productId: string, client?: PoolClient): Promise<ProductInfo | null> {
    const dbClient = client || pool;
    
    try {
      const result = await dbClient.query(
        `SELECT id, name, price, weight, weightUnit, inStock, stockQuantity, minimumOrderQuantity 
         FROM product 
         WHERE id = $1`,
        [productId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        weight: parseFloat(row.weight),
        weightUnit: row.weightunit,
        inStock: row.instock,
        stockQuantity: parseInt(row.stockquantity),
        minimumOrderQuantity: parseInt(row.minimumorderquantity)
      };
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error);
      throw new Error(`Failed to fetch product: ${(error as Error).message}`);
    }
  }

  /**
   * Get multiple products by IDs
   */
  async getProductsByIds(productIds: string[], client?: PoolClient): Promise<ProductInfo[]> {
    if (productIds.length === 0) {
      return [];
    }

    const dbClient = client || pool;
    
    try {
      const placeholders = productIds.map((_, index) => `$${index + 1}`).join(',');
      const result = await dbClient.query(
        `SELECT id, name, price, weight, weightUnit, inStock, stockQuantity, minimumOrderQuantity 
         FROM product 
         WHERE id IN (${placeholders})`,
        productIds
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        price: parseFloat(row.price),
        weight: parseFloat(row.weight),
        weightUnit: row.weightunit,
        inStock: row.instock,
        stockQuantity: parseInt(row.stockquantity),
        minimumOrderQuantity: parseInt(row.minimumorderquantity)
      }));
    } catch (error) {
      console.error('Error fetching products by IDs:', error);
      throw new Error(`Failed to fetch products: ${(error as Error).message}`);
    }
  }

  /**
   * Validate product availability for order
   */
  async validateProductAvailability(productId: string, requestedQuantity: number, client?: PoolClient): Promise<void> {
    const product = await this.getProductById(productId, client);
    
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    if (!product.inStock) {
      throw new Error(`Product out of stock: ${product.name}`);
    }

    if (requestedQuantity < product.minimumOrderQuantity) {
      throw new Error(
        `Minimum order quantity for ${product.name} is ${product.minimumOrderQuantity}, requested: ${requestedQuantity}`
      );
    }

    if (product.stockQuantity < requestedQuantity) {
      throw new Error(
        `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, requested: ${requestedQuantity}`
      );
    }
  }

  /**
   * Enrich order items with product data
   */
  async enrichOrderItems(
    items: Array<{ productId: string; quantity: number }>,
    client?: PoolClient
  ): Promise<EnrichedOrderItem[]> {
    if (items.length === 0) {
      return [];
    }

    // Validate all items first
    for (const item of items) {
      await this.validateProductAvailability(item.productId, item.quantity, client);
    }

    // Get all product data
    const productIds = items.map(item => item.productId);
    const products = await this.getProductsByIds(productIds, client);
    
    // Create a map for quick lookup
    const productMap = new Map(products.map(product => [product.id, product]));

    // Enrich items with product data
    return items.map(item => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Product data not found for ID: ${item.productId}`);
      }

      const totalPrice = item.quantity * product.price;

      return {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: Math.round(totalPrice * 100) / 100, // Round to 2 decimal places
        weight: product.weight,
        weightUnit: product.weightUnit
      };
    });
  }

  /**
   * Calculate subtotal from enriched order items
   */
  calculateSubtotal(enrichedItems: EnrichedOrderItem[]): number {
    const subtotal = enrichedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    return Math.round(subtotal * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Reserve stock for order (validate availability)
   * Note: Full inventory reservation system to be implemented in future version
   */
  async reserveStock(
    items: Array<{ productId: string; quantity: number }>,
    client?: PoolClient
  ): Promise<void> {
    // Current implementation validates availability only
    // Future enhancement: implement actual stock reservation with locking
    for (const item of items) {
      await this.validateProductAvailability(item.productId, item.quantity, client);
    }
    
    console.log('Stock availability validated for order items');
  }
}
