/**
 * Order Domain Types
 * 
 * All type definitions for the Order domain
 * Centralized for consistency and reusability
 */

// Re-export enums for convenience
export { OrderType, OrderStatus, OrderSource } from '@marcopersi/shared';

// ============================================================================
// Order Item
// ============================================================================

export interface OrderItemProduct {
  name: string;
  currentPrice: number;
  currency: string;
  weight: number;
  weightUnit: string;
  purity: number;
  year: number | null;
  type: string;
  metal: string;
  country: string | null;
  producer: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: OrderItemProduct;
}

// ============================================================================
// Order Entity
// ============================================================================

/**
 * Order entity - uses string values for type and status
 * Database stores lowercase ('buy', 'pending')
 * API returns uppercase enum keys ('BUY', 'PENDING')
 */
export interface OrderCustodyService {
  id: string;
  name: string;
  fee: number;
  paymentFrequency: string;
  currency: string;
  custodian: {
    id: string;
    name: string;
  };
}

export interface Order {
  id: string;
  userId: string;
  type: string;
  status: string;
  orderNumber: string;
  items: OrderItem[];
  currency: string;
  subtotal: number;
  taxes: number;
  totalAmount: number;
  custodyService?: OrderCustodyService | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateOrderRequest {
  userId: string;
  type: string;
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress?: any;
  paymentMethod?: any;
  custodyAssignments?: any[];
  notes?: string;
}

export interface OrderCalculation {
  subtotal: number;
  fees: {
    processing: number;
    shipping: number;
    insurance: number;
  };
  taxes: number;
  totalAmount: number;
}

export interface CreateOrderResult {
  order: Order;
  calculation: OrderCalculation;
}

// ============================================================================
// Pagination
// ============================================================================

export interface OrderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface GetOrdersOptions {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
}

export interface GetOrdersResult {
  orders: Order[];
  pagination: OrderPagination;
}
