/**
 * Portfolio Repository Implementation
 * 
 * Handles database operations for portfolio management using DI
 * All SQL queries are encapsulated here
 */

import { Pool } from 'pg';
import { CommonPaginationSchema } from '@marcopersi/shared';
import { IPortfolioRepository } from './IPortfolioRepository';
import {
  PortfolioSummary,
  PortfolioWithPositions,
  ListPortfoliosOptions,
  GetPortfoliosResult,
} from '../types/PortfolioTypes';
import { PORTFOLIO_STATS_SUBQUERY, PORTFOLIO_SELECT_FIELDS, SORT_COLUMN_MAP } from './PortfolioQueries';
import { mapRowToSummary, mapRowToPosition } from './PortfolioMappers';
import { AuditTrailUser, getAuditUser } from '../../../utils/auditTrail';

export class PortfolioRepositoryImpl implements IPortfolioRepository {
  constructor(private readonly pool: Pool) {}

  async getAllPortfolios(options: ListPortfoliosOptions): Promise<GetPortfoliosResult> {
    return this.queryPortfolios(options);
  }

  async getUserPortfolios(userId: string, options: ListPortfoliosOptions): Promise<GetPortfoliosResult> {
    return this.queryPortfolios({ ...options, ownerId: userId });
  }

  private async queryPortfolios(options: ListPortfoliosOptions): Promise<GetPortfoliosResult> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const { whereClause, params } = this.buildWhereClause(options);
    const orderByColumn = SORT_COLUMN_MAP[sortBy] || 'p.createdat';

