import { Router, Request, Response } from "express";
import { getPool } from "../dbConfig";
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Order, OrderServiceFactory } from "../services/order";
import { OrderType, OrderStatus } from "@marcopersi/shared";
import { ProductServiceFactory } from "../services/product";
import { CalculationServiceFactory } from "../services/calculation";

// Local validation schemas (temporary until full shared package compatibility)
const OrderQueryParamsSchema = z.object({
  page: z.string().optional().transform(val => val ? Math.max(1, Number.parseInt(val)) || 1 : 1),
  limit: z.string().optional().transform(val => val ? Math.min(100, Math.max(1, Number.parseInt(val))) || 20 : 20),
  status: z.string().optional(), // Accepts both 'pending' and 'PENDING'
  type: z.enum(['buy', 'sell', 'BUY', 'SELL']).optional().transform(val => val?.toLowerCase() as 'buy' | 'sell'), // Normalize to lowercase for DB
  userId: z.string().optional(), // Add userId for admin queries
  sortBy: z.enum(['createdAt', 'updatedAt', 'status', 'totalAmount']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

const CreateOrderInputSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['buy', 'sell', 'BUY', 'SELL']).transform(val => val.toLowerCase() as 'buy' | 'sell'), // Normalize to lowercase for DB
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive()
  })).min(1),
  shippingAddress: z.any().optional(),
  paymentMethod: z.any().optional(),
  notes: z.string().optional()
});

const UpdateOrderRequestSchema = z.object({
  status: z.string().optional(), // Accepts both formats
  notes: z.string().optional(),
  type: z.enum(['buy', 'sell', 'BUY', 'SELL']).optional().transform(val => val?.toLowerCase() as 'buy' | 'sell') // Normalize to lowercase for DB
});

// Response schemas
const OrderApiResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional()
});

const CreateOrderResponseSchema = OrderApiResponseSchema;
const UpdateOrderResponseSchema = OrderApiResponseSchema;

const OrderApiListResponseSchema = z.object({
  success: z.literal(true),
  orders: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean()
  }),
  message: z.string().optional()
});

const router = Router();

// Initialize services with DI
const pool = getPool();
const productService = ProductServiceFactory.createProductService(pool);
const calculationService = CalculationServiceFactory.create();
const orderService = OrderServiceFactory.create(pool, productService, calculationService);

// ============================================================================
// Helper Functions for Enum Conversion
// ============================================================================

/**
 * Converts database value (lowercase) to Enum constant name (UPPER_CASE)
 * Database: 'buy' → API: 'BUY'
 * Database: 'pending' → API: 'PENDING'
 */
function toEnumKey(
  dbValue: string,
  enumClass: any
): string {
  const enumInstance = enumClass.fromValue(dbValue.toLowerCase());
  if (!enumInstance) {
    console.warn(`Unknown enum value: ${dbValue}`);
    return dbValue.toUpperCase(); // Fallback
  }
  // Extract the constant name (e.g., 'BUY' from OrderType.BUY)
  const match = Object.entries(enumClass).find(([_, val]) => val === enumInstance);
  return match ? match[0] : dbValue.toUpperCase();
}

/**
 * Convert OrderType database value to API format
 */
function formatOrderType(dbValue: string): string {
  return toEnumKey(dbValue, OrderType);
}

/**
 * Convert OrderStatus database value to API format
 */
function formatOrderStatus(dbValue: string): string {
  return toEnumKey(dbValue, OrderStatus);
}

// Helper function to convert database rows to Order objects
const mapDatabaseRowsToOrder = (rows: any[]): Order => {
  if (rows.length === 0) throw new Error('No rows to map');
  
  const firstRow = rows[0];
  
  // Group rows by order if needed, for now assume single item per order
  const items = rows.map((row, _index) => ({
    id: row.itemid || uuidv4(), // Use item ID from database or generate UUID
    productId: row.productid,
    productName: row.productname || `Product ${row.productid}`,
    quantity: Number.parseFloat(row.quantity),
    unitPrice: Number.parseFloat(row.unitprice || row.totalprice) / Number.parseFloat(row.quantity),
    totalPrice: Number.parseFloat(row.totalprice),
  }));

  // Map database values to Enum keys for API response
  // Database: 'buy' → API: 'BUY'
  // Database: 'pending' → API: 'PENDING'
  const orderType = formatOrderType(firstRow.type || 'buy');
  const orderStatus = formatOrderStatus(firstRow.orderstatus);
  const currency = firstRow.currency; 

  // Calculate missing fields if not in database
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxes = 0; // Default for now
  const totalAmount = subtotal + taxes;

  return {
    id: firstRow.id,
    userId: firstRow.userid,  // Database has lowercase 'userid'
    type: orderType,  // String literal
    status: orderStatus,  // String literal
    orderNumber: firstRow.ordernumber || `ORD-${firstRow.id.slice(0, 8).toUpperCase()}`,
    items: items,
    currency: currency,  // String literal
    subtotal: subtotal,
    taxes: taxes,
    totalAmount: totalAmount,
    createdAt: firstRow.createdat,
    updatedAt: firstRow.updatedat
  } as Order;
};

