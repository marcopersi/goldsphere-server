/**
 * OrderService Implementation
 * 
 * Handles all order-related business logic including creation, validation,
 * enrichment, and status management. Orchestrates other services.
 */

import { v4 as uuidv4 } from 'uuid';
import { getPool } from "../dbConfig";
import { IProductService } from "../interfaces/IProductService";
import { ICalculationService } from "../interfaces/ICalculationService";
import { IOrderService, CreateOrderRequest, CreateOrderResult } from "../interfaces/IOrderService";
import { ProductServiceImpl } from "./ProductServiceImpl";
import { CalculationServiceImpl } from "./CalculationServiceImpl";
import { 
  Order,
  // Validation helpers for order business logic
  isValidOrderType,
  isValidOrderStatus,
  isValidStatusTransition
} from "@marcopersi/shared";

export class OrderService implements IOrderService {
  private readonly productService: IProductService;
  private readonly calculationService: ICalculationService;

  constructor(
    productService?: IProductService,
    calculationService?: ICalculationService
  ) {
    // Dependency injection with defaults - allows for easy mocking
    this.productService = productService || new ProductServiceImpl();
    this.calculationService = calculationService || new CalculationServiceImpl();
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
      status: "pending",
      orderNumber: `ORD-${orderId.slice(0, 8).toUpperCase()}`, // Generate order number
      items: enrichedItems.map((item: any, _index: number) => ({
        id: uuidv4(), // Generate proper UUID for each item
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })),
      currency: "CHF", //FIXME get currency from request, if there is non yet, we add one
      subtotal: calculation.subtotal,
      taxes: calculation.taxes || 0,
      totalAmount: calculation.totalAmount,
      createdAt: now,
      updatedAt: now
    } as Order;

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
      const result = await getPool().query(
        `SELECT o.id, o.userid, o.type, o.orderstatus, o.createdat, o.updatedat, o.payment_status,
                o.custodyserviceid,
                oi.id as itemid, oi.productid, oi.quantity, oi.totalprice, oi.unitprice,
                oi.productname,
                p.currency,
                cs.custodyservicename,
                cust.id as custodianid, cust.custodianname
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.orderid  
         LEFT JOIN product p ON oi.productid = p.id
         LEFT JOIN custodyservice cs ON o.custodyserviceid = cs.id
         LEFT JOIN custodian cust ON cs.custodianid = cust.id
         WHERE o.id = $1
         ORDER BY oi.createdat`,
        [orderId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // DEBUG: Log what we actually got from database
      console.log(`🔍 DEBUG getOrderById(${orderId}):`, {
        rowCount: result.rows.length,
        firstRow: result.rows[0],
        allRows: result.rows.map(r => ({ 
          id: r.id, 
          userid: r.userid, 
          orderstatus: r.orderstatus,
          productid: r.productid 
        }))
      });

      return OrderService.mapDatabaseRowsToOrder(result.rows);
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
      throw new Error(`Failed to fetch order: ${(error as Error).message}`);
    }
  }

