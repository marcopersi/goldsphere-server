/**
 * Portfolio Row Mappers
 * 
 * Transform database rows to domain types
 */

import { Pool } from 'pg';
import { PositionSchema } from '@marcopersi/shared';
import { PortfolioSummary, Position } from '../types/PortfolioTypes';
import { PRODUCT_SELECT_QUERY, CUSTODY_SELECT_QUERY } from './PortfolioQueries';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('PortfolioMappers');

function configureBaseURL(): string | null {
  const configuredBaseUrl = process.env.APP_BASE_URL || process.env.BASE_URL;
  if (!configuredBaseUrl) {
    logger.warn('Missing APP_BASE_URL/BASE_URL. Falling back to relative product image URL.');
    return null;
  }

  let composedUrl: URL;
  try {
    composedUrl = new URL(configuredBaseUrl);
  } catch {
    logger.error('Invalid APP_BASE_URL/BASE_URL. Falling back to relative product image URL.', {
      configuredBaseUrl,
    });
    return null;
  }

  const configuredPort = process.env.PORT;
  if (configuredPort) {
    composedUrl.port = configuredPort;
  }

  const finalBaseUrl = composedUrl.toString().endsWith('/')
    ? composedUrl.toString().slice(0, -1)
    : composedUrl.toString();

  logger.debug('Configured API base URL', { fullUrl: finalBaseUrl });

  return finalBaseUrl;
}

/**
 * Map database row to PortfolioSummary
 */
export function mapRowToSummary(row: Record<string, unknown>): PortfolioSummary {
  return {
    id: row.id as string,
    portfolioName: row.portfolioname as string,
    ownerId: row.ownerid as string,
    ownerDisplayName: (row.owner_display_name as string) || (row.ownerid as string),
    ownerName: (row.owner_name as string) || (row.ownerid as string),
    ownerEmail: (row.owner_email as string) || undefined,
    description: row.description as string | null,
    isActive: (row.isactive as boolean) ?? true,
    totalValue: Number.parseFloat(row.total_value as string) || 0,
    totalCost: Number.parseFloat(row.total_cost as string) || 0,
    totalGainLoss: Number.parseFloat(row.total_gain_loss as string) || 0,
    totalGainLossPercentage: Number.parseFloat(row.total_gain_loss_percentage as string) || 0,
    positionCount: Number.parseInt(row.position_count as string) || 0,
    lastUpdated: (row.last_updated || row.updatedat) as Date,
    createdAt: row.createdat as Date,
    updatedAt: row.updatedat as Date,
  };
}

/**
 * Map database row to Position with product and custody enrichment
 */
export async function mapRowToPosition(pool: Pool, row: Record<string, unknown>): Promise<Position> {
  const product = await fetchProductForPosition(pool, row.productid as string);
  const custody = row.custodyserviceid 
    ? await fetchCustodyForPosition(pool, row.custodyserviceid as string)
    : null;

  const position = {
    id: row.id as string,
    userId: row.userid as string,
    productId: row.productid as string,
    portfolioId: row.portfolioid as string,
    product,
    purchaseDate: (row.purchasedate as Date) || new Date(),
    purchasePrice: Number.parseFloat(row.purchaseprice as string) || 0,
    marketPrice: Number.parseFloat(row.marketprice as string) || 0,
    quantity: Number.parseFloat(row.quantity as string) || 0,
    custodyServiceId: (row.custodyserviceid as string) || undefined,
    custody: custody || undefined,
    status: (row.status as string) || 'active',
    notes: (row.notes as string) || '',
    createdAt: (row.createdat as Date) || new Date(),
    updatedAt: (row.updatedat as Date) || new Date(),
  };

  return PositionSchema.parse(position);
}

/**
 * Fetch product details for position
 */
async function fetchProductForPosition(pool: Pool, productId: string) {
  const result = await pool.query(PRODUCT_SELECT_QUERY, [productId]);
  if (result.rows.length === 0) {
    throw new Error(`Product not found: ${productId}`);
  }

  const row = result.rows[0];
  const apiBaseUrl = configureBaseURL();
  const imageUrl = apiBaseUrl
    ? `${apiBaseUrl}/api/products/${row.id}/image`
    : `/api/products/${row.id}/image`;

  return {
    id: row.id,
    name: row.productname,
    type: row.producttype,
    productTypeId: row.producttypeid,
    metal: { id: row.metal_id, name: row.metalname, symbol: row.metal_symbol },
    metalId: row.metalid,
    producer: row.producer,
    producerId: row.producerid,
    weight: Number.parseFloat(row.fineweight) || 0,
    weightUnit: row.unitofmeasure,
    purity: Number.parseFloat(row.purity) || 0.999,
    price: Number.parseFloat(row.price) || 0,
    currency: row.currency,
    country: row.country || undefined,
    countryId: row.countryid || undefined,
    year: row.productyear || undefined,
    description: row.description || '',
    imageUrl,
    inStock: row.instock ?? true,
    minimumOrderQuantity: row.minimumorderquantity || 1,
    createdAt: row.createdat || new Date(),
    updatedAt: row.updatedat || new Date(),
  };
}

/**
 * Fetch custody details for position
 */
async function fetchCustodyForPosition(pool: Pool, custodyServiceId: string) {
  const result = await pool.query(CUSTODY_SELECT_QUERY, [custodyServiceId]);
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    custodyServiceId: row.custodyserviceid,
    custodyServiceName: row.custodyservicename,
    custodianId: row.custodianid,
    custodianName: row.custodianname,
    fee: Number.parseFloat(row.fee) || 0,
    paymentFrequency: row.paymentfrequency,
  };
}
