/**
 * CalculationService
 * 
 * Handles all financial calculations including fees, taxes, and pricing.
 * Extracted from order route handlers to centralize business logic.
 */

export interface CalculationResult {
  subtotal: number;
  processingFee: number;
  taxes: number;
  totalAmount: number;
}

export interface CalculationConfig {
  processingFeeRate: number;  // Default: 0.05 (5%)
  taxRate: number;           // Default: 0.0825 (8.25%)
}

export class CalculationService {
  private readonly config: CalculationConfig;

  constructor(config?: Partial<CalculationConfig>) {
    this.config = {
      processingFeeRate: config?.processingFeeRate ?? 0.05,    // 5% processing fee
      taxRate: config?.taxRate ?? 0.0825                      // 8.25% tax rate
    };
  }

  /**
   * Calculate total order amount including fees and taxes
   */
  calculateOrderTotal(subtotal: number): CalculationResult {
    if (subtotal < 0) {
      throw new Error('Subtotal cannot be negative');
    }

    const processingFee = this.calculateProcessingFee(subtotal);
    const taxes = this.calculateTaxes(subtotal);
    const totalAmount = subtotal + processingFee + taxes;

    return {
      subtotal: this.roundToTwoDecimals(subtotal),
      processingFee: this.roundToTwoDecimals(processingFee),
      taxes: this.roundToTwoDecimals(taxes),
      totalAmount: this.roundToTwoDecimals(totalAmount)
    };
  }

  /**
   * Calculate processing fee for an order
   */
  private calculateProcessingFee(subtotal: number): number {
    return subtotal * this.config.processingFeeRate;
  }

  /**
   * Calculate taxes for an order
   */
  private calculateTaxes(subtotal: number): number {
    return subtotal * this.config.taxRate;
  }

  /**
   * Calculate item total (quantity × unit price)
   */
  calculateItemTotal(quantity: number, unitPrice: number): number {
    if (quantity < 0 || unitPrice < 0) {
      throw new Error('Quantity and unit price must be non-negative');
    }

    return this.roundToTwoDecimals(quantity * unitPrice);
  }

  /**
   * Round to two decimal places for currency precision
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Get current calculation configuration
   */
  getConfig(): CalculationConfig {
    return { ...this.config };
  }

  /**
   * Validate if calculation result matches expected total
   */
  validateCalculation(result: CalculationResult, expectedTotal?: number): boolean {
    const calculatedTotal = result.subtotal + result.processingFee + result.taxes;
    const isInternallyConsistent = Math.abs(calculatedTotal - result.totalAmount) < 0.01;
    
    if (expectedTotal !== undefined) {
      const matchesExpected = Math.abs(result.totalAmount - expectedTotal) < 0.01;
      return isInternallyConsistent && matchesExpected;
    }

    return isInternallyConsistent;
  }
}
