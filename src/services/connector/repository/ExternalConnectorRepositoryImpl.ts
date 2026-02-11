/**
 * External Connector Repository Implementation
 * 
 * Handles database access using the pg pool.
 */

import { Pool } from "pg";
import { AuditTrailUser, getAuditUser } from "../../../utils/auditTrail";
import { IExternalConnectorRepository } from "./IExternalConnectorRepository";
import { ExternalConnectorRecord, ExternalCredentialRecord, ExternalSyncConfigRecord, ExternalSyncRunRecord } from "../types/ExternalTypes";

export class ExternalConnectorRepositoryImpl implements IExternalConnectorRepository {
  constructor(private readonly pool: Pool) {}

  async listConnectors(): Promise<ExternalConnectorRecord[]> {
    const result = await this.pool.query(
      `
        SELECT id, type, base_url, status, last_test_at
        FROM external_connector
        ORDER BY createdat DESC
      `
    );

    return result.rows.map(row => ({
      id: row.id,
      type: row.type,
      baseUrl: row.base_url,
      status: row.status,
      lastTestAt: row.last_test_at ? new Date(row.last_test_at) : undefined
    }));
  }

  async getConnectorById(_id: string): Promise<ExternalConnectorRecord | null> {
    const result = await this.pool.query(
      `
        SELECT id, type, base_url, status, last_test_at
        FROM external_connector
        WHERE id = $1
      `,
      [_id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      type: row.type,
      baseUrl: row.base_url,
      status: row.status,
      lastTestAt: row.last_test_at ? new Date(row.last_test_at) : undefined
    };
  }

  async createConnector(_connector: ExternalConnectorRecord, _authenticatedUser?: AuditTrailUser): Promise<void> {
    const auditUser = getAuditUser(_authenticatedUser);
    const now = new Date().toISOString();

    await this.pool.query(
      `
        INSERT INTO external_connector (
          id, type, base_url, status, last_test_at,
          createdBy, updatedBy, createdat, updatedat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        _connector.id,
        _connector.type,
        _connector.baseUrl,
        _connector.status,
        _connector.lastTestAt ?? null,
        auditUser.id,
        auditUser.id,
        now,
        now
      ]
    );
  }

  async updateConnector(_connector: ExternalConnectorRecord, _authenticatedUser?: AuditTrailUser): Promise<void> {
    const auditUser = getAuditUser(_authenticatedUser);
    const now = new Date().toISOString();

    await this.pool.query(
      `
        UPDATE external_connector
        SET base_url = $2,
            status = $3,
            last_test_at = $4,
            updatedBy = $5,
            updatedat = $6
        WHERE id = $1
      `,
      [
        _connector.id,
        _connector.baseUrl,
        _connector.status,
        _connector.lastTestAt ?? null,
        auditUser.id,
        now
      ]
    );
  }

  async upsertCredential(_credential: ExternalCredentialRecord, _authenticatedUser?: AuditTrailUser): Promise<void> {
    const auditUser = getAuditUser(_authenticatedUser);
    const now = new Date().toISOString();

    await this.pool.query(
      `
        INSERT INTO external_credential (
          connector_id, encrypted_key, encrypted_secret,
          createdBy, updatedBy, createdat, updatedat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (connector_id)
        DO UPDATE SET
          encrypted_key = EXCLUDED.encrypted_key,
          encrypted_secret = EXCLUDED.encrypted_secret,
          updatedBy = $5,
          updatedat = $7
      `,
      [
        _credential.connectorId,
        _credential.encryptedKey,
        _credential.encryptedSecret,
        auditUser.id,
        auditUser.id,
        now,
        now
      ]
    );
  }

  async getCredential(connectorId: string): Promise<ExternalCredentialRecord | null> {
    const result = await this.pool.query(
      `
        SELECT connector_id, encrypted_key, encrypted_secret
        FROM external_credential
        WHERE connector_id = $1
      `,
      [connectorId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      connectorId: result.rows[0].connector_id,
      encryptedKey: result.rows[0].encrypted_key,
      encryptedSecret: result.rows[0].encrypted_secret
    };
  }

  async upsertSyncConfig(_config: ExternalSyncConfigRecord, _authenticatedUser?: AuditTrailUser): Promise<void> {
    const auditUser = getAuditUser(_authenticatedUser);
    const now = new Date().toISOString();

    await this.pool.query(
      `
        INSERT INTO external_sync_config (
          connector_id, sync_products, sync_orders, mappings_json,
          createdBy, updatedBy, createdat, updatedat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (connector_id)
        DO UPDATE SET
          sync_products = EXCLUDED.sync_products,
          sync_orders = EXCLUDED.sync_orders,
          mappings_json = EXCLUDED.mappings_json,
          updatedBy = $6,
          updatedat = $8
      `,
      [
        _config.connectorId,
        _config.syncProducts,
        _config.syncOrders,
        _config.mappingsJson,
        auditUser.id,
        auditUser.id,
        now,
        now
      ]
    );
  }

  async getSyncConfig(_connectorId: string): Promise<ExternalSyncConfigRecord | null> {
    const result = await this.pool.query(
      `
        SELECT connector_id, sync_products, sync_orders, mappings_json
        FROM external_sync_config
        WHERE connector_id = $1
      `,
      [_connectorId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      connectorId: row.connector_id,
      syncProducts: row.sync_products,
      syncOrders: row.sync_orders,
      mappingsJson: row.mappings_json ?? {}
    };
  }

  async createSyncRun(_run: ExternalSyncRunRecord): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO external_sync_run (
          id, connector_id, status, started_at, finished_at, stats_json
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        _run.id,
        _run.connectorId,
        _run.status,
        _run.startedAt,
        _run.finishedAt ?? null,
        _run.statsJson ?? {}
      ]
    );
  }

  async updateSyncRun(_run: ExternalSyncRunRecord): Promise<void> {
    await this.pool.query(
      `
        UPDATE external_sync_run
        SET status = $2,
            finished_at = $3,
            stats_json = $4
        WHERE id = $1
      `,
      [
        _run.id,
        _run.status,
        _run.finishedAt ?? null,
        _run.statsJson ?? {}
      ]
    );
  }

  async listSyncRuns(_connectorId: string): Promise<ExternalSyncRunRecord[]> {
    const result = await this.pool.query(
      `
        SELECT id, connector_id, status, started_at, finished_at, stats_json
        FROM external_sync_run
        WHERE connector_id = $1
        ORDER BY started_at DESC
      `,
      [_connectorId]
    );

    return result.rows.map(row => ({
      id: row.id,
      connectorId: row.connector_id,
      status: row.status,
      startedAt: new Date(row.started_at),
      finishedAt: row.finished_at ? new Date(row.finished_at) : undefined,
      statsJson: row.stats_json ?? {}
    }));
  }
}
