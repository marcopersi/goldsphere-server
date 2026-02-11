/**
 * Product Repository Mock Implementation
 * 
 * In-memory implementation for testing without database dependency
 */

import { Metal, ProductTypeEnum } from '@marcopersi/shared';
import { IProductRepository } from '../repository/IProductRepository';
import { CreateProductRequest, UpdateProductRequest, ProductManagementResponse, ProductLookupIds, ProductImageUpload, ProductListOptions, ProductListResponse, CreateProductByIdRequest, UpdateProductByIdRequest } from '../types/ProductTypes';
import type { AuditTrailUser } from '../../../utils/auditTrail';

export class ProductRepositoryMock implements IProductRepository {
  private products: Map<string, ProductManagementResponse> = new Map();
  private lookupData: Map<string, ProductLookupIds> = new Map();
  private imageData: Map<string, Buffer> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Initialize lookup data
    this.lookupData.set('Coin-Gold-Swiss Mint-Switzerland', {
      productTypeId: 'pt-001',
      metalId: 'm-001',
      producerId: 'pr-001',
      countryId: 'c-001',
    });

    this.lookupData.set('Bar-Gold-PAMP-Switzerland', {
      productTypeId: 'pt-002',
      metalId: 'm-001',
      producerId: 'pr-002',
      countryId: 'c-001',
    });

    this.lookupData.set('Coin-Silver-Austrian Mint-Austria', {
      productTypeId: 'pt-001',
      metalId: 'm-002',
      producerId: 'pr-003',
      countryId: 'c-002',
    });

    // Initialize products
    const product1: ProductManagementResponse = {
      id: '189b0a40-1a95-4243-961e-8db20135f624',
      name: 'Swiss Vreneli 20 Francs Gold Coin',
      productType: ProductTypeEnum.COIN,
      productTypeId: 'pt-001',
      metal: Metal.GOLD,
      metalId: 'm-001',
      weight: 0.1867,
      weightUnit: 'troy_ounces',
      purity: 0.9,
      price: 450.0,
      currency: 'CHF',
      producer: 'Swiss Mint',
      producerId: 'pr-001',
      country: 'Switzerland',
      countryId: 'c-001',
      year: 1935,
      description: 'Historic Swiss gold coin',
      certifiedProvenance: true,
      imageUrl: 'https://example.com/vreneli.jpg',
      imageFilename: 'vreneli.jpg',
      inStock: true,
      stockQuantity: 50,
      minimumOrderQuantity: 1,
      premiumPercentage: 5.0,
      diameter: 21.0,
      thickness: 1.4,
      mintage: null,
      certification: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const product2: ProductManagementResponse = {
      id: '2a543760-8b8c-443b-8929-fc98a9be00f1',
      name: 'PAMP Suisse 1oz Gold Bar',
      productType: ProductTypeEnum.BAR,
      productTypeId: 'pt-002',
      metal: Metal.GOLD,
      metalId: 'm-001',
      weight: 1.0,
      weightUnit: 'troy_ounces',
      purity: 0.9999,
      price: 2100.0,
      currency: 'USD',
      producer: 'PAMP',
      producerId: 'pr-002',
      country: 'Switzerland',
      countryId: 'c-001',
      year: 2024,
      description: 'Premium gold bar with certificate',
      certifiedProvenance: true,
      imageUrl: 'https://example.com/pamp.jpg',
      imageFilename: 'pamp.jpg',
      inStock: true,
      stockQuantity: 25,
      minimumOrderQuantity: 1,
      premiumPercentage: 3.0,
      diameter: null,
      thickness: null,
      mintage: null,
      certification: 'LBMA',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const product3: ProductManagementResponse = {
      id: '270e0998-a9fc-4489-9ea3-9a598dcd0ca1',
      name: 'Austrian Philharmonic 1oz Silver Coin',
      productType: ProductTypeEnum.COIN,
      productTypeId: 'pt-001',
      metal: Metal.SILVER,
      metalId: 'm-002',
      weight: 1.0,
      weightUnit: 'troy_ounces',
      purity: 0.999,
      price: 32.0,
      currency: 'EUR',
      producer: 'Austrian Mint',
      producerId: 'pr-003',
      country: 'Austria',
      countryId: 'c-002',
      year: 2024,
      description: 'Popular silver bullion coin',
      certifiedProvenance: false,
      imageUrl: 'https://example.com/philharmonic.jpg',
      imageFilename: 'philharmonic.jpg',
      inStock: true,
      stockQuantity: 100,
      minimumOrderQuantity: 1,
      premiumPercentage: 8.0,
      diameter: 37.0,
      thickness: 3.2,
      mintage: null,
      certification: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    this.products.set(product1.id, product1);
    this.products.set(product2.id, product2);
    this.products.set(product3.id, product3);
  }

  async findLookupIds(
    productType: string,
    metal: string,
    producer: string,
    country?: string
  ): Promise<ProductLookupIds | null> {
    const key = country
      ? `${productType}-${metal}-${producer}-${country}`
      : `${productType}-${metal}-${producer}`;

    return this.lookupData.get(key) || null;
  }

  async create(data: CreateProductRequest, _authenticatedUser: AuditTrailUser): Promise<ProductManagementResponse> {
    const lookupIds = await this.findLookupIds(data.productType, data.metal, data.producer, data.country);

    if (!lookupIds) {
      throw new Error('Failed to resolve product references');
    }

    const id = `prod-${Date.now()}`;
    const now = new Date();

    // Convert strings to Enums
    const productType = ProductTypeEnum.fromName(data.productType);
    const metal = Metal.fromName(data.metal);
    
    if (!productType) {
      throw new Error(`Invalid product type: ${data.productType}`);
    }
    
    if (!metal) {
      throw new Error(`Invalid metal: ${data.metal}`);
    }

    const product: ProductManagementResponse = {
      id,
      name: data.name,
      productType,
      productTypeId: lookupIds.productTypeId,
      metal,
      metalId: lookupIds.metalId,
      weight: data.weight,
      weightUnit: data.weightUnit,
      purity: data.purity,
      price: data.price,
      currency: data.currency,
      producer: data.producer,
      producerId: lookupIds.producerId,
      country: data.country || null,
      countryId: lookupIds.countryId || null,
      year: data.year || null,
      description: data.description || null,
      certifiedProvenance: false,
      imageUrl: data.imageUrl || null,
      imageFilename: data.imageFilename || null,
      inStock: data.inStock !== false,
      stockQuantity: data.stockQuantity || 0,
      minimumOrderQuantity: data.minimumOrderQuantity || 1,
      premiumPercentage: data.premiumPercentage || null,
      diameter: null,
      thickness: null,
      mintage: null,
      certification: null,
      createdAt: now,
      updatedAt: now,
    };

    this.products.set(id, product);
    return product;
  }

  async findById(id: string): Promise<ProductManagementResponse | null> {
    return this.products.get(id) || null;
  }
  
  async findAll(options?: ProductListOptions): Promise<ProductListResponse> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    const filter = options?.filter || {};
    
    let filteredProducts = Array.from(this.products.values());
    
    // Apply filters
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filteredProducts = filteredProducts.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        (p.description?.toLowerCase() || '').includes(searchLower)
      );
    }
    
