/**
 * Audit Trail Utilities
 * 
 * Provides helper functions to automatically track who creates/updates records
 * in the database. This ensures proper accountability and audit trails.
 * 
 * Usage Example:
 * const auditFields = generateCreateAuditFields(req.user);
 * const order = await createOrderWithAudit(orderData, req.user);
 */

import { getPool } from '../dbConfig';

export interface AuditTrailUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Extract and validate the authenticated user from an Express request.
 * Fail-fast: throws if no valid user is present.
 * Use at the entry point of every mutating controller endpoint.
 * 
 * tsoa's @Security("bearerAuth") already verifies JWT + DB existence,
 * so this is a type-narrowing guard, not a duplicate DB check.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function requireAuthenticatedUser(request: any): AuditTrailUser {
  const user = request?.user;
  if (!user?.id || !user?.email || !user?.role) {
    throw new AuthenticationError('Authenticated user required. No silent fallback allowed.');
  }
  return user;
}

/**
 * Validate that an audit trail user is present and valid.
 * Fail-fast: throws if user is missing or incomplete — no SYSTEM_USER fallback.
 */
export function getAuditUser(user: AuditTrailUser): AuditTrailUser {
  if (!user?.id || !user?.email) {
    throw new AuthenticationError('Audit trail user is required. Authenticate before performing mutations.');
  }
  return user;
}

/**
 * Custom error class for authentication failures in the audit trail layer.
 * Controllers should catch this and return 401.
 */
export class AuthenticationError extends Error {
  public readonly statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export interface CreateAuditFields {
  createdBy: string;
  updatedBy: string;
  createdat?: string;
  updatedat?: string;
}

export interface UpdateAuditFields {
  updatedBy: string;
  updatedat?: string;
}

/**
 * Generate audit fields for creating a new record
 */
export function generateCreateAuditFields(user: AuditTrailUser): CreateAuditFields {
  const now = new Date().toISOString();
  return {
    createdBy: user.id,
    updatedBy: user.id,
    createdat: now,
    updatedat: now
  };
}

/**
 * Generate audit fields for updating an existing record
 */
export function generateUpdateAuditFields(user: AuditTrailUser): UpdateAuditFields {
  return {
    updatedBy: user.id,
    updatedat: new Date().toISOString()
  };
}

/**
 * Generic function to add audit fields to any INSERT query
 */
export function addCreateAuditToQuery(
  baseQuery: string, 
  baseValues: any[], 
  user: AuditTrailUser
): { query: string; values: any[] } {
  const auditFields = generateCreateAuditFields(user);
  
  // Add audit columns to the query
  const modifiedQuery = baseQuery.replace(
    /\)\s*VALUES\s*\(/i, 
    ', createdBy, updatedBy, createdat, updatedat) VALUES ('
  );
  
  // Add audit values  
  const modifiedValues = [
    ...baseValues,
    auditFields.createdBy,
    auditFields.updatedBy,
    auditFields.createdat,
    auditFields.updatedat
  ];
  
  return { query: modifiedQuery, values: modifiedValues };
}

/**
 * Generic function to add audit fields to any UPDATE query
 */
export function addUpdateAuditToQuery(
  baseQuery: string, 
  baseValues: any[], 
  user: AuditTrailUser
): { query: string; values: any[] } {
  const auditFields = generateUpdateAuditFields(user);
  
  // Add audit fields to SET clause
  const modifiedQuery = baseQuery.replace(
    /\bSET\b/i, 
    'SET updatedBy = $' + (baseValues.length + 1) + ', updatedat = $' + (baseValues.length + 2) + ','
  );
  
  // Add audit values
  const modifiedValues = [
    ...baseValues,
    auditFields.updatedBy,
    auditFields.updatedat
  ];
  
  return { query: modifiedQuery, values: modifiedValues };
}

/**
 * Create an ORDER with audit trail
 */
export async function createOrderWithAudit(
  orderData: {
    id: string;
    userid: string;
    type: string;
    orderstatus: string;
    custodyserviceid?: string;
    payment_intent_id?: string;
    payment_status?: string;
  },
  user: AuditTrailUser
) {
  const auditFields = generateCreateAuditFields(user);
  
  const query = `
    INSERT INTO orders (
      id, userid, type, orderstatus, custodyserviceid, payment_intent_id, payment_status,
      createdBy, updatedBy, createdat, updatedat
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
    RETURNING *
  `;
  
  const values = [
    orderData.id,
    orderData.userid,
    orderData.type,
    orderData.orderstatus,
    orderData.custodyserviceid || null,
    orderData.payment_intent_id || null,
    orderData.payment_status || 'pending',
    auditFields.createdBy,
    auditFields.updatedBy,
    auditFields.createdat,
    auditFields.updatedat
  ];

  const result = await getPool().query(query, values);
  return result.rows[0];
}

/**
 * Update an ORDER with audit trail
 */
export async function updateOrderWithAudit(
  orderId: string,
  updateData: {
    type?: string;
    orderstatus?: string;
    custodyserviceid?: string;
    payment_status?: string;
    notes?: string;
  },
  user: AuditTrailUser
) {
  const auditFields = generateUpdateAuditFields(user);
  
  // Build dynamic update query
  const updateFields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updateData.type) {
    updateFields.push(`type = $${paramIndex}`);
    values.push(updateData.type);
    paramIndex++;
  }
  
