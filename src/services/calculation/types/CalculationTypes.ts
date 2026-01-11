/**
 * Calculation Service Types
 * 
 * Type definitions for calculation domain
 */

/**
 * Result of order calculation including all fees, taxes, and total
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

/**
 * Configuration for calculation service rates and fees
 */
export interface CalculationConfig {
  processingFeeRate: number;  // Percentage as decimal (e.g., 0.05 for 5%)
  taxRate: number;            // Percentage as decimal (e.g., 0.0825 for 8.25%)
  shippingFee: number;        // Flat fee amount
  insuranceFee: number;       // Percentage as decimal
}

/**
 * Order item for calculation purposes
 */
export interface CalculationItem {
  quantity: number;
  unitPrice: number;
}

/**
 * Location information for tax calculation
 */
export interface TaxLocation {
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
}
