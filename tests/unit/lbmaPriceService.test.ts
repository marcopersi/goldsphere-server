/**
 * LBMA Price Service Unit Tests
 * 
 * Tests for LbmaPriceServiceImpl
 */

import { LbmaPriceServiceImpl } from '../../src/services/market-data/impl/LbmaPriceServiceImpl';
import type { ILbmaPriceRepository } from '../../src/services/market-data/repository/ILbmaPriceRepository';
import type { IMarketDataRepository } from '../../src/services/market-data/repository/IMarketDataRepository';
import type { IReferenceService } from '../../src/services/reference/IReferenceService';
import type { ILbmaProvider } from '../../src/services/market-data/providers/MetalsApiLbmaProvider';
import type { LbmaPrice, PriceType, PremiumConfig, PriceTypeCode } from '../../src/services/market-data/types/MarketDataTypes';

describe('LbmaPriceServiceImpl', () => {
  let service: LbmaPriceServiceImpl;
  let mockLbmaRepository: jest.Mocked<ILbmaPriceRepository>;
  let mockReferenceService: jest.Mocked<IReferenceService>;
  let mockMarketDataRepository: jest.Mocked<IMarketDataRepository>;
  let mockLbmaProvider: jest.Mocked<ILbmaProvider>;

  const mockPriceTypes: PriceType[] = [
    { id: '1', code: 'LBMA_AM', name: 'LBMA Gold AM', isBenchmark: true, updateFrequencyMinutes: 1440 },
    { id: '2', code: 'LBMA_PM', name: 'LBMA Gold PM', isBenchmark: true, updateFrequencyMinutes: 1440 },
    { id: '3', code: 'SPOT', name: 'Spot Price', isBenchmark: false, updateFrequencyMinutes: 5 },
  ];

  const mockLbmaPrice: LbmaPrice = {
    id: 'lbma-1',
    metalId: 'metal-1',
    metalSymbol: 'AU',
    metalName: 'Gold',
    priceTypeId: '2',
    priceTypeCode: 'LBMA_PM',
    fixingDate: new Date('2026-01-10'),
    fixingTime: '15:00',
    priceUsd: 2650.50,
    priceGbp: 2100.25,
    priceEur: 2450.75,
    priceChf: 2320.00,
    source: 'METALS_API'
  };

  beforeEach(() => {
    // Create mock repositories and provider
    mockLbmaRepository = {
      getAllPriceTypes: jest.fn(),
      getPriceTypeByCode: jest.fn(),
      getPriceTypeIdByCode: jest.fn(),
      getLatestLbmaPrice: jest.fn(),
      getLbmaPriceByDate: jest.fn(),
      getLbmaHistory: jest.fn(),
      getTodayFixings: jest.fn(),
      upsertLbmaPrice: jest.fn(),
      bulkInsertLbmaPrices: jest.fn(),
      getActivePremiumConfigs: jest.fn(),
      getPremiumConfig: jest.fn(),
      savePremiumConfig: jest.fn(),
      updatePremiumConfig: jest.fn(),
      calculatePriceWithPremium: jest.fn(),
    };

    mockReferenceService = {
      listMetals: jest.fn(),
      getMetalById: jest.fn(),
      getMetalBySymbol: jest.fn().mockResolvedValue({ 
        id: 'metal-1', 
        symbol: 'AU', 
        name: 'Gold',
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      listProductTypes: jest.fn(),
      getProductTypeById: jest.fn(),
      listProducers: jest.fn(),
      getProducerById: jest.fn(),
    };

    mockMarketDataRepository = {
      getCurrentPrice: jest.fn(),
      getAllCurrentPrices: jest.fn(),
      getHistoricalPrices: jest.fn(),
      upsertPrice: jest.fn(),
      getActiveProviders: jest.fn(),
      updateProviderSuccess: jest.fn(),
      updateProviderFailure: jest.fn(),
      getCachedData: jest.fn(),
      setCachedData: jest.fn(),
      cleanupCache: jest.fn(),
      saveHistoricalPrice: jest.fn(),
    };

    mockLbmaProvider = {
      getName: jest.fn().mockReturnValue('Metals-API-LBMA'),
      getPriority: jest.fn().mockReturnValue(1),
      isAvailable: jest.fn().mockReturnValue(true),
      fetchPrices: jest.fn(),
      fetchLbmaPrices: jest.fn(),
      fetchLbmaHistorical: jest.fn(),
    };

    service = new LbmaPriceServiceImpl(
      mockLbmaRepository,
      mockReferenceService,
      mockLbmaProvider,
      mockMarketDataRepository
    );
  });

  describe('getPriceTypes', () => {
    it('should return all price types', async () => {
      mockLbmaRepository.getAllPriceTypes.mockResolvedValue(mockPriceTypes);

      const result = await service.getPriceTypes();

      expect(result).toEqual(mockPriceTypes);
      expect(mockLbmaRepository.getAllPriceTypes).toHaveBeenCalledTimes(1);
    });

    it('should throw error on repository failure', async () => {
      mockLbmaRepository.getAllPriceTypes.mockRejectedValue(new Error('DB error'));

      await expect(service.getPriceTypes()).rejects.toThrow('Failed to fetch price types');
    });
  });

  describe('getBenchmarkPriceTypes', () => {
    it('should return only benchmark price types', async () => {
      mockLbmaRepository.getAllPriceTypes.mockResolvedValue(mockPriceTypes);

      const result = await service.getBenchmarkPriceTypes();

      expect(result).toHaveLength(2);
      expect(result.every(pt => pt.isBenchmark)).toBe(true);
    });
  });

  describe('getLatestLbmaPrice', () => {
    it('should fetch from repository', async () => {
      mockLbmaRepository.getLatestLbmaPrice.mockResolvedValue(mockLbmaPrice);

      const result = await service.getLatestLbmaPrice('AU');

      expect(result).toEqual(mockLbmaPrice);
      expect(mockLbmaRepository.getLatestLbmaPrice).toHaveBeenCalledWith('AU', 'LBMA_PM');
    });

    it('should use provided price type code', async () => {
      mockLbmaRepository.getLatestLbmaPrice.mockResolvedValue(mockLbmaPrice);

      const result = await service.getLatestLbmaPrice('AU', 'LBMA_AM');

      expect(result).toEqual(mockLbmaPrice);
      expect(mockLbmaRepository.getLatestLbmaPrice).toHaveBeenCalledWith('AU', 'LBMA_AM');
    });

    it('should use LBMA_PM as default price type', async () => {
      mockMarketDataRepository.getCachedData.mockResolvedValue(null);
      mockLbmaRepository.getLatestLbmaPrice.mockResolvedValue(mockLbmaPrice);

      await service.getLatestLbmaPrice('AU');

      expect(mockLbmaRepository.getLatestLbmaPrice).toHaveBeenCalledWith('AU', 'LBMA_PM');
    });
  });

  describe('getLbmaPriceByDate', () => {
    it('should return price for specific date', async () => {
      const date = new Date('2026-01-10');
      mockLbmaRepository.getLbmaPriceByDate.mockResolvedValue(mockLbmaPrice);

      const result = await service.getLbmaPriceByDate('AU', date, 'LBMA_PM');

      expect(result).toEqual(mockLbmaPrice);
      expect(mockLbmaRepository.getLbmaPriceByDate).toHaveBeenCalledWith('AU', date, 'LBMA_PM');
    });
  });

  describe('getLbmaHistory', () => {
    it('should return history based on query', async () => {
      const history = [mockLbmaPrice];
      mockLbmaRepository.getLbmaHistory.mockResolvedValue(history);

      const query = { metalSymbol: 'AU', limit: 10 };
      const result = await service.getLbmaHistory(query);

      expect(result).toEqual(history);
      expect(mockLbmaRepository.getLbmaHistory).toHaveBeenCalledWith(query);
    });
  });

  describe('getTodayFixings', () => {
    it('should return today fixings', async () => {
      const fixings = [mockLbmaPrice];
      mockLbmaRepository.getTodayFixings.mockResolvedValue(fixings);

      const result = await service.getTodayFixings();

      expect(result).toEqual(fixings);
    });
  });

  describe('fetchAndStoreLbmaPrices', () => {
    it('should fetch and store prices successfully', async () => {
      mockLbmaProvider.isAvailable.mockReturnValue(true);
      mockLbmaProvider.fetchLbmaPrices.mockResolvedValue([mockLbmaPrice]);
      mockLbmaRepository.upsertLbmaPrice.mockResolvedValue();

      const result = await service.fetchAndStoreLbmaPrices('AU');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error if provider not available', async () => {
      mockLbmaProvider.isAvailable.mockReturnValue(false);

      const result = await service.fetchAndStoreLbmaPrices('AU');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('LBMA provider not available');
    });

    it('should handle fetch errors gracefully', async () => {
      mockLbmaProvider.isAvailable.mockReturnValue(true);
      mockLbmaProvider.fetchLbmaPrices.mockResolvedValue([]);

      const result = await service.fetchAndStoreLbmaPrices('AU');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('calculatePriceWithPremium', () => {
    it('should calculate price with premium', async () => {
      const priceWithPremium = {
        metalSymbol: 'AU',
        basePrice: 2650.50,
        basePriceType: 'LBMA_PM' as PriceTypeCode,
        premiumPercent: 0.025,
        finalPrice: 2716.76,
        currency: 'USD',
        timestamp: new Date()
      };
      mockLbmaRepository.calculatePriceWithPremium.mockResolvedValue(priceWithPremium);

      const result = await service.calculatePriceWithPremium('AU', 10, 'USD');

      expect(result).toEqual(priceWithPremium);
      expect(mockLbmaRepository.calculatePriceWithPremium).toHaveBeenCalledWith(
        'AU', 'LBMA_PM', 10, 'USD'
      );
    });
  });

  describe('getPremiumConfigs', () => {
    it('should return premium configs', async () => {
      const configs: PremiumConfig[] = [{
        id: '1',
        name: 'Gold Premium',
        metalSymbol: 'AU',
        premiumPercent: 0.025,
        currency: 'USD',
        validFrom: new Date(),
        isActive: true
      }];
      mockLbmaRepository.getActivePremiumConfigs.mockResolvedValue(configs);

      const result = await service.getPremiumConfigs('AU');

      expect(result).toEqual(configs);
      expect(mockLbmaRepository.getActivePremiumConfigs).toHaveBeenCalledWith('AU');
    });
  });

  describe('compareLbmaToSpot', () => {
    it('should compare LBMA and spot prices', async () => {
      mockMarketDataRepository.getCachedData.mockResolvedValue(null);
      mockLbmaRepository.getLatestLbmaPrice.mockResolvedValue(mockLbmaPrice);
      mockMarketDataRepository.setCachedData.mockResolvedValue();
      mockReferenceService.getMetalBySymbol.mockResolvedValue({ 
        id: 'metal-1', 
        symbol: 'AU', 
        name: 'Gold',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      mockMarketDataRepository.getCurrentPrice.mockResolvedValue({
        id: 'spot-1',
        metalId: 'metal-1',
        providerId: 'provider-1',
        pricePerTroyOz: 2660.00,
        currency: 'USD',
        timestamp: new Date()
      });

      const result = await service.compareLbmaToSpot('AU', 'USD');

      expect(result).toBeDefined();
      expect(result?.lbmaPrice).toBe(2650.50);
      expect(result?.spotPrice).toBe(2660.00);
      expect(result?.difference).toBeCloseTo(9.50, 2);
    });

    it('should return null if no LBMA price', async () => {
      mockMarketDataRepository.getCachedData.mockResolvedValue(null);
      mockLbmaRepository.getLatestLbmaPrice.mockResolvedValue(null);

      const result = await service.compareLbmaToSpot('AU');

      expect(result).toBeNull();
    });
  });
});