  if (updateData.orderstatus) {
    updateFields.push(`orderstatus = $${paramIndex}`);
    values.push(updateData.orderstatus);
    paramIndex++;
  }
  
  if (updateData.custodyserviceid) {
    updateFields.push(`custodyserviceid = $${paramIndex}`);
    values.push(updateData.custodyserviceid);
    paramIndex++;
  }
  
  if (updateData.payment_status) {
    updateFields.push(`payment_status = $${paramIndex}`);
    values.push(updateData.payment_status);
    paramIndex++;
  }

  // Always add audit fields
  updateFields.push(`updatedBy = $${paramIndex}`);
  values.push(auditFields.updatedBy);
  paramIndex++;
  
  updateFields.push(`updatedat = $${paramIndex}`);
  values.push(auditFields.updatedat);
  paramIndex++;

  // Add WHERE clause
  values.push(orderId);

  const query = `
    UPDATE orders 
    SET ${updateFields.join(', ')} 
    WHERE id = $${paramIndex} 
    RETURNING *
  `;

  const result = await getPool().query(query, values);
  return result.rows[0];
}

/**
 * Create an ORDER ITEM with audit trail
 */
export async function createOrderItemWithAudit(
  orderItemData: {
    orderid: string;
    productid: string;
    productname: string;
    quantity: number;
    unitprice: number;
    totalprice: number;
  },
  user: AuditTrailUser
) {
  const auditFields = generateCreateAuditFields(user);
  
  const query = `
    INSERT INTO order_items (
      orderid, productid, productname, quantity, unitprice, totalprice, 
      createdBy, updatedBy, createdat
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
    RETURNING *
  `;
  
  const values = [
    orderItemData.orderid,
    orderItemData.productid,
    orderItemData.productname,
    orderItemData.quantity,
    orderItemData.unitprice,
    orderItemData.totalprice,
    auditFields.createdBy,
    auditFields.updatedBy,
    auditFields.createdat
  ];

  const result = await getPool().query(query, values);
  return result.rows[0];
}

/**
 * Create a POSITION with audit trail
 */
export async function createPositionWithAudit(
  positionData: {
    id: string;
    userid: string;
    productid: string;
    portfolioid: string;
    purchasedate: string;
    purchaseprice: number;
    marketprice: number;
    quantity: number;
    custodyserviceid?: string;
    status?: string;
    notes?: string;
  },
  user: AuditTrailUser
) {
  const auditFields = generateCreateAuditFields(user);
  
  const query = `
    INSERT INTO position (
      id, userid, productid, portfolioid, purchasedate, purchaseprice, marketprice, 
      quantity, custodyserviceid, status, notes, createdBy, updatedBy, createdat, updatedat
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
    RETURNING *
  `;
  
  const values = [
    positionData.id,
    positionData.userid,
    positionData.productid,
    positionData.portfolioid,
    positionData.purchasedate,
    positionData.purchaseprice,
    positionData.marketprice,
    positionData.quantity,
    positionData.custodyserviceid || null,
    positionData.status || 'active',
    positionData.notes || null,
    auditFields.createdBy,
    auditFields.updatedBy,
    auditFields.createdat,
    auditFields.updatedat
  ];

  const result = await getPool().query(query, values);
  return result.rows[0];
}

