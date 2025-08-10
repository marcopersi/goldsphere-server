import { 
  // Re-export shared schemas - NO MORE LOCAL SCHEMAS!
  OrderSchema as SharedOrderSchema,
  CreateOrderRequestSchema as SharedCreateOrderRequestSchema,
  UpdateOrderRequestSchema as SharedUpdateOrderRequestSchema,
  UpdateOrderStatusRequestSchema as SharedUpdateOrderStatusRequestSchema,
  OrderApiResponseSchema as SharedOrderResponseSchema,
  OrderApiListResponseSchema as SharedOrdersResponseSchema,
  OrderQueryParamsSchema as SharedOrderQueryParamsSchema,
  OrderItemSchema as SharedOrderItemSchema,
  OrderFeesSchema as SharedOrderFeesSchema,
  OrderTrackingSchema as SharedOrderTrackingSchema,
  // Validation utilities
  validateOrderTotals,
  validateOrderItems,
  calculateOrderTotals
} from '@marcopersi/shared';

// Re-export shared schemas for local use
export const OrderSchema = SharedOrderSchema;
export const CreateOrderRequestSchema = SharedCreateOrderRequestSchema;
export const UpdateOrderRequestSchema = SharedUpdateOrderRequestSchema;
export const UpdateOrderStatusRequestSchema = SharedUpdateOrderStatusRequestSchema;
export const OrderResponseSchema = SharedOrderResponseSchema;
export const OrdersResponseSchema = SharedOrdersResponseSchema;
export const OrderQueryParamsSchema = SharedOrderQueryParamsSchema;
export const OrderItemSchema = SharedOrderItemSchema;
export const OrderFeesSchema = SharedOrderFeesSchema;
export const OrderTrackingSchema = SharedOrderTrackingSchema;

// Re-export types
export type OrderResponse = typeof OrderResponseSchema._type;
export type OrdersResponse = typeof OrdersResponseSchema._type;
export type OrderQueryParams = typeof OrderQueryParamsSchema._type;
export type CreateOrderRequest = typeof CreateOrderRequestSchema._type;
export type UpdateOrderRequest = typeof UpdateOrderRequestSchema._type;
export type UpdateOrderStatusRequest = typeof UpdateOrderStatusRequestSchema._type;

// Re-export validation utilities
export { validateOrderTotals, validateOrderItems, calculateOrderTotals };
