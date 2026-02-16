/**
 * Portfolio SQL Queries
 * 
 * Centralized SQL query definitions for portfolio operations
 */

/**
 * Portfolio stats subquery (used in multiple queries)
 */
export const PORTFOLIO_STATS_SUBQUERY = `
  SELECT 
    pos.portfolioid,
    SUM(pos.quantity * COALESCE(pos.marketprice, pos.purchaseprice, 0)) as total_value,
    SUM(pos.quantity * COALESCE(pos.purchaseprice, 0)) as total_cost,
    COUNT(pos.id) as position_count,
    MAX(pos.updatedat) as last_position_update
  FROM public.position pos
  GROUP BY pos.portfolioid
`;

/**
 * Select fields for portfolio summary
 */
export const PORTFOLIO_SELECT_FIELDS = `
  p.id,
  p.portfolioname,
  p.ownerid,
  COALESCE(
    NULLIF(TRIM(CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, ''))), ''),
    u.email,
    p.ownerid::text
  ) as owner_display_name,
  COALESCE(
    NULLIF(TRIM(CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, ''))), ''),
    u.email,
    p.ownerid::text
  ) as owner_name,
  u.email as owner_email,
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
`;

/**
 * Product query for position enrichment
 */
export const PRODUCT_SELECT_QUERY = `
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
    product.countryId,
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

/**
 * Custody query for position enrichment
 */
export const CUSTODY_SELECT_QUERY = `
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

/**
 * Sort column mapping for ORDER BY
 */
export const SORT_COLUMN_MAP: Record<string, string> = {
  portfolioName: 'p.portfolioname',
  totalValue: 'portfolio_stats.total_value',
  totalGainLoss: 'portfolio_stats.total_gain_loss',
  positionCount: 'portfolio_stats.position_count',
  createdAt: 'p.createdat',
  updatedAt: 'p.updatedat',
};
