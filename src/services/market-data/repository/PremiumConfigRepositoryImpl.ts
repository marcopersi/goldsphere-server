/**
 * Premium Config Repository Implementation
 * 
 * Handles database operations for LBMA premium configurations
 * Extracted from LbmaPriceRepositoryImpl to maintain <300 lines per file
 */

import { Pool } from 'pg';
import type { PremiumConfig, PriceWithPremium, PriceTypeCode, LbmaPrice } from '../types/MarketDataTypes';
import { mapToPremiumConfig } from './LbmaPriceMappers';
import * as queries from './LbmaPriceQueries';
import { AuditTrailUser, getAuditUser } from '../../../utils/auditTrail';

export interface IPremiumConfigRepository {
  getActivePremiumConfigs(metalSymbol?: string): Promise<PremiumConfig[]>;
  getPremiumConfig(metalSymbol: string, quantityOz: number): Promise<PremiumConfig | null>;
  savePremiumConfig(config: Omit<PremiumConfig, 'id'>, authenticatedUser?: AuditTrailUser): Promise<string>;
  updatePremiumConfig(id: string, config: Partial<PremiumConfig>, authenticatedUser?: AuditTrailUser): Promise<void>;
  calculatePriceWithPremium(
    metalSymbol: string,
    basePriceTypeCode: PriceTypeCode,
    quantityOz: number,
    currency: string,
    lbmaPrice: LbmaPrice
  ): Promise<PriceWithPremium | null>;
}

export class PremiumConfigRepositoryImpl implements IPremiumConfigRepository {
  constructor(private readonly pool: Pool) {}

  async getActivePremiumConfigs(metalSymbol?: string): Promise<PremiumConfig[]> {
    let query = queries.GET_ACTIVE_PREMIUM_CONFIGS_BASE;
    const params: string[] = [];

    if (metalSymbol) {
      query += ' AND m.symbol = $1';
      params.push(metalSymbol);
    }

    query += ' ORDER BY m.symbol, pc.min_quantity_oz NULLS FIRST';

    const result = await this.pool.query(query, params);
    return result.rows.map(row => mapToPremiumConfig(row));
  }

  async getPremiumConfig(metalSymbol: string, quantityOz: number): Promise<PremiumConfig | null> {
    const result = await this.pool.query(
      queries.GET_PREMIUM_CONFIG_FOR_QUANTITY,
      [metalSymbol, quantityOz]
    );
    if (result.rows.length === 0) return null;
    return mapToPremiumConfig(result.rows[0]);
  }

  async savePremiumConfig(config: Omit<PremiumConfig, 'id'>, authenticatedUser?: AuditTrailUser): Promise<string> {
    // metalId should be resolved by Service layer before calling Repository
    const metalId = config.metalId || null;
    const auditUser = getAuditUser(authenticatedUser);

    const result = await this.pool.query<{ id: string }>(
      queries.INSERT_PREMIUM_CONFIG,
      [
        config.name,
        config.description,
        metalId,
        config.basePriceTypeId,
        config.premiumPercent,
        config.premiumFixedAmount,
        config.currency,
        config.minQuantityOz,
        config.maxQuantityOz,
        config.validFrom,
        config.validTo,
        config.isActive,
        auditUser.id,
        auditUser.id
      ]
    );

    return result.rows[0].id;
  }

  async updatePremiumConfig(id: string, config: Partial<PremiumConfig>, authenticatedUser?: AuditTrailUser): Promise<void> {
    const updates: string[] = [];
    const params: (string | number | boolean | Date | null)[] = [];
    let paramIndex = 1;

    if (config.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(config.name);
    }
    if (config.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(config.description);
    }
    if (config.premiumPercent !== undefined) {
      updates.push(`premium_percent = $${paramIndex++}`);
      params.push(config.premiumPercent);
    }
    if (config.premiumFixedAmount !== undefined) {
      updates.push(`premium_fixed_amount = $${paramIndex++}`);
      params.push(config.premiumFixedAmount);
    }
    if (config.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(config.isActive);
    }
    if (config.validTo !== undefined) {
      updates.push(`valid_to = $${paramIndex++}`);
      params.push(config.validTo);
    }

    if (updates.length === 0) return;

    const auditUser = getAuditUser(authenticatedUser);
    updates.push(`updatedBy = $${paramIndex++}`);
    params.push(auditUser.id);
    updates.push(`updatedat = NOW()`);
    params.push(id);

    await this.pool.query(
      `UPDATE price_premium_config SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );
  }

  async calculatePriceWithPremium(
    metalSymbol: string,
    basePriceTypeCode: PriceTypeCode,
    quantityOz: number,
    currency: string,
    lbmaPrice: LbmaPrice
  ): Promise<PriceWithPremium | null> {
    const basePrice = this.getPriceInCurrency(lbmaPrice, currency);
    const premiumConfig = await this.getPremiumConfig(metalSymbol, quantityOz);
    const { finalPrice, premiumPercent, premiumFixed } = this.applyPremium(basePrice, premiumConfig);

    return {
      metalSymbol,
      basePrice,
      basePriceType: basePriceTypeCode,
      premiumPercent,
      premiumFixed,
      finalPrice,
      currency,
      timestamp: lbmaPrice.fixingDate
    };
  }

  // Private helper methods
  private getPriceInCurrency(lbmaPrice: LbmaPrice, currency: string): number {
    switch (currency.toUpperCase()) {
      case 'USD': return lbmaPrice.priceUsd;
      case 'GBP': return lbmaPrice.priceGbp || lbmaPrice.priceUsd;
      case 'EUR': return lbmaPrice.priceEur || lbmaPrice.priceUsd;
      case 'CHF': return lbmaPrice.priceChf || lbmaPrice.priceUsd;
      default: return lbmaPrice.priceUsd;
    }
  }

  private applyPremium(
    basePrice: number, 
    premiumConfig: PremiumConfig | null
  ): { finalPrice: number; premiumPercent?: number; premiumFixed?: number } {
    let finalPrice = basePrice;
    let premiumPercent: number | undefined;
    let premiumFixed: number | undefined;

    if (premiumConfig) {
      premiumPercent = premiumConfig.premiumPercent;
      premiumFixed = premiumConfig.premiumFixedAmount;

      if (premiumPercent) {
        finalPrice = finalPrice * (1 + premiumPercent);
      }
      if (premiumFixed) {
        finalPrice = finalPrice + premiumFixed;
      }
    }

    return { finalPrice, premiumPercent, premiumFixed };
  }
}
