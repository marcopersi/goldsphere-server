/**
 * Custodian Repository Implementation
 * PostgreSQL implementation of ICustodianRepository
 */

import { Pool } from 'pg';
import {
  CustodianEntity,
  ListCustodiansOptions,
  DeleteCustodianValidation,
} from '../types/CustodianTypes';
import { ICustodianRepository } from './ICustodianRepository';
import { AuditTrailUser, getAuditUser } from '../../../utils/auditTrail';

export class CustodianRepositoryImpl implements ICustodianRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(
    options: ListCustodiansOptions = {}
  ): Promise<{ custodians: CustodianEntity[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'custodianName',
      sortOrder = 'asc',
    } = options;

    // Build WHERE clause
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`custodianName ILIKE $${paramIndex++}`);
      queryParams.push(`%${search}%`);
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Map sortBy to column name
    const sortColumn = sortBy === 'createdAt' ? 'createdAt' : 'custodianName';
    // Validate sortDirection to prevent SQL injection
    const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM custodian ${whereClause}`;
    const countResult = await this.pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT id, custodianName, createdAt, updatedAt
      FROM custodian
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    queryParams.push(limit, offset);

    const dataResult = await this.pool.query(dataQuery, queryParams);

    return {
      custodians: dataResult.rows,
      total,
    };
  }

  async findById(id: string): Promise<CustodianEntity | null> {
    const query = `
      SELECT id, custodianName, createdAt, updatedAt
      FROM custodian
      WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByName(name: string): Promise<CustodianEntity | null> {
    const query = `
      SELECT id, custodianName, createdAt, updatedAt
      FROM custodian
      WHERE LOWER(custodianName) = LOWER($1)
    `;
    const result = await this.pool.query(query, [name]);
    return result.rows[0] || null;
  }

  async create(name: string, authenticatedUser?: AuditTrailUser): Promise<CustodianEntity> {
    const auditUser = getAuditUser(authenticatedUser);
    const query = `
      INSERT INTO custodian (custodianName, createdBy, updatedBy)
      VALUES ($1, $2, $3)
      RETURNING id, custodianName, createdAt, updatedAt
    `;
    const result = await this.pool.query(query, [name, auditUser.id, auditUser.id]);
    return result.rows[0];
  }

  async update(id: string, name: string, authenticatedUser?: AuditTrailUser): Promise<CustodianEntity> {
    const auditUser = getAuditUser(authenticatedUser);
    const query = `
      UPDATE custodian
      SET custodianName = $1, updatedAt = CURRENT_TIMESTAMP, updatedBy = $2
      WHERE id = $3
      RETURNING id, custodianName, createdAt, updatedAt
    `;
    const result = await this.pool.query(query, [name, auditUser.id, id]);
    return result.rows[0];
  }

  async delete(id: string, _authenticatedUser?: AuditTrailUser): Promise<void> {
    const query = `DELETE FROM custodian WHERE id = $1`;
    await this.pool.query(query, [id]);
  }

  async canDelete(id: string): Promise<DeleteCustodianValidation> {
    const query = `
      SELECT COUNT(*) as count
      FROM custodyService
      WHERE custodianId = $1
    `;
    const result = await this.pool.query(query, [id]);
    const count = parseInt(result.rows[0].count, 10);

    if (count > 0) {
      return {
        canDelete: false,
        reason: 'Cannot delete custodian with existing custody services',
        custodyServiceCount: count,
      };
    }

    return { canDelete: true };
  }

  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    let query = `
      SELECT id FROM custodian
      WHERE LOWER(custodianName) = LOWER($1)
    `;
    const params: any[] = [name];

    if (excludeId) {
      query += ` AND id != $2`;
      params.push(excludeId);
    }

    const result = await this.pool.query(query, params);
    return result.rows.length > 0;
  }
}
