/**
 * IOrderService Interface
 * 
 * Defines the contract for order-related business operations.
 * Allows for multiple implementations (production, mock, test) with same interface.
 */

import { Order, OrderStatus } from "@marcopersi/shared";

export interface CreateOrderRequest {
  userId: string;
  type: string;
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress?: any;
  paymentMethod?: any;
  custodyAssignments?: any[];
  notes?: string;
}

export interface CreateOrderResult {
  order: Order;
  calculation: {
    subtotal: number;
    fees: {
      processing: number;
      shipping: number;
      insurance: number;
    };
    taxes: number;
    totalAmount: number;
  };
}

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
  updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<void>;

  /**
   * Get orders by user with filtering and pagination
   */
  getOrdersByUserId(
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
      hasPrev: boolean;
    };
  }>;
}
