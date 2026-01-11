/**
 * OrderService Implementation
 * 
 * Handles order business logic using clean architecture with DI
 * Orchestrates product validation, calculation, and order persistence
 */

import { v4 as uuidv4 } from 'uuid';
import { IOrderService } from '../IOrderService';
import { IOrderRepository } from '../repository/IOrderRepository';
import { IProductService } from '../../product/IProductService';
import { ICalculationService } from '../../calculation/ICalculationService';
import { 
  Order, 
  CreateOrderRequest, 
  CreateOrderResult, 
  GetOrdersOptions, 
  GetOrdersResult,
  OrderType 
} from '../types/OrderTypes';
import { 
  validateCreateOrderRequest, 
  isValidOrderStatus, 
  isValidStatusTransition,
  parseOrderType 
} from '../utils/OrderValidator';
import { AuditTrailUser } from '../../../utils/auditTrail';

export class OrderServiceImpl implements IOrderService {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly productService: IProductService,
    private readonly calculationService: ICalculationService
  ) {}

  /**
   * Create a new order with full enrichment
   */
  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResult>;
  async createOrder(request: CreateOrderRequest, authenticatedUser?: AuditTrailUser): Promise<CreateOrderResult>;
  async createOrder(request: CreateOrderRequest, authenticatedUser?: AuditTrailUser): Promise<CreateOrderResult> {
    // Validate request
    validateCreateOrderRequest(request);

    // Enrich items with product data and validate availability
    const enrichedItems = await this.productService.enrichOrderItems(request.items);
    
    // Calculate pricing
    const calculation = this.calculationService.calculateOrderTotal(
      enrichedItems.map(item => ({ quantity: item.quantity, unitPrice: item.unitPrice }))
    );

    // Parse order type (returns lowercase for DB)
    const orderType: string = parseOrderType(request.type);

    // Generate order ID
    const orderId = uuidv4();
    const now = new Date();

    // Create the complete order object
    const order: Order = {
      id: orderId,
      userId: request.userId,
      type: orderType,  // lowercase for internal use
      status: "pending",  // lowercase for DB
      orderNumber: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      items: enrichedItems.map(item => ({
        id: uuidv4(),
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })),
      currency: "CHF", // TODO: Get from request or user preference
      subtotal: calculation.subtotal,
      taxes: calculation.taxes || 0,
      totalAmount: calculation.totalAmount,
      createdAt: now,
      updatedAt: now
    };

    // Save to database via repository
    await this.orderRepository.create(order, authenticatedUser);

    return {
      order,
      calculation
    };
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    return await this.orderRepository.findById(orderId);
  }

  /**
   * Update order status with validation
   */
  async updateOrderStatus(orderId: string, newStatus: string): Promise<void>;
  async updateOrderStatus(orderId: string, newStatus: string, authenticatedUser?: AuditTrailUser): Promise<void>;
  async updateOrderStatus(orderId: string, newStatus: string, authenticatedUser?: AuditTrailUser): Promise<void> {
    // Validate status
    if (!isValidOrderStatus(newStatus)) {
      throw new Error(`Invalid order status: ${newStatus}`);
    }

    // Get current order
    const currentOrder = await this.getOrderById(orderId);
    if (!currentOrder) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Validate status transition
    if (!isValidStatusTransition(currentOrder.status, newStatus)) {
      throw new Error(`Invalid status transition from ${currentOrder.status} to ${newStatus}`);
    }

    // Update via repository
    await this.orderRepository.updateStatus(orderId, newStatus, authenticatedUser);
  }

  /**
   * Get orders by user with filtering and pagination
   */
  async getOrdersByUserId(userId?: string, options?: GetOrdersOptions): Promise<GetOrdersResult> {
    return await this.orderRepository.findByUserId(userId, options || {});
  }
}
