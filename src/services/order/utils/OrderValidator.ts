/**
 * Order Validation Utilities
 * 
 * Centralized validation logic for Order domain
 * Separated from business logic for reusability
 */

import { OrderType, OrderStatus, CreateOrderRequest } from '../types/OrderTypes';

// ============================================================================
// Valid Values
// ============================================================================

/**
 * Validates if a string is a valid OrderType
 */
export function isValidOrderType(type: string): boolean {
  return OrderType.fromValue(type.toLowerCase()) !== undefined;
}

/**
 * Validates if a string is a valid OrderStatus
 */
export function isValidOrderStatus(status: string): boolean {
  return OrderStatus.fromValue(status.toLowerCase()) !== undefined;
}

export function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  // Simple validation for now - in practice this would have more complex business rules
  return isValidOrderStatus(newStatus);
}

export function validateCreateOrderRequest(request: CreateOrderRequest): void {
  if (!request.userId) {
    throw new Error('User ID is required');
  }

  if (!request.type) {
    throw new Error('Order type is required');
  }

  if (!isValidOrderType(request.type)) {
    throw new Error(`Invalid order type: ${request.type}. Must be 'buy' or 'sell'`);
  }

  if (!request.items || !Array.isArray(request.items)) {
    throw new Error('Order items are required');
  }

  if (request.items.length === 0) {
    throw new Error('Order must contain at least one item');
  }

  // Validate each item
  for (const item of request.items) {
    if (!item.productId) {
      throw new Error('Product ID is required for all items');
    }

    if (!item.quantity || item.quantity <= 0) {
      throw new Error('Item quantity must be greater than 0');
    }
  }
}

export function parseOrderType(type: string): string {
  const lowerType = type.toLowerCase();
  const orderType = OrderType.fromValue(lowerType);
  
  if (!orderType) {
    throw new Error(`Invalid order type: ${type}. Valid values: ${OrderType.values().map(t => t.value).join(', ')}`);
  }
  
  return lowerType; // Return lowercase for DB storage
}
