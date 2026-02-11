/**
 * WooCommerce Client Factory Interface
 * 
 * Creates per-connector clients with credentials.
 */

import { IWooCommerceClient } from "./IWooCommerceClient";

export interface IWooCommerceClientFactory {
  create(baseUrl: string, consumerKey: string, consumerSecret: string): IWooCommerceClient;
}
