/**
 * Connector Service Implementation
 * 
 * Orchestrates admin connectivity operations.
 */

import { v4 as uuidv4 } from "uuid";
import { AuditTrailUser } from "../../../utils/auditTrail";
import { IConnectorService } from "../IConnectorService";
import { IExternalConnectorRepository } from "../repository/IExternalConnectorRepository";
import { IExternalSyncService } from "../IExternalSyncService";
import { IWooCommerceClientFactory } from "../client/IWooCommerceClientFactory";
import {
  ConnectorCreateRequest,
  ConnectorSummary,
  ConnectorSyncRequest,
  ConnectorSyncResponse,
  ConnectorTestResponse,
  ConnectorUpdateRequest
} from "../types/ConnectorTypes";
import { ExternalSyncRunRecord } from "../types/ExternalTypes";
import { decryptSecret, encryptSecret } from "../../../utils/crypto";

export class ConnectorServiceImpl implements IConnectorService {
  constructor(
    private readonly connectorRepository: IExternalConnectorRepository,
    private readonly externalSyncService: IExternalSyncService,
    private readonly wooClientFactory: IWooCommerceClientFactory
  ) {}

  async listConnectors(): Promise<ConnectorSummary[]> {
    const connectors = await this.connectorRepository.listConnectors();
    const summaries: ConnectorSummary[] = [];

    for (const connector of connectors) {
      const config = await this.connectorRepository.getSyncConfig(connector.id);
      const runs = await this.connectorRepository.listSyncRuns(connector.id);
      const lastRun = runs[0];

      summaries.push({
        id: connector.id,
        type: connector.type,
        baseUrl: connector.baseUrl,
        status: connector.status,
        lastTestAt: connector.lastTestAt?.toISOString(),
        syncProducts: config?.syncProducts ?? false,
        syncOrders: config?.syncOrders ?? false,
        lastRun: lastRun ? {
          id: lastRun.id,
          status: lastRun.status,
          startedAt: lastRun.startedAt.toISOString(),
          finishedAt: lastRun.finishedAt?.toISOString(),
          stats: lastRun.statsJson
        } : undefined
      });
    }

    return summaries;
  }

  async createConnector(
    request: ConnectorCreateRequest,
    authenticatedUser?: AuditTrailUser
  ): Promise<ConnectorSummary> {
    const connectorId = uuidv4();
    const connectorRecord = {
      id: connectorId,
      type: request.type,
      baseUrl: request.baseUrl,
      status: "active" as const,
      lastTestAt: undefined
    };

    await this.connectorRepository.createConnector(connectorRecord, authenticatedUser);
    await this.connectorRepository.upsertCredential({
      connectorId,
      encryptedKey: encryptSecret(request.consumerKey),
      encryptedSecret: encryptSecret(request.consumerSecret)
    }, authenticatedUser);
    await this.connectorRepository.upsertSyncConfig({
      connectorId,
      syncProducts: request.syncProducts,
      syncOrders: request.syncOrders,
      mappingsJson: {}
    }, authenticatedUser);

    return {
      id: connectorId,
      type: request.type,
      baseUrl: request.baseUrl,
      status: "active",
      syncProducts: request.syncProducts,
      syncOrders: request.syncOrders
    };
  }

  async updateConnector(
    id: string,
    request: ConnectorUpdateRequest,
    authenticatedUser?: AuditTrailUser
  ): Promise<ConnectorSummary> {
    const connector = await this.connectorRepository.getConnectorById(id);
    if (!connector) {
      throw new Error("Connector not found");
    }

    await this.connectorRepository.updateConnector({
      ...connector,
      baseUrl: request.baseUrl
    }, authenticatedUser);

    if (request.consumerKey || request.consumerSecret) {
      const credential = await this.connectorRepository.getCredential(id);
      if (!credential) {
        throw new Error("Connector credentials not found");
      }

      await this.connectorRepository.upsertCredential({
        connectorId: id,
        encryptedKey: request.consumerKey ? encryptSecret(request.consumerKey) : credential.encryptedKey,
        encryptedSecret: request.consumerSecret ? encryptSecret(request.consumerSecret) : credential.encryptedSecret
      }, authenticatedUser);
    }

    await this.connectorRepository.upsertSyncConfig({
      connectorId: id,
      syncProducts: request.syncProducts,
      syncOrders: request.syncOrders,
      mappingsJson: (await this.connectorRepository.getSyncConfig(id))?.mappingsJson ?? {}
    }, authenticatedUser);

    return {
      id,
      type: connector.type,
      baseUrl: request.baseUrl,
      status: connector.status,
      lastTestAt: connector.lastTestAt?.toISOString(),
      syncProducts: request.syncProducts,
      syncOrders: request.syncOrders
    };
  }

  async testConnector(id: string): Promise<ConnectorTestResponse> {
    const connector = await this.connectorRepository.getConnectorById(id);
    if (!connector) {
      throw new Error("Connector not found");
    }

    const credential = await this.connectorRepository.getCredential(id);
    if (!credential) {
      throw new Error("Connector credentials not found");
    }

    const consumerKey = decryptSecret(credential.encryptedKey);
    const consumerSecret = decryptSecret(credential.encryptedSecret);
    const client = this.wooClientFactory.create(connector.baseUrl, consumerKey, consumerSecret);

    await client.testConnection();

    await this.connectorRepository.updateConnector({
      ...connector,
      status: "active",
      lastTestAt: new Date()
    });

    return { success: true, message: "Connection successful" };
  }

  async syncConnector(_id: string, _request: ConnectorSyncRequest): Promise<ConnectorSyncResponse> {
    return this.externalSyncService.runSync(_id, _request);
  }

  async listSyncRuns(_id: string): Promise<ExternalSyncRunRecord[]> {
    return this.connectorRepository.listSyncRuns(_id);
  }
}
