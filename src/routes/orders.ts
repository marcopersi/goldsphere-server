import { Router, Request, Response } from "express";
import pool from "../dbConfig";
import { v4 as uuidv4 } from 'uuid';
import { 
  Order,
  OrderQueryParamsSchema,
  // Validation schemas for order operations
  CreateOrderInputSchema,
  UpdateOrderRequestSchema,
  // API response schemas for consistent formatting
  OrderApiResponseSchema,
  CreateOrderResponseSchema,
  UpdateOrderResponseSchema,
  OrderApiListResponseSchema
} from "@marcopersi/shared";
import { OrderService } from "../services/OrderService";

const router = Router();

// Initialize the order service
const orderService = new OrderService();

// Helper function to convert database rows to Order objects
const mapDatabaseRowsToOrder = (rows: any[]): Order => {
  if (rows.length === 0) throw new Error('No rows to map');
  
  const firstRow = rows[0];
  
  // Group rows by order if needed, for now assume single item per order
  const items = rows.map((row, index) => ({
    id: row.itemid || uuidv4(), // Use item ID from database or generate UUID
    productId: row.productid,
    productName: row.productname || `Product ${row.productid}`,
    quantity: parseFloat(row.quantity),
    unitPrice: parseFloat(row.unitprice || row.totalprice) / parseFloat(row.quantity),
    totalPrice: parseFloat(row.totalprice),
  }));

  // Map database values to string literals (shared package expects strings)
  const orderType = (firstRow.type as "buy" | "sell") || "buy";
  const orderStatus = firstRow.orderstatus || "pending";  // Database has lowercase 'orderstatus'
  const currency = "USD";

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
    
    // Use OrderService for basic order retrieval
    const ordersResult = await OrderService.getOrdersByUserId(userId, {
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
    
    const statsResult = await pool.query(statsQuery, queryParams);
    const stats = statsResult.rows[0];
    
    // Return comprehensive admin response using shared schema
    const adminResponse = OrderApiListResponseSchema.parse({
      success: true,
      orders: ordersResult.orders,  // Changed from "data" to "orders"
      pagination: ordersResult.pagination,
      statistics: {
        totalOrders: parseInt(stats.totalorders),
        pendingOrders: parseInt(stats.pendingorders),
        completedOrders: parseInt(stats.completedorders),
        cancelledOrders: parseInt(stats.cancelledorders),
        uniqueUsers: parseInt(stats.uniqueusers)
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
    
    // Use OrderService to get user's orders
    const ordersResult = await OrderService.getOrdersByUserId(authenticatedUser.id, {
      page: Number(page),
      limit: Number(limit),
      status: status as string,
      type: type as string
    });
    
    // Return data using shared schema with user context
    const userResponse = OrderApiListResponseSchema.parse({
      success: true,
      orders: ordersResult.orders,  // Changed from "data" to "orders"
      pagination: ordersResult.pagination,
      user: {
        id: authenticatedUser.id
      }
    });
    
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
    
    // Use OrderService to get orders with proper access control
    const ordersResult = await OrderService.getOrdersByUserId(effectiveUserId, {
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
      orders: ordersResult.orders,  // Changed from "data" to "orders"
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
        details: validationResult.error.errors
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
    return res.status(500).json({
      success: false,
      error: "Failed to create order",
      details: (error as Error).message
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

    // Update order status using OrderService
    await orderService.updateOrderStatus(id, newStatus);

    // Create portfolio and positions when order is delivered (customer receives the items)
    if (newStatus === "delivered") {
      let portfolioId = await findPortfolioId(currentOrder.userId);
      
      // If user doesn't have a portfolio, create one
      if (!portfolioId) {
        portfolioId = await createPortfolioForUser(currentOrder.userId);
      }
      
      // Create positions for the shipped order
      if (portfolioId) {
        await insertPositionFromOrder(currentOrder, portfolioId);
        console.log(`Created positions for order ${currentOrder.id} in portfolio ${portfolioId}`);
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
        details: validationResult.error.errors
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

    const result = await pool.query(updateQuery, updateValues);
    
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

// DELETE order
router.delete("/orders/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM orders WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Failed to delete order", details: (error as Error).message });
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

const insertPosition = async (order: Order, portfolioId: string) => {
  const positions = [];
  
  // Create a position for each order item
  for (const item of order.items) {
    const positionId = uuidv4();
    const purchaseDate = new Date();
    const createdAt = new Date();
    const updatedAt = new Date();

    const result = await pool.query(
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

// Create position from a database order row (updated for new schema with order_items)
const insertPositionFromOrder = async (order: Order, portfolioId: string) => {
  try {
    // Create a position for each order item
    if (!order.items || order.items.length === 0) {
      console.warn(`No order items found for order ${order.id}`);
      return [];
    }

    const positions = [];
    const purchaseDate = new Date();
    const createdAt = new Date();
    const updatedAt = new Date();

    // Create a position for each order item
    for (const item of order.items) {
      const positionId = uuidv4();
      
      const result = await pool.query(
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
          item.unitPrice, // Use purchase price as initial market price
          createdAt,
          updatedAt
        ]
      );

      console.log(`Created position ${positionId} for product ${item.productId}, quantity: ${item.quantity}`);
      positions.push(result.rows[0]);
    }

    return positions;
  } catch (error) {
    console.error(`Error creating positions from order ${order.id}:`, error);
    throw error;
  }
};

// Find portfolio for user
const findPortfolioId = async (userId: string) => {
  const result = await pool.query(
    `SELECT id FROM public.portfolio WHERE ownerid = $1`, [userId]
  );

  return result.rows.length > 0 ? result.rows[0].id : null;
}

// Create a new portfolio for user if they don't have one
const createPortfolioForUser = async (userId: string): Promise<string | null> => {
  try {
    // Get user information to create a meaningful portfolio name
    const userResult = await pool.query(
      `SELECT username, email FROM public.users WHERE id = $1`, [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.error(`User not found: ${userId}`);
      return null;
    }
    
    const user = userResult.rows[0];
    const portfolioName = `${user.username}'s Portfolio`;
    
    // Create the portfolio
    const portfolioResult = await pool.query(
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

export default router;