    const baseQuery = `
      FROM public.portfolio p
      LEFT JOIN (${PORTFOLIO_STATS_SUBQUERY}) portfolio_stats ON p.id = portfolio_stats.portfolioid
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query(
        `SELECT ${PORTFOLIO_SELECT_FIELDS} ${baseQuery} ORDER BY ${orderByColumn} ${sortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      this.pool.query(`SELECT COUNT(*) as count ${baseQuery}`, params),
    ]);

    const total = Number.parseInt(countResult.rows[0]?.count || '0', 10);
    const portfolios: PortfolioSummary[] = dataResult.rows.map(mapRowToSummary);

    const pagination = CommonPaginationSchema.parse({
      page, limit, total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: offset + portfolios.length < total,
      hasPrevious: page > 1,
    });

    return { portfolios, pagination };
  }

  private buildWhereClause(options: ListPortfoliosOptions): { whereClause: string; params: (string | number | boolean)[] } {
    const conditions: string[] = [];
    const params: (string | number | boolean)[] = [];
    let idx = 1;

    if (options.ownerId) {
      conditions.push(`p.ownerid = $${idx++}`);
      params.push(options.ownerId);
    }
    if (typeof options.isActive === 'boolean') {
      conditions.push(`COALESCE(p.isactive, true) = $${idx++}`);
      params.push(options.isActive);
    }
    if (options.search) {
      conditions.push(`(p.portfolioname ILIKE $${idx} OR p.description ILIKE $${idx})`);
      params.push(`%${options.search}%`);
      idx++;
    }
    if (options.minValue !== undefined) {
      conditions.push(`portfolio_stats.total_value >= $${idx++}`);
      params.push(options.minValue);
    }
    if (options.maxValue !== undefined) {
      conditions.push(`portfolio_stats.total_value <= $${idx++}`);
      params.push(options.maxValue);
    }
    if (options.minPositionCount !== undefined) {
      conditions.push(`portfolio_stats.position_count >= $${idx++}`);
      params.push(options.minPositionCount);
    }
    if (options.maxPositionCount !== undefined) {
      conditions.push(`portfolio_stats.position_count <= $${idx++}`);
      params.push(options.maxPositionCount);
    }
    if (options.minGainLoss !== undefined) {
      conditions.push(`portfolio_stats.total_gain_loss >= $${idx++}`);
      params.push(options.minGainLoss);
    }
    if (options.maxGainLoss !== undefined) {
      conditions.push(`portfolio_stats.total_gain_loss <= $${idx++}`);
      params.push(options.maxGainLoss);
    }
    if (options.createdAfter) {
      conditions.push(`p.createdat >= $${idx++}`);
      params.push(options.createdAfter);
    }
    if (options.createdBefore) {
      conditions.push(`p.createdat <= $${idx++}`);
      params.push(options.createdBefore);
    }
    if (options.updatedAfter) {
      conditions.push(`p.updatedat >= $${idx++}`);
      params.push(options.updatedAfter);
    }
    if (options.updatedBefore) {
      conditions.push(`p.updatedat <= $${idx++}`);
      params.push(options.updatedBefore);
    }
    if (options.metal) {
      conditions.push(`EXISTS (
        SELECT 1 FROM public.position pos 
        JOIN public.product prod ON pos.productid = prod.id 
        JOIN public.metal m ON prod.metalid = m.id
        WHERE pos.portfolioid = p.id AND LOWER(m.metalname) = LOWER($${idx++})
      )`);
      params.push(options.metal);
    }

    return {
      whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params,
    };
  }

  async getById(portfolioId: string): Promise<PortfolioSummary | null> {
    const result = await this.pool.query(
      `SELECT ${PORTFOLIO_SELECT_FIELDS}
       FROM public.portfolio p
       LEFT JOIN (${PORTFOLIO_STATS_SUBQUERY}) portfolio_stats ON p.id = portfolio_stats.portfolioid
       WHERE p.id = $1`,
      [portfolioId]
    );
    return result.rows.length === 0 ? null : mapRowToSummary(result.rows[0]);
  }

  async getWithPositions(portfolioId: string): Promise<PortfolioWithPositions | null> {
    const summary = await this.getById(portfolioId);
    if (!summary) return null;

    const positionsResult = await this.pool.query(
      'SELECT * FROM position WHERE portfolioId = $1 ORDER BY createdat DESC',
      [portfolioId]
    );

    const positions = await Promise.all(
      positionsResult.rows.map(row => mapRowToPosition(this.pool, row))
    );

    return { ...summary, positions };
  }

  async create(
    userId: string,
    name: string,
    description: string | undefined,
    authenticatedUser: AuditTrailUser
  ): Promise<PortfolioSummary> {
    const auditUser = getAuditUser(authenticatedUser);
    const result = await this.pool.query(
      `INSERT INTO portfolio (ownerid, portfolioname, description, isactive, createdat, updatedat, createdBy, updatedBy)
       VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $4, $5)
       RETURNING *`,
      [userId, name, description || null, auditUser.id, auditUser.id]
    );

    return mapRowToSummary({
      ...result.rows[0],
      total_value: 0, total_cost: 0, total_gain_loss: 0,
      total_gain_loss_percentage: 0, position_count: 0,
      last_updated: result.rows[0].updatedat,
    });
  }

  async update(
    portfolioId: string,
    updates: Partial<PortfolioSummary>,
    authenticatedUser: AuditTrailUser
  ): Promise<PortfolioSummary | null> {
    const fields: string[] = [];
    const values: (string | boolean)[] = [];
    let idx = 1;

    if (updates.portfolioName) { fields.push(`portfolioname = $${idx++}`); values.push(updates.portfolioName); }
    if (updates.description !== undefined) { fields.push(`description = $${idx++}`); values.push(updates.description || ''); }
    if (typeof updates.isActive === 'boolean') { fields.push(`isactive = $${idx++}`); values.push(updates.isActive); }

    if (fields.length === 0) return this.getById(portfolioId);

    const auditUser = getAuditUser(authenticatedUser);
    fields.push(`updatedBy = $${idx++}`);
    values.push(auditUser.id);
    fields.push('updatedat = CURRENT_TIMESTAMP');
    values.push(portfolioId);

    await this.pool.query(`UPDATE portfolio SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    return this.getById(portfolioId);
  }

  async delete(portfolioId: string, _authenticatedUser: AuditTrailUser): Promise<void> {
    await this.pool.query('DELETE FROM portfolio WHERE id = $1', [portfolioId]);
  }

  async userExists(userId: string): Promise<boolean> {
    const result = await this.pool.query('SELECT 1 FROM users WHERE id = $1', [userId]);
    return result.rows.length > 0;
  }

  async nameExistsForUser(userId: string, name: string, excludePortfolioId?: string): Promise<boolean> {
    const query = excludePortfolioId
      ? 'SELECT 1 FROM portfolio WHERE ownerid = $1 AND portfolioname = $2 AND id != $3'
      : 'SELECT 1 FROM portfolio WHERE ownerid = $1 AND portfolioname = $2';
    const params = excludePortfolioId ? [userId, name, excludePortfolioId] : [userId, name];
    const result = await this.pool.query(query, params);
    return result.rows.length > 0;
  }

  async getPositionCount(portfolioId: string): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM position WHERE portfolioid = $1', [portfolioId]);
    return Number.parseInt(result.rows[0]?.count || '0', 10);
  }
}
