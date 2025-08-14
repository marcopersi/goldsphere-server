import { Router, Request, Response } from "express";
import pool from "../dbConfig";
import { v4 as uuidv4 } from 'uuid';
import { 
  Order,
  OrderType,
  OrderStatus,
  CurrencyEnum,
  OrderQueryParamsSchema
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
  const items = rows.map(row => ({
    productId: row.productid,
    productName: `Product ${row.productid}`, // Product name lookup can be added later
    quantity: parseFloat(row.quantity),
    unitPrice: parseFloat(row.totalprice) / parseFloat(row.quantity),
    totalPrice: parseFloat(row.totalprice),
    specifications: {}
  }));

  // Map database values to enum instances
  const orderType = OrderType.fromValue(firstRow.ordertype) || OrderType.BUY;
  const orderStatus = OrderStatus.fromValue(firstRow.orderstatus) || OrderStatus.PENDING;
  const currency = CurrencyEnum.fromIsoCode3('USD') || CurrencyEnum.USD;

  return {
    id: firstRow.id,
    userId: firstRow.userid,
    type: orderType,  // Use enum instance
    status: orderStatus,  // Use enum instance
    items: items,
    subtotal: items.reduce((sum, item) => sum + item.totalPrice, 0),
    fees: {
      processing: 0,
      shipping: 0,
      insurance: 0
    },
    taxes: 0,
    totalAmount: items.reduce((sum, item) => sum + item.totalPrice, 0),
    currency: currency,  // Use enum instance
    shippingAddress: {
      type: 'shipping',
      firstName: '',
      lastName: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    paymentMethod: {
      type: 'card' as const
    },
    createdAt: firstRow.createdat,
    updatedAt: firstRow.updatedat
  };
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
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingOrders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedOrders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelledOrders,
        COUNT(DISTINCT userId) as uniqueUsers
      FROM orders
      ${whereClause}
    `;
    
    const statsResult = await pool.query(statsQuery, queryParams);
    const stats = statsResult.rows[0];
    
    // Return comprehensive admin response directly
    res.json({
      orders: ordersResult.orders,
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
    
    // Return data directly with user context
    res.json({
      ...ordersResult,
      user: {
        id: authenticatedUser.id
      }
    });
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
    
    // Return data directly with context
    res.json({
      ...ordersResult,
      context: responseContext
    });
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

    // Validate that we have the minimal required fields from frontend
    const { type, items, shippingAddress, paymentMethod, notes } = req.body;
    
    if (!type || !items) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: type, items"
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Items must be a non-empty array"
      });
    }

    // Validate each item has the minimal required fields
    for (const item of items) {
      if (!item.productId || !item.quantity) {
        return res.status(400).json({
          success: false,
          error: "Each item must have productId and quantity"
        });
      }
    }
    
    // Generate backend-enriched fields
    const orderId = uuidv4();
    const now = new Date();
    
    // Enrich items with product details and calculate totals
    const enrichedItems = [];
    let subtotal = 0;
    
    for (const item of items) {
      // Fetch product details to enrich the item
      const productResult = await pool.query(
        "SELECT name, price, currency FROM product WHERE id = $1",
        [item.productId]
      );
      
      if (productResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: `Product not found: ${item.productId}`
        });
      }
      
      const product = productResult.rows[0];
      const unitPrice = parseFloat(product.price);
      const totalPrice = unitPrice * item.quantity;
      
      enrichedItems.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        specifications: item.specifications || {}
      });
      
      subtotal += totalPrice;
    }

    // Calculate fees and taxes (simplified for now)
    const fees = {
      processing: subtotal * 0.02, // 2% processing fee
      shipping: 25.00, // Flat shipping
      insurance: subtotal * 0.005 // 0.5% insurance
    };
    
    const taxes = subtotal * 0.08; // 8% tax
    const totalAmount = subtotal + fees.processing + fees.shipping + fees.insurance + taxes;
    
    // Create the enriched order object
    const enrichedOrder: Order = {
      id: orderId,
      userId: userId, // Extracted from JWT token
      type: type as OrderType,
      status: OrderStatus.PENDING,
      items: enrichedItems,
      subtotal: subtotal,
      fees: fees,
      taxes: taxes,
      totalAmount: totalAmount,
      currency: CurrencyEnum.USD, // Default currency, could be extracted from user preferences
      shippingAddress: shippingAddress,
      paymentMethod: paymentMethod || { type: 'card' as const },
      tracking: undefined,
      notes: notes,
      createdAt: now,
      updatedAt: now
    };

    // Store in legacy database format (each item as separate row)
    for (const item of enrichedItems) {
      await pool.query(
        "INSERT INTO orders (id, userId, productId, quantity, totalPrice, orderStatus, custodyServiceId, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          orderId, // Use same orderId for all items in this order
          enrichedOrder.userId,
          item.productId,
          item.quantity,
          item.totalPrice,
          enrichedOrder.status.value || "pending", // Use the string value for database
          null, // custodyServiceId - will be determined during order processing
          enrichedOrder.createdAt,
          enrichedOrder.updatedAt
        ]
      );
    }

    // Return the enriched order structure
    res.status(201).json({
      success: true,
      data: enrichedOrder,
      message: "Order created successfully. Backend enriched the order with product details and calculations."
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to create order", 
      details: (error as Error).message 
    });
  }
});

// process order
router.put("/orders/process/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
    if (orderResult.rows.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = orderResult.rows[0];
    let newStatus;

    switch (order.status) {
      case "pending":
        console.debug("Order is now pending, will be processing...");
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
        console.debug("Order is now delivered, will be closed...");
        newStatus = "closed";
        break;        
      default:
        res.status(400).json({ error: "Invalid order status for further processing" });
        return;
    }

    const result = await pool.query(
      "UPDATE orders SET status = $1, updatedat = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [newStatus, id]
    );

    const updatedOrder = result.rows[0];

    // Create portfolio and positions when order is shipped
    if (newStatus === "shipped") {
      let portfolioId = await findPortfolioId(updatedOrder.userid);
      
      // If user doesn't have a portfolio, create one
      if (!portfolioId) {
        portfolioId = await createPortfolioForUser(updatedOrder.userid);
      }
      
      // Create positions for the shipped order
      if (portfolioId) {
        await insertPositionFromOrder(updatedOrder, portfolioId);
        console.log(`Created positions for order ${updatedOrder.id} in portfolio ${portfolioId}`);
      } else {
        console.error(`Failed to create or find portfolio for user ${updatedOrder.userid}`);
      }
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Failed to update order", details: (error as Error).message });
  }
});

// PUT update order
router.put("/orders/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, productId, quantity, totalPrice, custodyServiceId } = req.body;
  try {
    const result = await pool.query(
      "UPDATE orders SET userId = $1, productId = $2, quantity = $3, totalPrice = $4, custodyServiceId = $5, updatedAt = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *",
      [userId, productId, quantity, totalPrice, custodyServiceId, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Failed to update order", details: (error as Error).message });
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
    const result = await pool.query("SELECT id, userId, productId, quantity, totalPrice, orderStatus, custodyServiceId, createdAt, updatedAt FROM orders WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order", details: (error as Error).message });
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
        id, userId, productId, portfolioId, purchaseDate, quantity, purchasePrice, marketPrice, createdat, updatedat)
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
const insertPositionFromOrder = async (orderRow: any, portfolioId: string) => {
  try {
    // First, get all order items for this order
    const orderItemsResult = await pool.query(
      `SELECT * FROM order_items WHERE orderid = $1`,
      [orderRow.id]
    );

    if (orderItemsResult.rows.length === 0) {
      console.warn(`No order items found for order ${orderRow.id}`);
      return [];
    }

    const positions = [];
    const purchaseDate = new Date();
    const createdAt = new Date();
    const updatedAt = new Date();

    // Create a position for each order item
    for (const item of orderItemsResult.rows) {
      const positionId = uuidv4();
      
      const result = await pool.query(
        `INSERT INTO public.position(
          id, userId, productId, portfolioId, purchaseDate, quantity, purchasePrice, marketPrice, createdat, updatedat)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          positionId,
          orderRow.userid,
          item.productid,
          portfolioId,
          purchaseDate,
          parseFloat(item.quantity),
          parseFloat(item.unitprice),
          parseFloat(item.unitprice), // Set marketPrice same as purchasePrice initially
          createdAt,
          updatedAt
        ]
      );

      console.log(`Created position ${positionId} for product ${item.productid}, quantity: ${item.quantity}`);
      positions.push(result.rows[0]);
    }

    return positions;
  } catch (error) {
    console.error(`Error creating positions from order ${orderRow.id}:`, error);
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