/**
 * ICalculationService Interface
 * 
 * Defines the contract for order calculation logic including
 * fees, taxes, and pricing computations.
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

export interface ICalculationService {
  /**
   * Calculate order totals including fees and taxes
   */
  calculateOrderTotal(items: Array<{ quantity: number; unitPrice: number }>): CalculationResult;

  /**
   * Calculate processing fees based on subtotal
   */
  calculateProcessingFee(subtotal: number): number;

  /**
   * Calculate shipping costs based on order details
   */
  calculateShippingCost(items: Array<{ quantity: number; unitPrice: number }>, shippingMethod?: string): number;

  /**
   * Calculate insurance costs based on order value
   */
  calculateInsurance(subtotal: number): number;

  /**
   * Calculate taxes based on order details and location
   */
  calculateTaxes(subtotal: number, location?: any): number;
}
