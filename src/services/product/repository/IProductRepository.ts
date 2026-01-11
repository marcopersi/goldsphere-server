/**
 * Product Repository Interface
 * 
 * Defines data access layer contract for product operations
 */

import { CreateProductRequest, UpdateProductRequest, ProductManagementResponse, ProductLookupIds, ProductImageUpload, ProductListOptions, ProductListResponse } from '../types/ProductTypes';

export interface IProductRepository {
  create(data: CreateProductRequest): Promise<ProductManagementResponse>;
  findById(id: string): Promise<ProductManagementResponse | null>;
  findAll(options?: ProductListOptions): Promise<ProductListResponse>;
  update(id: string, data: UpdateProductRequest): Promise<ProductManagementResponse>;
  delete(id: string): Promise<void>;
  saveImage(productId: string, image: ProductImageUpload): Promise<void>;
  getImage(productId: string): Promise<Buffer | null>;
  findLookupIds(productType: string, metal: string, producer: string, country?: string): Promise<ProductLookupIds | null>;
}
