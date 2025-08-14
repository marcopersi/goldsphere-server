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
        totalPrice: item.totalprice
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
                oi.productid, oi.quantity, oi.totalprice, oi.unitprice,
                oi.productname
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.orderid  
         WHERE o.id = $1
         ORDER BY oi.createdat`,
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
         SET orderstatus = $1, updatedat = CURRENT_TIMESTAMP 
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
      // Insert main order record with correct column names
      await pool.query(
        `INSERT INTO orders (
          id, userid, type, orderstatus, custodyserviceid, createdat, updatedat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          order.id,
          order.userId,
          order.type.value,
          order.status.value,
          null, // custodyServiceId - will be set later
          order.createdAt,
          order.updatedAt
        ]
      );

      // Insert order items into order_items table
      for (const item of order.items) {
        await pool.query(
          `INSERT INTO order_items (
            orderid, productid, productname, quantity, unitprice, totalprice, createdat
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            order.id,
            item.productId,
            item.productName,
            item.quantity,
            item.unitPrice,
            item.totalPrice,
            order.createdAt
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
      whereConditions.push(`o.userid = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`o.orderstatus = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (type) {
      whereConditions.push(`o.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get orders with pagination
    const dataQuery = `
      SELECT o.*, 
             oi.productid,
             oi.productname,
             oi.quantity,
             oi.unitprice,
             oi.totalprice
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.orderid
      ${whereClause}
      ORDER BY o.createdat DESC
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
        quantity: parseFloat(row.quantity || '0'),
        unitPrice: parseFloat(row.unitprice || '0'),
        totalPrice: parseFloat(row.totalprice || '0')      }));

    // Calculate totals from items since they're not stored in orders table
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const fees = {
      processing: subtotal * 0.02, // 2% processing fee
      shipping: 25.00, // Flat shipping
      insurance: subtotal * 0.005 // 0.5% insurance
    };
    const taxes = subtotal * 0.08; // 8% tax
    const totalAmount = subtotal + fees.processing + fees.shipping + fees.insurance + taxes;

    return {
      id: firstRow.id,
      userId: firstRow.userid,
      type: (firstRow.type ? OrderType.fromValue(firstRow.type) : null) || OrderType.BUY,
      status: (firstRow.orderstatus ? OrderStatus.fromValue(firstRow.orderstatus) : null) || OrderStatus.PENDING,
      items,
      subtotal,
      fees,
      taxes,
      totalAmount,
      currency: CurrencyEnum.USD,
      shippingAddress: { 
        type: 'shipping' as const,
        firstName: '',
        lastName: '',
        street: '', 
        city: '', 
        state: '', 
        zipCode: '', 
        country: '' 
      }, // Default empty address
      paymentMethod: { type: 'card' as const }, // Default payment method
      notes: undefined, // Not stored in current schema
      createdAt: new Date(firstRow.createdat),
      updatedAt: new Date(firstRow.updatedat)
    };
  }
}
