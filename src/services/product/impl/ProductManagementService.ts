/**
 * Product Management Service Implementation
 * 
 * Handles business logic for product CRUD operations with DI
 */

import { IProductManagementService } from '../IProductManagementService';
import { IProductRepository } from '../repository/IProductRepository';
import { CreateProductRequest, UpdateProductRequest, ProductManagementResponse, ProductListOptions, ProductListResponse, CreateProductByIdRequest, UpdateProductByIdRequest } from '../types/ProductTypes';
import { AuditTrailUser } from '../../../utils/auditTrail';

export class ProductManagementService implements IProductManagementService {
  constructor(private readonly repository: IProductRepository) {}
  
  async createProduct(data: CreateProductRequest, authenticatedUser: AuditTrailUser): Promise<ProductManagementResponse> {
    this.validateProductData(data);
    return await this.repository.create(data, authenticatedUser);
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
  
  async listProducts(options?: ProductListOptions): Promise<ProductListResponse> {
    // Validate pagination parameters
    if (options?.page !== undefined && options.page < 1) {
      throw new Error('Page number must be at least 1');
    }
    
    if (options?.limit !== undefined && (options.limit < 1 || options.limit > 100)) {
      throw new Error('Limit must be between 1 and 100');
    }
    
    // Validate price filters
    if (options?.filter?.minPrice !== undefined && options.filter.minPrice < 0) {
      throw new Error('Minimum price cannot be negative');
    }
    
    if (options?.filter?.maxPrice !== undefined && options.filter.maxPrice < 0) {
      throw new Error('Maximum price cannot be negative');
    }
    
    if (
      options?.filter?.minPrice !== undefined &&
      options?.filter?.maxPrice !== undefined &&
      options.filter.minPrice > options.filter.maxPrice
    ) {
      throw new Error('Minimum price cannot be greater than maximum price');
    }
    
    return await this.repository.findAll(options);
  }
  
  async updateProduct(id: string, data: UpdateProductRequest, authenticatedUser: AuditTrailUser): Promise<ProductManagementResponse> {
    // Validate ID
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Valid product ID is required');
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid product ID format');
    }
    
    // Validate update data (only validate fields that are present)
    this.validateUpdateData(data);
    
    return await this.repository.update(id, data, authenticatedUser);
  }
  
  async deleteProduct(id: string, authenticatedUser: AuditTrailUser): Promise<void> {
    // Validate ID
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Valid product ID is required');
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid product ID format');
    }
    
    // Check for existing orders referencing this product
    const hasOrders = await this.repository.hasOrders(id);
    if (hasOrders) {
      throw new Error('Cannot delete product with existing orders');
    }
    
