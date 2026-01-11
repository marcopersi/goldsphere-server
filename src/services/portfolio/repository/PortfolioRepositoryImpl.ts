/**
 * Portfolio Repository Implementation
 * 
 * Handles database operations for portfolio management using DI
 * All SQL queries are encapsulated here
 */

import { Pool } from 'pg';
import { CommonPaginationSchema, PositionSchema } from '@marcopersi/shared';
import { IPortfolioRepository } from './IPortfolioRepository';
import {
  PortfolioSummary,
  PortfolioWithPositions,
  ListPortfoliosOptions,
  GetPortfoliosResult,
  Position
} from '../types/PortfolioTypes';

export class PortfolioRepositoryImpl implements IPortfolioRepository {
  constructor(private readonly pool: Pool) {}

  async getUserPortfolios(userId: string, options: ListPortfoliosOptions): Promise<GetPortfoliosResult> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const where: string[] = ['p.ownerid = $1'];
    const params: any[] = [userId];
    let idx = params.length + 1;

    if (typeof options.isActive === 'boolean') {
      where.push(`COALESCE(p.isactive, true) = $${idx++}`);
      params.push(options.isActive);
    }
    if (options.search) {
      where.push(`(p.portfolioname ILIKE $${idx} OR p.description ILIKE $${idx})`);
      params.push(`%${options.search}%`);
      idx++;
    }

    const baseQuery = `
      FROM public.portfolio p
      LEFT JOIN (
        SELECT 
          pos.portfolioid,
          SUM(pos.quantity * COALESCE(pos.marketprice, pos.purchaseprice, 0)) as total_value,
          SUM(pos.quantity * COALESCE(pos.purchaseprice, 0)) as total_cost,
          COUNT(pos.id) as position_count,
          MAX(pos.updatedat) as last_position_update
        FROM public.position pos
        GROUP BY pos.portfolioid
      ) portfolio_stats ON p.id = portfolio_stats.portfolioid
      WHERE ${where.join(' AND ')}
    `;

