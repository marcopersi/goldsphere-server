/**
 * WooCommerce Client Interface
 * 
 * Defines HTTP operations for the WooCommerce API.
 */

export interface WooCommerceListOptions {
  page?: number;
  perPage?: number;
  after?: string;
  before?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
}

export interface WooCommerceListResult {
  items: Record<string, unknown>[];
  nextPage?: number;
}

export interface IWooCommerceClient {
  testConnection(): Promise<void>;
  listProducts(options: WooCommerceListOptions): Promise<WooCommerceListResult>;
  listOrders(options: WooCommerceListOptions): Promise<WooCommerceListResult>;
}
