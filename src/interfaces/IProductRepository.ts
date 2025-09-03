/**
 * Product Repository Interface
 * 
 * Defines data access layer contract for product operations
 */

import { CreateProductRequest, ProductManagementResponse } from './IProductManagementService';

export interface IProductRepository {
  create(data: CreateProductRequest): Promise<ProductManagementResponse>;
  findById(id: string): Promise<ProductManagementResponse | null>;
  findLookupIds(productType: string, metal: string, producer: string, country?: string): Promise<{
    productTypeId: string;
    metalId: string;
    producerId: string;
    countryId?: string;
  } | null>;
}