    const dataQuery = `
      SELECT 
        p.id,
        p.portfolioname,
        p.ownerid,
        p.description,
        COALESCE(p.isactive, true) as isactive,
        COALESCE(portfolio_stats.total_value, 0) as total_value,
        COALESCE(portfolio_stats.total_cost, 0) as total_cost,
        COALESCE(portfolio_stats.total_value - portfolio_stats.total_cost, 0) as total_gain_loss,
        CASE 
          WHEN portfolio_stats.total_cost > 0 
          THEN ((portfolio_stats.total_value - portfolio_stats.total_cost) / portfolio_stats.total_cost) * 100
          ELSE 0
        END as total_gain_loss_percentage,
        COALESCE(portfolio_stats.position_count, 0) as position_count,
        GREATEST(p.updatedat, COALESCE(portfolio_stats.last_position_update, p.updatedat)) as last_updated,
        p.createdat,
        p.updatedat
      ${baseQuery}
      ORDER BY p.createdat DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `SELECT COUNT(*) as count ${baseQuery}`;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query(dataQuery, params),
      this.pool.query(countQuery, params)
    ]);

    const total = Number.parseInt(countResult.rows[0]?.count || '0', 10);
    const portfolios: PortfolioSummary[] = dataResult.rows.map(this.mapRowToSummary);

    const pagination = CommonPaginationSchema.parse({
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: offset + portfolios.length < total,
      hasPrev: page > 1
    });

    return { portfolios, pagination };
  }

  async getById(portfolioId: string): Promise<PortfolioSummary | null> {
    const query = `
      SELECT 
        p.id,
        p.portfolioname,
        p.ownerid,
        p.description,
        COALESCE(p.isactive, true) as isactive,
        COALESCE(portfolio_stats.total_value, 0) as total_value,
        COALESCE(portfolio_stats.total_cost, 0) as total_cost,
        COALESCE(portfolio_stats.total_value - portfolio_stats.total_cost, 0) as total_gain_loss,
        CASE 
          WHEN portfolio_stats.total_cost > 0 
          THEN ((portfolio_stats.total_value - portfolio_stats.total_cost) / portfolio_stats.total_cost) * 100
          ELSE 0
        END as total_gain_loss_percentage,
        COALESCE(portfolio_stats.position_count, 0) as position_count,
        GREATEST(p.updatedat, COALESCE(portfolio_stats.last_position_update, p.updatedat)) as last_updated,
        p.createdat,
        p.updatedat
      FROM public.portfolio p
      LEFT JOIN (
        SELECT 
          pos.portfolioid,
          SUM(pos.quantity * COALESCE(pos.marketprice, pos.purchaseprice, 0)) as total_value,
          SUM(pos.quantity * COALESCE(pos.purchaseprice, 0)) as total_cost,
          COUNT(pos.id) as position_count,
          MAX(pos.updatedat) as last_position_update
        FROM public.position pos
        GROUP BY pos.portfolioid
      ) portfolio_stats ON p.id = portfolio_stats.portfolioid
      WHERE p.id = $1
    `;

    const result = await this.pool.query(query, [portfolioId]);
    if (result.rows.length === 0) return null;
    
    return this.mapRowToSummary(result.rows[0]);
  }

  async getWithPositions(portfolioId: string): Promise<PortfolioWithPositions | null> {
    const summary = await this.getById(portfolioId);
    if (!summary) return null;

    const positionsResult = await this.pool.query(
      `SELECT * FROM position WHERE portfolioId = $1 ORDER BY createdat DESC`,
      [portfolioId]
    );

    const positions = await Promise.all(
      positionsResult.rows.map(row => this.mapRowToPosition(row))
    );

    return { ...summary, positions };
  }

  async create(userId: string, name: string, description?: string): Promise<PortfolioSummary> {
    const result = await this.pool.query(
      `INSERT INTO portfolio (ownerid, portfolioname, description, isactive, createdat, updatedat)
       VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, name, description || null]
    );

    const row = result.rows[0];
    return this.mapRowToSummary({
      ...row,
      total_value: 0,
      total_cost: 0,
      total_gain_loss: 0,
      total_gain_loss_percentage: 0,
      position_count: 0,
      last_updated: row.updatedat
    });
  }

  async update(portfolioId: string, updates: Partial<PortfolioSummary>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.portfolioName) {
      fields.push(`portfolioname = $${idx++}`);
      values.push(updates.portfolioName);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(updates.description);
    }
    if (typeof updates.isActive === 'boolean') {
      fields.push(`isactive = $${idx++}`);
      values.push(updates.isActive);
    }

    if (fields.length === 0) return;

    fields.push(`updatedat = CURRENT_TIMESTAMP`);
    values.push(portfolioId);

    await this.pool.query(
      `UPDATE portfolio SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );
  }

  async delete(portfolioId: string): Promise<void> {
    await this.pool.query('DELETE FROM portfolio WHERE id = $1', [portfolioId]);
  }

  // ============================================================================
  // Private Mapping Methods
  // ============================================================================

  private mapRowToSummary(row: any): PortfolioSummary {
    return {
      id: row.id,
      portfolioName: row.portfolioname,
      ownerId: row.ownerid,
      description: row.description,
      isActive: row.isactive ?? true,
      totalValue: Number.parseFloat(row.total_value) || 0,
      totalCost: Number.parseFloat(row.total_cost) || 0,
      totalGainLoss: Number.parseFloat(row.total_gain_loss) || 0,
      totalGainLossPercentage: Number.parseFloat(row.total_gain_loss_percentage) || 0,
      positionCount: Number.parseInt(row.position_count) || 0,
      lastUpdated: row.last_updated || row.updatedat,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };
  }

  private async mapRowToPosition(row: any): Promise<Position> {
    const product = await this.fetchProductForPosition(row.productid);
    let custody = null;

    if (row.custodyserviceid) {
      custody = await this.fetchCustodyForPosition(row.custodyserviceid);
    }

    const position = {
      id: row.id,
      userId: row.userid,
      productId: row.productid,
      portfolioId: row.portfolioid,
      product,
      purchaseDate: row.purchasedate || new Date(),
      purchasePrice: Number.parseFloat(row.purchaseprice) || 0,
      marketPrice: Number.parseFloat(row.marketprice) || 0,
      quantity: Number.parseFloat(row.quantity) || 0,
      custodyServiceId: row.custodyserviceid || undefined,
      custody: custody || undefined,
      status: row.status || 'active',
      notes: row.notes || '',
      createdAt: row.createdat || new Date(),
      updatedAt: row.updatedat || new Date()
    };

    return PositionSchema.parse(position);
  }

  private async fetchProductForPosition(productId: string) {
    const productQuery = `
      SELECT 
        product.id, 
        product.name AS productname, 
        product.productTypeId,
        productType.productTypeName AS producttype, 
        product.metalId,
        metal.id AS metal_id,
        metal.name AS metalname,
        metal.symbol AS metal_symbol,
        product.producerId,
        product.weight AS fineweight, 
        product.weightUnit AS unitofmeasure, 
        product.purity,
        product.price,
        product.currency,
        producer.producerName AS producer,
        country.countryName AS country,
        product.year AS productyear,
        product.description,
        product.imageFilename AS imageurl,
        product.inStock,
        product.minimumOrderQuantity,
        product.createdat,
        product.updatedat
      FROM product 
      JOIN productType ON productType.id = product.productTypeId 
      JOIN metal ON metal.id = product.metalId 
      JOIN producer ON producer.id = product.producerId
      LEFT JOIN country ON country.id = product.countryId
      WHERE product.id = $1
    `;

    const result = await this.pool.query(productQuery, [productId]);
    if (result.rows.length === 0) {
      throw new Error(`Product not found: ${productId}`);
    }

    const row = result.rows[0];
    let imageUrl = 'https://example.com/images/placeholder.jpg';
    if (row.imageurl) {
      imageUrl = row.imageurl.startsWith('http') 
        ? row.imageurl 
        : `https://example.com/images/${row.imageurl}`;
    }

    return {
      id: row.id,
      name: row.productname,
      type: row.producttype,
      productTypeId: row.producttypeid,
      metal: {
        id: row.metal_id,
        name: row.metalname,
        symbol: row.metal_symbol
      },
      metalId: row.metalid,
      producer: row.producer,
      producerId: row.producerid,
      weight: Number.parseFloat(row.fineweight) || 0,
      weightUnit: row.unitofmeasure,
      purity: Number.parseFloat(row.purity) || 0.999,
      price: Number.parseFloat(row.price) || 0,
      currency: row.currency,
      country: row.country || undefined,
      year: row.productyear || undefined,
      description: row.description || '',
      imageUrl,
      inStock: row.instock ?? true,
      minimumOrderQuantity: row.minimumorderquantity || 1,
      createdAt: row.createdat || new Date(),
      updatedAt: row.updatedat || new Date()
    };
  }

  private async fetchCustodyForPosition(custodyServiceId: string) {
    const custodyQuery = `
      SELECT 
        cs.id as custodyServiceId,
        cs.custodyServiceName,
        c.id as custodianId,
        c.custodianName,
        cs.fee,
        cs.paymentFrequency
      FROM custodyService cs
      JOIN custodian c ON cs.custodianId = c.id
      WHERE cs.id = $1
    `;

    const result = await this.pool.query(custodyQuery, [custodyServiceId]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      custodyServiceId: row.custodyserviceid,
      custodyServiceName: row.custodyservicename,
      custodianId: row.custodianid,
      custodianName: row.custodianname,
      fee: Number.parseFloat(row.fee) || 0,
      paymentFrequency: row.paymentfrequency
    };
  }
}
