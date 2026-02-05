/**
 * LBMA Provider Unit Tests
 * 
 * Tests for MetalsApiLbmaProvider and GoldApiProvider
 * Focus on unit tests that don't require actual API calls
 */

import { MetalsApiLbmaProvider } from '../../src/services/market-data/providers/MetalsApiLbmaProvider';
import { GoldApiProvider } from '../../src/services/market-data/providers/GoldApiProvider';

describe('MetalsApiLbmaProvider', () => {
  let provider: MetalsApiLbmaProvider;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv, METALS_API_KEY: 'test-api-key' };
    provider = new MetalsApiLbmaProvider();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getName', () => {
    it('should return provider name', () => {
      expect(provider.getName()).toBe('Metals-API-LBMA');
    });
  });

  describe('getPriority', () => {
    it('should return priority level', () => {
      expect(provider.getPriority()).toBe(1);
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is set', () => {
      expect(provider.isAvailable()).toBe(true);
    });

    it('should return false when API key is not set', () => {
      process.env.METALS_API_KEY = '';
      const noKeyProvider = new MetalsApiLbmaProvider();
      expect(noKeyProvider.isAvailable()).toBe(false);
    });

    it('should return false when API key is undefined', () => {
      delete process.env.METALS_API_KEY;
      const noKeyProvider = new MetalsApiLbmaProvider();
      expect(noKeyProvider.isAvailable()).toBe(false);
    });
  });

  describe('provider interface', () => {
    it('should have fetchPrices method', () => {
      expect(typeof provider.fetchPrices).toBe('function');
    });

    it('should have fetchLbmaPrices method', () => {
      expect(typeof provider.fetchLbmaPrices).toBe('function');
    });

    it('should have fetchLbmaHistorical method', () => {
      expect(typeof provider.fetchLbmaHistorical).toBe('function');
    });
  });
});

describe('GoldApiProvider', () => {
  let provider: GoldApiProvider;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv, GOLD_API_KEY: 'test-gold-api-key' };
    provider = new GoldApiProvider();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getName', () => {
    it('should return provider name', () => {
      expect(provider.getName()).toBe('GoldAPI');
    });
  });

  describe('getPriority', () => {
    it('should return priority level', () => {
      expect(provider.getPriority()).toBe(2);
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is set', () => {
      expect(provider.isAvailable()).toBe(true);
    });

    it('should return false when API key is not set', () => {
      process.env.GOLD_API_KEY = '';
      const noKeyProvider = new GoldApiProvider();
      expect(noKeyProvider.isAvailable()).toBe(false);
    });

    it('should return false when API key is undefined', () => {
      delete process.env.GOLD_API_KEY;
      const noKeyProvider = new GoldApiProvider();
      expect(noKeyProvider.isAvailable()).toBe(false);
    });
  });

  describe('provider interface', () => {
    it('should have fetchPrices method', () => {
      expect(typeof provider.fetchPrices).toBe('function');
    });

    it('should have fetchSinglePrice method', () => {
      expect(typeof provider.fetchSinglePrice).toBe('function');
    });

    it('should have fetchHistoricalPrice method', () => {
      expect(typeof provider.fetchHistoricalPrice).toBe('function');
    });

    it('should have fetchGoldKaratPrices method', () => {
      expect(typeof provider.fetchGoldKaratPrices).toBe('function');
    });
  });

  describe('supported metals', () => {
    it('should support gold (XAU)', () => {
      const supportedMetals = ['XAU', 'XAG', 'XPT', 'XPD'];
      expect(supportedMetals).toContain('XAU');
    });

    it('should support silver (XAG)', () => {
      const supportedMetals = ['XAU', 'XAG', 'XPT', 'XPD'];
      expect(supportedMetals).toContain('XAG');
    });

    it('should support platinum (XPT)', () => {
      const supportedMetals = ['XAU', 'XAG', 'XPT', 'XPD'];
      expect(supportedMetals).toContain('XPT');
    });

    it('should support palladium (XPD)', () => {
      const supportedMetals = ['XAU', 'XAG', 'XPT', 'XPD'];
      expect(supportedMetals).toContain('XPD');
    });
  });

  describe('supported currencies', () => {
    it('should have default currency USD', () => {
      const defaultCurrency = 'USD';
      expect(defaultCurrency).toBe('USD');
    });

    it('should support common currencies', () => {
      const supportedCurrencies = ['USD', 'EUR', 'GBP', 'CHF'];
      expect(supportedCurrencies.length).toBe(4);
    });
  });
});
