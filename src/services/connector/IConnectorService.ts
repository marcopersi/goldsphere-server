/**
 * Connector Service Interface
 * 
 * Defines the admin connectivity operations.
 */

import { AuditTrailUser } from "../../utils/auditTrail";
import {
  ConnectorCreateRequest,
  ConnectorSummary,
  ConnectorSyncRequest,
  ConnectorSyncResponse,
  ConnectorTestResponse,
  ConnectorUpdateRequest
} from "./types/ConnectorTypes";
import { ExternalSyncRunRecord } from "./types/ExternalTypes";

export interface IConnectorService {
  listConnectors(): Promise<ConnectorSummary[]>;
  createConnector(request: ConnectorCreateRequest, authenticatedUser?: AuditTrailUser): Promise<ConnectorSummary>;
  updateConnector(id: string, request: ConnectorUpdateRequest, authenticatedUser?: AuditTrailUser): Promise<ConnectorSummary>;
  testConnector(id: string): Promise<ConnectorTestResponse>;
  syncConnector(id: string, request: ConnectorSyncRequest): Promise<ConnectorSyncResponse>;
  listSyncRuns(id: string): Promise<ExternalSyncRunRecord[]>;
}
