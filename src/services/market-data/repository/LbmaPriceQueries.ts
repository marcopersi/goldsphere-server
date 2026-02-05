/**
 * LBMA Price SQL Queries
 * 
 * Centralized SQL query definitions for LBMA prices
 * Reduces code duplication and improves maintainability
 */

/**
 * Base SELECT fields for LBMA price queries
 */
export const LBMA_PRICE_SELECT_FIELDS = `
  lp.id,
  lp.metal_id,
  m.symbol as metal_symbol,
  m.name as metal_name,
  lp.price_type_id,
  pt.code as price_type_code,
  lp.fixing_date,
  lp.fixing_time::text as fixing_time,
  lp.price_usd,
  lp.price_gbp,
  lp.price_eur,
  lp.price_chf,
  lp.participants,
  lp.source,
  lp.createdat
`;

/**
 * Base FROM clause with joins for LBMA price queries
 */
export const LBMA_PRICE_FROM_CLAUSE = `
  FROM lbma_price lp
  JOIN metal m ON lp.metal_id = m.id
  JOIN price_type pt ON lp.price_type_id = pt.id
`;

/**
 * Query for getting the latest LBMA price
 */
export const GET_LATEST_LBMA_PRICE = `
  SELECT ${LBMA_PRICE_SELECT_FIELDS}
  ${LBMA_PRICE_FROM_CLAUSE}
  WHERE m.symbol = $1 AND pt.code = $2
  ORDER BY lp.fixing_date DESC, lp.fixing_time DESC
  LIMIT 1
`;

/**
 * Query for getting LBMA price by date
 */
export const GET_LBMA_PRICE_BY_DATE = `
  SELECT ${LBMA_PRICE_SELECT_FIELDS}
  ${LBMA_PRICE_FROM_CLAUSE}
  WHERE m.symbol = $1 
    AND lp.fixing_date = $2
    AND pt.code = $3
  LIMIT 1
`;

/**
 * Query for getting today's fixings
 */
export const GET_TODAY_FIXINGS = `
  SELECT ${LBMA_PRICE_SELECT_FIELDS}
  ${LBMA_PRICE_FROM_CLAUSE}
  WHERE lp.fixing_date = CURRENT_DATE
  ORDER BY m.symbol, lp.fixing_time
`;

/**
 * Query for upserting LBMA price
 */
export const UPSERT_LBMA_PRICE = `
  INSERT INTO lbma_price (
    metal_id, price_type_id, fixing_date, fixing_time,
    price_usd, price_gbp, price_eur, price_chf,
    participants, source
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  ON CONFLICT (metal_id, fixing_date, price_type_id)
  DO UPDATE SET
    price_usd = COALESCE(EXCLUDED.price_usd, lbma_price.price_usd),
    price_gbp = COALESCE(EXCLUDED.price_gbp, lbma_price.price_gbp),
    price_eur = COALESCE(EXCLUDED.price_eur, lbma_price.price_eur),
    price_chf = COALESCE(EXCLUDED.price_chf, lbma_price.price_chf),
    participants = COALESCE(EXCLUDED.participants, lbma_price.participants),
    source = EXCLUDED.source,
    updatedat = NOW()
`;

/**
 * Query for getting all price types
 */
export const GET_ALL_PRICE_TYPES = `
  SELECT id, code, name, description, is_benchmark, update_frequency_minutes
  FROM price_type
  ORDER BY is_benchmark DESC, code ASC
`;

/**
 * Query for getting price type by code
 */
export const GET_PRICE_TYPE_BY_CODE = `
  SELECT id, code, name, description, is_benchmark, update_frequency_minutes 
  FROM price_type 
  WHERE code = $1
`;

/**
 * Base SELECT for premium config queries
 */
export const PREMIUM_CONFIG_SELECT_FIELDS = `
  pc.id, pc.name, pc.description,
  pc.metal_id, m.symbol as metal_symbol,
  pc.base_price_type_id,
  pc.premium_percent, pc.premium_fixed_amount,
  pc.currency, pc.min_quantity_oz, pc.max_quantity_oz,
  pc.valid_from, pc.valid_to, pc.is_active
`;

/**
 * Query for getting active premium configs
 */
export const GET_ACTIVE_PREMIUM_CONFIGS_BASE = `
  SELECT ${PREMIUM_CONFIG_SELECT_FIELDS}
  FROM price_premium_config pc
  LEFT JOIN metal m ON pc.metal_id = m.id
  WHERE pc.is_active = true
    AND pc.valid_from <= CURRENT_DATE
    AND (pc.valid_to IS NULL OR pc.valid_to >= CURRENT_DATE)
`;

/**
 * Query for getting premium config for a specific quantity
 */
export const GET_PREMIUM_CONFIG_FOR_QUANTITY = `
  SELECT ${PREMIUM_CONFIG_SELECT_FIELDS}
  FROM price_premium_config pc
  JOIN metal m ON pc.metal_id = m.id
  WHERE m.symbol = $1
    AND pc.is_active = true
    AND pc.valid_from <= CURRENT_DATE
    AND (pc.valid_to IS NULL OR pc.valid_to >= CURRENT_DATE)
    AND (pc.min_quantity_oz IS NULL OR pc.min_quantity_oz <= $2)
    AND (pc.max_quantity_oz IS NULL OR pc.max_quantity_oz >= $2)
  ORDER BY pc.min_quantity_oz DESC NULLS LAST
  LIMIT 1
`;

/**
 * Query for inserting new premium config
 */
export const INSERT_PREMIUM_CONFIG = `
  INSERT INTO price_premium_config (
    name, description, metal_id, base_price_type_id,
    premium_percent, premium_fixed_amount, currency,
    min_quantity_oz, max_quantity_oz, valid_from, valid_to, is_active,
    createdBy, updatedBy
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING id
`;
