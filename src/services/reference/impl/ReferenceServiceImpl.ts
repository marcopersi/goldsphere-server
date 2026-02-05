/**
 * Reference Service Implementation
 * 
 * Handles business logic for reference data operations with DI
 */

import { IReferenceService } from '../IReferenceService';
import { IReferenceRepository } from '../repository/IReferenceRepository';
import {
  MetalResponse,
  MetalListOptions,
  MetalListResponse,
  ProductTypeResponse,
  ProductTypeListOptions,
  ProductTypeListResponse,
  ProducerResponse,
  ProducerListOptions,
  ProducerListResponse
} from '../types/ReferenceTypes';

export class ReferenceServiceImpl implements IReferenceService {
  constructor(private readonly repository: IReferenceRepository) {}

  // ============================================================================
  // Metals
  // ============================================================================

  async listMetals(options?: MetalListOptions): Promise<MetalListResponse> {
    // Validate pagination parameters
    if (options?.page && options.page < 1) {
      throw new Error('Page number must be greater than 0');
    }
    if (options?.limit && (options.limit < 1 || options.limit > 100)) {
      throw new Error('Limit must be between 1 and 100');
    }

    return await this.repository.findAllMetals(options);
  }

  async getMetalById(id: string): Promise<MetalResponse> {
    if (!id || id.trim() === '') {
      throw new Error('Metal ID is required');
    }

    const metal = await this.repository.findMetalById(id);
    
    if (!metal) {
      throw new Error(`Metal with ID ${id} not found`);
    }

    return metal;
  }

  async getMetalBySymbol(symbol: string): Promise<MetalResponse | null> {
    if (!symbol || symbol.trim() === '') {
      return null;
    }
    return this.repository.findMetalBySymbol(symbol.trim().toUpperCase());
  }

  // ============================================================================
  // Product Types
  // ============================================================================

  async listProductTypes(options?: ProductTypeListOptions): Promise<ProductTypeListResponse> {
    // Validate pagination parameters
    if (options?.page && options.page < 1) {
      throw new Error('Page number must be greater than 0');
    }
    if (options?.limit && (options.limit < 1 || options.limit > 100)) {
      throw new Error('Limit must be between 1 and 100');
    }

    return await this.repository.findAllProductTypes(options);
  }

  async getProductTypeById(id: string): Promise<ProductTypeResponse> {
    if (!id || id.trim() === '') {
      throw new Error('Product Type ID is required');
    }

    const productType = await this.repository.findProductTypeById(id);
    
    if (!productType) {
      throw new Error(`Product Type with ID ${id} not found`);
    }

    return productType;
  }

  // ============================================================================
  // Producers
  // ============================================================================

  async listProducers(options?: ProducerListOptions): Promise<ProducerListResponse> {
    // Validate pagination parameters
    if (options?.page && options.page < 1) {
      throw new Error('Page number must be greater than 0');
    }
    if (options?.limit && (options.limit < 1 || options.limit > 100)) {
      throw new Error('Limit must be between 1 and 100');
    }

    return await this.repository.findAllProducers(options);
  }

  async getProducerById(id: string): Promise<ProducerResponse> {
    if (!id || id.trim() === '') {
      throw new Error('Producer ID is required');
    }

    const producer = await this.repository.findProducerById(id);
    
    if (!producer) {
      throw new Error(`Producer with ID ${id} not found`);
    }

    return producer;
  }
}
