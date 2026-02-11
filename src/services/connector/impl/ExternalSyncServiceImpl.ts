/**
 * External Sync Service Implementation
 * 
 * Runs product and order syncs using external APIs.
 */

import { v4 as uuidv4 } from "uuid";
import { IExternalSyncService } from "../IExternalSyncService";
import { ConnectorSyncRequest, ConnectorSyncResponse } from "../types/ConnectorTypes";
import { IExternalConnectorRepository } from "../repository/IExternalConnectorRepository";
import { IExternalDataRepository } from "../repository/IExternalDataRepository";
import { IExternalMappingService } from "../IExternalMappingService";
import { IWooCommerceClientFactory } from "../client/IWooCommerceClientFactory";
import { IWooCommerceClient } from "../client/IWooCommerceClient";
import { decryptSecret } from "../../../utils/crypto";
import { ExternalMappingRule, ExternalRecordStatus } from "../types/ExternalTypes";
import { IExternalLookupService } from "../IExternalLookupService";
import { defaultWooOrderRules, defaultWooProductRules, mapWooOrderLineItems } from "../mapping/wooDefaultMapping";

const DEFAULT_PAGE_SIZE = 50;

export class ExternalSyncServiceImpl implements IExternalSyncService {
  constructor(
    private readonly connectorRepository: IExternalConnectorRepository,
    private readonly externalDataRepository: IExternalDataRepository,
    private readonly mappingService: IExternalMappingService,
    private readonly wooClientFactory: IWooCommerceClientFactory,
    private readonly lookupService: IExternalLookupService
  ) {}

  async runSync(connectorId: string, request: ConnectorSyncRequest): Promise<ConnectorSyncResponse> {
    const connector = await this.connectorRepository.getConnectorById(connectorId);
    if (!connector) {
      throw new Error("Connector not found");
    }

    const credential = await this.connectorRepository.getCredential(connectorId);
    if (!credential) {
      throw new Error("Connector credentials not found");
    }

    const config = await this.connectorRepository.getSyncConfig(connectorId);
    const syncProducts = request.syncProducts && (config?.syncProducts ?? true);
    const syncOrders = request.syncOrders && (config?.syncOrders ?? true);

    const consumerKey = decryptSecret(credential.encryptedKey);
    const consumerSecret = decryptSecret(credential.encryptedSecret);
    const client = this.wooClientFactory.create(connector.baseUrl, consumerKey, consumerSecret);

    const runId = uuidv4();
    const startedAt = new Date();
    await this.connectorRepository.createSyncRun({
      id: runId,
      connectorId,
      status: "running",
      startedAt
    });

    const stats = {
      products: { total: 0, mapped: 0, failed: 0 },
      orders: { total: 0, mapped: 0, failed: 0 }
    };

    try {
      const mappings = config?.mappingsJson ?? {};
      const productRules = this.getRulesWithFallback(mappings, "productRules", defaultWooProductRules);
      const orderRules = this.getRulesWithFallback(mappings, "orderRules", defaultWooOrderRules);

      if (syncProducts) {
        await this.syncProducts(connectorId, client, productRules, stats.products);
      }

      if (syncOrders) {
        await this.syncOrders(connectorId, connector.type, client, orderRules, stats.orders);
      }

      await this.connectorRepository.updateSyncRun({
        id: runId,
        connectorId,
        status: "success",
        startedAt,
        finishedAt: new Date(),
        statsJson: stats
      });
    } catch (error) {
      await this.connectorRepository.updateSyncRun({
        id: runId,
        connectorId,
        status: "failed",
        startedAt,
        finishedAt: new Date(),
        statsJson: stats
      });

      throw error;
    }

    return { success: true, runId, status: "success" };
  }

  private parseRules(mappings: Record<string, unknown>, key: string): ExternalMappingRule[] {
    const candidate = mappings[key];
    if (!Array.isArray(candidate)) {
      return [];
    }

    return candidate.filter(rule => typeof rule === "object" && rule !== null) as ExternalMappingRule[];
  }

