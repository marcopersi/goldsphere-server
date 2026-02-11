/**
 * WooCommerce Client Implementation (placeholder)
 * 
 * HTTP logic will be added when wiring sync pipelines.
 */

import { IWooCommerceClient, WooCommerceListOptions, WooCommerceListResult } from "./IWooCommerceClient";

export class WooCommerceClientImpl implements IWooCommerceClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(baseUrl: string, consumerKey: string, consumerSecret: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    const token = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    this.authHeader = `Basic ${token}`;
  }

  async testConnection(): Promise<void> {
    await this.request("/system_status");
  }

  async listProducts(options: WooCommerceListOptions): Promise<WooCommerceListResult> {
    return this.list("/products", options);
  }

  async listOrders(options: WooCommerceListOptions): Promise<WooCommerceListResult> {
    return this.list("/orders", options);
  }

  private async list(path: string, options: WooCommerceListOptions): Promise<WooCommerceListResult> {
    const searchParams = new URLSearchParams();
    if (options.page) searchParams.set("page", String(options.page));
    if (options.perPage) searchParams.set("per_page", String(options.perPage));
    if (options.after) searchParams.set("after", options.after);
    if (options.before) searchParams.set("before", options.before);
    if (options.modifiedAfter) searchParams.set("modified_after", options.modifiedAfter);
    if (options.modifiedBefore) searchParams.set("modified_before", options.modifiedBefore);

    const query = searchParams.toString();
    const response = await this.request(`${path}${query ? `?${query}` : ""}`);
    const items = response.data as Record<string, unknown>[];
    const totalPagesHeader = response.headers.get("x-wp-totalpages");
    const totalPages = totalPagesHeader ? Number(totalPagesHeader) : undefined;
    const nextPage = totalPages && options.page && options.page < totalPages ? options.page + 1 : undefined;

    return { items, nextPage };
  }

  private async request(path: string): Promise<{ data: unknown; headers: Headers }> {
    const url = `${this.baseUrl}/wp-json/wc/v3${path}`;
    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`WooCommerce request failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    return { data, headers: response.headers };
  }
}
