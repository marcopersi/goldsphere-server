/**
 * CalculationService
 * 
 * Handles all financial calculations including fees, taxes, and totals.
 * Centralizes business logic for order pricing calculations.
 */

export interface CalculationResult {
  subtotal: number;
  fees: {
    processing: number;
    shipping: number;
    insurance: number;
  };
  taxes: number;
  totalAmount: number;
}

export interface CalculationConfig {
  processingFeeRate: number;
  taxRate: number;
  shippingFee: number;
  insuranceFee: number;
}

export class CalculationService {
  private readonly config: CalculationConfig;

  constructor(config?: Partial<CalculationConfig>) {
    this.config = {
      processingFeeRate: 0.05,  // 5% processing fee
      taxRate: 0.0825,          // 8.25% tax rate
      shippingFee: 0,           // No shipping fee by default
      insuranceFee: 0,          // No insurance fee by default
      ...config
    };
  }

  /**
   * Calculate order total with all fees and taxes
   */
  calculateOrderTotal(items: Array<{ quantity: number; unitPrice: number }>): CalculationResult {
    // Calculate subtotal
    const subtotal = this.calculateSubtotal(items);
    
    // Calculate fees
    const processingFee = this.calculateProcessingFee(subtotal);
    const fees = {
      processing: processingFee,
      shipping: this.config.shippingFee,
      insurance: this.config.insuranceFee
    };
    
    // Calculate taxes (on subtotal + fees)
    const taxableAmount = subtotal + processingFee + fees.shipping + fees.insurance;
    const taxes = this.calculateTaxes(taxableAmount);
    
    // Calculate total
    const totalAmount = subtotal + processingFee + fees.shipping + fees.insurance + taxes;
    
    return {
      subtotal,
      fees,
      taxes,
      totalAmount
    };
  }

  /**
   * Calculate item total (quantity * price)
   */
  calculateItemTotal(quantity: number, unitPrice: number): number {
    if (quantity < 0 || unitPrice < 0) {
      throw new Error("Quantity and unit price must be non-negative");
    }
    return Math.round((quantity * unitPrice) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate subtotal from items
   */
  private calculateSubtotal(items: Array<{ quantity: number; unitPrice: number }>): number {
    const subtotal = items.reduce((total, item) => {
      return total + this.calculateItemTotal(item.quantity, item.unitPrice);
    }, 0);
    
    return Math.round(subtotal * 100) / 100;
  }

  /**
   * Calculate processing fee
   */
  private calculateProcessingFee(subtotal: number): number {
    const fee = subtotal * this.config.processingFeeRate;
    return Math.round(fee * 100) / 100;
  }

  /**
   * Calculate taxes
   */
  private calculateTaxes(taxableAmount: number): number {
    const taxes = taxableAmount * this.config.taxRate;
    return Math.round(taxes * 100) / 100;
  }

  /**
   * Validate calculation result
   */
  validateCalculation(result: CalculationResult): boolean {
    // Check for negative values
    if (result.subtotal < 0 || result.taxes < 0 || result.totalAmount < 0) {
      return false;
    }
    
    // Check if total is correctly calculated
    const expectedTotal = result.subtotal + 
      result.fees.processing + 
      result.fees.shipping + 
      result.fees.insurance + 
      result.taxes;
    
    const tolerance = 0.01; // Allow 1 cent tolerance for rounding
    return Math.abs(result.totalAmount - expectedTotal) <= tolerance;
  }
}
