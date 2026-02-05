/**
 * Market Data Types
 * Strongly typed definitions for precious metal market data
 * 
 * Following Clean Architecture principles:
 * - All domain types in one place
 * - No dependencies on infrastructure
 * - Immutable data structures where possible
 */

export interface MarketDataProvider {
  readonly id: string;
  readonly name: string;
  readonly apiKeyEnvVar: string;
  readonly baseUrl: string;
  readonly isActive: boolean;
  readonly rateLimitPerMinute: number;
  readonly priority: number;
  readonly lastSuccess?: Date;
  readonly lastFailure?: Date;
  readonly failureCount: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
  readonly createdBy?: string;
  readonly updatedBy?: string;
}

export interface MarketPrice {
  readonly id: string;
  readonly metalId: string;
  readonly metalSymbol?: string;
  readonly metalName?: string;
  readonly providerId: string;
  readonly providerName?: string;
  readonly pricePerTroyOz: number;
  readonly currency: string;
  readonly bid?: number;
  readonly ask?: number;
  readonly high24h?: number;
  readonly low24h?: number;
  readonly change24h?: number;
  readonly changePercent24h?: number;
  readonly timestamp: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export interface PriceHistory {
  readonly id: string;
  readonly metalId: string;
  readonly metalSymbol?: string;
  readonly providerId: string;
  readonly pricePerTroyOz: number;
  readonly currency: string;
  readonly bid?: number;
  readonly ask?: number;
  readonly high?: number;
  readonly low?: number;
  readonly open?: number;
  readonly close?: number;
  readonly volume?: number;
  readonly timestamp: Date;
  readonly createdAt?: Date;
}

export interface MarketDataCache {
  readonly id: string;
  readonly cacheKey: string;
  readonly data: Record<string, unknown>;
  readonly expiresAt: Date;
  readonly createdAt?: Date;
}

export interface ProviderApiResponse {
  readonly success: boolean;
  readonly rates?: Record<string, number>;
  readonly base?: string;
  readonly timestamp?: number;
  readonly error?: string;
}

export interface MarketDataQuery {
  readonly metalSymbol?: string;
  readonly metalId?: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly currency?: string;
  readonly limit?: number;
}

export interface PriceUpdateResult {
  success: boolean;
  provider: string;
  updatedMetals: string[];
  errors: string[];
  readonly timestamp: Date;
}

export interface MetalPrice {
  readonly symbol: string;
  readonly price: number;
  readonly currency: string;
  readonly bid?: number;
  readonly ask?: number;
  readonly timestamp: Date;
}

export interface PriceData {
  readonly metalId: string;
  readonly providerId: string;
  readonly price: number;
  readonly currency: string;
  readonly metadata?: {
    readonly bid?: number;
    readonly ask?: number;
    readonly high?: number;
    readonly low?: number;
  };
}

/**
 * Price Type Definition
 * Represents different pricing methodologies (LBMA, Spot, Realtime)
 */
export interface PriceType {
  readonly id: string;
  readonly code: PriceTypeCode;
  readonly name: string;
  readonly description?: string;
  readonly isBenchmark: boolean;
  readonly updateFrequencyMinutes?: number;
}

/**
 * Supported Price Type Codes
 */
export const PRICE_TYPE_CODES = [
  'LBMA_AM',
  'LBMA_PM', 
  'LBMA_SILVER',
  'LBMA_PLATINUM_AM',
  'LBMA_PLATINUM_PM',
  'LBMA_PALLADIUM_AM',
  'LBMA_PALLADIUM_PM',
  'SPOT',
  'REALTIME',
  'BID',
  'ASK'
] as const;
export type PriceTypeCode = typeof PRICE_TYPE_CODES[number];

/**
 * LBMA Fixing Price
 * Official benchmark prices from London Bullion Market Association
 */
export interface LbmaPrice {
  readonly id: string;
  readonly metalId: string;
  readonly metalSymbol?: string;
  readonly metalName?: string;
  readonly priceTypeId: string;
  readonly priceTypeCode?: PriceTypeCode;
  readonly fixingDate: Date;
  readonly fixingTime: string;
  readonly priceUsd: number;
  readonly priceGbp?: number;
  readonly priceEur?: number;
  readonly priceChf?: number;
  readonly participants?: number;
  readonly source: string;
  readonly createdAt?: Date;
}

/**
 * Premium Configuration
 * Defines markup over benchmark prices
 */
export interface PremiumConfig {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly metalId?: string;
  readonly metalSymbol?: string;
  readonly basePriceTypeId?: string;
  readonly premiumPercent?: number;
  readonly premiumFixedAmount?: number;
  readonly currency: string;
  readonly minQuantityOz?: number;
  readonly maxQuantityOz?: number;
  readonly validFrom: Date;
  readonly validTo?: Date;
  readonly isActive: boolean;
}

/**
 * Price with Premium Calculation Result
 */
export interface PriceWithPremium {
  readonly metalSymbol: string;
  readonly basePrice: number;
  readonly basePriceType: PriceTypeCode;
  readonly premiumPercent?: number;
  readonly premiumFixed?: number;
  readonly finalPrice: number;
  readonly currency: string;
  readonly timestamp: Date;
}

/**
 * LBMA Query Parameters
 */
export interface LbmaQuery {
  readonly metalSymbol?: string;
  readonly priceTypeCode?: PriceTypeCode;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly currency?: string;
  readonly limit?: number;
}

/**
 * LBMA API Response from Metals-API
 */
export interface LbmaApiResponse {
  readonly success: boolean;
  readonly timestamp?: number;
  readonly base?: string;
  readonly date?: string;
  readonly rates?: Record<string, number>;
  readonly unit?: string;
  readonly error?: {
    readonly code: number;
    readonly info: string;
  };
}

/**
 * Supported precious metals (chemical symbols)
 */
export const SUPPORTED_METALS = ['AU', 'AG', 'PT', 'PD'] as const;
export type SupportedMetal = typeof SUPPORTED_METALS[number];

/**
 * LBMA Symbol Mapping
 * Maps our metal symbols to Metals-API LBMA symbols
 */
export const LBMA_SYMBOL_MAP: Record<SupportedMetal, { am?: string; pm?: string; single?: string }> = {
  AU: { am: 'LBXAUAM', pm: 'LBXAUPM' },
  AG: { single: 'LBXAG' },
  PT: { am: 'LBXPTAM', pm: 'LBXPTPM' },
  PD: { am: 'LBXPDAM', pm: 'LBXPDPM' }
};

/**
 * LBMA Fixing Times (London Time)
 */
export const LBMA_FIXING_TIMES = {
  GOLD_AM: '10:30',
  GOLD_PM: '15:00',
  SILVER: '12:00',
  PLATINUM_AM: '09:45',
  PLATINUM_PM: '14:00',
  PALLADIUM_AM: '09:45',
  PALLADIUM_PM: '14:00'
} as const;

/**
 * Supported currencies
 */
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'CHF', 'GBP'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

/**
 * Cache configuration
 */
export const CACHE_DURATION_MINUTES = 5;
export const CACHE_CLEANUP_INTERVAL_HOURS = 1;
export const LBMA_CACHE_DURATION_MINUTES = 60; // LBMA prices change once/twice daily