// Load SQL query from file (for future use if needed)
// const queries = fs.readFileSync(path.join(__dirname, "../queries/queries.json"), "utf8");

// GET all orders (admin only) - comprehensive order management endpoint
router.get("/orders/admin", async (req: Request, res: Response) => {
  try {
    // Extract user info from JWT token
    const authenticatedUser = (req as any).user;
    
    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    // Check if user is admin
    if (authenticatedUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin role required."
      });
    }

    // Parse query parameters
    const query = OrderQueryParamsSchema.parse(req.query);
    const { page, limit, status, type, userId } = query;
    
    // Use orderService for basic order retrieval
    const ordersResult = await orderService.getOrdersByUserId(userId, {
      page,
      limit,
      status,
      type
    });
    
    // For admin view, we need additional statistics
    // Build WHERE clause for stats query
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }
    
    if (userId) {
      whereConditions.push(`userId = $${paramIndex}`);
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
    
    // Return comprehensive admin response using shared schema
    const adminResponse = OrderApiListResponseSchema.parse({
      success: true,
      orders: ordersResult.orders,
      pagination: ordersResult.pagination,
      statistics: {
        totalOrders: Number.parseInt(stats.totalorders),
        pendingOrders: Number.parseInt(stats.pendingorders),
        completedOrders: Number.parseInt(stats.completedorders),
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
    });
    
    res.json(adminResponse);
  } catch (error) {
    console.error("Error fetching orders for admin:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch orders for admin", 
      details: (error as Error).message 
    });
  }
});

// GET user's own orders - simplified endpoint for authenticated users
router.get("/orders/my", async (req: Request, res: Response) => {
  try {
    // Extract user info from JWT token
    const authenticatedUser = (req as any).user;
    
    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    // Parse query parameters (page, limit, status, type only - no userId)
    const { page = 1, limit = 20, status, type } = req.query;
    
    // Use orderService to get user's orders
    const ordersResult = await orderService.getOrdersByUserId(authenticatedUser.id, {
      page: Number(page),
      limit: Number(limit),
      status: status as string,
      type: type as string
    });
    
    // Return enhanced data directly without schema validation that strips rich data
    const userResponse = {
      success: true,
      orders: ordersResult.orders,
      pagination: ordersResult.pagination,
      user: {
        id: authenticatedUser.id
      }
    };
    
    res.json(userResponse);
  } catch (error) {
    console.error("Error fetching user's orders:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch user's orders", 
      details: (error as Error).message 
    });
  }
});

// GET all orders - intelligently routes based on user role and parameters
router.get("/orders", async (req: Request, res: Response) => {
  try {
    // Extract user info from JWT token
    const authenticatedUser = (req as any).user;
    
    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    const { userId } = req.query;
    
    // Access control: Regular users can only access their own orders
    if (authenticatedUser.role !== 'admin' && userId && userId !== authenticatedUser.id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Users can only view their own orders. Use /orders/my for a simpler experience."
      });
    }
    
    // Parse query parameters
    const query = OrderQueryParamsSchema.parse(req.query);
    const { page, limit, status, type } = query;
    
    // For regular users, force userId to their own ID
    const effectiveUserId = authenticatedUser.role === 'admin' ? userId : authenticatedUser.id;
    
    // Use orderService to get orders with proper access control
    const ordersResult = await orderService.getOrdersByUserId(effectiveUserId, {
      page,
      limit,
      status,
      type
    });
    
    const responseContext = {
      requestedBy: `${authenticatedUser.role}:${authenticatedUser.email}`,
      viewingOrdersFor: effectiveUserId || 'all-users',
      endpointType: authenticatedUser.role === 'admin' ? 'admin-access' : 'user-scoped',
      ...(authenticatedUser.role !== 'admin' && { suggestion: 'Consider using /orders/my for a simplified user experience' })
    };
    
    // Return data using shared schema with context
    const response = OrderApiListResponseSchema.parse({
      success: true,
      orders: ordersResult.orders,
      pagination: ordersResult.pagination,
      context: responseContext
    });
    
    res.json(response);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch orders", 
      details: (error as Error).message 
    });
  }
});

// POST new order - Frontend sends minimal request, backend enriches
router.post("/orders", async (req: Request, res: Response) => {
  try {
    // Extract userId from JWT token (set by authMiddleware)
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    // Validate request body using shared schema
    const validationResult = CreateOrderInputSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid order data",
        details: validationResult.error.issues
      });
    }

    const orderInput = validationResult.data;

    // Use OrderService to create order with proper validation and enrichment
    const createOrderRequest = {
      userId: userId,
      type: orderInput.type,
      items: orderInput.items,
      notes: orderInput.notes
    };

    // Create audit trail user object from authenticated user
    const auditUser = {
      id: (req as any).user.id,
      email: (req as any).user.email,
      role: (req as any).user.role
    };

    const result = await orderService.createOrder(createOrderRequest);
    
    // Format response using shared schema
    const response = CreateOrderResponseSchema.parse({
      success: true,
      data: result.order,
      message: "Order created successfully. Backend enriched the order with product details and calculations."
    });
    
    return res.status(201).json(response);

  } catch (error) {
    console.error("Error creating order:", error);
    
    const errorMessage = (error as Error).message;
    
    // Check if it's a stock availability error
    if (errorMessage.includes('Insufficient stock for')) {
      return res.status(400).json({
        success: false,
        error: "Insufficient stock",
        message: errorMessage,
        details: errorMessage
      });
    }
    
    // Generic error for other types of failures
    return res.status(500).json({
      success: false,
      error: "Failed to create order",
      details: errorMessage
    });
  }
});

