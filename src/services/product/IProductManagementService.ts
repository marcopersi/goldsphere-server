/**
 * Product Management Service Interface
 * 
 * Defines contract for CRUD operations on products
 */

import { CreateProductRequest, UpdateProductRequest, ProductManagementResponse, ProductListOptions, ProductListResponse } from './types/ProductTypes';

export interface IProductManagementService {
  createProduct(data: CreateProductRequest): Promise<ProductManagementResponse>;
  getProductById(id: string): Promise<ProductManagementResponse | null>;
  listProducts(options?: ProductListOptions): Promise<ProductListResponse>;
  updateProduct(id: string, data: UpdateProductRequest): Promise<ProductManagementResponse>;
  deleteProduct(id: string): Promise<void>;
  uploadImage(productId: string, imageBase64: string, contentType: string, filename: string): Promise<void>;
}
