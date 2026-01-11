/**
 * Order Repository Interface
 * 
 * Defines data access layer contract for order operations
 * Separates data access from business logic
 */

import { Order, GetOrdersOptions, GetOrdersResult } from '../types/OrderTypes';
import { AuditTrailUser } from '../../../utils/auditTrail';

export interface IOrderRepository {
  /**
   * Create a new order in the database
   */
  create(order: Order, authenticatedUser?: AuditTrailUser): Promise<void>;

  /**
   * Find order by ID with all related data
   */
  findById(orderId: string): Promise<Order | null>;

  /**
   * Find orders by user ID with filtering and pagination
   */
  findByUserId(userId: string | undefined, options: GetOrdersOptions): Promise<GetOrdersResult>;

  /**
   * Update order status
   */
  updateStatus(orderId: string, newStatus: string, authenticatedUser?: AuditTrailUser): Promise<void>;

  /**
   * Update order with multiple fields
   */
  update(orderId: string, updates: Partial<Order>, authenticatedUser?: AuditTrailUser): Promise<void>;

  /**
   * Count orders by user ID with filters
   */
  countByUserId(userId: string | undefined, options?: { status?: string; type?: string }): Promise<number>;
}