// process order
router.post("/orders/:id/process", async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.exec(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid order ID format" 
      });
    }

    // Check authentication and admin role
    const authenticatedUser = (req as any).user;
    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    if (authenticatedUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin role required to process orders."
      });
    }

    // No need to validate request body since we auto-determine the next status
    // The route automatically progresses the order to the next logical status

    // Get current order using OrderService to ensure proper data mapping
    const currentOrder = await orderService.getOrderById(id);
    if (!currentOrder) {
      return res.status(404).json({ 
        success: false,
        error: "Order not found" 
      });
    }

    // Determine next status based on updated shared package flow
    let newStatus: string;
    switch (currentOrder.status) {
      case "pending":
        console.debug("Order is now pending, will be confirmed...");
        newStatus = "confirmed";
        break;
      case "confirmed":
        console.debug("Order is now confirmed, will be processing...");
        newStatus = "processing";
        break;
      case "processing":
        console.debug("Order is now processing, will be shipped...");
        newStatus = "shipped";
        break;
      case "shipped":
        console.debug("Order is now shipped, will be delivered...");
        newStatus = "delivered";
        break;
      case "delivered":
        console.debug("Order is now delivered, will be completed...");
        newStatus = "completed";
        break;
      case "completed":
        console.debug("Order is now completed, cannot process further");
        return res.status(400).json({ 
          success: false,
          error: "Order is already completed and cannot be processed further" 
        });
      case "cancelled":
        console.debug("Order is cancelled, cannot process further");
        return res.status(400).json({ 
          success: false,
          error: "Order is cancelled and cannot be processed" 
        });
      default:
        return res.status(400).json({ 
          success: false,
          error: `Invalid order status '${currentOrder.status}' for further processing` 
        });
    }

    // Update order status using OrderService with audit trail
    const auditUser = {
      id: (req as any).user?.id,
      email: (req as any).user?.email || 'unknown',
      role: (req as any).user?.role || 'unknown'
    };
    
    await orderService.updateOrderStatus(id, newStatus);

    // Create portfolio and positions when order is delivered (customer receives the items)
    if (newStatus === "delivered") {
      let portfolioId = await findPortfolioId(currentOrder.userId);
      
      // If user doesn't have a portfolio, create one
      if (!portfolioId) {
        portfolioId = await createPortfolioForUser(currentOrder.userId);
      }
      
      // Handle positions based on order type
      if (portfolioId) {
        if (currentOrder.type === "buy") {
          // For buy orders: add to positions
          await insertPositionFromOrder(currentOrder, portfolioId);
          console.log(`Created/consolidated positions for BUY order ${currentOrder.id} in portfolio ${portfolioId}`);
        } else if (currentOrder.type === "sell") {
          // For sell orders: subtract from positions
          await reducePositionFromOrder(currentOrder, portfolioId);
          console.log(`Reduced positions for SELL order ${currentOrder.id} in portfolio ${portfolioId}`);
        }
      } else {
        console.error(`Failed to create or find portfolio for user ${currentOrder.userId}`);
      }
    }

    // Get updated order with proper data mapping
    const updatedOrder = await orderService.getOrderById(id);
    if (!updatedOrder) {
      console.error(`Failed to retrieve updated order ${id} after processing`);
      throw new Error("Failed to retrieve updated order");
    }

    // DEBUG: Log the retrieved updated order
    console.log(`🔍 DEBUG Retrieved updated order ${id}:`, {
      id: updatedOrder.id,
      userId: updatedOrder.userId,
      status: updatedOrder.status,
      type: updatedOrder.type,
      itemsCount: updatedOrder.items?.length || 0,
      fullOrder: updatedOrder
    });

    // Validate that we have essential fields
    if (!updatedOrder.id || !updatedOrder.userId) {
      console.error(`Retrieved order ${id} has missing critical fields:`, {
        hasId: !!updatedOrder.id,
        hasUserId: !!updatedOrder.userId,
        status: updatedOrder.status,
        itemCount: updatedOrder.items?.length || 0
      });
      throw new Error("Retrieved order data is incomplete");
    }

    // Format response using shared schema
    console.log(`🔍 DEBUG Before Zod validation - updatedOrder:`, {
      id: updatedOrder.id,
      userId: updatedOrder.userId,
      status: updatedOrder.status,
      type: updatedOrder.type,
      keys: Object.keys(updatedOrder)
    });

    const response = UpdateOrderResponseSchema.parse({
      success: true,
      data: updatedOrder,
      message: `Order status updated to ${newStatus}`
    });

    console.log(`🔍 DEBUG After Zod validation - response.data:`, {
      id: response.data.id,
      userId: response.data.userId,
      status: response.data.status,
      type: response.data.type,
      keys: Object.keys(response.data)
    });

    // Additional validation before sending response
    if (!response.data || !response.data.id || !response.data.userId) {
      console.error(`Response validation failed for order ${id}:`, {
        hasData: !!response.data,
        hasId: !!response.data?.id,
        hasUserId: !!response.data?.userId,
        status: response.data?.status
      });
      throw new Error("Response validation failed - missing critical data");
    }

    console.log(`✅ Order ${id} processed successfully: ${currentOrder.status} -> ${newStatus}`);
    return res.json(response);

  } catch (error) {
    console.error("Error processing order:", error);
    return res.status(500).json({ 
      success: false,
      error: "Failed to process order", 
      details: (error as Error).message 
    });
  }
});

