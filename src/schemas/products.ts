import { z } from 'zod';
import { 
  ProductSchema as SharedProductSchema,
  ProductsResponseSchema as SharedProductsResponseSchema,
  PaginationSchema as SharedPaginationSchema
} from '@marcopersi/shared';

// Re-export shared schemas for local use
export const ProductSchema = SharedProductSchema;
export const ProductsResponseSchema = SharedProductsResponseSchema;
export const PaginationSchema = SharedPaginationSchema;

// Export types
export type ProductResponse = z.infer<typeof ProductSchema>;
export type ProductsResponse = z.infer<typeof ProductsResponseSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;

// Legacy Metal schema removed - now using Metal enum from shared package

// Query parameters schema for products endpoint
export const ProductsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  metal: z.string().optional(),
  type: z.string().optional(),
  inStock: z.string().optional().transform(val => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }),
  minPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  maxPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined)
});

export type ProductsQuery = z.infer<typeof ProductsQuerySchema>;

// Error response schema
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.string().optional()
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
