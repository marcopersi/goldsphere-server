/**
 * Reference Repository Implementation
 * 
 * Handles database operations for reference data using Dependency Injection
 * Refactored to use generic query builder - eliminates code duplication
 */

import { Pool } from 'pg';
import { IReferenceRepository } from './IReferenceRepository';
import {
  MetalResponse,
  MetalListOptions,
  MetalListResponse,
  ProductTypeResponse,
  ProductTypeListOptions,
  ProductTypeListResponse,
  ProducerResponse,
  ProducerListOptions,
  ProducerListResponse,
} from '../types/ReferenceTypes';
import { TABLE_CONFIGS, queryPaginated, findById, findMetalBySymbol } from './ReferenceQueryBuilder';
import { mapMetalRow, mapProductTypeRow, mapProducerRow } from './ReferenceMappers';

export class ReferenceRepositoryImpl implements IReferenceRepository {
  constructor(private readonly pool: Pool) {}

  // ============================================================================
  // Metals
  // ============================================================================

  async findAllMetals(options?: MetalListOptions): Promise<MetalListResponse> {
    return queryPaginated(this.pool, TABLE_CONFIGS.metal, options || {}, mapMetalRow);
  }

  async findMetalById(id: string): Promise<MetalResponse | null> {
    return findById(this.pool, TABLE_CONFIGS.metal, id, mapMetalRow);
  }

  async findMetalBySymbol(symbol: string): Promise<MetalResponse | null> {
    return findMetalBySymbol(this.pool, symbol, mapMetalRow);
  }

  // ============================================================================
  // Product Types
  // ============================================================================

  async findAllProductTypes(options?: ProductTypeListOptions): Promise<ProductTypeListResponse> {
    return queryPaginated(this.pool, TABLE_CONFIGS.productType, options || {}, mapProductTypeRow);
  }

  async findProductTypeById(id: string): Promise<ProductTypeResponse | null> {
    return findById(this.pool, TABLE_CONFIGS.productType, id, mapProductTypeRow);
  }

  // ============================================================================
  // Producers
  // ============================================================================

  async findAllProducers(options?: ProducerListOptions): Promise<ProducerListResponse> {
    return queryPaginated(this.pool, TABLE_CONFIGS.producer, options || {}, mapProducerRow);
  }

  async findProducerById(id: string): Promise<ProducerResponse | null> {
    return findById(this.pool, TABLE_CONFIGS.producer, id, mapProducerRow);
  }
}

