/**
 * External Data Repository Implementation
 * 
 * Handles raw and mapped payload persistence.
 */

import { Pool } from "pg";
import { AuditTrailUser, getAuditUser } from "../../../utils/auditTrail";
import { IExternalDataRepository, ExternalDataRecord } from "./IExternalDataRepository";
import { ExternalEntityType, ExternalReferenceRecord } from "../types/ExternalTypes";

export class ExternalDataRepositoryImpl implements IExternalDataRepository {
  constructor(private readonly pool: Pool) {}

  async upsertExternalRecord(
    entityType: ExternalEntityType,
    record: ExternalDataRecord,
    authenticatedUser?: AuditTrailUser
  ): Promise<void> {
    const auditUser = getAuditUser(authenticatedUser);
    const table = entityType === "product" ? "external_product" : "external_order";

    const query = `
      INSERT INTO ${table} (
        connector_id, external_id, raw_payload_json, mapped_payload_json, status,
        createdBy, updatedBy, createdat, updatedat
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (connector_id, external_id)
      DO UPDATE SET
        raw_payload_json = EXCLUDED.raw_payload_json,
        mapped_payload_json = EXCLUDED.mapped_payload_json,
        status = EXCLUDED.status,
        updatedBy = $7,
        updatedat = $9
    `;

    const now = new Date().toISOString();
    await this.pool.query(query, [
      record.connectorId,
      record.externalId,
      record.rawPayload,
      record.mappedPayload ?? null,
      record.status,
      auditUser.id,
      auditUser.id,
      now,
      now
    ]);
  }

  async getExternalReference(
    source: string,
    entityType: ExternalEntityType,
    externalId: string
  ): Promise<ExternalReferenceRecord | null> {
    const result = await this.pool.query(
      `
        SELECT source, entity_type, external_id, internal_id
        FROM external_reference
        WHERE source = $1 AND entity_type = $2 AND external_id = $3
      `,
      [source, entityType, externalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      source: result.rows[0].source,
      entityType: result.rows[0].entity_type,
      externalId: result.rows[0].external_id,
      internalId: result.rows[0].internal_id
    };
  }

  async upsertExternalReference(reference: ExternalReferenceRecord, authenticatedUser?: AuditTrailUser): Promise<void> {
    const auditUser = getAuditUser(authenticatedUser);
    const now = new Date().toISOString();

    await this.pool.query(
      `
        INSERT INTO external_reference (
          source, entity_type, external_id, internal_id,
          createdBy, updatedBy, createdat, updatedat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (source, entity_type, external_id)
        DO UPDATE SET
          internal_id = EXCLUDED.internal_id,
          updatedBy = $6,
          updatedat = $8
      `,
      [
        reference.source,
        reference.entityType,
        reference.externalId,
        reference.internalId,
        auditUser.id,
        auditUser.id,
        now,
        now
      ]
    );
  }
}
