/**
 * LBMA Price Repository Implementation
 * 
 * Implements ILbmaPriceRepository interface
 * Handles all database operations for LBMA prices and premium configurations
 */

import { Pool } from 'pg';
import type { ILbmaPriceRepository } from './ILbmaPriceRepository';
import type { 
  LbmaPrice, 
  PriceType, 
  PremiumConfig,
  PriceWithPremium,
  LbmaQuery,
  PriceTypeCode
} from '../types/MarketDataTypes';
import { 
  mapToLbmaPrice, 
  mapToPriceType, 
  mapToPremiumConfig,
  type LbmaPriceRow,
  type PriceTypeRow
} from './LbmaPriceMappers';
import * as queries from './LbmaPriceQueries';
import { PremiumConfigRepositoryImpl } from './PremiumConfigRepositoryImpl';
import { createLogger } from '../../../utils/logger';
import type { AuditTrailUser } from '../../../utils/auditTrail';

const logger = createLogger('LbmaPriceRepository');

export class LbmaPriceRepositoryImpl implements ILbmaPriceRepository {
  private readonly premiumConfigRepo: PremiumConfigRepositoryImpl;

  constructor(private readonly pool: Pool) {
    this.premiumConfigRepo = new PremiumConfigRepositoryImpl(pool);
  }

  async getAllPriceTypes(): Promise<PriceType[]> {
    const result = await this.pool.query<PriceTypeRow>(queries.GET_ALL_PRICE_TYPES);
    return result.rows.map(row => mapToPriceType(row));
  }

  async getPriceTypeByCode(code: PriceTypeCode): Promise<PriceType | null> {
    const result = await this.pool.query<PriceTypeRow>(
      queries.GET_PRICE_TYPE_BY_CODE,
      [code]
    );
    if (result.rows.length === 0) return null;
    return mapToPriceType(result.rows[0]);
  }

  async getPriceTypeIdByCode(code: PriceTypeCode): Promise<string | null> {
    const result = await this.pool.query<{ id: string }>(
      'SELECT id FROM price_type WHERE code = $1',
      [code]
    );
    return result.rows[0]?.id || null;
  }

  async getLatestLbmaPrice(
    metalSymbol: string, 
    priceTypeCode: PriceTypeCode = 'LBMA_PM'
  ): Promise<LbmaPrice | null> {
    const result = await this.pool.query<LbmaPriceRow>(
      queries.GET_LATEST_LBMA_PRICE,
      [metalSymbol, priceTypeCode]
    );
    if (result.rows.length === 0) return null;
    return mapToLbmaPrice(result.rows[0]);
  }

  async getLbmaPriceByDate(
    metalSymbol: string,
    date: Date,
    priceTypeCode: PriceTypeCode = 'LBMA_PM'
  ): Promise<LbmaPrice | null> {
    const result = await this.pool.query<LbmaPriceRow>(
      queries.GET_LBMA_PRICE_BY_DATE,
      [metalSymbol, date, priceTypeCode]
    );
    if (result.rows.length === 0) return null;
    return mapToLbmaPrice(result.rows[0]);
  }

  async getLbmaHistory(query: LbmaQuery): Promise<LbmaPrice[]> {
    const conditions: string[] = [];
    const params: (string | Date | number)[] = [];
    let paramIndex = 1;

    if (query.metalSymbol) {
      conditions.push(`m.symbol = $${paramIndex++}`);
      params.push(query.metalSymbol);
    }
    if (query.priceTypeCode) {
      conditions.push(`pt.code = $${paramIndex++}`);
      params.push(query.priceTypeCode);
    }
    if (query.startDate) {
      conditions.push(`lp.fixing_date >= $${paramIndex++}`);
      params.push(query.startDate);
    }
    if (query.endDate) {
      conditions.push(`lp.fixing_date <= $${paramIndex++}`);
      params.push(query.endDate);
    }

    const limit = query.limit || 100;
    params.push(limit);

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    const sql = `
      SELECT ${queries.LBMA_PRICE_SELECT_FIELDS}
      ${queries.LBMA_PRICE_FROM_CLAUSE}
      ${whereClause}
      ORDER BY lp.fixing_date DESC, lp.fixing_time DESC
      LIMIT $${paramIndex}
    `;

    const result = await this.pool.query<LbmaPriceRow>(sql, params);
    return result.rows.map(row => mapToLbmaPrice(row));
  }

  async getTodayFixings(): Promise<LbmaPrice[]> {
    const result = await this.pool.query<LbmaPriceRow>(queries.GET_TODAY_FIXINGS);
    return result.rows.map(row => mapToLbmaPrice(row));
  }

  async upsertLbmaPrice(price: Omit<LbmaPrice, 'id' | 'createdAt'>): Promise<void> {
    // Use metalId directly - symbol resolution should happen in Service layer
    if (!price.metalId) {
      throw new Error(`Metal ID is required for upsert. Symbol: ${price.metalSymbol}`);
    }

    const priceTypeId = await this.getPriceTypeIdByCode(price.priceTypeCode!);
    if (!priceTypeId) {
      throw new Error(`Price type not found: ${price.priceTypeCode}`);
    }

    await this.pool.query(queries.UPSERT_LBMA_PRICE, [
      price.metalId,
      priceTypeId,
      price.fixingDate,
      price.fixingTime,
      price.priceUsd,
      price.priceGbp,
      price.priceEur,
      price.priceChf,
      price.participants,
      price.source
    ]);
  }

  async bulkInsertLbmaPrices(prices: Omit<LbmaPrice, 'id' | 'createdAt'>[]): Promise<number> {
    let inserted = 0;
    
    for (const price of prices) {
      try {
        await this.upsertLbmaPrice(price);
        inserted++;
      } catch (error) {
        logger.error(`Failed to insert LBMA price for ${price.metalSymbol}`, error);
      }
    }

    return inserted;
  }

  // Delegate premium config methods to PremiumConfigRepositoryImpl
  async getActivePremiumConfigs(metalSymbol?: string): Promise<PremiumConfig[]> {
    return this.premiumConfigRepo.getActivePremiumConfigs(metalSymbol);
  }

  async getPremiumConfig(metalSymbol: string, quantityOz: number): Promise<PremiumConfig | null> {
    return this.premiumConfigRepo.getPremiumConfig(metalSymbol, quantityOz);
  }

  async savePremiumConfig(config: Omit<PremiumConfig, 'id'>, authenticatedUser?: AuditTrailUser): Promise<string> {
    return this.premiumConfigRepo.savePremiumConfig(config, authenticatedUser);
  }

  async updatePremiumConfig(id: string, config: Partial<PremiumConfig>, authenticatedUser?: AuditTrailUser): Promise<void> {
    return this.premiumConfigRepo.updatePremiumConfig(id, config, authenticatedUser);
  }

  async calculatePriceWithPremium(
    metalSymbol: string,
    basePriceTypeCode: PriceTypeCode,
    quantityOz: number,
    currency: string
  ): Promise<PriceWithPremium | null> {
    const lbmaPrice = await this.getLatestLbmaPrice(metalSymbol, basePriceTypeCode);
    if (!lbmaPrice) return null;
    return this.premiumConfigRepo.calculatePriceWithPremium(
      metalSymbol, basePriceTypeCode, quantityOz, currency, lbmaPrice
    );
  }
}
