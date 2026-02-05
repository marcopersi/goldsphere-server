/**
 * Reference Service Module
 * 
 * Barrel export (Facade Pattern) for clean module access
 * Central export point for all Reference domain types and services
 */

// ============================================================================
// Service Interface
// ============================================================================
export { IReferenceService } from './IReferenceService';

// ============================================================================
// Repository Interface
// ============================================================================
export { IReferenceRepository } from './repository/IReferenceRepository';

// ============================================================================
// Types
// ============================================================================
export type {
  MetalResponse,
  MetalListOptions,
  MetalListResponse,
  ProductTypeResponse,
  ProductTypeListOptions,
  ProductTypeListResponse,
  ProducerResponse,
  ProducerListOptions,
  ProducerListResponse,
  AllReferenceDataResponse
} from './types/ReferenceTypes';

// ============================================================================
// Factory (Primary entry point)
// ============================================================================
export { ReferenceServiceFactory } from './ReferenceServiceFactory';

// ============================================================================
// Implementations (for advanced usage or direct instantiation)
// ============================================================================
export { ReferenceServiceImpl } from './impl/ReferenceServiceImpl';
export { ReferenceRepositoryImpl } from './repository/ReferenceRepositoryImpl';