// PUT update order
router.put("/orders/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.exec(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid order ID format" 
      });
    }

    // Validate request body using shared schema
    const validationResult = UpdateOrderRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid order update request",
        details: validationResult.error.issues
      });
    }

    const updateData = validationResult.data;

    // For now, use direct database update since OrderService.updateOrder doesn't exist
    // NOTE: OrderService.updateOrder method should be implemented for better abstraction
    
    // Check if order exists first
    const existingOrder = await orderService.getOrderById(id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    // Build dynamic update query based on provided fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updateData.type) {
      updateFields.push(`ordertype = $${paramIndex}`);
      updateValues.push(updateData.type);
      paramIndex++;
    }
    
    if (updateData.status) {
      updateFields.push(`orderstatus = $${paramIndex}`);
      updateValues.push(updateData.status);
      paramIndex++;
    }
    
    if (updateData.notes) {
      updateFields.push(`notes = $${paramIndex}`);
      updateValues.push(updateData.notes);
      paramIndex++;
    }

    // Always update the updatedAt timestamp
    updateFields.push(`updatedat = CURRENT_TIMESTAMP`);

    if (updateFields.length === 1) { // Only timestamp update
      return res.status(400).json({
        success: false,
        error: "No valid fields provided for update"
      });
    }

    const updateQuery = `
      UPDATE orders 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;
    updateValues.push(id);

    const result = await getPool().query(updateQuery, updateValues);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    // Get updated order using OrderService for proper mapping
    const updatedOrder = await orderService.getOrderById(id);
    
    // Format response using shared schema
    const response = UpdateOrderResponseSchema.parse({
      success: true,
      data: updatedOrder,
      message: "Order updated successfully"
    });
    
    return res.json(response);
  } catch (error) {
    console.error("Error updating order:", error);
    return res.status(500).json({ 
      success: false,
      error: "Failed to update order", 
      details: (error as Error).message 
    });
  }
});

// DELETE order - Physically delete order and all associated order items
router.delete("/orders/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const authenticatedUser = (req as any).user;
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.exec(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order ID format"
      });
    }

    // Check authentication
    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    // Authorization check: Only admins can physically delete orders
    if (authenticatedUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Only administrators can delete orders. Regular users should use the cancel endpoint instead."
      });
    }

    // Get the order to check if it exists
    const order = await orderService.getOrderById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    // Start transaction to ensure both order and order_items are deleted atomically
    await getPool().query('BEGIN');

    try {
      // First delete all order items
      const deleteItemsResult = await getPool().query(
        "DELETE FROM order_items WHERE orderid = $1",
        [id]
      );

      // Then delete the main order
      await getPool().query(
        "DELETE FROM orders WHERE id = $1",
        [id]
      );

      // Commit the transaction
      await getPool().query('COMMIT');

      // Log the deletion for audit trail
      console.log(`Order ${id} and ${deleteItemsResult.rowCount} associated items physically deleted by ${authenticatedUser.role}:${authenticatedUser.email} at ${new Date().toISOString()}`);

      return res.status(200).json({
        success: true,
        message: "Order and associated items deleted successfully",
        data: {
          orderId: id,
          deletedOrderItems: deleteItemsResult.rowCount,
          deletedBy: authenticatedUser.email,
          deletedAt: new Date().toISOString()
        }
      });

    } catch (dbError) {
      // Rollback the transaction on error
      await getPool().query('ROLLBACK');
      throw dbError;
    }

  } catch (error) {
    console.error("Error deleting order:", error);
    return res.status(500).json({ 
      success: false,
      error: "Failed to delete order", 
      details: (error as Error).message 
    });
  }
});

// POST /orders/:id/cancel - Cancel an order with proper authorization
router.post("/orders/:id/cancel", async (req: Request, res: Response) => {
  const { id } = req.params;
  const authenticatedUser = (req as any).user;
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.exec(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order ID format"
      });
    }

    // Check authentication
    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    // Get the order to check ownership and current status
    const order = await orderService.getOrderById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    // Authorization check: Users can only cancel their own orders, admins can cancel any order
    if (authenticatedUser.role !== 'admin' && order.userId !== authenticatedUser.id) {
      return res.status(403).json({
        success: false,
        error: "You can only cancel your own orders"
      });
    }

    // Business logic check: Regular users can only cancel pending orders
    if (authenticatedUser.role !== 'admin' && order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel order with status '${order.status}'. Only pending orders can be cancelled by users.`,
        details: `Current order status: ${order.status}`
      });
    }

    // Prevent cancelling already cancelled orders
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: "Order is already cancelled"
      });
    }

    // Update order status to cancelled
    await orderService.updateOrderStatus(id, 'cancelled');

    // Get updated order for response
    const cancelledOrder = await orderService.getOrderById(id);
    
    // Log the cancellation for audit trail
    console.log(`Order ${id} cancelled by ${authenticatedUser.role}:${authenticatedUser.email} at ${new Date().toISOString()}`);

    return res.status(200).json({
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
    });

  } catch (error) {
    console.error(`Error cancelling order ${id}:`, error);
    
    // Handle specific business logic errors
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('Invalid status transition')) {
      return res.status(400).json({
        success: false,
        error: "Cannot cancel order in current state",
        details: errorMessage
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to cancel order",
      details: errorMessage
    });
  }
});

