/**
 * External Mapping Service Interface
 * 
 * Maps raw external payloads to internal structures.
 */

import { ExternalMappingResult, ExternalMappingRule } from "./types/ExternalTypes";

export interface IExternalMappingService {
  mapExternalOrder(raw: Record<string, unknown>, rules: ExternalMappingRule[]): ExternalMappingResult;
  mapExternalProduct(raw: Record<string, unknown>, rules: ExternalMappingRule[]): ExternalMappingResult;
}
