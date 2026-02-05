/**
 * Reference Row Mappers
 * 
 * Transform database rows to typed response objects
 */

import { MetalResponse, ProductTypeResponse, ProducerResponse } from '../types/ReferenceTypes';

/**
 * Map metal database row to MetalResponse
 */
export function mapMetalRow(row: Record<string, unknown>): MetalResponse {
  return {
    id: row.id as string,
    name: row.name as string,
    symbol: row.symbol as string,
    createdAt: row.createdat as Date,
    updatedAt: row.updatedat as Date,
  };
}

/**
 * Map product type database row to ProductTypeResponse
 */
export function mapProductTypeRow(row: Record<string, unknown>): ProductTypeResponse {
  return {
    id: row.id as string,
    name: row.producttypename as string,
    createdAt: row.createdat as Date,
    updatedAt: row.updatedat as Date,
  };
}

/**
 * Map producer database row to ProducerResponse
 */
export function mapProducerRow(row: Record<string, unknown>): ProducerResponse {
  return {
    id: row.id as string,
    name: row.producername as string,
    country: row.country as string | undefined,
    websiteUrl: row.websiteurl as string | undefined,
    createdAt: row.createdat as Date,
    updatedAt: row.updatedat as Date,
  };
}