// GET order by id
router.get("/orders/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.exec(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid order ID format" 
      });
    }

    const order = await orderService.getOrderById(id);
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: "Order not found" 
      });
    }

    // Format response using shared schema
    const response = OrderApiResponseSchema.parse({
      success: true,
      data: order,
      message: "Order retrieved successfully"
    });

    return res.json(response);
  } catch (error) {
    console.error("Error fetching order:", error);
    return res.status(500).json({ 
      success: false,
      error: "Failed to fetch order", 
      details: (error as Error).message 
    });
  }
});

// GET order by id with detailed information (frontend-friendly)
router.get("/orders/:id/detailed", async (req: Request, res: Response) => {
  const { id } = req.params;
  const authenticatedUser = (req as any).user;
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.exec(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid order ID format" 
      });
    }

    // Check authentication
    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
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
        cust.id as custodian_id,
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
      LEFT JOIN custodian cust ON cs.custodianid = cust.id
      LEFT JOIN currency curr ON cs.currencyid = curr.id
      WHERE o.id = $1
      ORDER BY oi.createdat
    `;

    const result = await getPool().query(orderQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    const firstRow = result.rows[0];

    // Check access control: users can only access their own orders, admins can access any
    if (authenticatedUser.role !== 'admin' && firstRow.order_user_id !== authenticatedUser.id) {
      return res.status(403).json({
        success: false,
        error: "Access denied: You can only view your own orders"
      });
    }

    // Build the detailed order response
    const detailedOrder = {
      id: firstRow.order_id,
      type: firstRow.order_type,
      status: firstRow.order_status,
      paymentStatus: firstRow.payment_status,
      createdAt: firstRow.order_created_at,
      updatedAt: firstRow.order_updated_at,
      
      // User information
      user: {
        id: firstRow.order_user_id,
        name: firstRow.user_name,
        email: firstRow.user_email
      },
      
      // Process order items with full details
      items: result.rows
        .filter(row => row.item_id) // Only rows with actual items
        .map(row => ({
          id: row.item_id,
          quantity: Number.parseFloat(row.item_quantity),
          unitPrice: Number.parseFloat(row.item_unit_price),
          totalPrice: Number.parseFloat(row.item_total_price),
          
          // Full product details
          product: {
            id: row.item_product_id,
            name: row.product_name || row.item_product_name, // Use stored name if product lookup fails
            type: row.product_type,
            metal: row.product_metal,
            weight: Number.parseFloat(row.product_weight),
            weightUnit: row.product_weight_unit,
            purity: Number.parseFloat(row.product_purity),
            price: Number.parseFloat(row.product_current_price),
            currency: row.product_currency,
            producer: row.product_producer,
            country: row.product_country,
            year: row.product_year || new Date().getFullYear()
          }
        })),
        
      // Custody service details
      custodyService: firstRow.custody_service_id ? {
        id: firstRow.custody_service_id,
        name: firstRow.custody_service_name,
        fee: Number.parseFloat(firstRow.custody_service_fee),
        paymentFrequency: firstRow.custody_service_payment_frequency,
        currency: firstRow.custody_service_currency
      } : null,
      
      // Custodian information
      custodian: firstRow.custodian_id ? {
        id: firstRow.custodian_id,
        name: firstRow.custodian_name
      } : null,
      
      // Calculate totals
      subtotal: result.rows
        .filter(row => row.item_id)
        .reduce((sum, row) => sum + Number.parseFloat(row.item_total_price || '0'), 0),
      taxes: 0, // TODO: Calculate actual taxes
      currency: firstRow.product_currency,
      totalAmount: 0 // Will be calculated below
    };

    // Calculate totalAmount
    detailedOrder.totalAmount = detailedOrder.subtotal + detailedOrder.taxes;

    res.json({
      success: true,
      data: detailedOrder,
      message: "Detailed order retrieved successfully"
    });

  } catch (error) {
    console.error("Error fetching detailed order:", error);
    return res.status(500).json({ 
      success: false,
      error: "Failed to fetch detailed order", 
      details: (error as Error).message 
    });
  }
});

const insertPosition = async (order: Order, portfolioId: string) => {
  const positions = [];
  
  // Create a position for each order item
  for (const item of order.items) {
    const positionId = uuidv4();
    const purchaseDate = new Date();
    const createdAt = new Date();
    const updatedAt = new Date();

    const result = await getPool().query(
      `INSERT INTO public.position(
        id, userid, productid, portfolioid, purchasedate, quantity, purchaseprice, marketprice, createdat, updatedat)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        positionId,
        order.userId,
        item.productId,
        portfolioId,
        purchaseDate,
        item.quantity,
        item.unitPrice,
        item.unitPrice, // Set marketPrice same as purchasePrice initially
        createdAt,
        updatedAt
      ]
    );

    positions.push(result.rows[0]);
  }

  return positions;
};

