/**
 * Reference Query Builder
 * 
 * Generic query builder for reference data tables to eliminate code duplication
 */

import { Pool } from 'pg';

interface TableConfig {
  tableName: string;
  nameColumn: string;
  selectFields: string;
}

interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Table configurations for reference data
 */
export const TABLE_CONFIGS = {
  metal: {
    tableName: 'metal',
    nameColumn: 'name',
    selectFields: 'id, name, symbol, createdat, updatedat',
  },
  productType: {
    tableName: 'producttype',
    nameColumn: 'producttypename',
    selectFields: 'id, producttypename, createdat, updatedat',
  },
  producer: {
    tableName: 'producer',
    nameColumn: 'producername',
    selectFields: 'id, producername, country, websiteurl, createdat, updatedat',
  },
} as const;

/**
 * Convert sortBy to database column name
 */
function getDbColumnName(sortBy: string, nameColumn: string): string {
  if (sortBy === 'name') return nameColumn;
  if (sortBy === 'createdAt') return 'createdat';
  if (sortBy === 'updatedAt') return 'updatedat';
  return nameColumn;
}

/**
 * Generic paginated query for reference tables
 */
export async function queryPaginated<T>(
  pool: Pool,
  config: TableConfig,
  options: QueryOptions,
  rowMapper: (row: Record<string, unknown>) => T
): Promise<PaginatedResult<T>> {
  const { page = 1, limit = 100, sortBy = 'name', sortOrder = 'asc', search } = options;
  const offset = (page - 1) * limit;

  // Build WHERE clause
  const whereConditions: string[] = [];
  const queryParams: (string | number)[] = [];
  let paramIndex = 1;

  if (search) {
    whereConditions.push(`${config.nameColumn} ILIKE $${paramIndex++}`);
    queryParams.push(`%${search}%`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Validate sort parameters
  const validSortColumns = ['name', 'createdAt', 'updatedAt'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'name';
  const safeSortOrder = sortOrder === 'desc' ? 'DESC' : 'ASC';
  const dbColumnName = getDbColumnName(safeSortBy, config.nameColumn);

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as count FROM ${config.tableName} ${whereClause}`,
    queryParams
  );
  const total = Number.parseInt(countResult.rows[0].count);

  // Get paginated data
  queryParams.push(limit, offset);
  const dataResult = await pool.query(
    `SELECT ${config.selectFields} FROM ${config.tableName} ${whereClause} 
     ORDER BY ${dbColumnName} ${safeSortOrder} 
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    queryParams
  );

  const totalPages = Math.ceil(total / limit);

  return {
    items: dataResult.rows.map(rowMapper),
    pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 },
  };
}

/**
 * Generic find by ID for reference tables
 */
export async function findById<T>(
  pool: Pool,
  config: TableConfig,
  id: string,
  rowMapper: (row: Record<string, unknown>) => T
): Promise<T | null> {
  const result = await pool.query(
    `SELECT ${config.selectFields} FROM ${config.tableName} WHERE id = $1`,
    [id]
  );
  return result.rows.length === 0 ? null : rowMapper(result.rows[0]);
}

/**
 * Find metal by symbol (case-insensitive)
 */
export async function findMetalBySymbol<T>(
  pool: Pool,
  symbol: string,
  rowMapper: (row: Record<string, unknown>) => T
): Promise<T | null> {
  const result = await pool.query(
    `SELECT ${TABLE_CONFIGS.metal.selectFields} FROM ${TABLE_CONFIGS.metal.tableName} WHERE UPPER(symbol) = UPPER($1)`,
    [symbol]
  );
  return result.rows.length === 0 ? null : rowMapper(result.rows[0]);
}
