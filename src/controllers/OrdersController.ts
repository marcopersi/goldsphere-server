/**
 * Orders Controller - tsoa implementation (Phase 1 & 2)
 * 
 * Migration Strategy:
 * Phase 1: Simple GET endpoints ✅
 * Phase 2: List + Create endpoints ✅
 * Phase 3: Complex endpoints (process, cancel, update, delete)
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Put,
  Query,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags
} from "tsoa";
import { getPool } from "../dbConfig";
import { OrderServiceFactory } from "../services/order";
import { ProductServiceFactory } from "../services/product";
import { CalculationServiceFactory } from "../services/calculation";
import type {
  Order,
  OrderItem,
  OrderItemProduct,
  OrderCustodyService,
} from "../services/order/types/OrderTypes";
import { createLogger } from "../utils/logger";
import { requireAuthenticatedUser, AuthenticationError } from "../utils/auditTrail";

const logger = createLogger("OrdersController");

// Initialize services with DI (same pattern as orders.ts)
const pool = getPool();
const productService = ProductServiceFactory.createProductService(pool);
const calculationService = CalculationServiceFactory.create();
const orderService = OrderServiceFactory.create(pool, productService, calculationService);

// =============================================================================
// INTERFACES
// =============================================================================

interface OrdersErrorResponse {
  success: false;
  error: string;
  details?: string;
}

interface OrdersPaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface OrdersListResponse {
  success: true;
  orders: OrderResponse[];
  pagination: OrdersPaginationInfo;
  user?: {
    id: string;
  };
}

interface OrderDetailResponse {
  success: true;
  data: OrderResponse;
  message?: string;
}

interface DetailedOrderCustodianResponse {
  name: string;
  email: string | null;
}

interface DetailedOrderCustodyServiceResponse {
  id: string;
  name: string;
  fee: number;
  paymentFrequency: string;
  currency: string;
  custodian: DetailedOrderCustodianResponse;
}

interface DetailedOrderUserResponse {
  email: string | null;
}

interface DetailedOrderData {
  id: string;
  userId: string;
  type: string;
  status: string;
  paymentStatus: string;
  items: OrderItemResponse[];
  subtotal: number;
  totalAmount: number;
  user: DetailedOrderUserResponse;
  custodyService: DetailedOrderCustodyServiceResponse | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DetailedOrderResponse {
  success: true;
  data: DetailedOrderData;
  message: string;
}

interface OrderItemProductResponse {
  name: string;
  currentPrice: number;
  currency: string;
  weight: number;
  weightUnit: string;
  purity: number;
  year: number | null;
  type: string;
  metal: string;
  country: string | null;
  producer: string;
}

interface OrderItemResponse {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: OrderItemProductResponse;
}

interface OrderCustodyServiceResponse {
  id: string;
  name: string;
  fee: number;
  paymentFrequency: string;
  currency: string;
  custodian: {
    id: string;
    name: string;
  };
}

interface OrderResponse {
  id: string;
  userId: string;
  type: string;
  status: string;
  orderNumber: string;
  items: OrderItemResponse[];
  currency: string;
  subtotal: number;
  taxes: number;
  totalAmount: number;
  custodyService?: OrderCustodyServiceResponse | null;
  createdAt: string;
  updatedAt: string;
}

interface OrdersAdminStatistics {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  uniqueUsers: number;
}

interface OrdersAdminResponse {
  success: true;
  orders: OrderResponse[];
  pagination: OrdersPaginationInfo;
  statistics: OrdersAdminStatistics;
  filters?: {
    status?: string;
    type?: string;
    userId?: string;
  };
  adminContext: {
    requestedBy: string;
    role: string;
  };
}

function mapOrderItemProductToResponse(product: OrderItemProduct): OrderItemProductResponse {
  return {
    name: product.name,
    currentPrice: product.currentPrice,
    currency: product.currency,
    weight: product.weight,
    weightUnit: product.weightUnit,
    purity: product.purity,
    year: product.year,
    type: product.type,
    metal: product.metal,
    country: product.country,
    producer: product.producer,
  };
}

function mapOrderItemToResponse(item: OrderItem): OrderItemResponse {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    product: item.product ? mapOrderItemProductToResponse(item.product) : undefined,
  };
}

function mapOrderCustodyServiceToResponse(custodyService: OrderCustodyService): OrderCustodyServiceResponse {
  return {
    id: custodyService.id,
    name: custodyService.name,
    fee: custodyService.fee,
    paymentFrequency: custodyService.paymentFrequency,
    currency: custodyService.currency,
    custodian: {
      id: custodyService.custodian.id,
      name: custodyService.custodian.name,
    },
  };
}

function mapOrderToResponse(order: Order): OrderResponse {
  return {
    id: order.id,
    userId: order.userId,
    type: order.type,
    status: order.status,
    orderNumber: order.orderNumber,
    items: order.items.map(mapOrderItemToResponse),
    currency: order.currency,
    subtotal: order.subtotal,
    taxes: order.taxes,
    totalAmount: order.totalAmount,
    custodyService: order.custodyService
      ? mapOrderCustodyServiceToResponse(order.custodyService)
      : order.custodyService,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

interface OrdersCreateInput {
  type: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  custodyServiceId?: string;
  notes?: string;
  currency?: string; // Optional - currency for the order
  source?: string; // Optional - source of the order (e.g. 'web', 'mobile')
  userId?: string; // Optional - ignored, user comes from JWT token
}

interface OrdersCreateResponse {
  success: true;
  data: any;
  message: string;
}

interface OrdersUpdateInput {
  type?: string;
  status?: string;
  notes?: string;
}

interface OrdersUpdateResponse {
  success: true;
  data: any;
  message: string;
}

interface OrdersDeleteResponse {
  success: true;
  message: string;
  data: {
    orderId: string;
    deletedOrderItems: number;
    deletedBy: string;
    deletedAt: string;
  };
}

interface OrdersCancelResponse {
  success: true;
  message: string;
  data: {
    orderId: string;
    previousStatus: string;
    newStatus: string;
    cancelledBy: string;
    cancelledAt: string;
    order: any;
  };
}

@Route("orders")
@Tags("Orders")
@Security("bearerAuth")
export class OrdersController extends Controller {
  /**
   * Get all orders with role-based access control
   * Admins can view all orders, regular users can only view their own
   */
  @Get()
  @SuccessResponse(200, "Orders retrieved successfully")
  @Response<OrdersErrorResponse>(401, "User not authenticated")
  @Response<OrdersErrorResponse>(403, "Access denied")
  @Response<OrdersErrorResponse>(500, "Internal server error")
  public async getOrders(
    @Request() request: any,
    @Query() page?: number,
    @Query() limit?: number,
    @Query() status?: string,
    @Query() type?: string,
    @Query() userId?: string
  ): Promise<OrdersListResponse | OrdersErrorResponse> {
    try {
      const authenticatedUser = requireAuthenticatedUser(request);

      // Access control: Regular users can only access their own orders
      if (authenticatedUser.role !== 'admin' && userId && userId !== authenticatedUser.id) {
        this.setStatus(403);
        return {
          success: false,
          error: "Access denied. Users can only view their own orders. Use /orders/my for a simpler experience."
        };
      }

      // For regular users, force userId to their own ID
      const effectiveUserId = authenticatedUser.role === 'admin' ? userId : authenticatedUser.id;

      // Use orderService to get orders with proper access control
      const ordersResult = await orderService.getOrdersByUserId(effectiveUserId, {
        page: page || 1,
        limit: limit || 20,
        status: status as string,
        type: type as string
      });
      const mappedOrders = ordersResult.orders.map(mapOrderToResponse);

      this.setStatus(200);
      return {
        success: true,
        orders: mappedOrders,
        pagination: ordersResult.pagination,
        user: effectiveUserId ? { id: effectiveUserId } : undefined
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.setStatus(401);
        return { success: false, error: error.message };
      }
      logger.error("Error fetching orders", error);
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to fetch orders",
        details: (error as Error).message
      };
    }
  }

  /**
   * Get all orders with admin statistics
   * Admin-only endpoint with comprehensive order management data
   */
  @Get("admin")
  @SuccessResponse(200, "Admin orders retrieved successfully")
  @Response<OrdersErrorResponse>(401, "User not authenticated")
  @Response<OrdersErrorResponse>(403, "Access denied - Admin role required")
  @Response<OrdersErrorResponse>(500, "Internal server error")
  public async getOrdersAdmin(
    @Request() request: any,
    @Query() page?: number,
    @Query() limit?: number,
    @Query() status?: string,
    @Query() type?: string,
    @Query() userId?: string
  ): Promise<OrdersAdminResponse | OrdersErrorResponse> {
    try {
      const authenticatedUser = requireAuthenticatedUser(request);

      // Check if user is admin
      if (authenticatedUser.role !== 'admin') {
        this.setStatus(403);
        return {
          success: false,
          error: "Access denied. Admin role required."
        };
      }

      // Use orderService for basic order retrieval
      const ordersResult = await orderService.getOrdersByUserId(userId, {
        page: page || 1,
        limit: limit || 20,
        status: status as string,
        type: type as string
      });
      const mappedOrders = ordersResult.orders.map(mapOrderToResponse);

      // Build WHERE clause for stats query
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (status) {
        whereConditions.push(`orderstatus = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      if (type) {
        whereConditions.push(`type = $${paramIndex}`);
        queryParams.push(type);
        paramIndex++;
      }

      if (userId) {
        whereConditions.push(`userid = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get summary statistics for admin dashboard
      const statsQuery = `
        SELECT 
          COUNT(*) as totalOrders,
          COUNT(CASE WHEN orderstatus = 'pending' THEN 1 END) as pendingOrders,
          COUNT(CASE WHEN orderstatus = 'processing' THEN 1 END) as processingOrders,
          COUNT(CASE WHEN orderstatus = 'shipped' THEN 1 END) as shippedOrders,
          COUNT(CASE WHEN orderstatus = 'delivered' THEN 1 END) as deliveredOrders,
          COUNT(CASE WHEN orderstatus = 'cancelled' THEN 1 END) as cancelledOrders,
          COUNT(DISTINCT userid) as uniqueUsers
        FROM orders
        ${whereClause}
      `;

      const statsResult = await getPool().query(statsQuery, queryParams);
      const stats = statsResult.rows[0];

      this.setStatus(200);
      return {
        success: true,
        orders: mappedOrders,
        pagination: ordersResult.pagination,
        statistics: {
          totalOrders: Number.parseInt(stats.totalorders),
          pendingOrders: Number.parseInt(stats.pendingorders),
          processingOrders: Number.parseInt(stats.processingorders),
          shippedOrders: Number.parseInt(stats.shippedorders),
          deliveredOrders: Number.parseInt(stats.deliveredorders),
          cancelledOrders: Number.parseInt(stats.cancelledorders),
          uniqueUsers: Number.parseInt(stats.uniqueusers)
        },
        filters: {
          status,
          type,
          userId
        },
        adminContext: {
          requestedBy: authenticatedUser.email,
          role: authenticatedUser.role
        }
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.setStatus(401);
        return { success: false, error: error.message };
      }
      logger.error("Error fetching orders for admin", error);
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to fetch orders for admin",
        details: (error as Error).message
      };
    }
  }

  /**
   * Get current user's orders
   * Simple endpoint for authenticated users to view their own orders
   */
  @Get("my")
  @SuccessResponse(200, "User orders retrieved successfully")
  @Response<OrdersErrorResponse>(401, "User not authenticated")
  @Response<OrdersErrorResponse>(500, "Internal server error")
  public async getMyOrders(
    @Request() request: any,
    @Query() page?: number,
    @Query() limit?: number,
    @Query() status?: string,
    @Query() type?: string
  ): Promise<OrdersListResponse | OrdersErrorResponse> {
    try {
      const authenticatedUser = requireAuthenticatedUser(request);

      // Use orderService to get user's orders
      const ordersResult = await orderService.getOrdersByUserId(authenticatedUser.id, {
        page: page || 1,
        limit: limit || 20,
        status: status as string,
        type: type as string
      });
      const mappedOrders = ordersResult.orders.map(mapOrderToResponse);

      // Return enhanced data
      this.setStatus(200);
      return {
        success: true,
        orders: mappedOrders,
        pagination: ordersResult.pagination,
        user: {
          id: authenticatedUser.id
        }
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.setStatus(401);
        return { success: false, error: error.message };
      }
      logger.error("Error fetching user's orders", error);
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to fetch user's orders",
        details: (error as Error).message
      };
    }
  }

  /**
   * Create a new order
   * Frontend sends minimal request, backend enriches with product details
   */
  @Post()
  @SuccessResponse(201, "Order created successfully")
  @Response<OrdersErrorResponse>(400, "Invalid order data or insufficient stock")
  @Response<OrdersErrorResponse>(401, "User not authenticated")
  @Response<OrdersErrorResponse>(500, "Internal server error")
  public async createOrder(
    @Request() request: any,
    @Body() body: OrdersCreateInput
  ): Promise<OrdersCreateResponse | OrdersErrorResponse> {
    try {
      const authenticatedUser = requireAuthenticatedUser(request);

      // Validate items array
      if (!body.items || body.items.length === 0) {
        this.setStatus(400);
        return {
          success: false,
          error: "Invalid order data",
          details: "Order must contain at least one item"
        };
      }

      // Use OrderService to create order with proper validation and enrichment
      const createOrderRequest = {
        userId: authenticatedUser.id,
        type: body.type,
        items: body.items,
        custodyServiceId: body.custodyServiceId,
        notes: body.notes
      };

      const result = await orderService.createOrder(createOrderRequest, authenticatedUser);

      this.setStatus(201);
      return {
        success: true,
        data: result.order,
        message: "Order created successfully. Backend enriched the order with product details and calculations."
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.setStatus(401);
        return { success: false, error: error.message };
      }
      logger.error("Error creating order", error);

      const errorMessage = (error as Error).message;

      // Check if it's a stock availability error
      if (errorMessage.includes('Insufficient stock for')) {
        this.setStatus(400);
        return {
          success: false,
          error: "Insufficient stock",
          details: errorMessage
        };
      }

      // Generic error for other types of failures
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to create order",
        details: errorMessage
      };
    }
  }

  /**
   * Get order by ID
   * Returns basic order information
   */
  @Get("{id}")
  @SuccessResponse(200, "Order retrieved successfully")
  @Response<OrdersErrorResponse>(400, "Invalid order ID format")
  @Response<OrdersErrorResponse>(404, "Order not found")
  @Response<OrdersErrorResponse>(500, "Internal server error")
  public async getOrder(@Path() id: string): Promise<OrderDetailResponse | OrdersErrorResponse> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.exec(id)) {
        this.setStatus(400);
        return {
          success: false,
          error: "Invalid order ID format"
        };
      }

      const order = await orderService.getOrderById(id);
      if (!order) {
        this.setStatus(404);
        return {
          success: false,
          error: "Order not found"
        };
      }

      this.setStatus(200);
      return {
        success: true,
        data: mapOrderToResponse(order),
        message: "Order retrieved successfully"
      };
    } catch (error) {
      logger.error("Error fetching order", error);
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to fetch order",
        details: (error as Error).message
      };
    }
  }

  /**
   * Get order by ID with detailed information
   * Frontend-friendly endpoint with all related data (product, custody, user)
   */
  @Get("{id}/detailed")
  @SuccessResponse(200, "Detailed order retrieved successfully")
  @Response<OrdersErrorResponse>(400, "Invalid order ID format")
  @Response<OrdersErrorResponse>(401, "User not authenticated")
  @Response<OrdersErrorResponse>(404, "Order not found")
  @Response<OrdersErrorResponse>(500, "Internal server error")
  public async getOrderDetailed(
    @Request() request: any,
    @Path() id: string
  ): Promise<DetailedOrderResponse | OrdersErrorResponse> {
    try {
      requireAuthenticatedUser(request);

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.exec(id)) {
        this.setStatus(400);
        return {
          success: false,
          error: "Invalid order ID format"
        };
      }

      // Comprehensive query to get order with all related data
      const orderQuery = `
        SELECT 
          o.id as order_id,
          o.userid as order_user_id,
          o.type as order_type,
          o.orderstatus as order_status,
          o.payment_status as payment_status,
          o.createdat as order_created_at,
          o.updatedat as order_updated_at,
          o.custodyserviceid as order_custody_service_id,

          -- User information
          u.email as user_email,
          
          -- Order items
          oi.id as item_id,
          oi.productid as item_product_id,
          oi.productname as item_product_name,
          oi.quantity as item_quantity,
          oi.unitprice as item_unit_price,
          oi.totalprice as item_total_price,
          
          -- Product details
          p.name as product_name,
          p.price as product_current_price,
          p.currency as product_currency,
          p.weight as product_weight,
          p.weightunit as product_weight_unit,
          p.purity as product_purity,
          p.year as product_year,
          
          -- Product related data
          pt.producttypename as product_type,
          m.name as product_metal,
          c.countryname as product_country,
          pr.producername as product_producer,
          
          -- Custody service details
          cs.id as custody_service_id,
          cs.custodyservicename as custody_service_name,
          cs.fee as custody_service_fee,
          cs.paymentfrequency as custody_service_payment_frequency,
          
          -- Custody service currency
          curr.isocode3 as custody_service_currency,
          
          -- Custodian information
          cust.custodianname as custodian_name
        FROM orders o
        LEFT JOIN users u ON o.userid = u.id
        LEFT JOIN order_items oi ON o.id = oi.orderid
        LEFT JOIN product p ON oi.productid = p.id
        LEFT JOIN producttype pt ON p.producttypeid = pt.id
        LEFT JOIN metal m ON p.metalid = m.id
        LEFT JOIN country c ON p.countryid = c.id
        LEFT JOIN producer pr ON p.producerid = pr.id
        LEFT JOIN custodyservice cs ON o.custodyserviceid = cs.id
        LEFT JOIN currency curr ON cs.currencyid = curr.id
        LEFT JOIN custodian cust ON cs.custodianid = cust.id
        WHERE o.id = $1
      `;

      const result = await getPool().query(orderQuery, [id]);

      if (result.rows.length === 0) {
        this.setStatus(404);
        return {
          success: false,
          error: "Order not found"
        };
      }

      // Group by order and build detailed structure
      const firstRow = result.rows[0];

      // Build items array from rows (multiple rows if multiple items)
      const items: OrderItemResponse[] = result.rows.map((row) => ({
        id: row.item_id,
        productId: row.item_product_id,
        productName: row.item_product_name || row.product_name,
        quantity: Number.parseFloat(row.item_quantity),
        unitPrice: Number.parseFloat(row.item_unit_price),
        totalPrice: Number.parseFloat(row.item_total_price),
        product: {
          name: row.product_name,
          currentPrice: Number.parseFloat(row.product_current_price) || 0,
          currency: row.product_currency,
          weight: Number.parseFloat(row.product_weight) || 0,
          weightUnit: row.product_weight_unit,
          purity: Number.parseFloat(row.product_purity) || 0,
          year: row.product_year,
          type: row.product_type,
          metal: row.product_metal,
          country: row.product_country,
          producer: row.product_producer
        }
      }));

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

      const detailedOrder: DetailedOrderData = {
        id: firstRow.order_id,
        userId: firstRow.order_user_id,
        type: firstRow.order_type,
        status: firstRow.order_status,
        paymentStatus: firstRow.payment_status,
        items,
        subtotal,
        totalAmount: subtotal,
        user: {
          email: firstRow.user_email || null
        },
        custodyService: firstRow.custody_service_id
          ? {
              id: firstRow.custody_service_id,
              name: firstRow.custody_service_name,
              fee: Number.parseFloat(firstRow.custody_service_fee) || 0,
              paymentFrequency: firstRow.custody_service_payment_frequency,
              currency: firstRow.custody_service_currency,
              custodian: {
                name: firstRow.custodian_name,
                email: null
              }
            }
          : null,
        createdAt: firstRow.order_created_at,
        updatedAt: firstRow.order_updated_at
      };

      this.setStatus(200);
      return {
        success: true,
        data: detailedOrder,
        message: "Detailed order retrieved successfully"
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.setStatus(401);
        return { success: false, error: error.message };
      }
      logger.error("Error fetching detailed order", error);
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to fetch detailed order",
        details: (error as Error).message
      };
    }
  }

  /**
   * Process order (status progression)
   * Admin-only endpoint to move order through workflow stages
   * Auto-determines next status: pending→confirmed→processing→shipped→delivered→completed
   */
  @Post("{id}/process")
  @SuccessResponse(200, "Order processed successfully")
  @Response<OrdersErrorResponse>(400, "Invalid order ID or cannot process")
  @Response<OrdersErrorResponse>(401, "User not authenticated")
  @Response<OrdersErrorResponse>(403, "Admin role required")
  @Response<OrdersErrorResponse>(404, "Order not found")
  @Response<OrdersErrorResponse>(500, "Internal server error")
  public async processOrder(
    @Request() request: any,
    @Path() id: string
  ): Promise<OrdersUpdateResponse | OrdersErrorResponse> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.exec(id)) {
        this.setStatus(400);
        return {
          success: false,
          error: "Invalid order ID format"
        };
      }

      const authenticatedUser = requireAuthenticatedUser(request);

      if (authenticatedUser.role !== 'admin') {
        this.setStatus(403);
        return {
          success: false,
          error: "Access denied. Admin role required to process orders."
        };
      }

      // No redundant DB check needed — tsoa @Security("bearerAuth") already verifies user exists in DB

      const workflowResult = await orderService.processOrderWorkflow(id, authenticatedUser);

      // Get updated order
      const updatedOrder = await orderService.getOrderById(id);
      if (!updatedOrder) {
        throw new Error("Failed to retrieve updated order");
      }

      logger.info(`Order ${id} processed successfully: ${workflowResult.previousStatus} -> ${workflowResult.newStatus}`);

      this.setStatus(200);
      return {
        success: true,
        data: updatedOrder,
        message: `Order status updated to ${workflowResult.newStatus}`
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.setStatus(401);
        return { success: false, error: error.message };
      }

      const errorMessage = (error as Error).message;
      const handledWorkflowError = this.mapWorkflowProcessError(errorMessage);
      if (handledWorkflowError) {
        return handledWorkflowError;
      }

      logger.error("Error processing order", error);
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to process order",
        details: errorMessage
      };
    }
  }

  private mapWorkflowProcessError(errorMessage: string): OrdersErrorResponse | null {
    if (errorMessage === 'ORDER_NOT_FOUND') {
      this.setStatus(404);
      return {
        success: false,
        error: 'Order not found'
      };
    }

    if (!errorMessage.startsWith('ORDER_WORKFLOW_INVALID_STATE:')) {
      return null;
    }

    const currentStatus = errorMessage.split(':')[1] || 'unknown';
    this.setStatus(400);

    if (currentStatus === 'completed') {
      return {
        success: false,
        error: 'Order is already completed and cannot be processed further'
      };
    }

    if (currentStatus === 'cancelled') {
      return {
        success: false,
        error: 'Order is cancelled and cannot be processed'
      };
    }

    return {
      success: false,
      error: `Invalid order status '${currentStatus}' for further processing`
    };
  }

  /**
   * Update order
   * Update order fields (type, status, notes)
   */
  @Put("{id}")
  @SuccessResponse(200, "Order updated successfully")
  @Response<OrdersErrorResponse>(400, "Invalid order ID or data")
  @Response<OrdersErrorResponse>(404, "Order not found")
  @Response<OrdersErrorResponse>(500, "Internal server error")
  public async updateOrder(
    @Path() id: string,
    @Body() body: OrdersUpdateInput
  ): Promise<OrdersUpdateResponse | OrdersErrorResponse> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.exec(id)) {
        this.setStatus(400);
        return {
          success: false,
          error: "Invalid order ID format"
        };
      }

      // Check if order exists
      const existingOrder = await orderService.getOrderById(id);
      if (!existingOrder) {
        this.setStatus(404);
        return {
          success: false,
          error: "Order not found"
        };
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (body.type) {
        updateFields.push(`type = $${paramIndex}`);
        updateValues.push(body.type);
        paramIndex++;
      }

      if (body.status) {
        updateFields.push(`orderstatus = $${paramIndex}`);
        updateValues.push(body.status);
        paramIndex++;
      }

      if (body.notes) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(body.notes);
        paramIndex++;
      }

      // Always update timestamp
      updateFields.push(`updatedat = CURRENT_TIMESTAMP`);

      if (updateFields.length === 1) {
        this.setStatus(400);
        return {
          success: false,
          error: "No valid fields provided for update"
        };
      }

      const updateQuery = `
        UPDATE orders 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex} 
        RETURNING *
      `;
      updateValues.push(id);

      await getPool().query(updateQuery, updateValues);

      // Get updated order
      const updatedOrder = await orderService.getOrderById(id);

      this.setStatus(200);
      return {
        success: true,
        data: updatedOrder,
        message: "Order updated successfully"
      };
    } catch (error) {
      logger.error("Error updating order", error);
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to update order",
        details: (error as Error).message
      };
    }
  }

  /**
   * Delete order
   * Admin-only endpoint to physically delete order and associated items
   */
  @Delete("{id}")
  @SuccessResponse(200, "Order deleted successfully")
  @Response<OrdersErrorResponse>(400, "Invalid order ID format")
  @Response<OrdersErrorResponse>(401, "User not authenticated")
  @Response<OrdersErrorResponse>(403, "Admin role required")
  @Response<OrdersErrorResponse>(404, "Order not found")
  @Response<OrdersErrorResponse>(500, "Internal server error")
  public async deleteOrder(
    @Request() request: any,
    @Path() id: string
  ): Promise<OrdersDeleteResponse | OrdersErrorResponse> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.exec(id)) {
        this.setStatus(400);
        return {
          success: false,
          error: "Invalid order ID format"
        };
      }

      const authenticatedUser = requireAuthenticatedUser(request);

      if (authenticatedUser.role !== 'admin') {
        this.setStatus(403);
        return {
          success: false,
          error: "Only administrators can delete orders. Regular users should use the cancel endpoint instead."
        };
      }

      // Check if order exists
      const order = await orderService.getOrderById(id);
      if (!order) {
        this.setStatus(404);
        return {
          success: false,
          error: "Order not found"
        };
      }

      // Start transaction
      await getPool().query('BEGIN');

      try {
        // Delete order items first
        const deleteItemsResult = await getPool().query(
          "DELETE FROM order_items WHERE orderid = $1",
          [id]
        );

        // Delete main order
        await getPool().query(
          "DELETE FROM orders WHERE id = $1",
          [id]
        );

        await getPool().query('COMMIT');

        logger.info(`Order ${id} and ${deleteItemsResult.rowCount} items deleted by ${authenticatedUser.email}`);

        this.setStatus(200);
        return {
          success: true,
          message: "Order and associated items deleted successfully",
          data: {
            orderId: id,
            deletedOrderItems: deleteItemsResult.rowCount || 0,
            deletedBy: authenticatedUser.email,
            deletedAt: new Date().toISOString()
          }
        };
      } catch (dbError) {
        await getPool().query('ROLLBACK');
        throw dbError;
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.setStatus(401);
        return { success: false, error: error.message };
      }
      logger.error("Error deleting order", error);
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to delete order",
        details: (error as Error).message
      };
    }
  }

  /**
   * Cancel order
   * Users can cancel their own pending orders, admins can cancel any order
   */
  @Post("{id}/cancel")
  @SuccessResponse(200, "Order cancelled successfully")
  @Response<OrdersErrorResponse>(400, "Invalid order ID or cannot cancel")
  @Response<OrdersErrorResponse>(401, "User not authenticated")
  @Response<OrdersErrorResponse>(403, "Access denied")
  @Response<OrdersErrorResponse>(404, "Order not found")
  @Response<OrdersErrorResponse>(500, "Internal server error")
  public async cancelOrder(
    @Request() request: any,
    @Path() id: string
  ): Promise<OrdersCancelResponse | OrdersErrorResponse> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.exec(id)) {
        this.setStatus(400);
        return {
          success: false,
          error: "Invalid order ID format"
        };
      }

      const authenticatedUser = requireAuthenticatedUser(request);

      // No redundant DB check needed — tsoa @Security("bearerAuth") already verifies user exists in DB

      // Get order to check ownership and status
      const order = await orderService.getOrderById(id);
      if (!order) {
        this.setStatus(404);
        return {
          success: false,
          error: "Order not found"
        };
      }

      // Authorization: Users can only cancel their own orders
      if (authenticatedUser.role !== 'admin' && order.userId !== authenticatedUser.id) {
        this.setStatus(403);
        return {
          success: false,
          error: "You can only cancel your own orders"
        };
      }

      // Business logic: Regular users can only cancel pending orders
      if (authenticatedUser.role !== 'admin' && order.status !== 'pending') {
        this.setStatus(400);
        return {
          success: false,
          error: `Cannot cancel order with status '${order.status}'. Only pending orders can be cancelled by users.`
        };
      }

      // Prevent cancelling already cancelled orders
      if (order.status === 'cancelled') {
        this.setStatus(400);
        return {
          success: false,
          error: "Order is already cancelled"
        };
      }

      // Update status to cancelled
      await orderService.updateOrderStatus(id, 'cancelled', authenticatedUser);

      // Get updated order
      const cancelledOrder = await orderService.getOrderById(id);

      logger.info(`Order ${id} cancelled by ${authenticatedUser.email}`);

      this.setStatus(200);
      return {
        success: true,
        message: "Order cancelled successfully",
        data: {
          orderId: id,
          previousStatus: order.status,
          newStatus: 'cancelled',
          cancelledBy: authenticatedUser.email,
          cancelledAt: new Date().toISOString(),
          order: cancelledOrder
        }
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.setStatus(401);
        return { success: false, error: error.message };
      }
      logger.error(`Error cancelling order ${id}`, error);

      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Invalid status transition')) {
        this.setStatus(400);
        return {
          success: false,
          error: "Cannot cancel order in current state",
          details: errorMessage
        };
      }

      this.setStatus(500);
      return {
        success: false,
        error: "Failed to cancel order",
        details: errorMessage
      };
    }
  }
}