// Create transaction record for a position
const createTransactionForPosition = async (position: any, order: Order, item: any) => {
  try {
    const transactionId = uuidv4();
    const transactionDate = new Date();
    
    const result = await getPool().query(
      `INSERT INTO public.transactions(
        id, positionId, userId, type, date, quantity, price, fees, notes, createdat)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        transactionId,
        position.id,
        order.userId,
        'buy', // Transaction type matches order type
        transactionDate,
        item.quantity,
        item.unitPrice,
        0, // fees default to 0
        `Transaction for order ${order.id}`, // notes
        transactionDate // createdAt
      ]
    );

    console.log(`Created transaction ${transactionId} for position ${position.id}, product ${item.productId}, quantity: ${item.quantity}`);
    return result.rows[0];
  } catch (error) {
    console.error(`Error creating transaction for position ${position.id}:`, error);
    throw error;
  }
};

// Get custody service ID by name (with fallback)
const getCustodyServiceId = async (custodyServiceName: string): Promise<string | null> => {
  try {
    const result = await getPool().query(
      `SELECT id FROM custodyService WHERE custodyServiceName = $1`,
      [custodyServiceName]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    console.error(`Error getting custody service ID for "${custodyServiceName}":`, error);
    return null;
  }
};

// Get default "Home Delivery" custody service ID
const getDefaultCustodyServiceId = async (): Promise<string | null> => {
  return await getCustodyServiceId('Home Delivery');
};

// Check if a position already exists for consolidation
const findExistingPosition = async (
  userId: string, 
  productId: string, 
  portfolioId: string, 
  custodyServiceId: string | null
): Promise<{ active: any; closed: any }> => {
  try {
    let activeResult, closedResult;
    
    if (custodyServiceId === null) {
      // Find active position
      activeResult = await getPool().query(
        `SELECT * FROM position 
         WHERE userid = $1 AND productid = $2 AND portfolioid = $3 AND custodyserviceid IS NULL AND status = 'active'`,
        [userId, productId, portfolioId]
      );
      
      // Find closed position (for potential reactivation)
      closedResult = await getPool().query(
        `SELECT * FROM position 
         WHERE userid = $1 AND productid = $2 AND portfolioid = $3 AND custodyserviceid IS NULL AND status = 'closed'
         ORDER BY closeddate DESC LIMIT 1`,
        [userId, productId, portfolioId]
      );
    } else {
      // Find active position
      activeResult = await getPool().query(
        `SELECT * FROM position 
         WHERE userid = $1 AND productid = $2 AND portfolioid = $3 AND custodyserviceid = $4 AND status = 'active'`,
        [userId, productId, portfolioId, custodyServiceId]
      );
      
      // Find closed position (for potential reactivation)
      closedResult = await getPool().query(
        `SELECT * FROM position 
         WHERE userid = $1 AND productid = $2 AND portfolioid = $3 AND custodyserviceid = $4 AND status = 'closed'
         ORDER BY closeddate DESC LIMIT 1`,
        [userId, productId, portfolioId, custodyServiceId]
      );
    }
    
    console.log(`🔍 POSITION CHECK: userId=${userId}, productId=${productId}, custodyServiceId=${custodyServiceId} → Active: ${activeResult.rows.length}, Closed: ${closedResult.rows.length}`);
    
    return {
      active: activeResult.rows.length > 0 ? activeResult.rows[0] : null,
      closed: closedResult.rows.length > 0 ? closedResult.rows[0] : null
    };
  } catch (error) {
    console.error(`❌ Error finding existing position:`, error);
    return { active: null, closed: null };
  }
};

// Consolidate existing position with new order item
const consolidatePosition = async (existingPosition: any, newQuantity: number, newPrice: number): Promise<any> => {
  try {
    const currentQuantity = Number.parseFloat(existingPosition.quantity);
    const currentPrice = Number.parseFloat(existingPosition.purchaseprice);
    
    // Calculate new consolidated values
    const totalQuantity = currentQuantity + newQuantity;
    const weightedAveragePrice = ((currentQuantity * currentPrice) + (newQuantity * newPrice)) / totalQuantity;
    
    console.log(`🔄 CONSOLIDATING POSITION ${existingPosition.id}:`, {
      existing: { quantity: currentQuantity, price: currentPrice },
      new: { quantity: newQuantity, price: newPrice },
      consolidated: { totalQuantity, weightedAveragePrice: weightedAveragePrice.toFixed(2) }
    });

    const result = await getPool().query(
      `UPDATE position 
       SET quantity = $1, purchaseprice = $2, marketprice = $3, updatedat = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [totalQuantity, weightedAveragePrice, weightedAveragePrice, existingPosition.id]
    );

    return result.rows[0];
  } catch (error) {
    console.error(`Error consolidating position ${existingPosition.id}:`, error);
    throw error;
  }
};

