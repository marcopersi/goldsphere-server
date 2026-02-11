/**
 * External Data Repository Interface
 * 
 * Defines persistence for raw and mapped external payloads.
 */

import { AuditTrailUser } from "../../../utils/auditTrail";
import { ExternalEntityType, ExternalRecordStatus, ExternalReferenceRecord } from "../types/ExternalTypes";

export interface ExternalDataRecord {
  connectorId: string;
  externalId: string;
  rawPayload: Record<string, unknown>;
  mappedPayload?: Record<string, unknown>;
  status: ExternalRecordStatus;
}

export interface IExternalDataRepository {
  upsertExternalRecord(
    entityType: ExternalEntityType,
    record: ExternalDataRecord,
    authenticatedUser?: AuditTrailUser
  ): Promise<void>;
  getExternalReference(source: string, entityType: ExternalEntityType, externalId: string): Promise<ExternalReferenceRecord | null>;
  upsertExternalReference(reference: ExternalReferenceRecord, authenticatedUser?: AuditTrailUser): Promise<void>;
}