/**
 * Update a POSITION with audit trail
 */
export async function updatePositionWithAudit(
  positionId: string,
  updateData: {
    quantity?: number;
    marketprice?: number;
    status?: string;
    closeddate?: string;
    notes?: string;
  },
  user: AuditTrailUser
) {
  const auditFields = generateUpdateAuditFields(user);
  
  // Build dynamic update query
  const updateFields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updateData.quantity !== undefined) {
    updateFields.push(`quantity = $${paramIndex}`);
    values.push(updateData.quantity);
    paramIndex++;
  }
  
  if (updateData.marketprice !== undefined) {
    updateFields.push(`marketprice = $${paramIndex}`);
    values.push(updateData.marketprice);
    paramIndex++;
  }
  
  if (updateData.status) {
    updateFields.push(`status = $${paramIndex}`);
    values.push(updateData.status);
    paramIndex++;
  }
  
  if (updateData.closeddate) {
    updateFields.push(`closeddate = $${paramIndex}`);
    values.push(updateData.closeddate);
    paramIndex++;
  }
  
  if (updateData.notes) {
    updateFields.push(`notes = $${paramIndex}`);
    values.push(updateData.notes);
    paramIndex++;
  }

  // Always add audit fields
  updateFields.push(`updatedBy = $${paramIndex}`);
  values.push(auditFields.updatedBy);
  paramIndex++;
  
  updateFields.push(`updatedat = $${paramIndex}`);
  values.push(auditFields.updatedat);
  paramIndex++;

  // Add WHERE clause
  values.push(positionId);

  const query = `
    UPDATE position 
    SET ${updateFields.join(', ')} 
    WHERE id = $${paramIndex} 
    RETURNING *
  `;

  const result = await getPool().query(query, values);
  return result.rows[0];
}

/**
 * Create a TRANSACTION with audit trail
 */
export async function createTransactionWithAudit(
  transactionData: {
    positionId: string;
    userId: string;
    type: 'buy' | 'sell';
    date: string;
    quantity: number;
    price: number;
    fees?: number;
    notes?: string;
  },
  user: AuditTrailUser
) {
  const auditFields = generateCreateAuditFields(user);
  
  const query = `
    INSERT INTO transactions (
      positionId, userId, type, date, quantity, price, fees, notes, createdBy, createdat
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
    RETURNING *
  `;
  
  const values = [
    transactionData.positionId,
    transactionData.userId,
    transactionData.type,
    transactionData.date,
    transactionData.quantity,
    transactionData.price,
    transactionData.fees || 0,
    transactionData.notes || null,
    auditFields.createdBy,
    auditFields.createdat
  ];

  const result = await getPool().query(query, values);
  return result.rows[0];
}

/**
 * Get audit trail information for a record
 */
export async function getAuditTrail(tableName: string, recordId: string) {
  const query = `
    SELECT 
      t.createdat,
      t.updatedat,
      creator.email as created_by_email,
      creator.role as created_by_role,
      updater.email as updated_by_email,
      updater.role as updated_by_role
    FROM ${tableName} t
    LEFT JOIN users creator ON t.createdBy = creator.id
    LEFT JOIN users updater ON t.updatedBy = updater.id
    WHERE t.id = $1
  `;

  const result = await getPool().query(query, [recordId]);
  return result.rows[0] || null;
}

/**
 * Get audit history for a specific record (if we implement audit log table later)
 */
export async function getAuditHistory(tableName: string, recordId: string) {
  // This would require an audit_log table to track all changes
  // For now, we just return the current audit info
  return await getAuditTrail(tableName, recordId);
}
