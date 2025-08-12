/**
 * Unit tests for CalculationService
 */

import { CalculationService } from '../../src/services/CalculationService';

describe('CalculationService', () => {
  let calculationService: CalculationService;

  beforeEach(() => {
    calculationService = new CalculationService();
  });

  describe('calculateOrderTotal', () => {
    it('should calculate correct totals with default rates', () => {
      const subtotal = 1000.00;
      const result = calculationService.calculateOrderTotal(subtotal);

      expect(result.subtotal).toBe(1000.00);
      expect(result.processingFee).toBe(50.00); // 5%
      expect(result.taxes).toBe(82.50); // 8.25%
      expect(result.totalAmount).toBe(1132.50);
    });

    it('should handle zero subtotal', () => {
      const result = calculationService.calculateOrderTotal(0);

      expect(result.subtotal).toBe(0);
      expect(result.processingFee).toBe(0);
      expect(result.taxes).toBe(0);
      expect(result.totalAmount).toBe(0);
    });

    it('should throw error for negative subtotal', () => {
      expect(() => {
        calculationService.calculateOrderTotal(-100);
      }).toThrow('Subtotal cannot be negative');
    });

    it('should round to two decimal places', () => {
      const subtotal = 33.333;
      const result = calculationService.calculateOrderTotal(subtotal);

      // All values should be rounded to 2 decimal places
      expect(Number.isInteger(result.subtotal * 100)).toBe(true);
      expect(Number.isInteger(result.processingFee * 100)).toBe(true);
      expect(Number.isInteger(result.taxes * 100)).toBe(true);
      expect(Number.isInteger(result.totalAmount * 100)).toBe(true);
    });
  });

  describe('calculateItemTotal', () => {
    it('should calculate item total correctly', () => {
      const result = calculationService.calculateItemTotal(2, 1500.00);
      expect(result).toBe(3000.00);
    });

    it('should handle decimal quantities', () => {
      const result = calculationService.calculateItemTotal(2.5, 100.00);
      expect(result).toBe(250.00);
    });

    it('should throw error for negative values', () => {
      expect(() => {
        calculationService.calculateItemTotal(-1, 100);
      }).toThrow('Quantity and unit price must be non-negative');

      expect(() => {
        calculationService.calculateItemTotal(1, -100);
      }).toThrow('Quantity and unit price must be non-negative');
    });
  });

  describe('validateCalculation', () => {
    it('should validate internal consistency', () => {
      const result = calculationService.calculateOrderTotal(1000);
      const isValid = calculationService.validateCalculation(result);
      expect(isValid).toBe(true);
    });

    it('should validate against expected total', () => {
      const result = calculationService.calculateOrderTotal(1000);
      const isValid = calculationService.validateCalculation(result, 1132.50);
      expect(isValid).toBe(true);
    });

    it('should reject invalid expected total', () => {
      const result = calculationService.calculateOrderTotal(1000);
      const isValid = calculationService.validateCalculation(result, 1200.00);
      expect(isValid).toBe(false);
    });
  });

  describe('custom configuration', () => {
    it('should use custom rates when provided', () => {
      const customService = new CalculationService({
        processingFeeRate: 0.03, // 3%
        taxRate: 0.10 // 10%
      });

      const result = customService.calculateOrderTotal(1000);
      expect(result.processingFee).toBe(30.00); // 3%
      expect(result.taxes).toBe(100.00); // 10%
      expect(result.totalAmount).toBe(1130.00);
    });

    it('should expose configuration via getConfig', () => {
      const config = calculationService.getConfig();
      expect(config.processingFeeRate).toBe(0.05);
      expect(config.taxRate).toBe(0.0825);
    });
  });
});
