/**
 * Order Repository Mock Implementation
 * 
 * In-memory implementation for testing without database dependency
 */

import { IOrderRepository } from '../repository/IOrderRepository';
import { Order, GetOrdersOptions, GetOrdersResult } from '../types/OrderTypes';
import { AuditTrailUser } from '../../../utils/auditTrail';

export class OrderRepositoryMock implements IOrderRepository {
  private readonly orders: Map<string, Order> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const testOrder1: Order = {
      id: 'order-001',
      userId: 'user-001',
      type: 'buy',
      status: 'pending',
      orderNumber: 'ORD-ORDER001',
      items: [
        {
          id: 'item-001',
          productId: 'prod-001',
          productName: 'Swiss Vreneli 20 Francs Gold Coin',
          quantity: 2,
          unitPrice: 450.0,
          totalPrice: 900.0
        }
      ],
      currency: 'CHF',
      subtotal: 900.0,
      taxes: 0,
      totalAmount: 900.0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    const testOrder2: Order = {
      id: 'order-002',
      userId: 'user-001',
      type: 'buy',
      status: 'confirmed',
      orderNumber: 'ORD-ORDER002',
      items: [
        {
          id: 'item-002',
          productId: 'prod-002',
          productName: 'PAMP Suisse 1oz Gold Bar',
          quantity: 1,
          unitPrice: 2100.0,
          totalPrice: 2100.0
        },
        {
          id: 'item-003',
          productId: 'prod-003',
          productName: 'Austrian Philharmonic 1oz Silver Coin',
          quantity: 5,
          unitPrice: 32.0,
          totalPrice: 160.0
        }
      ],
      currency: 'USD',
      subtotal: 2260.0,
      taxes: 0,
      totalAmount: 2260.0,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-16')
    };

    this.orders.set(testOrder1.id, testOrder1);
    this.orders.set(testOrder2.id, testOrder2);
  }

  async create(order: Order, _authenticatedUser: AuditTrailUser): Promise<void> {
    this.orders.set(order.id, { ...order });
  }

  async findById(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) || null;
  }

  async findByUserId(userId: string | undefined, options: GetOrdersOptions): Promise<GetOrdersResult> {
    const { page = 1, limit = 20, status, type } = options;
    
    // Filter orders
    let filteredOrders = Array.from(this.orders.values());
    
    if (userId) {
      filteredOrders = filteredOrders.filter(o => o.userId === userId);
    }
    
    if (status) {
      filteredOrders = filteredOrders.filter(o => o.status === status);
    }
    
    if (type) {
      filteredOrders = filteredOrders.filter(o => o.type === type);
    }
    
    // Sort by createdAt DESC
    filteredOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Pagination
    const total = filteredOrders.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const orders = filteredOrders.slice(offset, offset + limit);
    
    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    };
  }

  async updateStatus(orderId: string, newStatus: string, _authenticatedUser: AuditTrailUser): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    
    order.status = newStatus as any;
    order.updatedAt = new Date();
    this.orders.set(orderId, order);
  }

  async update(orderId: string, updates: Partial<Order>, _authenticatedUser: AuditTrailUser): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    
    const updatedOrder = { ...order, ...updates, updatedAt: new Date() };
    this.orders.set(orderId, updatedOrder);
  }

  async countByUserId(userId: string | undefined, options?: { status?: string; type?: string }): Promise<number> {
    let filteredOrders = Array.from(this.orders.values());
    
    if (userId) {
      filteredOrders = filteredOrders.filter(o => o.userId === userId);
    }
    
    if (options?.status) {
      filteredOrders = filteredOrders.filter(o => o.status === options.status);
    }
    
    if (options?.type) {
      filteredOrders = filteredOrders.filter(o => o.type === options.type);
    }
    
    return filteredOrders.length;
  }

  // Test helper methods
  clear(): void {
    this.orders.clear();
  }

  getAllOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  reset(): void {
    this.clear();
    this.initializeMockData();
  }
}
