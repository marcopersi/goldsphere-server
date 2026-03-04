/**
 * Calculation Service Mock Implementation
 * 
 * Simplified mock for testing with fixed values
 */

import { ICalculationService } from "../ICalculationService";
import { CalculationResult, CalculationItem, TaxLocation, OrderTypeValue } from "../types/CalculationTypes";

export class CalculationServiceMock implements ICalculationService {
  /**
   * Calculate order total with fixed mock values
   */
  calculateOrderTotal(items: CalculationItem[], orderType: OrderTypeValue = 'buy'): CalculationResult {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxes = orderType === 'sell' ? 0 : 8.5;
    
    return {
      subtotal,
      fees: {
        processing: 10,
        shipping: 5,
        insurance: 2.5
      },
      taxes,
      totalAmount: subtotal + 17.5 + taxes // subtotal + all fees + taxes
    };
  }

  /**
   * Calculate fixed processing fee
   */
  calculateProcessingFee(_subtotal: number): number {
    return 10;
  }

  /**
   * Calculate fixed shipping cost
   */
  calculateShippingCost(_items: CalculationItem[], _shippingMethod?: string): number {
    return 5;
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
  calculateTaxes(_subtotal: number, _location?: TaxLocation, orderType: OrderTypeValue = 'buy'): number {
    return orderType === 'sell' ? 0 : 8.5;
  }
}
