/**
 * OrderService
 * 
 * Handles all order-related business logic including creation, validation,
 * enrichment, and status management. Orchestrates other services.
 */

import { v4 as uuidv4 } from 'uuid';
import pool from "../dbConfig";
import { ProductService } from "./ProductService";
import { CalculationService, CalculationResult } from "./CalculationService";
import { 
  Order,
  OrderType,
  OrderStatus,
  CurrencyEnum
} from "@marcopersi/shared";

export interface CreateOrderRequest {
  userId: string;
  type: string;
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress?: any;
  paymentMethod?: any;
  notes?: string;
}

export interface CreateOrderResult {
  order: Order;
  calculation: CalculationResult;
}

export class OrderService {
  private readonly productService: ProductService;
  private readonly calculationService: CalculationService;

  constructor() {
    this.productService = new ProductService();
    this.calculationService = new CalculationService();
  }

  /**
   * Create a new order with full enrichment
   */
  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResult> {
    // Validate request
    this.validateCreateOrderRequest(request);

    // Enrich items with product data and validate availability
    const enrichedItems = await this.productService.enrichOrderItems(request.items);
    
    // Calculate pricing
    const calculation = this.calculationService.calculateOrderTotal(
      enrichedItems.map(item => ({ quantity: item.quantity, unitPrice: item.unitPrice }))
    );

    // Parse order type
    const orderType = this.parseOrderType(request.type);

    // Generate order ID
    const orderId = uuidv4();
    const now = new Date();

    // Create the complete order object
    const order: Order = {
      id: orderId,
      userId: request.userId,
      type: orderType,
      status: OrderStatus.PENDING,
      items: enrichedItems.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        specifications: {} // Empty for now, could be extended
      })),
      subtotal: calculation.subtotal,
      fees: {
        processing: calculation.fees.processing,
        shipping: calculation.fees.shipping,
        insurance: calculation.fees.insurance
      },
      taxes: calculation.taxes,
      totalAmount: calculation.totalAmount,
      currency: CurrencyEnum.USD,
      shippingAddress: request.shippingAddress,
      paymentMethod: request.paymentMethod,
      notes: request.notes,
      createdAt: now,
      updatedAt: now
    };

    // Save to database
    await this.saveOrderToDatabase(order);

    return {
      order,
      calculation
    };
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const result = await pool.query(
        `SELECT o.*, 
                oi.productId, oi.quantity, oi.totalPrice,
                p.name as productName, p.price as unitPrice
         FROM orders o
         LEFT JOIN orderItems oi ON o.id = oi.orderId  
         LEFT JOIN product p ON oi.productId = p.id
         WHERE o.id = $1
         ORDER BY oi.createdAt`,
        [orderId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return OrderService.mapDatabaseRowsToOrder(result.rows);
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
      throw new Error(`Failed to fetch order: ${(error as Error).message}`);
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<void> {
    try {
      const result = await pool.query(
        `UPDATE orders 
         SET status = $1, updatedAt = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [newStatus.value, orderId]
      );

      if (result.rowCount === 0) {
        throw new Error(`Order not found: ${orderId}`);
      }
    } catch (error) {
      console.error(`Error updating order status for ${orderId}:`, error);
      throw new Error(`Failed to update order status: ${(error as Error).message}`);
    }
  }

  /**
   * Validate create order request
   */
  private validateCreateOrderRequest(request: CreateOrderRequest): void {
    if (!request.userId) {
      throw new Error('User ID is required');
    }

    if (!request.type) {
      throw new Error('Order type is required');
    }

    if (!request.items || !Array.isArray(request.items) || request.items.length === 0) {
      throw new Error('Items must be a non-empty array');
    }

    for (const item of request.items) {
      if (!item.productId || !item.quantity) {
        throw new Error('Each item must have productId and quantity');
      }

      if (item.quantity <= 0) {
        throw new Error('Item quantity must be positive');
      }
    }
  }

  /**
   * Parse order type string to OrderType enum
   */
  private parseOrderType(typeString: string): OrderType {
    const orderType = OrderType.fromValue(typeString.toLowerCase());
    if (!orderType) {
      throw new Error(`Invalid order type: ${typeString}`);
    }
    return orderType;
  }

  /**
   * Save order to database
   */
  private async saveOrderToDatabase(order: Order): Promise<void> {
    try {
      // Insert main order record
      await pool.query(
        `INSERT INTO orders (
          id, userId, type, status, subtotal, fees, taxes, totalAmount, 
          currency, shippingAddress, paymentMethod, notes, createdAt, updatedAt
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          order.id,
          order.userId,
          order.type.value,
          order.status.value,
          order.subtotal,
          order.fees.processing, // Store just processing fee for now
          order.taxes,
          order.totalAmount,
          'USD', // Store as string for now
          JSON.stringify(order.shippingAddress),
          JSON.stringify(order.paymentMethod),
          order.notes,
          order.createdAt.toISOString(),
          order.updatedAt.toISOString()
        ]
      );

      // Insert order items
      for (const item of order.items) {
        await pool.query(
          `INSERT INTO orderItems (
            id, orderId, productId, quantity, unitPrice, totalPrice, createdAt
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            order.id,
            item.productId,
            item.quantity,
            item.unitPrice,
            item.totalPrice,
            new Date().toISOString()
          ]
        );
      }
    } catch (error) {
      console.error('Error saving order to database:', error);
      throw new Error(`Failed to save order: ${(error as Error).message}`);
    }
  }

  /**
   * Get orders by user ID with filtering and pagination
   */
  static async getOrdersByUserId(
    userId?: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      type?: string;
    } = {}
  ): Promise<{
    orders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page = 1, limit = 20, status, type } = options;
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (userId) {
      whereConditions.push(`userId = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`orderStatus = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT id) as total
      FROM orders 
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get orders with pagination
    const dataQuery = `
      SELECT * FROM orders 
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const result = await pool.query(dataQuery, queryParams);
    
    // Group database rows by order ID and convert to Order objects
    const ordersMap = new Map<string, any[]>();
    result.rows.forEach((row: any) => {
      if (!ordersMap.has(row.id)) {
        ordersMap.set(row.id, []);
      }
      ordersMap.get(row.id)!.push(row);
    });
    
    const orders = Array.from(ordersMap.values()).map(rows => OrderService.mapDatabaseRowsToOrder(rows));
    
    // Calculate pagination
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
    
    return {
      orders,
      pagination
    };
  }

  /**
   * Map database rows to Order object
   */
  private static mapDatabaseRowsToOrder(rows: any[]): Order {
    if (rows.length === 0) {
      throw new Error('No rows to map');
    }
   
    const firstRow = rows[0];
    
    // Group rows by order items
    const items = rows
      .filter(row => row.productid) // Filter out rows without items
      .map(row => ({
        productId: row.productid,
        productName: row.productname || `Product ${row.productid}`,
        quantity: parseFloat(row.quantity),
        unitPrice: parseFloat(row.unitprice),
        totalPrice: parseFloat(row.totalprice),
        specifications: {}
      }));

    return {
      id: firstRow.id,
      userId: firstRow.userid,
      type: (firstRow.type ? OrderType.fromValue(firstRow.type) : null) || OrderType.BUY,
      status: (firstRow.orderstatus ? OrderStatus.fromValue(firstRow.orderstatus) : null) || OrderStatus.PENDING,
      items,
      subtotal: parseFloat(firstRow.subtotal || '0'),
      fees: {
        processing: parseFloat(firstRow.fees || '0'),
        shipping: 0,
        insurance: 0
      },
      taxes: parseFloat(firstRow.taxes || '0'),
      totalAmount: parseFloat(firstRow.totalprice || '0'),
      currency: CurrencyEnum.USD,
      shippingAddress: firstRow.shippingaddress ? JSON.parse(firstRow.shippingaddress) : undefined,
      paymentMethod: firstRow.paymentmethod ? JSON.parse(firstRow.paymentmethod) : undefined,
      notes: firstRow.notes,
      createdAt: new Date(firstRow.createdat),
      updatedAt: new Date(firstRow.updatedat)
    };
  }
}
