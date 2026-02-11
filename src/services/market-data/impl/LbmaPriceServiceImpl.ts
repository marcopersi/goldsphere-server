/**
 * LBMA Price Service Implementation
 * 
 * Business logic for LBMA benchmark prices
 * Orchestrates between Repository and Provider layers
 * Follows SOLID principles and Clean Architecture
 */

import type { ILbmaPriceService } from '../ILbmaPriceService';
import type { ILbmaPriceRepository } from '../repository/ILbmaPriceRepository';
import type { IMarketDataRepository } from '../repository/IMarketDataRepository';
import type { IReferenceService } from '../../reference/IReferenceService';
import type { ILbmaProvider } from '../providers/MetalsApiLbmaProvider';
import type { 
  LbmaPrice, 
  PriceType, 
  PremiumConfig,
  PriceWithPremium,
  LbmaQuery,
  PriceTypeCode
} from '../types/MarketDataTypes';
import { LBMA_CACHE_DURATION_MINUTES, SUPPORTED_METALS } from '../types/MarketDataTypes';
import { createLogger } from '../../../utils/logger';
import type { AuditTrailUser } from '../../../utils/auditTrail';

const logger = createLogger('LbmaPriceService');

export class LbmaPriceServiceImpl implements ILbmaPriceService {
  constructor(
    private readonly lbmaRepository: ILbmaPriceRepository,
    private readonly referenceService: IReferenceService,
    private readonly lbmaProvider: ILbmaProvider,
    private readonly marketDataRepository?: IMarketDataRepository
  ) {}

  /**
   * Resolve metal symbol to ID using ReferenceService
   */
  private async resolveMetalId(metalSymbol: string): Promise<string | null> {
    const metal = await this.referenceService.getMetalBySymbol(metalSymbol);
    return metal?.id || null;
  }

  async getPriceTypes(): Promise<PriceType[]> {
    try {
      return await this.lbmaRepository.getAllPriceTypes();
    } catch (error) {
      logger.error('Failed to get price types', error);
      throw new Error('Failed to fetch price types');
    }
  }

  async getBenchmarkPriceTypes(): Promise<PriceType[]> {
    try {
      const allTypes = await this.lbmaRepository.getAllPriceTypes();
      return allTypes.filter(pt => pt.isBenchmark);
    } catch (error) {
      logger.error('Failed to get benchmark price types', error);
      throw new Error('Failed to fetch benchmark price types');
    }
  }

  async getLatestLbmaPrice(
    metalSymbol: string,
    priceTypeCode: PriceTypeCode = 'LBMA_PM'
  ): Promise<LbmaPrice | null> {
    try {
      // Get from database
      const price = await this.lbmaRepository.getLatestLbmaPrice(metalSymbol, priceTypeCode);
      return price;
    } catch (error) {
      logger.error(`Failed to get latest LBMA price for ${metalSymbol}`, error);
      throw new Error(`Failed to fetch LBMA price for ${metalSymbol}`);
    }
  }

  async getLbmaPriceByDate(
    metalSymbol: string,
    date: Date,
    priceTypeCode: PriceTypeCode = 'LBMA_PM'
  ): Promise<LbmaPrice | null> {
    try {
      return await this.lbmaRepository.getLbmaPriceByDate(metalSymbol, date, priceTypeCode);
    } catch (error) {
      logger.error(`Failed to get LBMA price for ${metalSymbol} on ${date}`, error);
      throw new Error(`Failed to fetch LBMA price for ${metalSymbol}`);
    }
  }

  async getLbmaHistory(query: LbmaQuery): Promise<LbmaPrice[]> {
    try {
      return await this.lbmaRepository.getLbmaHistory(query);
    } catch (error) {
      logger.error('Failed to get LBMA history', error);
      throw new Error('Failed to fetch LBMA price history');
    }
  }

  async getTodayFixings(): Promise<LbmaPrice[]> {
    try {
      return await this.lbmaRepository.getTodayFixings();
    } catch (error) {
      logger.error('Failed to get today fixings', error);
      throw new Error('Failed to fetch today\'s LBMA fixings');
    }
  }