    await this.repository.delete(id, authenticatedUser);
  }
  
  async uploadImage(
    productId: string,
    imageBase64: string,
    contentType: string,
    filename: string,
    authenticatedUser: AuditTrailUser
  ): Promise<void> {
    // Validate product ID
    if (!productId || typeof productId !== 'string' || productId.trim().length === 0) {
      throw new Error('Valid product ID is required');
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      throw new Error('Invalid product ID format');
    }
    
    // Validate image data
    if (!imageBase64 || imageBase64.trim().length === 0) {
      throw new Error('Image data is required');
    }
    
    // Remove data URL prefix if present (data:image/png;base64,...)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // Convert Base64 to Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Validate content type
    const validContentTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validContentTypes.includes(contentType.toLowerCase())) {
      throw new Error(`Invalid content type. Must be one of: ${validContentTypes.join(', ')}`);
    }
    
    // Validate file size (max 5MB)
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (imageBuffer.length > maxSizeBytes) {
      throw new Error(`Image size exceeds maximum allowed size of 5MB`);
    }
    
    await this.repository.saveImage(productId, {
      imageData: imageBuffer,
      contentType,
      filename
    }, authenticatedUser);
  }
  
  async getProductPrice(id: string): Promise<{ id: string; price: number; currency: string } | null> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Valid product ID is required');
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid product ID format');
    }
    
    return await this.repository.findPriceById(id);
  }
  
  async getProductPrices(ids: string[]): Promise<{ id: string; price: number; currency: string }[]> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('Product IDs array is required');
    }
    
    if (ids.length > 100) {
      throw new Error('Maximum 100 product IDs allowed');
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const id of ids) {
      if (typeof id !== 'string' || !uuidRegex.test(id)) {
        throw new Error(`Invalid product ID format: ${id}`);
      }
    }
    
    return await this.repository.findPricesByIds(ids);
  }
  
  async getProductImage(id: string): Promise<{ data: Buffer; contentType: string; filename: string } | null> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return null; // Return null instead of throwing for invalid input
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return null; // Return null instead of throwing for invalid UUID format
    }
    
    return await this.repository.getImageWithMetadata(id);
  }
  
  private validateUpdateData(data: UpdateProductRequest): void {
    // Validate numeric fields if present
    if (data.weight !== undefined && data.weight <= 0) {
      throw new Error('Weight must be greater than 0');
    }
    
    if (data.purity !== undefined && (data.purity <= 0 || data.purity > 1)) {
      throw new Error('Purity must be between 0 and 1');
    }
    
    if (data.price !== undefined && data.price <= 0) {
      throw new Error('Price must be greater than 0');
    }
    
    if (data.year !== undefined && (data.year < 1800 || data.year > new Date().getFullYear() + 1)) {
      throw new Error('Year must be between 1800 and next year');
    }
    
    if (data.stockQuantity !== undefined && data.stockQuantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }
    
    if (data.minimumOrderQuantity !== undefined && data.minimumOrderQuantity <= 0) {
      throw new Error('Minimum order quantity must be greater than 0');
    }
    
    if (data.premiumPercentage !== undefined && data.premiumPercentage < 0) {
      throw new Error('Premium percentage cannot be negative');
    }
    
    // Validate currency if present
    if (data.currency) {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD'];
      if (!validCurrencies.includes(data.currency.toUpperCase())) {
        throw new Error(`Currency must be one of: ${validCurrencies.join(', ')}`);
      }
    }
    
    // Validate weight unit if present
    if (data.weightUnit) {
      const validWeightUnits = ['troy_ounces', 'grams', 'ounces', 'kilograms'];
      if (!validWeightUnits.includes(data.weightUnit)) {
        throw new Error(`Weight unit must be one of: ${validWeightUnits.join(', ')}`);
      }
    }
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
  
  async createProductById(data: CreateProductByIdRequest, authenticatedUser: AuditTrailUser): Promise<ProductManagementResponse> {
    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Product name is required');
    }
    
    if (!data.productTypeId || !data.metalId || !data.producerId) {
      throw new Error('productTypeId, metalId, and producerId are required');
    }
    
    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.productTypeId)) {
      throw new Error('Invalid productTypeId format');
    }
    if (!uuidRegex.test(data.metalId)) {
      throw new Error('Invalid metalId format');
    }
    if (!uuidRegex.test(data.producerId)) {
      throw new Error('Invalid producerId format');
    }
    if (data.countryId && !uuidRegex.test(data.countryId)) {
      throw new Error('Invalid countryId format');
    }
    
    // Validate reference IDs exist
    const validation = await this.repository.validateReferenceIds(
      data.metalId,
      data.productTypeId,
      data.producerId,
      data.countryId
    );
    
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    
    // Validate numeric fields
    if (data.weight <= 0) {
      throw new Error('Weight must be greater than 0');
    }
    if (data.purity < 0 || data.purity > 1) {
      throw new Error('Purity must be between 0 and 1');
    }
    if (data.price <= 0) {
      throw new Error('Price must be greater than 0');
    }
    
    return await this.repository.createById(data, authenticatedUser);
  }
  
  async updateProductById(id: string, data: UpdateProductByIdRequest, authenticatedUser: AuditTrailUser): Promise<ProductManagementResponse> {
    // Validate ID
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Valid product ID is required');
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid product ID format');
    }
    
    // Check if product exists
    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new Error('Product not found');
    }
    
    // Check if there are any fields to update
    const hasUpdates = Object.keys(data).some(key => data[key as keyof UpdateProductByIdRequest] !== undefined);
    if (!hasUpdates) {
      throw new Error('No fields to update');
    }
    
    // Validate UUID formats for reference IDs if provided
    if (data.productTypeId && !uuidRegex.test(data.productTypeId)) {
      throw new Error('Invalid productTypeId format');
    }
    if (data.metalId && !uuidRegex.test(data.metalId)) {
      throw new Error('Invalid metalId format');
    }
    if (data.producerId && !uuidRegex.test(data.producerId)) {
      throw new Error('Invalid producerId format');
    }
    if (data.countryId && !uuidRegex.test(data.countryId)) {
      throw new Error('Invalid countryId format');
    }
    
    // Validate reference IDs exist if provided
    if (data.metalId || data.productTypeId || data.producerId || data.countryId) {
      const validation = await this.repository.validateReferenceIds(
        data.metalId,
        data.productTypeId,
        data.producerId,
        data.countryId
      );
      
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }
    }
    
    // Validate numeric fields if provided
    if (data.weight !== undefined && data.weight <= 0) {
      throw new Error('Weight must be greater than 0');
    }
    if (data.purity !== undefined && (data.purity < 0 || data.purity > 1)) {
      throw new Error('Purity must be between 0 and 1');
    }
    if (data.price !== undefined && data.price <= 0) {
      throw new Error('Price must be greater than 0');
    }
    
    return await this.repository.updateById(id, data, authenticatedUser);
  }
}
