/**
 * LBMA Price Mappers
 * 
 * Maps database rows to domain types for LBMA prices
 */

import type { 
  LbmaPrice, 
  PriceType, 
  PremiumConfig,
  PriceTypeCode 
} from '../types/MarketDataTypes';

/**
 * Raw database row types for LBMA price queries
 */
export interface LbmaPriceRow {
  id: string;
  metal_id: string;
  metal_symbol: string;
  metal_name: string;
  price_type_id: string;
  price_type_code: string;
  fixing_date: Date;
  fixing_time: string;
  price_usd: number;
  price_gbp: number | null;
  price_eur: number | null;
  price_chf: number | null;
  participants: number | null;
  source: string;
  createdat: Date;
}

export interface PriceTypeRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_benchmark: boolean;
  update_frequency_minutes: number | null;
}

export interface PremiumConfigRow {
  id: string;
  name: string;
  description: string | null;
  metal_id: string | null;
  metal_symbol: string | null;
  base_price_type_id: string | null;
  premium_percent: string | null;
  premium_fixed_amount: string | null;
  currency: string;
  min_quantity_oz: string | null;
  max_quantity_oz: string | null;
  valid_from: Date;
  valid_to: Date | null;
  is_active: boolean;
}

/**
 * Map database row to LbmaPrice domain type
 */
export function mapToLbmaPrice(row: LbmaPriceRow): LbmaPrice {
  return {
    id: row.id,
    metalId: row.metal_id,
    metalSymbol: row.metal_symbol,
    metalName: row.metal_name,
    priceTypeId: row.price_type_id,
    priceTypeCode: row.price_type_code as PriceTypeCode,
    fixingDate: row.fixing_date,
    fixingTime: row.fixing_time,
    priceUsd: parseFloat(String(row.price_usd)),
    priceGbp: row.price_gbp ? parseFloat(String(row.price_gbp)) : undefined,
    priceEur: row.price_eur ? parseFloat(String(row.price_eur)) : undefined,
    priceChf: row.price_chf ? parseFloat(String(row.price_chf)) : undefined,
    participants: row.participants ?? undefined,
    source: row.source,
    createdAt: row.createdat
  };
}

/**
 * Map database row to PriceType domain type
 */
export function mapToPriceType(row: PriceTypeRow): PriceType {
  return {
    id: row.id,
    code: row.code as PriceTypeCode,
    name: row.name,
    description: row.description ?? undefined,
    isBenchmark: row.is_benchmark,
    updateFrequencyMinutes: row.update_frequency_minutes ?? undefined
  };
}

/**
 * Map database row to PremiumConfig domain type
 */
export function mapToPremiumConfig(row: PremiumConfigRow): PremiumConfig {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    metalId: row.metal_id ?? undefined,
    metalSymbol: row.metal_symbol ?? undefined,
    basePriceTypeId: row.base_price_type_id ?? undefined,
    premiumPercent: row.premium_percent ? parseFloat(row.premium_percent) : undefined,
    premiumFixedAmount: row.premium_fixed_amount ? parseFloat(row.premium_fixed_amount) : undefined,
    currency: row.currency,
    minQuantityOz: row.min_quantity_oz ? parseFloat(row.min_quantity_oz) : undefined,
    maxQuantityOz: row.max_quantity_oz ? parseFloat(row.max_quantity_oz) : undefined,
    validFrom: row.valid_from,
    validTo: row.valid_to ?? undefined,
    isActive: row.is_active
  };
}
