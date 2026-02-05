/**
 * Product Management Service Interface
 * 
 * Defines contract for CRUD operations on products
 */

import { 
  CreateProductRequest, 
  UpdateProductRequest, 
  ProductManagementResponse, 
  ProductListOptions, 
  ProductListResponse,
  ProductPriceDTO,
  ProductImageDTO,
  CreateProductByIdRequest,
  UpdateProductByIdRequest
} from './types/ProductTypes';
import { AuditTrailUser } from '../../utils/auditTrail';

export interface IProductManagementService {
  createProduct(data: CreateProductRequest, authenticatedUser?: AuditTrailUser): Promise<ProductManagementResponse>;
  getProductById(id: string): Promise<ProductManagementResponse | null>;
  listProducts(options?: ProductListOptions): Promise<ProductListResponse>;
  updateProduct(id: string, data: UpdateProductRequest, authenticatedUser?: AuditTrailUser): Promise<ProductManagementResponse>;
  deleteProduct(id: string, authenticatedUser?: AuditTrailUser): Promise<void>;
  uploadImage(productId: string, imageBase64: string, contentType: string, filename: string, authenticatedUser?: AuditTrailUser): Promise<void>;
  
  // Price methods
  getProductPrice(id: string): Promise<ProductPriceDTO | null>;
  getProductPrices(ids: string[]): Promise<ProductPriceDTO[]>;
  
  // Image retrieval
  getProductImage(id: string): Promise<ProductImageDTO | null>;
  
  // ID-based CRUD methods (using foreign key IDs instead of names)
  createProductById(data: CreateProductByIdRequest, authenticatedUser?: AuditTrailUser): Promise<ProductManagementResponse>;
  updateProductById(id: string, data: UpdateProductByIdRequest, authenticatedUser?: AuditTrailUser): Promise<ProductManagementResponse>;
}