  async fetchAndStoreLbmaPrices(
    metalSymbol: string,
    date?: Date
  ): Promise<{ success: boolean; count: number; errors: string[] }> {
    const result = { success: false, count: 0, errors: [] as string[] };

    // Default to yesterday (LBMA prices are published end of day)
    const targetDate = date || this.getYesterday();

    try {
      if (!this.lbmaProvider.isAvailable()) {
        result.errors.push('LBMA provider not available');
        return result;
      }

      // Resolve metal ID via ReferenceService (Clean Architecture)
      const metalId = await this.resolveMetalId(metalSymbol);
      if (!metalId) {
        result.errors.push(`Unknown metal symbol: ${metalSymbol}`);
        return result;
      }

      logger.info(`Fetching LBMA prices for ${metalSymbol} on ${this.formatDate(targetDate)}`);

      const prices = await this.lbmaProvider.fetchLbmaPrices(metalSymbol, targetDate);

      if (prices.length === 0) {
        result.errors.push(`No LBMA prices found for ${metalSymbol} on ${this.formatDate(targetDate)}`);
        return result;
      }

      // Store each price with resolved metalId
      for (const price of prices) {
        try {
          await this.lbmaRepository.upsertLbmaPrice({ ...price, metalId });
          result.count++;
        } catch (error) {
          const msg = `Failed to store price: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(msg);
        }
      }

      result.success = result.count > 0;
      logger.info(`Stored ${result.count} LBMA prices for ${metalSymbol}`);

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(msg);
      logger.error('fetchAndStoreLbmaPrices error', error);
    }

    return result;
  }

  async fetchHistoricalLbmaPrices(
    metalSymbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ success: boolean; count: number; errors: string[] }> {
    const result = { success: false, count: 0, errors: [] as string[] };

    try {
      if (!this.lbmaProvider.isAvailable()) {
        result.errors.push('LBMA provider not available');
        return result;
      }

      // Resolve metal ID via ReferenceService (Clean Architecture)
      const metalId = await this.resolveMetalId(metalSymbol);
      if (!metalId) {
        result.errors.push(`Unknown metal symbol: ${metalSymbol}`);
        return result;
      }

      logger.info(`Fetching historical LBMA prices for ${metalSymbol} from ${this.formatDate(startDate)} to ${this.formatDate(endDate)}`);

      const prices = await this.lbmaProvider.fetchLbmaHistorical(metalSymbol, startDate, endDate);

      // Add metalId to all prices before bulk insert
      const pricesWithMetalId = prices.map(p => ({ ...p, metalId }));
      result.count = await this.lbmaRepository.bulkInsertLbmaPrices(pricesWithMetalId);
      result.success = result.count > 0;

      logger.info(`Stored ${result.count} historical LBMA prices for ${metalSymbol}`);

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(msg);
      logger.error('fetchHistoricalLbmaPrices error', error);
    }

    return result;
  }

  async calculatePriceWithPremium(
    metalSymbol: string,
    quantityOz: number,
    currency = 'USD',
    basePriceTypeCode: PriceTypeCode = 'LBMA_PM'
  ): Promise<PriceWithPremium | null> {
    try {
      return await this.lbmaRepository.calculatePriceWithPremium(
        metalSymbol,
        basePriceTypeCode,
        quantityOz,
        currency
      );
    } catch (error) {
      logger.error('Failed to calculate price with premium', error);
      throw new Error('Failed to calculate price with premium');
    }
  }

  async getPremiumConfigs(metalSymbol?: string): Promise<PremiumConfig[]> {
    try {
      return await this.lbmaRepository.getActivePremiumConfigs(metalSymbol);
    } catch (error) {
      logger.error('Failed to get premium configs', error);
      throw new Error('Failed to fetch premium configurations');
    }
  }

  async savePremiumConfig(config: Omit<PremiumConfig, 'id'>, authenticatedUser: AuditTrailUser): Promise<string> {
    try {
      // Resolve metalId from symbol if not provided (Clean Architecture)
      let resolvedConfig = config;
      if (config.metalSymbol && !config.metalId) {
        const metalId = await this.resolveMetalId(config.metalSymbol);
        if (!metalId) {
          throw new Error(`Unknown metal symbol: ${config.metalSymbol}`);
        }
        resolvedConfig = { ...config, metalId };
      }
      return await this.lbmaRepository.savePremiumConfig(resolvedConfig, authenticatedUser);
    } catch (error) {
      logger.error('Failed to save premium config', error);
      throw new Error('Failed to save premium configuration');
    }
  }

  async updatePremiumConfig(id: string, config: Partial<PremiumConfig>, authenticatedUser: AuditTrailUser): Promise<void> {
    try {
      await this.lbmaRepository.updatePremiumConfig(id, config, authenticatedUser);
    } catch (error) {
      logger.error('Failed to update premium config', error);
      throw new Error('Failed to update premium configuration');
    }
  }

  async compareLbmaToSpot(
    metalSymbol: string,
    currency = 'USD'
  ): Promise<{
    lbmaPrice: number;
    spotPrice: number;
    difference: number;
    differencePercent: number;
    lbmaDate: Date;
    spotTimestamp: Date;
  } | null> {
    try {
      // Get latest LBMA price
      const lbmaPrice = await this.getLatestLbmaPrice(metalSymbol, 'LBMA_PM');
      if (!lbmaPrice) {
        logger.warn(`No LBMA price found for ${metalSymbol}`);
        return null;
      }

      // Get metal ID via ReferenceService
      const metalId = await this.resolveMetalId(metalSymbol);
      if (!metalId) {
        logger.warn(`Metal not found: ${metalSymbol}`);
        return null;
      }

      // Get current spot price (requires optional marketDataRepository)
      if (!this.marketDataRepository) {
        logger.warn('compareLbmaToSpot requires marketDataRepository');
        return null;
      }
      const spotPrice = await this.marketDataRepository.getCurrentPrice(metalId, currency);
      if (!spotPrice) {
        logger.warn(`No spot price found for ${metalSymbol}`);
        return null;
      }

      // Get LBMA price in requested currency
      let lbmaPriceValue: number;
      switch (currency.toUpperCase()) {
        case 'USD': lbmaPriceValue = lbmaPrice.priceUsd; break;
        case 'GBP': lbmaPriceValue = lbmaPrice.priceGbp || lbmaPrice.priceUsd; break;
        case 'EUR': lbmaPriceValue = lbmaPrice.priceEur || lbmaPrice.priceUsd; break;
        case 'CHF': lbmaPriceValue = lbmaPrice.priceChf || lbmaPrice.priceUsd; break;
        default: lbmaPriceValue = lbmaPrice.priceUsd;
      }

      const difference = spotPrice.pricePerTroyOz - lbmaPriceValue;
      const differencePercent = (difference / lbmaPriceValue) * 100;

      return {
        lbmaPrice: lbmaPriceValue,
        spotPrice: spotPrice.pricePerTroyOz,
        difference,
        differencePercent,
        lbmaDate: lbmaPrice.fixingDate,
        spotTimestamp: spotPrice.timestamp
      };
    } catch (error) {
      logger.error('Failed to compare LBMA to spot', error);
      throw new Error('Failed to compare LBMA and spot prices');
    }
  }

  /**
   * Fetch LBMA prices for all supported metals
   */
  async fetchAllLbmaPrices(date?: Date): Promise<{ 
    success: boolean; 
    results: Record<string, { count: number; errors: string[] }> 
  }> {
    const results: Record<string, { count: number; errors: string[] }> = {};
    let overallSuccess = false;

    for (const metal of SUPPORTED_METALS) {
      const result = await this.fetchAndStoreLbmaPrices(metal, date);
      results[metal] = { count: result.count, errors: result.errors };
      if (result.success) overallSuccess = true;
    }

    return { success: overallSuccess, results };
  }

  // Private helper methods
  private getYesterday(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
