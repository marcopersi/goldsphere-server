/**
 * Product Management Service Interface
 * 
 * Defines contract for CRUD operations on products
 */

export interface CreateProductRequest {
  name: string;
  productType: string;
  metal: string;
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
}

export interface ProductManagementResponse {
  id: string;
  name: string;
  productType: string;
  metal: string;
  weight: number;
  weightUnit: string;
  purity: number;
  price: number;
  currency: string;
  producer: string;
  country: string | null;
  year: number | null;
  description: string | null;
  imageUrl: string | null;
  imageFilename: string | null;
  inStock: boolean;
  stockQuantity: number;
  minimumOrderQuantity: number;
  premiumPercentage: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductManagementService {
  createProduct(data: CreateProductRequest): Promise<ProductManagementResponse>;
  getProductById(id: string): Promise<ProductManagementResponse | null>;
}
