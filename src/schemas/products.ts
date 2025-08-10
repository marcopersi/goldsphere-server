import { z } from 'zod';

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().min(1),
  limit: z.number().min(1).max(100),
  total: z.number().min(0),
  totalPages: z.number().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean()
});

export type Pagination = z.infer<typeof PaginationSchema>;

// Metal object schema
export const MetalSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string().describe('Chemical symbol, e.g. "AU", "AG", "PT", "PD"')
});

export type Metal = z.infer<typeof MetalSchema>;

// Simplified Product schema to match expected frontend structure
export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().describe('Product type from database, e.g. "Cast Bar", "Minted Bar", "Coin", etc.'),
  metal: MetalSchema,
  weight: z.number(),
  weightUnit: z.string().describe('Weight unit from database, e.g. "grams", "ounces", "kg"'),
  purity: z.number(),
  price: z.number(),
  currency: z.string().describe('Currency code from database, e.g. "USD", "EUR", "GBP"'),
  producer: z.string(),
  country: z.string().describe('ISO 3166-1 alpha-2 country code (lowercase), e.g. "us", "ca", "au"'),
  year: z.number().optional(),
  description: z.string(),
  inStock: z.boolean(),
  minimumOrderQuantity: z.number(),
  imageUrl: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type ProductResponse = z.infer<typeof ProductSchema>;

// Products API Response schema
export const ProductsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    products: z.array(ProductSchema),
    pagination: PaginationSchema
  })
});

export type ProductsResponse = z.infer<typeof ProductsResponseSchema>;

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
