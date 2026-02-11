/**
 * External Connector Types
 * 
 * Shared domain types for external connector services.
 */

import { ConnectorStatus, ConnectorType, SyncRunStatus } from "./ConnectorTypes";

export type ExternalSource = ConnectorType;

export type ExternalEntityType = "product" | "order";

export type ExternalRecordStatus = "pending" | "mapped" | "failed";

export interface ExternalConnectorRecord {
  id: string;
  type: ConnectorType;
  baseUrl: string;
  status: ConnectorStatus;
  lastTestAt?: Date;
}

export interface ExternalCredentialRecord {
  connectorId: string;
  encryptedKey: string;
  encryptedSecret: string;
}

export interface ExternalSyncConfigRecord {
  connectorId: string;
  syncProducts: boolean;
  syncOrders: boolean;
  mappingsJson: Record<string, unknown>;
}

export interface ExternalSyncRunRecord {
  id: string;
  connectorId: string;
  status: SyncRunStatus;
  startedAt: Date;
  finishedAt?: Date;
  statsJson?: Record<string, unknown>;
}

export interface ExternalReferenceRecord {
  source: ExternalSource;
  entityType: ExternalEntityType;
  externalId: string;
  internalId: string;
}

export type MappingTransformType = "enum" | "number" | "currency" | "string" | "boolean" | "lowercase" | "stockStatus";

export interface MappingTransform {
  type: MappingTransformType;
  map?: Record<string, string>;
}

export interface ExternalMappingRule {
  sourceField: string;
  targetField: string;
  required?: boolean;
  transform?: MappingTransform;
}

export interface ExternalMappingResult {
  mappedPayload: Record<string, unknown>;
  errors: string[];
}