  /**
   * Update order status with validation
   */
  async updateOrderStatus(orderId: string, newStatus: string): Promise<void> {
    try {
      // Validate that the new status is a valid order status
      if (!isValidOrderStatus(newStatus)) {
        throw new Error(`Invalid order status: ${newStatus}`);
      }

      // Get current order to validate status transition
      const currentOrder = await this.getOrderById(orderId);
      if (!currentOrder) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Validate status transition
      if (!isValidStatusTransition(currentOrder.status, newStatus)) {
        throw new Error(`Invalid status transition from ${currentOrder.status} to ${newStatus}`);
      }

      const result = await getPool().query(
        `UPDATE orders 
         SET orderstatus = $1, updatedat = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [newStatus, orderId]
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
   * Update order with comprehensive validation
   */
  async updateOrder(orderId: string, updateData: {
    type?: string;
    status?: string;
    notes?: string;
    fees?: {
      shipping: number;
      insurance: number;
      total: number;
      certification: number;
    };
  }): Promise<{ order: Order }> {
    try {
      // Get current order
      const currentOrder = await this.getOrderById(orderId);
      if (!currentOrder) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Validate order type if provided
      if (updateData.type && !isValidOrderType(updateData.type)) {
        throw new Error(`Invalid order type: ${updateData.type}`);
      }

      // Validate status transition if provided
      if (updateData.status) {
        if (!isValidOrderStatus(updateData.status)) {
          throw new Error(`Invalid order status: ${updateData.status}`);
        }
        if (!isValidStatusTransition(currentOrder.status, updateData.status)) {
          throw new Error(`Invalid status transition from ${currentOrder.status} to ${updateData.status}`);
        }
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updateData.type) {
        updateFields.push(`type = $${paramIndex}`);
        updateValues.push(updateData.type);
        paramIndex++;
      }

      if (updateData.status) {
        updateFields.push(`orderstatus = $${paramIndex}`);
        updateValues.push(updateData.status);
        paramIndex++;
      }

      if (updateData.notes) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(updateData.notes);
        paramIndex++;
      }

      // Always update timestamp
      updateFields.push(`updatedat = CURRENT_TIMESTAMP`);

      if (updateFields.length === 1) { // Only timestamp
        throw new Error('No valid fields provided for update');
      }

      const updateQuery = `
        UPDATE orders 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex} 
      `;
      updateValues.push(orderId);

      await getPool().query(updateQuery, updateValues);

      // Return updated order
      const updatedOrder = await this.getOrderById(orderId);
      if (!updatedOrder) {
        throw new Error('Failed to retrieve updated order');
      }

      return { order: updatedOrder };
    } catch (error) {
      console.error(`Error updating order ${orderId}:`, error);
      throw new Error(`Failed to update order: ${(error as Error).message}`);
    }
  }

  /**
   * Validate create order request with enhanced validation
   */
  private validateCreateOrderRequest(request: CreateOrderRequest): void {
    this.validateBasicOrderFields(request);
    this.validateOrderItems(request.items);
    this.validateOptionalFields(request);
  }

  /**
   * Validate basic required order fields
   */
  private validateBasicOrderFields(request: CreateOrderRequest): void {
    if (!request.userId) {
      throw new Error('User ID is required');
    }

    if (!request.type) {
      throw new Error('Order type is required');
    }

    // Use shared package validation for order type
    if (!isValidOrderType(request.type.toLowerCase())) {
      throw new Error(`Invalid order type: ${request.type}. Must be 'buy' or 'sell'`);
    }
  }

  /**
   * Validate order items array
   */
  private validateOrderItems(items: Array<{ productId: string; quantity: number }>): void {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Items must be a non-empty array');
    }

    for (const [index, item] of items.entries()) {
      if (!item.productId || !item.quantity) {
        throw new Error(`Item ${index + 1}: productId and quantity are required`);
      }

      if (item.quantity <= 0) {
        throw new Error(`Item ${index + 1}: quantity must be positive`);
      }
    }
  }

  /**
   * Validate optional order fields
   */
  private validateOptionalFields(request: CreateOrderRequest): void {
    // Validate shipping address if provided
    if (request.shippingAddress) {
      this.validateShippingAddress(request.shippingAddress);
    }

    // Validate payment method if provided
    if (request.paymentMethod) {
      this.validatePaymentMethod(request.paymentMethod);
    }
  }

  /**
   * Validate shipping address completeness
   */
  private validateShippingAddress(address: any): void {
    const { firstName, lastName, street, city, state, zipCode, country } = address;
    if (!firstName || !lastName || !street || !city || !state || !zipCode || !country) {
      throw new Error('Incomplete shipping address: all fields are required');
    }
  }

  /**
   * Validate payment method type
   */
  private validatePaymentMethod(paymentMethod: any): void {
    const validTypes = ['card', 'bank_transfer', 'crypto'];
    if (!validTypes.includes(paymentMethod.type)) {
      throw new Error(`Invalid payment method type: ${paymentMethod.type}. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Parse order type string to string literal with validation
   */
  private parseOrderType(typeString: string): "buy" | "sell" {
    // Use shared package validation
    if (!isValidOrderType(typeString.toLowerCase())) {
      throw new Error(`Invalid order type: ${typeString}`);
    }

    const lowerType = typeString.toLowerCase();
    if (lowerType === "buy" || lowerType === "sell") {
      return lowerType;
    }
    throw new Error(`Invalid order type: ${typeString}`);
  }

  /**
   * Save order to database
   */
  private async saveOrderToDatabase(order: Order): Promise<void> {
    try {
      // Insert main order record with correct column names
      await getPool().query(
        `INSERT INTO orders (
          id, userid, type, orderstatus, custodyserviceid, createdat, updatedat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          order.id,
          order.userId,
          order.type,
          order.status,
          null, // custodyServiceId - currently not assigned during order creation
          order.createdAt,
          order.updatedAt
        ]
      );

      // Insert order items into order_items table
      for (const item of order.items) {
        await getPool().query(
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
      hasPrevious: boolean;  // Changed from hasPrev to hasPrevious
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
    
    const countResult = await getPool().query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get orders with pagination including rich product and custody data
    const dataQuery = `
      SELECT 
        o.id as order_id,
        o.userid as order_user_id,
        o.type as order_type,
        o.orderstatus as order_status,
        o.payment_status as payment_status,
        o.createdat as order_created_at,
        o.updatedat as order_updated_at,
        o.custodyserviceid as order_custody_service_id,
        
        -- Order items
        oi.id as item_id,
        oi.productid as item_product_id,
        oi.productname as item_product_name,
        oi.quantity as item_quantity,
        oi.unitprice as item_unit_price,
        oi.totalprice as item_total_price,
        
        -- Product details
        p.name as product_name,
        p.price as product_current_price,
        p.currency as product_currency,
        p.weight as product_weight,
        p.weightunit as product_weight_unit,
        p.purity as product_purity,
        p.year as product_year,
        
        -- Product related data
        pt.producttypename as product_type,
        m.name as product_metal,
        ic.issuingcountryname as product_country,
        pr.producername as product_producer,
        
        -- Custody service details
        cs.id as custody_service_id,
        cs.custodyservicename as custody_service_name,
        cs.fee as custody_service_fee,
        cs.paymentfrequency as custody_service_payment_frequency,
        
        -- Custody service currency
        curr.isocode3 as custody_service_currency,
        
        -- Custodian information
        cust.id as custodian_id,
        cust.custodianname as custodian_name
        
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.orderid
      LEFT JOIN product p ON oi.productid = p.id
      LEFT JOIN producttype pt ON p.producttypeid = pt.id
      LEFT JOIN metal m ON p.metalid = m.id
      LEFT JOIN issuingcountry ic ON p.issuingcountryid = ic.id
      LEFT JOIN producer pr ON p.producerid = pr.id
      LEFT JOIN custodyservice cs ON o.custodyserviceid = cs.id
      LEFT JOIN custodian cust ON cs.custodianid = cust.id
      LEFT JOIN currency curr ON cs.currencyid = curr.id
      ${whereClause}
      ORDER BY o.createdat DESC, oi.createdat ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const result = await getPool().query(dataQuery, queryParams);
    
    // Group database rows by order ID and convert to Order objects
    const ordersMap = new Map<string, any[]>();
    result.rows.forEach((row: any) => {
      if (!ordersMap.has(row.order_id)) {
        ordersMap.set(row.order_id, []);
      }
      ordersMap.get(row.order_id)!.push(row);
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
      hasPrevious: page > 1  // Changed from hasPrev to hasPrevious to match schema
    };
    
    return {
      orders,
      pagination
    };
  }

  /**
   * Map database rows to Order object
   */
  /**
   * Extract basic order information from database row
   */
  private static mapBasicOrderInfo(row: any): {
    id: string;
    userId: string;
    type: string;
    status: string;
    paymentStatus: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: row.id,
      userId: row.userid,
      type: row.type,
      status: row.orderstatus,
      paymentStatus: row.payment_status || 'pending',
      createdAt: new Date(row.createdat),
      updatedAt: new Date(row.updatedat)
    };
  }

  /**
   * Extract order items from database rows
   */
  private static mapOrderItems(rows: any[]): Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    certificateRequested: boolean;
  }> {
    return rows
      .filter(row => row.itemid) // Only rows with actual items
      .map(row => ({
        id: row.itemid,
        productId: row.productid,
        productName: row.productname,
        quantity: parseFloat(row.quantity || '0'),
        unitPrice: parseFloat(row.unitprice || '0'),
        totalPrice: parseFloat(row.totalprice || '0'),
        certificateRequested: false
      }));
  }

  /**
   * Calculate order totals from items
   */
  private static calculateOrderTotals(items: Array<{ totalPrice: number }>): {
    subtotal: number;
    taxes: number;
    totalAmount: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxes = 0; // TODO: Calculate actual taxes
    const totalAmount = subtotal + taxes;
    
    return { subtotal, taxes, totalAmount };
  }

  /**
   * Extract custody service information from database row
   */
  private static mapCustodyService(row: any): {
    id: string;
    name: string;
  } | null {
    if (!row.custodyserviceid) {
      return null;
    }
    
    return {
      id: row.custodyserviceid,
      name: row.custodyservicename || 'Unknown Custody Service'
    };
  }

  /**
   * Extract custodian information from database row
   */
  private static mapCustodian(row: any): {
    id: string;
    name: string;
  } | null {
    if (!row.custodianid) {
      return null;
    }
    
    return {
      id: row.custodianid,
      name: row.custodianname || 'Unknown Custodian'
    };
  }

  /**
   * Generate order number from order ID
   */
  private static generateOrderNumber(orderId: string): string {
    return `ORD-${orderId.slice(0, 8).toUpperCase()}`;
  }

  /**
   * Map database rows to complete Order object
   */
  private static mapDatabaseRowsToOrder(rows: any[]): Order {
    if (rows.length === 0) {
      throw new Error('No rows to map');
    }
   
    const firstRow = rows[0];
    
    // Extract basic order info
    const basicInfo = this.mapBasicOrderInfo(firstRow);
    
    // Extract items
    const items = this.mapOrderItems(rows);
    
    // Calculate totals
    const totals = this.calculateOrderTotals(items);
    
    // Extract custody info
    const custodyService = this.mapCustodyService(firstRow);
    const custodian = this.mapCustodian(firstRow);
    
    // Generate order number
    const orderNumber = this.generateOrderNumber(basicInfo.id);
    
    // Get currency from first product or default
    const currency = firstRow.currency || 'USD';

    return {
      id: basicInfo.id,
      userId: basicInfo.userId,
      type: basicInfo.type,
      status: basicInfo.status,
      orderNumber: orderNumber,
      items: items,
      currency: currency,
      subtotal: totals.subtotal,
      taxes: totals.taxes,
      totalAmount: totals.totalAmount,
      custodyService: custodyService,
      custodian: custodian,
      paymentStatus: basicInfo.paymentStatus,
      createdAt: basicInfo.createdAt,
      updatedAt: basicInfo.updatedAt
    } as Order;
  }

  /**
   * Get orders by user ID with filtering and pagination (instance method)
   */
  async getOrdersByUserId(
    userId?: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
      type?: string;
    }
  ): Promise<{
    orders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;  // Changed from hasPrev to hasPrevious
    };
  }> {
    // Delegate to static method for now
    return OrderService.getOrdersByUserId(userId, options);
  }
}
