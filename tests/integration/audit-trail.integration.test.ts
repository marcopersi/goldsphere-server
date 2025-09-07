/**
 * Audit Trail Integration Tests
 * 
 * Tests audit trail functionality for orders, positions, and other entities.
 * Verifies that createdBy and updatedBy columns are properly populated.
 */

import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../../src/dbConfig';
import { createOrderWithAudit, updateOrderWithAudit, getAuditTrail, AuditTrailUser } from '../../src/utils/auditTrail';

describe('Audit Trail Integration Tests', () => {
  let pool: any;
  let testUser: AuditTrailUser;
  let testUserId: string;
  let orderId: string;

  beforeAll(async () => {
    pool = getPool();
    
    // Create a test user for audit trail with unique email
    testUserId = uuidv4();
    const uniqueTestEmail = `audit-${Date.now()}@test.com`;
    await pool.query(
      `INSERT INTO users (id, username, email, role, passwordHash) 
       VALUES ($1, $2, $3, $4, $5)`,
      [testUserId, 'auditUser', uniqueTestEmail, 'admin', 'dummy_hash']
    );

    testUser = {
      id: testUserId,
      email: uniqueTestEmail,
      role: 'admin'
    };
  });

  afterAll(async () => {
    try {
      // Clean up test data - orders first due to foreign key constraints
      if (orderId) {
        await pool.query('DELETE FROM order_items WHERE orderid = $1', [orderId]);
        await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
      }
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('Order Audit Trail', () => {
    it('should create order with audit trail information', async () => {
      orderId = uuidv4();
      
      const orderData = {
        id: orderId,
        userid: testUserId,
        type: 'buy',
        orderstatus: 'pending',
        custodyserviceid: undefined,
        payment_intent_id: undefined,
        payment_status: 'pending'
      };

      // Create order with audit trail
      const createdOrder = await createOrderWithAudit(orderData, testUser);

      expect(createdOrder).toBeDefined();
      expect(createdOrder.id).toBe(orderId);

      // Verify audit trail was recorded
      const result = await pool.query(
        'SELECT createdBy, updatedBy, createdat, updatedat FROM orders WHERE id = $1',
        [orderId]
      );

      expect(result.rows).toHaveLength(1);
      const auditData = result.rows[0];
      
      expect(auditData.createdby).toBe(testUserId);
      expect(auditData.updatedby).toBe(testUserId);
      expect(auditData.createdat).toBeDefined();
      expect(auditData.updatedat).toBeDefined();
    });

    it('should update order with audit trail information', async () => {
      const updateData = {
        orderstatus: 'confirmed'
      };

      // Update order with audit trail
      const updatedOrder = await updateOrderWithAudit(orderId, updateData, testUser);

      expect(updatedOrder).toBeDefined();
      expect(updatedOrder.orderstatus).toBe('confirmed');

      // Verify audit trail was updated
      const result = await pool.query(
        'SELECT createdBy, updatedBy, createdat, updatedat FROM orders WHERE id = $1',
        [orderId]
      );

      const auditData = result.rows[0];
      
      // CreatedBy should remain the same
      expect(auditData.createdby).toBe(testUserId);
      // UpdatedBy should be the current user
      expect(auditData.updatedby).toBe(testUserId);
      // UpdatedAt should be different from CreatedAt
      expect(new Date(auditData.updatedat)).not.toEqual(new Date(auditData.createdat));
    });

    it('should retrieve audit trail with user information', async () => {
      const auditInfo = await getAuditTrail('orders', orderId);

      expect(auditInfo).toBeDefined();
      expect(auditInfo.created_by_email).toBe(testUser.email);
      expect(auditInfo.created_by_role).toBe('admin');
      expect(auditInfo.updated_by_email).toBe(testUser.email);
      expect(auditInfo.updated_by_role).toBe('admin');
    });

    it('should track multiple users when different admins modify the same order', async () => {
      // Create a second test user with unique email
      const secondUserId = uuidv4();
      const uniqueEmail = `admin2-${Date.now()}@test.com`;
      await pool.query(
        `INSERT INTO users (id, username, email, role, passwordHash) 
         VALUES ($1, $2, $3, $4, $5)`,
        [secondUserId, 'secondAdmin', uniqueEmail, 'admin', 'dummy_hash']
      );

      const secondUser: AuditTrailUser = {
        id: secondUserId,
        email: uniqueEmail,
        role: 'admin'
      };

      try {
        // Update order with second user
        const updateData = {
          orderstatus: 'processing'
        };

        await updateOrderWithAudit(orderId, updateData, secondUser);

        // Verify audit trail shows different users
        const auditInfo = await getAuditTrail('orders', orderId);

        expect(auditInfo.created_by_email).toBe(testUser.email); // Original user
        expect(auditInfo.updated_by_email).toBe(uniqueEmail); // Second user
        
        // Verify the specific scenario mentioned in requirements
        const result = await pool.query(
          'SELECT orderstatus FROM orders WHERE id = $1',
          [orderId]
        );
        expect(result.rows[0].orderstatus).toBe('processing');

        console.log('✅ Successfully demonstrated: When someone changes an order status, we can track which admin it was!');
        console.log(`   - Order ${orderId} was originally created by: ${auditInfo.created_by_email}`);
        console.log(`   - Order ${orderId} was last updated by: ${auditInfo.updated_by_email}`);

      } finally {
        // Clean up second user - but need to clean up orders first due to foreign key constraint
        await pool.query('DELETE FROM order_items WHERE orderid = $1', [orderId]);
        await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
        await pool.query('DELETE FROM users WHERE id = $1', [secondUserId]);
      }
    });
  });

  describe('Order Cancellation Audit Trail', () => {
    it('should track which admin cancelled an order', async () => {
      // This demonstrates the specific use case mentioned: 
      // "when someone cancelled an order, we need to know which admin it was"
      
      // Create a fresh order for cancellation test
      const cancelOrderId = uuidv4();
      const cancelOrderData = {
        id: cancelOrderId,
        userid: testUserId,
        type: 'buy',
        orderstatus: 'confirmed',
        custodyserviceid: undefined,
        payment_intent_id: undefined,
        payment_status: 'pending'
      };

      await createOrderWithAudit(cancelOrderData, testUser);
      
      const cancelData = {
        orderstatus: 'cancelled',
        notes: 'Customer requested cancellation'
      };

      await updateOrderWithAudit(cancelOrderId, cancelData, testUser);

      // Verify we can identify who cancelled the order
      const auditInfo = await getAuditTrail('orders', cancelOrderId);
      const orderResult = await pool.query(
        'SELECT orderstatus FROM orders WHERE id = $1',
        [cancelOrderId]
      );

      expect(orderResult.rows[0].orderstatus).toBe('cancelled');
      expect(auditInfo.updated_by_email).toBe(testUser.email);
      expect(auditInfo.updated_by_role).toBe('admin');

      console.log('✅ Order cancellation audit trail verified!');
      console.log(`   - Order ${cancelOrderId} was cancelled by admin: ${auditInfo.updated_by_email}`);
      console.log(`   - Cancellation timestamp: ${auditInfo.updatedat}`);

      // Clean up the cancellation test order
      await pool.query('DELETE FROM order_items WHERE orderid = $1', [cancelOrderId]);
      await pool.query('DELETE FROM orders WHERE id = $1', [cancelOrderId]);
    });
  });
});
