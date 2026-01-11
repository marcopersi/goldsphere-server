/**
 * IOrderService Interface
 * 
 * Defines the contract for order-related business operations.
 * Allows for multiple implementations (production, mock, test) with same interface.
 */

import { Order, CreateOrderRequest, CreateOrderResult, GetOrdersOptions, GetOrdersResult } from './types/OrderTypes';

export interface IOrderService {
  /**
   * Create a new order with full enrichment and validation
   */
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResult>;

  /**
   * Get order by ID with complete data mapping
   */
  getOrderById(orderId: string): Promise<Order | null>;

  /**
   * Update order status with business logic validation
   */
  updateOrderStatus(orderId: string, newStatus: string): Promise<void>;

  /**
   * Get orders by user with filtering and pagination
   */
  getOrdersByUserId(userId?: string, options?: GetOrdersOptions): Promise<GetOrdersResult>;
}
