/**
 * External Sync Service Interface
 * 
 * Defines the sync pipeline entry point.
 */

import { ConnectorSyncRequest, ConnectorSyncResponse } from "./types/ConnectorTypes";

export interface IExternalSyncService {
  runSync(connectorId: string, request: ConnectorSyncRequest): Promise<ConnectorSyncResponse>;
}
