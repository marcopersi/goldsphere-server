/**
 * Reference Service Interface
 * 
 * Business logic layer for reference data operations
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
} from './types/ReferenceTypes';

export interface IReferenceService {
  // Metals
  listMetals(options?: MetalListOptions): Promise<MetalListResponse>;
  getMetalById(id: string): Promise<MetalResponse>;
  getMetalBySymbol(symbol: string): Promise<MetalResponse | null>;
  
  // Product Types
  listProductTypes(options?: ProductTypeListOptions): Promise<ProductTypeListResponse>;
  getProductTypeById(id: string): Promise<ProductTypeResponse>;
  
  // Producers
  listProducers(options?: ProducerListOptions): Promise<ProducerListResponse>;
  getProducerById(id: string): Promise<ProducerResponse>;
}
