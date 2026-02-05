/**
 * Custody SQL Queries
 * 
 * Centralized SQL query definitions for custody services
 * Reduces code duplication in repository implementations
 */

/**
 * Base SELECT fields for custody service queries
 */
export const CUSTODY_SERVICE_SELECT_FIELDS = `
  cs.id, cs.custodyServiceName, cs.custodianId, cs.fee, 
  cs.paymentFrequency, cs.currencyId, cs.minWeight, cs.maxWeight,
  cs.createdAt, cs.updatedAt,
  c.custodianName, curr.isoCode3 as currency
`;

/**
 * Base FROM clause with joins for custody service queries
 */
export const CUSTODY_SERVICE_FROM_CLAUSE = `
  FROM custodyService cs
  JOIN custodian c ON cs.custodianId = c.id
  JOIN currency curr ON cs.currencyId = curr.id
`;

/**
 * Get custody service by ID
 */
export const GET_CUSTODY_SERVICE_BY_ID = `
  SELECT ${CUSTODY_SERVICE_SELECT_FIELDS}
  ${CUSTODY_SERVICE_FROM_CLAUSE}
  WHERE cs.id = $1
`;

/**
 * Get custody services by custodian ID
 */
export const GET_CUSTODY_SERVICES_BY_CUSTODIAN = `
  SELECT ${CUSTODY_SERVICE_SELECT_FIELDS}
  ${CUSTODY_SERVICE_FROM_CLAUSE}
  WHERE cs.custodianId = $1
  ORDER BY cs.custodyServiceName ASC
`;

/**
 * Get default custody service (Home Delivery)
 */
export const GET_DEFAULT_CUSTODY_SERVICE = `
  SELECT ${CUSTODY_SERVICE_SELECT_FIELDS}
  ${CUSTODY_SERVICE_FROM_CLAUSE}
  WHERE LOWER(c.custodianName) = 'home delivery'
  LIMIT 1
`;

/**
 * Insert custody service
 */
export const INSERT_CUSTODY_SERVICE = `
  INSERT INTO custodyService (
    custodyServiceName, custodianId, fee, paymentFrequency, 
    currencyId, minWeight, maxWeight, createdBy, updatedBy
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING *
`;

/**
 * Delete custody service
 */
export const DELETE_CUSTODY_SERVICE = 'DELETE FROM custodyService WHERE id = $1';

/**
 * Count positions for custody service (for delete validation)
 */
export const COUNT_POSITIONS_FOR_SERVICE = `
  SELECT COUNT(*) as count
  FROM position
  WHERE custodyServiceId = $1
`;

/**
 * Check if service name exists for custodian
 */
export const CHECK_SERVICE_NAME_EXISTS = `
  SELECT id FROM custodyService
  WHERE custodianId = $1 AND LOWER(custodyServiceName) = LOWER($2)
`;
