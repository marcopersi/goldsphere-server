import { OrderService } from '../../src/services/OrderService';

describe('OrderService Mapping Methods', () => {
  
  describe('mapBasicOrderInfo', () => {
    it('should extract basic order information from database row', () => {
      const row = {
        id: 'order-123',
        userid: 'user-456',
        type: 'buy',
        orderstatus: 'pending',
        payment_status: 'pending',
        createdat: '2025-01-01T00:00:00Z',
        updatedat: '2025-01-02T00:00:00Z'
      };

      const result = (OrderService as any).mapBasicOrderInfo(row);

      expect(result).toEqual({
        id: 'order-123',
        userId: 'user-456',
        type: 'buy',
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-02T00:00:00Z')
      });
    });

    it('should default payment_status to pending when not provided', () => {
      const row = {
        id: 'order-123',
        userid: 'user-456',
        type: 'sell',
        orderstatus: 'confirmed',
        createdat: '2025-01-01T00:00:00Z',
        updatedat: '2025-01-02T00:00:00Z'
      };

      const result = (OrderService as any).mapBasicOrderInfo(row);

      expect(result.paymentStatus).toBe('pending');
    });
  });

  describe('mapOrderItems', () => {
    it('should extract order items from database rows', () => {
      const rows = [
        {
          itemid: 'item-1',
          productid: 'product-1',
          productname: 'Gold Coin',
          quantity: '2',
          unitprice: '100.50',
          totalprice: '201.00'
        },
        {
          itemid: 'item-2',
          productid: 'product-2',
          productname: 'Silver Bar',
          quantity: '1',
          unitprice: '50.25',
          totalprice: '50.25'
        }
      ];

      const result = (OrderService as any).mapOrderItems(rows);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'item-1',
        productId: 'product-1',
        productName: 'Gold Coin',
        quantity: 2,
        unitPrice: 100.50,
        totalPrice: 201.00,
        certificateRequested: false
      });
      expect(result[1]).toEqual({
        id: 'item-2',
        productId: 'product-2',
        productName: 'Silver Bar',
        quantity: 1,
        unitPrice: 50.25,
        totalPrice: 50.25,
        certificateRequested: false
      });
    });

    it('should filter out rows without itemid', () => {
      const rows = [
        {
          itemid: 'item-1',
          productid: 'product-1',
          productname: 'Gold Coin',
          quantity: '1',
          unitprice: '100',
          totalprice: '100'
        },
        {
          // Row without itemid should be filtered out
          productid: 'product-2',
          productname: 'Silver Bar',
          quantity: '1',
          unitprice: '50',
          totalprice: '50'
        }
      ];

      const result = (OrderService as any).mapOrderItems(rows);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item-1');
    });

    it('should handle missing numeric values gracefully', () => {
      const rows = [
        {
          itemid: 'item-1',
          productid: 'product-1',
          productname: 'Gold Coin',
          // Missing quantity, unitprice, totalprice
        }
      ];

      const result = (OrderService as any).mapOrderItems(rows);

      expect(result[0]).toEqual({
        id: 'item-1',
        productId: 'product-1',
        productName: 'Gold Coin',
        quantity: 0,
        unitPrice: 0,
        totalPrice: 0,
        certificateRequested: false
      });
    });
  });

  describe('calculateOrderTotals', () => {
    it('should calculate totals from items', () => {
      const items = [
        { totalPrice: 100.50 },
        { totalPrice: 50.25 },
        { totalPrice: 75.75 }
      ];

      const result = (OrderService as any).calculateOrderTotals(items);

      expect(result).toEqual({
        subtotal: 226.50,
        taxes: 0,
        totalAmount: 226.50
      });
    });

    it('should handle empty items array', () => {
      const items: any[] = [];

      const result = (OrderService as any).calculateOrderTotals(items);

      expect(result).toEqual({
        subtotal: 0,
        taxes: 0,
        totalAmount: 0
      });
    });
  });

  describe('mapCustodyService', () => {
    it('should extract custody service information when present', () => {
      const row = {
        custodyserviceid: 'custody-123',
        custodyservicename: 'Premium Custody'
      };

      const result = (OrderService as any).mapCustodyService(row);

      expect(result).toEqual({
        id: 'custody-123',
        name: 'Premium Custody'
      });
    });

    it('should return null when custody service not present', () => {
      const row = {
        // No custodyserviceid
      };

      const result = (OrderService as any).mapCustodyService(row);

      expect(result).toBeNull();
    });

    it('should provide default name when missing', () => {
      const row = {
        custodyserviceid: 'custody-123'
        // Missing custodyservicename
      };

      const result = (OrderService as any).mapCustodyService(row);

      expect(result).toEqual({
        id: 'custody-123',
        name: 'Unknown Custody Service'
      });
    });
  });

  describe('mapCustodian', () => {
    it('should extract custodian information when present', () => {
      const row = {
        custodianid: 'custodian-123',
        custodianname: 'Bank of Gold'
      };

      const result = (OrderService as any).mapCustodian(row);

      expect(result).toEqual({
        id: 'custodian-123',
        name: 'Bank of Gold'
      });
    });

    it('should return null when custodian not present', () => {
      const row = {
        // No custodianid
      };

      const result = (OrderService as any).mapCustodian(row);

      expect(result).toBeNull();
    });

    it('should provide default name when missing', () => {
      const row = {
        custodianid: 'custodian-123'
        // Missing custodianname
      };

      const result = (OrderService as any).mapCustodian(row);

      expect(result).toEqual({
        id: 'custodian-123',
        name: 'Unknown Custodian'
      });
    });
  });

  describe('generateOrderNumber', () => {
    it('should generate order number from order ID', () => {
      const orderId = 'abcdef12-3456-7890-abcd-ef1234567890';

      const result = (OrderService as any).generateOrderNumber(orderId);

      expect(result).toBe('ORD-ABCDEF12');
    });

    it('should handle short order IDs', () => {
      const orderId = 'abc123';

      const result = (OrderService as any).generateOrderNumber(orderId);

      expect(result).toBe('ORD-ABC123');
    });

    it('should uppercase the result', () => {
      const orderId = 'abcdef12-lowercase';

      const result = (OrderService as any).generateOrderNumber(orderId);

      expect(result).toBe('ORD-ABCDEF12');
    });
  });
});
