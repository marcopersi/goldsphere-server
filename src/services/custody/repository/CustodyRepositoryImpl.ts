/**
 * Custody Service Repository Implementation
 * PostgreSQL implementation of ICustodyRepository
 */

import { Pool } from 'pg';
import {
  CustodyServiceEntity,
  ListCustodyServicesOptions,
  DeleteCustodyServiceValidation,
  CustodianWithServices,
  mapEntityToDTO,
} from '../types/CustodyTypes';
import { ICustodyRepository } from './ICustodyRepository';
import * as queries from './CustodyQueries';
import { AuditTrailUser, getAuditUser } from '../../../utils/auditTrail';

export class CustodyRepositoryImpl implements ICustodyRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(
    options: ListCustodyServicesOptions = {}
  ): Promise<{ custodyServices: CustodyServiceEntity[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      custodianId,
      minFee,
      maxFee,
      paymentFrequency,
      currency,
      sortBy = 'custodyServiceName',
      sortOrder = 'asc',
    } = options;

    // Build WHERE clause
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`cs.custodyServiceName ILIKE $${paramIndex++}`);
      queryParams.push(`%${search}%`);
    }

    if (custodianId) {
      whereConditions.push(`cs.custodianId = $${paramIndex++}`);
      queryParams.push(custodianId);
    }

    if (minFee !== undefined) {
      whereConditions.push(`cs.fee >= $${paramIndex++}`);
      queryParams.push(minFee);
    }

    if (maxFee !== undefined) {
      whereConditions.push(`cs.fee <= $${paramIndex++}`);
      queryParams.push(maxFee);
    }

    if (paymentFrequency) {
      whereConditions.push(`cs.paymentFrequency = $${paramIndex++}`);
      queryParams.push(paymentFrequency);
    }

    if (currency) {
      whereConditions.push(`curr.isoCode3 = $${paramIndex++}`);
      queryParams.push(currency);
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Map sortBy to column name
    const validSortColumns = ['custodyServiceName', 'fee', 'createdAt'];
    const sortColumn = validSortColumns.includes(sortBy)
      ? sortBy
      : 'custodyServiceName';
    // Validate sortDirection to prevent SQL injection
    const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM custodyService cs
      JOIN custodian c ON cs.custodianId = c.id
      JOIN currency curr ON cs.currencyId = curr.id
      ${whereClause}
    `;
    const countResult = await this.pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT 
        cs.id, cs.custodyServiceName, cs.custodianId, cs.fee, 
        cs.paymentFrequency, cs.currencyId, cs.minWeight, cs.maxWeight,
        cs.createdAt, cs.updatedAt,
        c.custodianName, curr.isoCode3 as currency
      FROM custodyService cs
      JOIN custodian c ON cs.custodianId = c.id
      JOIN currency curr ON cs.currencyId = curr.id
      ${whereClause}
      ORDER BY cs.${sortColumn} ${sortDirection}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    queryParams.push(limit, offset);

    const dataResult = await this.pool.query(dataQuery, queryParams);

    return {
      custodyServices: dataResult.rows,
      total,
    };
  }

  async findById(id: string): Promise<CustodyServiceEntity | null> {
    const result = await this.pool.query(queries.GET_CUSTODY_SERVICE_BY_ID, [id]);
    return result.rows[0] || null;
  }

  async findByCustodianId(custodianId: string): Promise<CustodyServiceEntity[]> {
    const result = await this.pool.query(queries.GET_CUSTODY_SERVICES_BY_CUSTODIAN, [custodianId]);
    return result.rows;
  }

  async findDefault(): Promise<CustodyServiceEntity | null> {
    const result = await this.pool.query(queries.GET_DEFAULT_CUSTODY_SERVICE);
    return result.rows[0] || null;
  }

  async getCustodiansWithServices(
    search?: string
  ): Promise<CustodianWithServices[]> {
    let whereClause = '';
    const queryParams: any[] = [];

    if (search) {
      whereClause = 'WHERE LOWER(c.custodianName) ILIKE LOWER($1)';
      queryParams.push(`%${search}%`);
    }

    const query = `
      SELECT 
        c.id as custodianId, c.custodianName,
        cs.id as serviceId, cs.custodyServiceName, cs.fee,
        cs.paymentFrequency, cs.currencyId, cs.minWeight, cs.maxWeight,
        cs.createdAt, cs.updatedAt,
        curr.isoCode3 as currency
      FROM custodian c
      LEFT JOIN custodyService cs ON c.id = cs.custodianId
      LEFT JOIN currency curr ON cs.currencyId = curr.id
      ${whereClause}
      ORDER BY c.custodianName ASC, cs.custodyServiceName ASC
    `;

    const result = await this.pool.query(query, queryParams);

    // Group services by custodian
    const custodiansMap = new Map<string, CustodianWithServices>();

    for (const row of result.rows) {
      let custodian = custodiansMap.get(row.custodianid);

      if (!custodian) {
        custodian = {
          custodianId: row.custodianid,
          custodianName: row.custodianname,
          services: [],
        };
        custodiansMap.set(row.custodianid, custodian);
      }

      // Add service if it exists
      if (row.serviceid) {
        custodian.services.push(
          mapEntityToDTO({
            id: row.serviceid,
            custodyservicename: row.custodyservicename,
            custodianid: row.custodianid,
            custodianname: row.custodianname,
            fee: row.fee,
            paymentfrequency: row.paymentfrequency,
            currencyid: row.currencyid,
            currency: row.currency,
            minweight: row.minweight,
            maxweight: row.maxweight,
            createdat: row.createdat,
            updatedat: row.updatedat,
          })
        );
      }
    }

    return Array.from(custodiansMap.values());
  }

  async create(data: {
    custodyServiceName: string;
    custodianId: string;
    fee: number;
    paymentFrequency: 'monthly' | 'quarterly' | 'annual' | 'onetime';
    currencyId: string;
    minWeight?: number | null;
    maxWeight?: number | null;
  }, authenticatedUser: AuditTrailUser): Promise<CustodyServiceEntity> {
    const auditUser = getAuditUser(authenticatedUser);
    const result = await this.pool.query(queries.INSERT_CUSTODY_SERVICE, [
      data.custodyServiceName, data.custodianId, data.fee, data.paymentFrequency,
      data.currencyId, data.minWeight || null, data.maxWeight || null,
      auditUser.id, auditUser.id,
    ]);
    return (await this.findById(result.rows[0].id))!;
  }

  async update(id: string, data: {
    custodyServiceName?: string;
    custodianId?: string;
    fee?: number;
    paymentFrequency?: 'monthly' | 'quarterly' | 'annual' | 'onetime';
    currencyId?: string;
    minWeight?: number | null;
    maxWeight?: number | null;
  }, authenticatedUser: AuditTrailUser): Promise<CustodyServiceEntity> {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let idx = 1;

    if (data.custodyServiceName !== undefined) { updates.push(`custodyServiceName = $${idx++}`); values.push(data.custodyServiceName); }
    if (data.custodianId !== undefined) { updates.push(`custodianId = $${idx++}`); values.push(data.custodianId); }
    if (data.fee !== undefined) { updates.push(`fee = $${idx++}`); values.push(data.fee); }
    if (data.paymentFrequency !== undefined) { updates.push(`paymentFrequency = $${idx++}`); values.push(data.paymentFrequency); }
    if (data.currencyId !== undefined) { updates.push(`currencyId = $${idx++}`); values.push(data.currencyId); }
    if (data.minWeight !== undefined) { updates.push(`minWeight = $${idx++}`); values.push(data.minWeight); }
    if (data.maxWeight !== undefined) { updates.push(`maxWeight = $${idx++}`); values.push(data.maxWeight); }

    const auditUser = getAuditUser(authenticatedUser);
    updates.push(`updatedBy = $${idx++}`);
    values.push(auditUser.id);
    updates.push(`updatedAt = CURRENT_TIMESTAMP`);
    values.push(id);

    await this.pool.query(`UPDATE custodyService SET ${updates.join(', ')} WHERE id = $${idx}`, values);
    return (await this.findById(id))!;
  }

  async delete(id: string, _authenticatedUser: AuditTrailUser): Promise<void> {
    await this.pool.query(queries.DELETE_CUSTODY_SERVICE, [id]);
  }

  async canDelete(id: string): Promise<DeleteCustodyServiceValidation> {
    const result = await this.pool.query(queries.COUNT_POSITIONS_FOR_SERVICE, [id]);
    const count = parseInt(result.rows[0].count, 10);
    if (count > 0) {
      return { canDelete: false, reason: 'Cannot delete custody service with active positions', activePositionCount: count };
    }
    return { canDelete: true };
  }

  async serviceNameExists(
    custodianId: string,
    serviceName: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = `
      SELECT id FROM custodyService
      WHERE custodianId = $1 AND LOWER(custodyServiceName) = LOWER($2)
    `;
    const params: any[] = [custodianId, serviceName];

    if (excludeId) {
      query += ` AND id != $3`;
      params.push(excludeId);
    }

    const result = await this.pool.query(query, params);
    return result.rows.length > 0;
  }

  async custodianExists(custodianId: string): Promise<boolean> {
    const query = `SELECT id FROM custodian WHERE id = $1`;
    const result = await this.pool.query(query, [custodianId]);
    return result.rows.length > 0;
  }

  async currencyExists(currencyId: string): Promise<boolean> {
    const query = `SELECT id FROM currency WHERE id = $1`;
    const result = await this.pool.query(query, [currencyId]);
    return result.rows.length > 0;
  }
  
  async getCurrencyIdByCode(isoCode: string): Promise<string | null> {
    const query = `SELECT id FROM currency WHERE isocode3 = $1`;
    const result = await this.pool.query(query, [isoCode]);
    return result.rows.length > 0 ? result.rows[0].id : null;
  }
}
