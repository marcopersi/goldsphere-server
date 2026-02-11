/**
 * Connector Types
 * 
 * Shared DTOs for admin connectivity endpoints.
 */

export type ConnectorType = 'woocommerce';

export type ConnectorStatus = 'active' | 'disabled' | 'error';

export type SyncRunStatus = 'running' | 'success' | 'failed';

export interface ConnectorRunSummary {
  id: string;
  status: SyncRunStatus;
  startedAt: string;
  finishedAt?: string;
  stats?: Record<string, unknown>;
}

export interface ConnectorSummary {
  id: string;
  type: ConnectorType;
  baseUrl: string;
  status: ConnectorStatus;
  lastTestAt?: string;
  syncProducts: boolean;
  syncOrders: boolean;
  lastRun?: ConnectorRunSummary;
}

export interface ConnectorCreateRequest {
  type: ConnectorType;
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  syncProducts: boolean;
  syncOrders: boolean;
}

export interface ConnectorUpdateRequest {
  baseUrl: string;
  consumerKey?: string;
  consumerSecret?: string;
  syncProducts: boolean;
  syncOrders: boolean;
}

export interface ConnectorSyncRequest {
  syncProducts: boolean;
  syncOrders: boolean;
}

export interface ConnectorListResponse {
  success: true;
  connectors: ConnectorSummary[];
}

export interface ConnectorCreateResponse {
  success: true;
  connector: ConnectorSummary;
}

export interface ConnectorUpdateResponse {
  success: true;
  connector: ConnectorSummary;
}

export interface ConnectorTestResponse {
  success: true;
  message: string;
}

export interface ConnectorSyncResponse {
  success: true;
  runId: string;
  status: SyncRunStatus;
}

export interface ConnectorRunsResponse {
  success: true;
  runs: ConnectorRunSummary[];
}
