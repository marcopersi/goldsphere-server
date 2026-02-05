/**
 * LBMA Price Service Interface
 * 
 * Business logic layer for LBMA benchmark prices
 * Follows Interface Segregation Principle
 */

import type { 
  LbmaPrice, 
  PriceType, 
  PremiumConfig, 
  PriceWithPremium,
  LbmaQuery,
  PriceTypeCode
} from './types/MarketDataTypes';
import type { AuditTrailUser } from '../../utils/auditTrail';

export interface ILbmaPriceService {
  /**
   * Get all available price types
   */
  getPriceTypes(): Promise<PriceType[]>;

  /**
   * Get benchmark (LBMA) price types only
   */
  getBenchmarkPriceTypes(): Promise<PriceType[]>;

  /**
   * Get latest LBMA price for a metal
   * @param metalSymbol - Metal symbol (AU, AG, PT, PD)
   * @param priceTypeCode - Optional price type (LBMA_AM, LBMA_PM, etc.)
   */
  getLatestLbmaPrice(
    metalSymbol: string,
    priceTypeCode?: PriceTypeCode
  ): Promise<LbmaPrice | null>;

  /**
   * Get LBMA price for a specific date
   */
  getLbmaPriceByDate(
    metalSymbol: string,
    date: Date,
    priceTypeCode?: PriceTypeCode
  ): Promise<LbmaPrice | null>;

  /**
   * Get LBMA price history
   */
  getLbmaHistory(query: LbmaQuery): Promise<LbmaPrice[]>;

  /**
   * Get all today's LBMA fixings
   */
  getTodayFixings(): Promise<LbmaPrice[]>;

  /**
   * Fetch and store LBMA prices from external API
   * @param metalSymbol - Metal to fetch
   * @param date - Date to fetch (defaults to yesterday)
   */
  fetchAndStoreLbmaPrices(
    metalSymbol: string,
    date?: Date
  ): Promise<{ success: boolean; count: number; errors: string[] }>;

  /**
   * Fetch historical LBMA prices for a date range
   */
  fetchHistoricalLbmaPrices(
    metalSymbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ success: boolean; count: number; errors: string[] }>;

  /**
   * Calculate price with premium over LBMA benchmark
   */
  calculatePriceWithPremium(
    metalSymbol: string,
    quantityOz: number,
    currency?: string,
    basePriceTypeCode?: PriceTypeCode
  ): Promise<PriceWithPremium | null>;

  /**
   * Get active premium configurations
   */
  getPremiumConfigs(metalSymbol?: string): Promise<PremiumConfig[]>;

  /**
   * Create or update premium configuration
   */
  savePremiumConfig(config: Omit<PremiumConfig, 'id'>, authenticatedUser?: AuditTrailUser): Promise<string>;

  /**
   * Update existing premium config
   */
  updatePremiumConfig(id: string, config: Partial<PremiumConfig>, authenticatedUser?: AuditTrailUser): Promise<void>;

  /**
   * Compare LBMA price with current spot price
   */
  compareLbmaToSpot(
    metalSymbol: string,
    currency?: string
  ): Promise<{
    lbmaPrice: number;
    spotPrice: number;
    difference: number;
    differencePercent: number;
    lbmaDate: Date;
    spotTimestamp: Date;
  } | null>;
}
