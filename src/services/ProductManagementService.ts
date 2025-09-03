/**
 * Product Management Service Implementation
 * 
 * Handles business logic for product CRUD operations
 */

import { IProductManagementService, CreateProductRequest, ProductManagementResponse } from '../interfaces/IProductManagementService';
import { IProductRepository } from '../interfaces/IProductRepository';
import { ProductRepository } from '../repositories/ProductRepository';

export class ProductManagementService implements IProductManagementService {
  private readonly repository: IProductRepository;
  
  constructor(repository?: IProductRepository) {
    this.repository = repository || new ProductRepository();
  }
  
  async createProduct(data: CreateProductRequest): Promise<ProductManagementResponse> {
    this.validateProductData(data);
    return await this.repository.create(data);
  }
  
  async getProductById(id: string): Promise<ProductManagementResponse | null> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Valid product ID is required');
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid product ID format');
    }
    
    return await this.repository.findById(id);
  }
  
  private validateProductData(data: CreateProductRequest): void {
    this.validateRequiredFields(data);
    this.validateNumericFields(data);
    this.validateEnumFields(data);
  }
  
  private validateRequiredFields(data: CreateProductRequest): void {
    const requiredFields = ['name', 'productType', 'metal', 'weight', 'weightUnit', 'purity', 'price', 'currency', 'producer'];
    
    for (const field of requiredFields) {
      const value = data[field as keyof CreateProductRequest];
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        throw new Error(`${field} is required`);
      }
    }
  }
  
  private validateNumericFields(data: CreateProductRequest): void {
    if (data.weight <= 0) {
      throw new Error('Weight must be greater than 0');
    }
    
    if (data.purity <= 0 || data.purity > 1) {
      throw new Error('Purity must be between 0 and 1');
    }
    
    if (data.price <= 0) {
      throw new Error('Price must be greater than 0');
    }
    
    if (data.year && (data.year < 1800 || data.year > new Date().getFullYear() + 1)) {
      throw new Error('Year must be between 1800 and next year');
    }
    
    if (data.stockQuantity && data.stockQuantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }
    
    if (data.minimumOrderQuantity && data.minimumOrderQuantity <= 0) {
      throw new Error('Minimum order quantity must be greater than 0');
    }
    
    if (data.premiumPercentage && data.premiumPercentage < 0) {
      throw new Error('Premium percentage cannot be negative');
    }
  }
  
  private validateEnumFields(data: CreateProductRequest): void {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD'];
    if (!validCurrencies.includes(data.currency.toUpperCase())) {
      throw new Error(`Currency must be one of: ${validCurrencies.join(', ')}`);
    }
    
    const validWeightUnits = ['troy_ounces', 'grams', 'ounces', 'kilograms'];
    if (!validWeightUnits.includes(data.weightUnit)) {
      throw new Error(`Weight unit must be one of: ${validWeightUnits.join(', ')}`);
    }
  }
}
