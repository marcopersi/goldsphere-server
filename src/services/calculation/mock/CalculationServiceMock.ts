/**
 * Calculation Service Mock Implementation
 * 
 * Simplified mock for testing with fixed values
 */

import { ICalculationService } from "../ICalculationService";
import { CalculationResult, CalculationItem, TaxLocation } from "../types/CalculationTypes";

export class CalculationServiceMock implements ICalculationService {
  /**
   * Calculate order total with fixed mock values
   */
  calculateOrderTotal(items: CalculationItem[]): CalculationResult {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    
    return {
      subtotal,
      fees: {
        processing: 10.0,
        shipping: 5.0,
        insurance: 2.5
      },
      taxes: 8.5,
      totalAmount: subtotal + 26.0 // subtotal + all fees + taxes
    };
  }

  /**
   * Calculate fixed processing fee
   */
  calculateProcessingFee(_subtotal: number): number {
    return 10.0;
  }

  /**
   * Calculate fixed shipping cost
   */
  calculateShippingCost(_items: CalculationItem[], _shippingMethod?: string): number {
    return 5.0;
  }

  /**
   * Calculate fixed insurance
   */
  calculateInsurance(_subtotal: number): number {
    return 2.5;
  }

  /**
   * Calculate fixed taxes
   */
  calculateTaxes(_subtotal: number, _location?: TaxLocation): number {
    return 8.5;
  }
}
