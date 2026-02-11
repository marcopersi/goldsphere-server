/**
 * External Connector Repository Interface
 * 
 * Defines persistence for connector configuration and runs.
 */

import { AuditTrailUser } from "../../../utils/auditTrail";
import { ExternalConnectorRecord, ExternalCredentialRecord, ExternalSyncConfigRecord, ExternalSyncRunRecord } from "../types/ExternalTypes";

export interface IExternalConnectorRepository {
  listConnectors(): Promise<ExternalConnectorRecord[]>;
  getConnectorById(id: string): Promise<ExternalConnectorRecord | null>;
  createConnector(connector: ExternalConnectorRecord, authenticatedUser?: AuditTrailUser): Promise<void>;
  updateConnector(connector: ExternalConnectorRecord, authenticatedUser?: AuditTrailUser): Promise<void>;
  upsertCredential(credential: ExternalCredentialRecord, authenticatedUser?: AuditTrailUser): Promise<void>;
  getCredential(connectorId: string): Promise<ExternalCredentialRecord | null>;
  upsertSyncConfig(config: ExternalSyncConfigRecord, authenticatedUser?: AuditTrailUser): Promise<void>;
  getSyncConfig(connectorId: string): Promise<ExternalSyncConfigRecord | null>;
  createSyncRun(run: ExternalSyncRunRecord): Promise<void>;
  updateSyncRun(run: ExternalSyncRunRecord): Promise<void>;
  listSyncRuns(connectorId: string): Promise<ExternalSyncRunRecord[]>;
}
