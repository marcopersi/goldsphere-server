/**
 * ICalculationService Interface
 * 
 * Defines the contract for order calculation logic including
 * fees, taxes, and pricing computations.
 */

import { CalculationResult, CalculationItem, TaxLocation } from './types/CalculationTypes';

export interface ICalculationService {
  /**
   * Calculate order totals including fees and taxes
   */
  calculateOrderTotal(items: CalculationItem[]): CalculationResult;

  /**
   * Calculate processing fees based on subtotal
   */
  calculateProcessingFee(subtotal: number): number;

  /**
   * Calculate shipping costs based on order details
   */
  calculateShippingCost(items: CalculationItem[], shippingMethod?: string): number;

  /**
   * Calculate insurance costs based on order value
   */
  calculateInsurance(subtotal: number): number;

  /**
   * Calculate taxes based on order details and location
   */
  calculateTaxes(subtotal: number, location?: TaxLocation): number;
}
