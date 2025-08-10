import { z } from 'zod';
import { PaginationSchema } from './products';

// Order schema to match expected frontend structure
export const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(['buy', 'sell']),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    specifications: z.record(z.string(), z.any())
  })),
  subtotal: z.number(),
  fees: z.object({
    processing: z.number().optional(),
    shipping: z.number().optional(),
    insurance: z.number().optional()
  }),
  taxes: z.number(),
  totalAmount: z.number(),
  currency: z.enum(['USD', 'EUR', 'GBP']),
  shippingAddress: z.object({
    type: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string()
  }).optional(),
  paymentMethod: z.object({
    type: z.string()
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type OrderResponse = z.infer<typeof OrderSchema>;

// Orders API Response schema
export const OrdersResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    orders: z.array(OrderSchema),
    pagination: PaginationSchema
  })
});

export type OrdersResponse = z.infer<typeof OrdersResponseSchema>;

// Query parameters schema for orders endpoint
export const OrdersQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  status: z.string().optional(),
  type: z.string().optional(),
  userId: z.string().optional()
});

export type OrdersQuery = z.infer<typeof OrdersQuerySchema>;
