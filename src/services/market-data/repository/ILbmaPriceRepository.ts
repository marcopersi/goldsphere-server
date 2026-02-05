/**
 * LBMA Price Repository Interface
 * 
 * Data Access Layer for LBMA benchmark prices
 * Follows Repository Pattern and Dependency Inversion Principle
 */

import type { 
  LbmaPrice, 
  PriceType, 
  PremiumConfig,
  PriceWithPremium,
  LbmaQuery,
  PriceTypeCode
} from '../types/MarketDataTypes';
import type { AuditTrailUser } from '../../../utils/auditTrail';

export interface ILbmaPriceRepository {
  /**
   * Get all available price types
   */
  getAllPriceTypes(): Promise<PriceType[]>;

  /**
   * Get price type by code
   */
  getPriceTypeByCode(code: PriceTypeCode): Promise<PriceType | null>;

  /**
   * Get price type ID by code
   */
  getPriceTypeIdByCode(code: PriceTypeCode): Promise<string | null>;

  /**
   * Get latest LBMA price for a metal
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
   * Get all today's fixings
   */
  getTodayFixings(): Promise<LbmaPrice[]>;

  /**
   * Save or update LBMA price
   */
  upsertLbmaPrice(price: Omit<LbmaPrice, 'id' | 'createdAt'>): Promise<void>;

  /**
   * Bulk insert LBMA prices (for historical import)
   */
  bulkInsertLbmaPrices(prices: Omit<LbmaPrice, 'id' | 'createdAt'>[]): Promise<number>;

  /**
   * Get active premium configurations
   */
  getActivePremiumConfigs(metalSymbol?: string): Promise<PremiumConfig[]>;

  /**
   * Get premium config for specific metal and quantity
   */
  getPremiumConfig(metalSymbol: string, quantityOz: number): Promise<PremiumConfig | null>;

  /**
   * Save premium configuration
   */
  savePremiumConfig(config: Omit<PremiumConfig, 'id'>, authenticatedUser?: AuditTrailUser): Promise<string>;

  /**
   * Update premium configuration
   */
  updatePremiumConfig(id: string, config: Partial<PremiumConfig>, authenticatedUser?: AuditTrailUser): Promise<void>;

  /**
   * Calculate price with premium
   */
  calculatePriceWithPremium(
    metalSymbol: string,
    basePriceTypeCode: PriceTypeCode,
    quantityOz: number,
    currency: string
  ): Promise<PriceWithPremium | null>;
}
