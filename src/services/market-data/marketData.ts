/**
 * Market Data Types
 * Type definitions for precious metal market data
 */

export interface MarketDataProvider {
  id: string;
  name: string;
  api_key_env_var: string;
  base_url: string;
  is_active: boolean;
  rate_limit_per_minute: number;
  priority: number;
  last_success?: Date;
  last_failure?: Date;
  failure_count: number;
  createdat?: Date;
  updatedat?: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface MarketPrice {
  id: string;
  metal_id: string;
  metal_symbol?: string;
  metal_name?: string;
  provider_id: string;
  provider_name?: string;
  price_per_troy_oz: number;
  currency: string;
  bid?: number;
  ask?: number;
  high_24h?: number;
  low_24h?: number;
  change_24h?: number;
  change_percent_24h?: number;
  timestamp: Date;
  createdat?: Date;
  updatedat?: Date;
}

export interface PriceHistory {
  id: string;
  metal_id: string;
  metal_symbol?: string;
  provider_id: string;
  price_per_troy_oz: number;
  currency: string;
  bid?: number;
  ask?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
  volume?: number;
  timestamp: Date;
  createdat?: Date;
}

export interface MarketDataCache {
  id: string;
  cache_key: string;
  data: Record<string, unknown>;
  expires_at: Date;
  createdat?: Date;
}

export interface ProviderApiResponse {
  success: boolean;
  rates?: Record<string, number>;
  base?: string;
  timestamp?: number;
  error?: string;
}

export interface MarketDataQuery {
  metalSymbol?: string;
  metalId?: string;
  startDate?: Date;
  endDate?: Date;
  currency?: string;
  limit?: number;
}

export interface PriceUpdateResult {
  success: boolean;
  provider: string;
  updatedMetals: string[];
  errors: string[];
  timestamp: Date;
}