    if (filter.metalId) {
      // In mock, we use metal name, so filter by name
      filteredProducts = filteredProducts.filter(p => p.metal.name === filter.metalId);
    }
    
    if (filter.productTypeId) {
      filteredProducts = filteredProducts.filter(p => p.productType.name === filter.productTypeId);
    }
    
    if (filter.producerId) {
      filteredProducts = filteredProducts.filter(p => p.producer === filter.producerId);
    }
    
    if (filter.inStock !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.inStock === filter.inStock);
    }
    
    if (filter.minPrice !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.price >= filter.minPrice!);
    }
    
    if (filter.maxPrice !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.price <= filter.maxPrice!);
    }
    
    // Sort
    filteredProducts.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        case 'createdAt':
        default:
          aVal = a.createdAt.getTime();
          bVal = b.createdAt.getTime();
          break;
      }
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    // Paginate
    const total = filteredProducts.length;
    const offset = (page - 1) * limit;
    const paginatedProducts = filteredProducts.slice(offset, offset + limit);
    const totalPages = Math.ceil(total / limit);
    
    return {
      items: paginatedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    };
  }

  async update(id: string, data: UpdateProductRequest, _authenticatedUser: AuditTrailUser): Promise<ProductManagementResponse> {
    const product = this.products.get(id);
    if (!product) {
      throw new Error(`Product not found: ${id}`);
    }

    // Convert strings to Enums if provided
    const updateData: Partial<ProductManagementResponse> = {
      ...data,
      productType: data.productType ? ProductTypeEnum.fromName(data.productType) : product.productType,
      metal: data.metal ? Metal.fromName(data.metal) : product.metal,
    };

    // Validate Enum conversions
    if (data.productType && !updateData.productType) {
      throw new Error(`Invalid product type: ${data.productType}`);
    }
    if (data.metal && !updateData.metal) {
      throw new Error(`Invalid metal: ${data.metal}`);
    }

    const updated: ProductManagementResponse = {
      ...product,
      ...updateData,
      id: product.id, // Never update ID
      createdAt: product.createdAt, // Never update creation date
      updatedAt: new Date()
    };

    this.products.set(id, updated);
    return updated;
  }

  async delete(id: string, _authenticatedUser: AuditTrailUser): Promise<void> {
    if (!this.products.has(id)) {
      throw new Error(`Product not found: ${id}`);
    }
    this.products.delete(id);
    this.imageData.delete(id);
  }

  async saveImage(productId: string, image: ProductImageUpload, _authenticatedUser: AuditTrailUser): Promise<void> {
    if (!this.products.has(productId)) {
      throw new Error(`Product not found: ${productId}`);
    }
    this.imageData.set(productId, image.imageData);
  }

  async getImage(productId: string): Promise<Buffer | null> {
    return this.imageData.get(productId) || null;
  }

  async getImageWithMetadata(productId: string): Promise<{ data: Buffer; contentType: string; filename: string } | null> {
    const imageBuffer = this.imageData.get(productId);
    if (!imageBuffer) {
      return null;
    }
    
    const product = this.products.get(productId);
    return {
      data: imageBuffer,
      contentType: 'image/jpeg',
      filename: product?.imageFilename || 'product-image.jpg'
    };
  }

  async findPriceById(id: string): Promise<{ id: string; price: number; currency: string } | null> {
    const product = this.products.get(id);
    if (!product) {
      return null;
    }
    
    return {
      id: product.id,
      price: product.price,
      currency: product.currency
    };
  }

  async findPricesByIds(ids: string[]): Promise<{ id: string; price: number; currency: string }[]> {
    const prices: { id: string; price: number; currency: string }[] = [];
    
    for (const id of ids) {
      const product = this.products.get(id);
      if (product) {
        prices.push({
          id: product.id,
          price: product.price,
          currency: product.currency
        });
      }
    }
    
    return prices;
  }

  async exists(id: string): Promise<boolean> {
    return this.products.has(id);
  }
  
  async hasOrders(_productId: string): Promise<boolean> {
    // Mock always returns false - no orders in test data
    return false;
  }
  
  async validateReferenceIds(
    _metalId?: string,
    _productTypeId?: string,
    _producerId?: string,
    _countryId?: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    // Mock always returns valid - no real database to check
    return { valid: true, errors: [] };
  }
  
  async createById(data: CreateProductByIdRequest, _authenticatedUser: AuditTrailUser): Promise<ProductManagementResponse> {
    const id = `prod-${Date.now()}`;
    const now = new Date();
    
    // Mock product type and metal based on IDs
    const productType = ProductTypeEnum.COIN;
    const metal = Metal.GOLD;
    
    const product: ProductManagementResponse = {
      id,
      name: data.name,
      productType,
      productTypeId: data.productTypeId,
      metal,
      metalId: data.metalId,
      weight: data.weight,
      weightUnit: data.weightUnit,
      purity: data.purity,
      price: data.price,
      currency: data.currency,
      producer: 'Mock Producer',
      producerId: data.producerId,
      country: null,
      countryId: data.countryId || null,
      year: data.year || null,
      description: data.description || null,
      certifiedProvenance: false,
      imageUrl: null,
      imageFilename: data.imageFilename || null,
      inStock: data.inStock !== false,
      stockQuantity: data.stockQuantity || 0,
      minimumOrderQuantity: data.minimumOrderQuantity || 1,
      premiumPercentage: data.premiumPercentage || null,
      diameter: null,
      thickness: null,
      mintage: null,
      certification: null,
      createdAt: now,
      updatedAt: now,
    };
    
    this.products.set(id, product);
    return product;
  }
  
  async updateById(id: string, data: UpdateProductByIdRequest, _authenticatedUser: AuditTrailUser): Promise<ProductManagementResponse> {
    const product = this.products.get(id);
    if (!product) {
      throw new Error(`Product not found: ${id}`);
    }
    
    const updated: ProductManagementResponse = {
      ...product,
      name: data.name ?? product.name,
      weight: data.weight ?? product.weight,
      weightUnit: data.weightUnit ?? product.weightUnit,
      purity: data.purity ?? product.purity,
      price: data.price ?? product.price,
      currency: data.currency ?? product.currency,
      year: data.year ?? product.year,
      description: data.description ?? product.description,
      imageFilename: data.imageFilename ?? product.imageFilename,
      inStock: data.inStock ?? product.inStock,
      stockQuantity: data.stockQuantity ?? product.stockQuantity,
      minimumOrderQuantity: data.minimumOrderQuantity ?? product.minimumOrderQuantity,
      premiumPercentage: data.premiumPercentage ?? product.premiumPercentage,
      updatedAt: new Date()
    };
    
    this.products.set(id, updated);
    return updated;
  }
  
  // Test helper methods (not part of interface)
  clear(): void {
    this.products.clear();
    this.lookupData.clear();
  }

  getAllProducts(): ProductManagementResponse[] {
    return Array.from(this.products.values());
  }

  reset(): void {
    this.clear();
    this.initializeMockData();
  }
}
