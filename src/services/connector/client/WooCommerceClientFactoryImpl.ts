/**
 * WooCommerce Client Factory Implementation
 */

import { IWooCommerceClientFactory } from "./IWooCommerceClientFactory";
import { IWooCommerceClient } from "./IWooCommerceClient";
import { WooCommerceClientImpl } from "./WooCommerceClientImpl";

export class WooCommerceClientFactoryImpl implements IWooCommerceClientFactory {
  create(baseUrl: string, consumerKey: string, consumerSecret: string): IWooCommerceClient {
    return new WooCommerceClientImpl(baseUrl, consumerKey, consumerSecret);
  }
}
