/**
 * Order Repository Implementation
 * 
 * Handles database operations for order management using DI
 * All SQL queries are encapsulated here
 */

import { Pool } from 'pg';
import { IOrderRepository } from './IOrderRepository';
import { Order, OrderItem, GetOrdersOptions, GetOrdersResult } from '../types/OrderTypes';
import { createOrderWithAudit, createOrderItemWithAudit, updateOrderWithAudit, AuditTrailUser } from '../../../utils/auditTrail';

export class OrderRepositoryImpl implements IOrderRepository {
  constructor(private readonly pool: Pool) {}

  async create(order: Order, authenticatedUser?: AuditTrailUser): Promise<void> {
    try {
      if (authenticatedUser) {
        // Use audit trail functions when user context is available
        await createOrderWithAudit({
          id: order.id,
          userid: order.userId,
          type: order.type,
          orderstatus: order.status,
          custodyserviceid: undefined,
          payment_intent_id: undefined,
          payment_status: 'pending'
        }, authenticatedUser);

        // Insert order items with audit trail
        for (const item of order.items) {
          await createOrderItemWithAudit({
            orderid: order.id,
            productid: item.productId,
            productname: item.productName,
            quantity: item.quantity,
            unitprice: item.unitPrice,
            totalprice: item.totalPrice
          }, authenticatedUser);
        }
      } else {
        // Fallback to direct SQL when no user context
        await this.pool.query(
          `INSERT INTO orders (
            id, userid, type, orderstatus, custodyserviceid, createdat, updatedat
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            order.id,
            order.userId,
            order.type,
            order.status,
            null,
            order.createdAt,
            order.updatedAt
          ]
        );

        // Insert order items
        for (const item of order.items) {
          await this.pool.query(
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
      }
    } catch (error) {
      throw new Error(`Failed to create order: ${(error as Error).message}`);
    }
  }

  async findById(orderId: string): Promise<Order | null> {
    try {
      const result = await this.pool.query(
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

      return this.mapDatabaseRowsToOrder(result.rows);
    } catch (error) {
      throw new Error(`Failed to fetch order: ${(error as Error).message}`);
    }
  }

  async findByUserId(userId: string | undefined, options: GetOrdersOptions): Promise<GetOrdersResult> {
    const { page = 1, limit = 20, status, type } = options;
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
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
    const total = await this.countByUserId(userId, { status, type });
    
    // Get orders with pagination
    const dataQuery = `
      SELECT 
        o.id, o.userid, o.type, o.orderstatus, o.payment_status,
        o.createdat, o.updatedat, o.custodyserviceid,
        oi.id as itemid, oi.productid, oi.productname, oi.quantity,
        oi.unitprice, oi.totalprice,
        p.currency, p.name as product_name,
        p.price as product_current_price, p.currency as product_currency,
        p.weight as product_weight, p.weightunit as product_weight_unit,
        p.purity as product_purity, p.year as product_year,
        pt.producttypename as product_type,
        m.name as product_metal,
        c.countryname as product_country,
        pr.producername as product_producer,
        cs.custodyservicename,
        cs.fee as custody_service_fee,
        cs.paymentfrequency as custody_service_payment_frequency,
        curr.isocode3 as custody_service_currency,
        cust.id as custodianid, cust.custodianname
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.orderid
      LEFT JOIN product p ON oi.productid = p.id
      LEFT JOIN producttype pt ON p.producttypeid = pt.id
      LEFT JOIN metal m ON p.metalid = m.id
      LEFT JOIN country c ON p.countryid = c.id
      LEFT JOIN producer pr ON p.producerid = pr.id
      LEFT JOIN custodyservice cs ON o.custodyserviceid = cs.id
      LEFT JOIN custodian cust ON cs.custodianid = cust.id
      LEFT JOIN currency curr ON cs.currencyid = curr.id
      ${whereClause}
      ORDER BY o.createdat DESC, oi.createdat ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const result = await this.pool.query(dataQuery, queryParams);
    
    // Group by order ID
    const ordersMap = new Map<string, any[]>();
    for (const row of result.rows) {
      if (!ordersMap.has(row.id)) {
        ordersMap.set(row.id, []);
      }
      ordersMap.get(row.id)!.push(row);
    }
    
    const orders = Array.from(ordersMap.values()).map(rows => this.mapDatabaseRowsToOrder(rows));
    
    // Calculate pagination
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };
    
    return { orders, pagination };
  }

  async updateStatus(orderId: string, newStatus: string, authenticatedUser?: AuditTrailUser): Promise<void> {
    try {
      if (authenticatedUser) {
        await updateOrderWithAudit(orderId, {
          orderstatus: newStatus
        }, authenticatedUser);
      } else {
        const result = await this.pool.query(
          `UPDATE orders 
           SET orderstatus = $1, updatedat = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [newStatus, orderId]
        );

        if (result.rowCount === 0) {
          throw new Error(`Order not found: ${orderId}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to update order status: ${(error as Error).message}`);
    }
  }

  async update(orderId: string, updates: Partial<Order>, authenticatedUser?: AuditTrailUser): Promise<void> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.type) {
        updateFields.push(`type = $${paramIndex}`);
        updateValues.push(updates.type);
        paramIndex++;
      }

      if (updates.status) {
        updateFields.push(`orderstatus = $${paramIndex}`);
        updateValues.push(updates.status);
        paramIndex++;
      }

      // Always update timestamp
      updateFields.push(`updatedat = CURRENT_TIMESTAMP`);

      if (updateFields.length === 1) {
        throw new Error('No valid fields provided for update');
      }

      const updateQuery = `
        UPDATE orders 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex}
      `;
      updateValues.push(orderId);

      await this.pool.query(updateQuery, updateValues);
    } catch (error) {
      throw new Error(`Failed to update order: ${(error as Error).message}`);
    }
  }

  async countByUserId(userId: string | undefined, options?: { status?: string; type?: string }): Promise<number> {
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (userId) {
      whereConditions.push(`o.userid = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    }
    
    if (options?.status) {
      whereConditions.push(`o.orderstatus = $${paramIndex}`);
      queryParams.push(options.status);
      paramIndex++;
    }
    
    if (options?.type) {
      whereConditions.push(`o.type = $${paramIndex}`);
      queryParams.push(options.type);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      ${whereClause}
    `;
    
    const result = await this.pool.query(countQuery, queryParams);
    return Number.parseInt(result.rows[0].total);
  }

  // ============================================================================
  // Private Mapping Methods
  // ============================================================================

  private mapDatabaseRowsToOrder(rows: any[]): Order {
    if (rows.length === 0) {
      throw new Error('No rows to map');
    }

    const firstRow = rows[0];
    
    const items: OrderItem[] = rows
      .filter(row => row.itemid)
      .map(row => ({
        id: row.itemid,
        productId: row.productid,
        productName: row.productname,
        quantity: Number.parseFloat(row.quantity || '0'),
        unitPrice: Number.parseFloat(row.unitprice || '0'),
        totalPrice: Number.parseFloat(row.totalprice || '0')
      }));

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxes = 0;
    const totalAmount = subtotal + taxes;

    return {
      id: firstRow.id,
      userId: firstRow.userid,
      type: firstRow.type,
      status: firstRow.orderstatus,
      orderNumber: this.generateOrderNumber(firstRow.id),
      items,
      currency: firstRow.currency || 'CHF',
      subtotal,
      taxes,
      totalAmount,
      createdAt: new Date(firstRow.createdat),
      updatedAt: new Date(firstRow.updatedat)
    };
  }

  private generateOrderNumber(orderId: string): string {
    return `ORD-${orderId.slice(0, 8).toUpperCase()}`;
  }
}