// Reactivate closed position with fresh start (ignore previous transaction history)
const reactivatePosition = async (closedPosition: any, newQuantity: number, newPrice: number): Promise<any> => {
  try {
    console.log(`🔄 REACTIVATING POSITION ${closedPosition.id}:`, {
      previous: { quantity: Number.parseFloat(closedPosition.quantity), price: Number.parseFloat(closedPosition.purchaseprice) },
      fresh: { quantity: newQuantity, price: newPrice },
      note: "Previous transaction history ignored - fresh start"
    });

    const result = await getPool().query(
      `UPDATE position 
       SET quantity = $1, purchaseprice = $2, marketprice = $3, status = 'active', purchasedate = CURRENT_TIMESTAMP, updatedat = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [newQuantity, newPrice, newPrice, closedPosition.id]
    );

    return result.rows[0];
  } catch (error) {
    console.error(`Error reactivating position ${closedPosition.id}:`, error);
    throw error;
  }
};

// Create position from a database order row (updated with consolidation logic)
const insertPositionFromOrder = async (order: Order, portfolioId: string) => {
  try {
    // Create a position for each order item
    if (!order.items || order.items.length === 0) {
      console.warn(`No order items found for order ${order.id}`);
      return [];
    }

    const positions = [];
    const transactions = [];
    const purchaseDate = new Date();
    const createdAt = new Date();
    const updatedAt = new Date();

    // Get custody service ID from order or default to "Home Delivery"
    let custodyServiceId: string | null = null;
    
    // First, try to get custody service ID from the order (we'll need to fetch this from DB)
    const orderResult = await getPool().query(
      `SELECT custodyserviceid FROM orders WHERE id = $1`,
      [order.id]
    );
    
    if (orderResult.rows.length > 0 && orderResult.rows[0].custodyserviceid) {
      custodyServiceId = orderResult.rows[0].custodyserviceid;
      console.log(`✅ Using custody service ID from order: ${custodyServiceId}`);
    } else {
      // Default to "Home Delivery"
      custodyServiceId = await getDefaultCustodyServiceId();
      console.log(`🏠 Using default "Home Delivery" custody service ID: ${custodyServiceId}`);
    }

    // Create or consolidate positions for each order item
    for (const item of order.items) {
      // Check if position already exists for consolidation or reactivation
      const positionResult = await findExistingPosition(order.userId, item.productId, portfolioId, custodyServiceId);
      
      let position: any;
      
      if (positionResult.active) {
        // CONSOLIDATE: Update existing active position
        console.log(`🔄 Found existing active position ${positionResult.active.id} for consolidation`);
        position = await consolidatePosition(positionResult.active, item.quantity, item.unitPrice);
        console.log(`✅ Consolidated position ${position.id}: ${position.quantity} units at avg $${Number.parseFloat(position.purchaseprice).toFixed(2)}`);
      } else if (positionResult.closed) {
        // REACTIVATE: Reactivate closed position with fresh start (ignore previous average)
        console.log(`🔄 Found closed position ${positionResult.closed.id} for reactivation`);
        position = await reactivatePosition(positionResult.closed, item.quantity, item.unitPrice);
        console.log(`✅ Reactivated position ${position.id}: ${position.quantity} units at $${Number.parseFloat(position.purchaseprice).toFixed(2)}`);
      } else {
        // CREATE NEW: No existing position found
        const positionId = uuidv4();
        console.log(`🆕 Creating new position for product ${item.productId} in custody service ${custodyServiceId}`);
        
        const result = await getPool().query(
          `INSERT INTO public.position(
            id, userid, productid, portfolioid, purchasedate, quantity, purchaseprice, marketprice, custodyserviceid, createdat, updatedat)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
          [
            positionId,
            order.userId,
            item.productId,
            portfolioId,
            purchaseDate,
            item.quantity,
            item.unitPrice,
            item.unitPrice, // Use purchase price as initial market price
            custodyServiceId,
            createdAt,
            updatedAt
          ]
        );

        position = result.rows[0];
        console.log(`✅ Created new position ${positionId}: ${item.quantity} units at $${item.unitPrice}`);
      }

      positions.push(position);

      // Create corresponding transaction record (always create new transaction)
      const transaction = await createTransactionForPosition(position, order, item);
      transactions.push(transaction);
    }

    console.log(`🎉 SUMMARY: Processed ${order.items.length} order items → ${positions.length} positions, ${transactions.length} transactions for order ${order.id}`);
    return { positions, transactions };
  } catch (error) {
    console.error(`❌ Error creating/consolidating positions from order ${order.id}:`, error);
    throw error;
  }
};

