/**
 * Reference Data Domain Types
 * 
 * Type definitions for reference data (metals, product types, producers)
 * Centralized for consistency and reusability
 */

import { PaginationResponse } from "@marcopersi/shared";

// ============================================================================
// Common Types
// ============================================================================

type SortByField = 'name' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

// ============================================================================
// Metal Types
// ============================================================================

export interface MetalResponse {
  id: string;
  name: string;
  symbol?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetalListOptions {
  page?: number;
  limit?: number;
  sortBy?: SortByField;
  sortOrder?: SortOrder;
  search?: string;
}

export interface MetalListResponse {
  items: MetalResponse[];
  pagination: PaginationResponse;
}

// ============================================================================
// Product Type Types
// ============================================================================

export interface ProductTypeResponse {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductTypeListOptions {
  page?: number;
  limit?: number;
  sortBy?: SortByField;
  sortOrder?: SortOrder;
  search?: string;
}

export interface ProductTypeListResponse {
  items: ProductTypeResponse[];
  pagination: PaginationResponse;
}

// ============================================================================
// Producer Types
// ============================================================================

export interface ProducerResponse {
  id: string;
  name: string;
  country?: string;
  websiteUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProducerListOptions {
  page?: number;
  limit?: number;
  sortBy?: SortByField;
  sortOrder?: SortOrder;
  search?: string;
}

export interface ProducerListResponse {
  items: ProducerResponse[];
  pagination: PaginationResponse;
}

// ============================================================================
// Combined Reference Data Response
// ============================================================================

export interface AllReferenceDataResponse {
  metals: MetalResponse[];
  productTypes: ProductTypeResponse[];
  producers: ProducerResponse[];
  countries: Array<{ code: string; name: string }>;
  custodians: Array<{ value: string; name: string }>;
  paymentFrequencies: Array<{ value: string; displayName: string; description: string }>;
  custodyServiceTypes: Array<{ value: string; displayName: string; description: string }>;
}