  private getRulesWithFallback(
    mappings: Record<string, unknown>,
    key: string,
    fallback: ExternalMappingRule[]
  ): ExternalMappingRule[] {
    const rules = this.parseRules(mappings, key);
    return rules.length > 0 ? rules : fallback;
  }

  private async syncProducts(
    connectorId: string,
    client: IWooCommerceClient,
    rules: ExternalMappingRule[],
    stats: { total: number; mapped: number; failed: number }
  ): Promise<void> {
    let page = 1;

    while (page) {
      const result = await client.listProducts({ page, perPage: DEFAULT_PAGE_SIZE });
      for (const item of result.items) {
        stats.total += 1;
        const rawId = (item as Record<string, unknown>).id;
        if (rawId === undefined || rawId === null) {
          stats.failed += 1;
          continue;
        }

        const externalId = String(rawId);
        const mapping = this.mappingService.mapExternalProduct(item, rules);
        const status: ExternalRecordStatus = mapping.errors.length > 0 ? "failed" : "mapped";

        const mappedPayload = mapping.errors.length > 0
          ? { ...mapping.mappedPayload, mappingErrors: mapping.errors }
          : mapping.mappedPayload;

        await this.externalDataRepository.upsertExternalRecord("product", {
          connectorId,
          externalId,
          rawPayload: item,
          mappedPayload,
          status
        });

        if (status === "mapped") {
          stats.mapped += 1;
        } else {
          stats.failed += 1;
        }
      }

      page = result.nextPage ?? 0;
    }
  }

  private async syncOrders(
    connectorId: string,
    source: string,
    client: IWooCommerceClient,
    rules: ExternalMappingRule[],
    stats: { total: number; mapped: number; failed: number }
  ): Promise<void> {
    let page = 1;

    while (page) {
      const result = await client.listOrders({ page, perPage: DEFAULT_PAGE_SIZE });
      for (const item of result.items) {
        stats.total += 1;
        const rawId = (item as Record<string, unknown>).id;
        if (rawId === undefined || rawId === null) {
          stats.failed += 1;
          continue;
        }

        const externalId = String(rawId);
        const mapping = this.mappingService.mapExternalOrder(item, rules);
        const mapped = await this.enrichOrderMapping(source, item, mapping.mappedPayload, mapping.errors);
        const status: ExternalRecordStatus = mapped.errors.length > 0 ? "failed" : "mapped";

        const mappedPayload = mapped.errors.length > 0
          ? { ...mapped.payload, mappingErrors: mapped.errors }
          : mapped.payload;

        await this.externalDataRepository.upsertExternalRecord("order", {
          connectorId,
          externalId,
          rawPayload: item,
          mappedPayload,
          status
        });

        if (status === "mapped") {
          stats.mapped += 1;
        } else {
          stats.failed += 1;
        }
      }

      page = result.nextPage ?? 0;
    }
  }

  private async enrichOrderMapping(
    source: string,
    rawOrder: Record<string, unknown>,
    mappedPayload: Record<string, unknown>,
    baseErrors: string[]
  ): Promise<{ payload: Record<string, unknown>; errors: string[] }> {
    const errors = [...baseErrors];
    const payload: Record<string, unknown> = { ...mappedPayload, type: "BUY" };

    const userEmail = mappedPayload.userEmail;
    if (typeof userEmail === "string" && userEmail.length > 0) {
      const userId = await this.lookupService.resolveUserIdByEmail(userEmail);
      if (userId) {
        payload.userId = userId;
      } else {
        errors.push(`User not found for email: ${userEmail}`);
      }
    } else {
      errors.push("Missing userEmail");
    }

    const itemMapping = mapWooOrderLineItems(rawOrder);
    if (itemMapping.errors.length > 0) {
      errors.push(...itemMapping.errors);
    }

    const mappedItems: Array<Record<string, unknown>> = [];
    for (const item of itemMapping.items) {
      const productId = await this.lookupService.resolveProductIdByExternalId(source, item.externalProductId);
      if (!productId) {
        errors.push(`Product not mapped: ${item.externalProductId}`);
        continue;
      }

      mappedItems.push({
        productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      });
    }

    payload.items = mappedItems;
    return { payload, errors };
  }
}