// Find portfolio for user
const findPortfolioId = async (userId: string) => {
  const result = await getPool().query(
    `SELECT id FROM public.portfolio WHERE ownerid = $1`, [userId]
  );

  return result.rows.length > 0 ? result.rows[0].id : null;
}

// Create a new portfolio for user if they don't have one
const createPortfolioForUser = async (userId: string): Promise<string | null> => {
  try {
    // Get user information to create a meaningful portfolio name
    const userResult = await getPool().query(
      `SELECT email FROM public.users WHERE id = $1`, [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.error(`User not found: ${userId}`);
      return null;
    }
    
    const user = userResult.rows[0];
    const portfolioName = `${user.email.split('@')[0]}'s Portfolio`;
    
    // Create the portfolio
    const portfolioResult = await getPool().query(
      `INSERT INTO public.portfolio (portfolioName, ownerId, createdAt, updatedAt) 
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING id`,
      [portfolioName, userId]
    );
    
    const portfolioId = portfolioResult.rows[0].id;
    console.log(`Created new portfolio "${portfolioName}" (${portfolioId}) for user ${userId}`);
    
    return portfolioId;
  } catch (error) {
    console.error(`Error creating portfolio for user ${userId}:`, error);
    return null;
  }
}

// Reduce position quantities for sell orders
const reducePositionFromOrder = async (order: Order, portfolioId: string) => {
  try {
    if (!order.items || order.items.length === 0) {
      console.warn(`No order items found for sell order ${order.id}`);
      return [];
    }

    const updatedPositions = [];

    for (const item of order.items) {
      // Find existing active position for this product (exclude closed positions)
      const existingPositionResult = await getPool().query(
        `SELECT * FROM public.position 
         WHERE userid = $1 AND productid = $2 AND portfolioid = $3 AND quantity > 0 AND status = 'active'
         ORDER BY createdat ASC
         LIMIT 1`,
        [order.userId, item.productId, portfolioId]
      );

      if (existingPositionResult.rows.length === 0) {
        throw new Error(`Cannot sell ${item.quantity} units of product ${item.productId}: No position found`);
      }

      const existingPosition = existingPositionResult.rows[0];
      
      if (existingPosition.quantity < item.quantity) {
        throw new Error(`Cannot sell ${item.quantity} units of product ${item.productId}: Only ${existingPosition.quantity} units available`);
      }

      // Reduce the position quantity
      const newQuantity = existingPosition.quantity - item.quantity;
      
      if (newQuantity === 0) {
        // Set position status to 'closed' instead of deleting
        const updateResult = await getPool().query(
          `UPDATE public.position 
           SET quantity = $1, status = 'closed', updatedat = CURRENT_TIMESTAMP 
           WHERE id = $2 
           RETURNING *`,
          [0, existingPosition.id]
        );
        
        const closedPosition = updateResult.rows[0];
        updatedPositions.push(closedPosition);
        console.log(`� Closed position ${existingPosition.id} (quantity reduced to 0)`);
      } else {
        // Update position with reduced quantity
        const updateResult = await getPool().query(
          `UPDATE public.position 
           SET quantity = $1, updatedat = CURRENT_TIMESTAMP 
           WHERE id = $2 
           RETURNING *`,
          [newQuantity, existingPosition.id]
        );
        
        const updatedPosition = updateResult.rows[0];
        updatedPositions.push(updatedPosition);
        console.log(`📉 Reduced position ${existingPosition.id}: ${existingPosition.quantity} → ${newQuantity} units`);
      }

      // Create sell transaction record
      await createSellTransactionForPosition(existingPosition, order, item);
    }

    console.log(`🎉 SELL ORDER SUMMARY: Processed ${order.items.length} sell items for order ${order.id}`);
    return updatedPositions;
  } catch (error) {
    console.error(`❌ Error reducing positions from sell order ${order.id}:`, error);
    throw error;
  }
};

// Create sell transaction record
const createSellTransactionForPosition = async (position: any, order: Order, item: any) => {
  try {
    const transactionId = uuidv4();
    const result = await getPool().query(
      `INSERT INTO public.transactions(
        id, positionid, userid, type, date, quantity, price, createdat)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        transactionId,
        position.id,
        order.userId,
        'sell',
        new Date(),
        item.quantity,
        item.unitPrice || item.price || 0, // Use fallback for price
        new Date()
      ]
    );
    
    console.log(`📝 Created sell transaction ${transactionId} for position ${position.id}`);
    return result.rows[0];
  } catch (error) {
    console.error(`❌ Error creating sell transaction:`, error);
    throw error;
  }
};

export default router;