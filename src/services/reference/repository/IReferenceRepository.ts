/**
 * Reference Repository Interface
 * 
 * Defines contract for reference data access operations
 */

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

export interface IReferenceRepository {
  // Metals
  findAllMetals(options?: MetalListOptions): Promise<MetalListResponse>;
  findMetalById(id: string): Promise<MetalResponse | null>;
  findMetalBySymbol(symbol: string): Promise<MetalResponse | null>;
  
  // Product Types
  findAllProductTypes(options?: ProductTypeListOptions): Promise<ProductTypeListResponse>;
  findProductTypeById(id: string): Promise<ProductTypeResponse | null>;
  
  // Producers
  findAllProducers(options?: ProducerListOptions): Promise<ProducerListResponse>;
  findProducerById(id: string): Promise<ProducerResponse | null>;
}
