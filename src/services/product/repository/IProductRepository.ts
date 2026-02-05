/**
 * Product Repository Interface
 * 
 * Defines data access layer contract for product operations
 */

import { 
  CreateProductRequest, 
  UpdateProductRequest, 
  ProductManagementResponse, 
  ProductLookupIds, 
  ProductImageUpload, 
  ProductListOptions, 
  ProductListResponse,
  ProductPriceDTO,
  ProductImageDTO,
  CreateProductByIdRequest,
  UpdateProductByIdRequest
} from '../types/ProductTypes';
import { AuditTrailUser } from '../../../utils/auditTrail';

export interface IProductRepository {
  create(data: CreateProductRequest, authenticatedUser?: AuditTrailUser): Promise<ProductManagementResponse>;
  findById(id: string): Promise<ProductManagementResponse | null>;
  findAll(options?: ProductListOptions): Promise<ProductListResponse>;
  update(id: string, data: UpdateProductRequest, authenticatedUser?: AuditTrailUser): Promise<ProductManagementResponse>;
  delete(id: string, authenticatedUser?: AuditTrailUser): Promise<void>;
  saveImage(productId: string, image: ProductImageUpload, authenticatedUser?: AuditTrailUser): Promise<void>;
  getImage(productId: string): Promise<Buffer | null>;
  getImageWithMetadata(productId: string): Promise<ProductImageDTO | null>;
  findLookupIds(productType: string, metal: string, producer: string, country?: string): Promise<ProductLookupIds | null>;
  
  // Price methods
  findPriceById(id: string): Promise<ProductPriceDTO | null>;
  findPricesByIds(ids: string[]): Promise<ProductPriceDTO[]>;
  
  // Existence check
  exists(id: string): Promise<boolean>;
  
  // Order dependency check
  hasOrders(productId: string): Promise<boolean>;
  
  // ID-based CRUD methods
  createById(data: CreateProductByIdRequest, authenticatedUser?: AuditTrailUser): Promise<ProductManagementResponse>;
  updateById(id: string, data: UpdateProductByIdRequest, authenticatedUser?: AuditTrailUser): Promise<ProductManagementResponse>;
  
  // Reference validation
  validateReferenceIds(metalId?: string, productTypeId?: string, producerId?: string, countryId?: string): Promise<{
    valid: boolean;
    errors: string[];
  }>;
}
