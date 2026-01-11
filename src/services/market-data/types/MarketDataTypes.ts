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
 * Supported precious metals (chemical symbols)
 */
export const SUPPORTED_METALS = ['AU', 'AG', 'PT', 'PD'] as const;
export type SupportedMetal = typeof SUPPORTED_METALS[number];

/**
 * Supported currencies
 */
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'CHF'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

/**
 * Cache configuration
 */
export const CACHE_DURATION_MINUTES = 5;
export const CACHE_CLEANUP_INTERVAL_HOURS = 1;
