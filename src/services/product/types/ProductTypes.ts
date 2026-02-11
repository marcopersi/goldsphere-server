/**
 * Product Domain Types
 * 
 * All type definitions for the Product domain
 * Centralized for consistency and reusability
 */

import { Metal, ProductTypeEnum, PaginationResponse } from "@marcopersi/shared";

// ============================================================================
// Request/Response Types for Product Management
// ============================================================================

export interface CreateProductRequest {
  name: string;
  productType: string;  // Will be converted to ProductTypeEnum
  metal: string;        // Will be converted to Metal
  weight: number;
  weightUnit: string;
  purity: number;
  price: number;
  currency: string;
  producer: string;
  country?: string;
  year?: number;
  description?: string;
  imageUrl?: string;
  imageFilename?: string;
  inStock?: boolean;
  stockQuantity?: number;
  minimumOrderQuantity?: number;
  premiumPercentage?: number;
  diameter?: number;
  thickness?: number;
  mintage?: number;
}

export interface UpdateProductRequest {
  name?: string;
  productType?: string;  // Will be converted to ProductTypeEnum
  metal?: string;        // Will be converted to Metal
  weight?: number;
  weightUnit?: string;
  purity?: number;
  price?: number;
  currency?: string;
  producer?: string;
  country?: string;
  year?: number;
  description?: string;
  imageUrl?: string;
  imageFilename?: string;
  inStock?: boolean;
  stockQuantity?: number;
  minimumOrderQuantity?: number;
  premiumPercentage?: number;
  diameter?: number;
  thickness?: number;
  mintage?: number;
}

export interface ProductImageUpload {
  imageData: Buffer;
  contentType: string;
  filename: string;
}

export interface ProductListFilter {
  search?: string;
  metalId?: string;
  productTypeId?: string;
  producerId?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface ProductListOptions {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  filter?: ProductListFilter;
}

// Use standard API response format from shared package
export type ProductListResponse = {
  items: ProductManagementResponse[];
  pagination: PaginationResponse;
};

export interface ProductManagementResponse {
  id: string;
  name: string;
  productType: ProductTypeEnum;  // ✅ Enum instead of string
  productTypeId: string;          // ✅ UUID for foreign key
  metal: Metal;                   // ✅ Enum instead of string
  metalId: string;                // ✅ UUID for foreign key
  weight: number;
  weightUnit: string;
  purity: number;
  price: number;
  currency: string;
  producer: string;
  producerId: string;             // ✅ UUID for foreign key
  country: string | null;
  countryId: string | null;       // ✅ UUID for foreign key
  year: number | null;
  description: string | null;
  certifiedProvenance: boolean;
  imageUrl: string | null;
  imageFilename: string | null;
  inStock: boolean;
  stockQuantity: number;
  minimumOrderQuantity: number;
  premiumPercentage: number | null;
  diameter: number | null;
  thickness: number | null;
  mintage: number | null;
  certification: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Product Entity
// ============================================================================

export interface Product {
  id: string;
  name: string;
  productTypeId: string;
  metalId: string;
  weight: number;
  weightUnit: string;
  purity: number;
  price: number;
  currency: string;
  producerId: string;
  countryId?: string;
  year?: number;
  description?: string;
  imageUrl?: string;
  stockQuantity: number;
  minOrderQuantity: number;
  premiumPercentage: number;
  diameter?: number;
  thickness?: number;
  mintage?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// Order Item Types
// ============================================================================

export interface EnrichedOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  available: boolean;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

// ============================================================================
// Lookup Types
// ============================================================================

export interface ProductLookupIds {
  productTypeId: string;
  metalId: string;
  producerId: string;
  countryId?: string;
}

// ============================================================================
// Availability Check
// ============================================================================

export interface ProductAvailability {
  productId: string;
  available: boolean;
  stockQuantity: number;
  requestedQuantity: number;
}

// ============================================================================
// Price Types
// ============================================================================

export interface ProductPriceDTO {
  id: string;
  price: number;
  currency: string;
}

export interface ProductImageDTO {
  data: Buffer;
  contentType: string;
  filename: string;
}

// ============================================================================
// ID-based Request Types (for API endpoints using foreign key IDs)
// ============================================================================

export interface CreateProductByIdRequest {
  name: string;
  productTypeId: string;
  metalId: string;
  producerId: string;
  countryId?: string;
  weight: number;
  weightUnit: string;
  purity: number;
  price: number;
  currency: string;
  year?: number;
  description?: string;
  imageFilename?: string;
  inStock?: boolean;
  stockQuantity?: number;
  minimumOrderQuantity?: number;
  premiumPercentage?: number;
  diameter?: number;
  thickness?: number;
  mintage?: number;
  certification?: string;
}

export interface UpdateProductByIdRequest {
  name?: string;
  productTypeId?: string;
  metalId?: string;
  producerId?: string;
  countryId?: string;
  weight?: number;
  weightUnit?: string;
  purity?: number;
  price?: number;
  currency?: string;
  year?: number;
  description?: string;
  imageFilename?: string;
  inStock?: boolean;
  stockQuantity?: number;
  minimumOrderQuantity?: number;
  premiumPercentage?: number;
  diameter?: number;
  thickness?: number;
  mintage?: number;
  certification?: string;
}
