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

const router = Router();

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

// GET all orders
router.get("/orders", async (req: Request, res: Response) => {
  try {
    // Parse query parameters
    const query = OrderQueryParamsSchema.parse(req.query);
    const { page, limit, status, type, userId } = query;
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      whereConditions.push(`orderStatus = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (type) {
      whereConditions.push(`orderType = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }
    
    if (userId) {
      whereConditions.push(`userId = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT id) as total
      FROM orders 
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get orders with pagination
    const dataQuery = `
      SELECT * FROM orders 
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const result = await pool.query(dataQuery, queryParams);
    
    // Group database rows by order ID and convert to Order objects
    const ordersMap = new Map<string, any[]>();
    result.rows.forEach((row: any) => {
      if (!ordersMap.has(row.id)) {
        ordersMap.set(row.id, []);
      }
      ordersMap.get(row.id)!.push(row);
    });
    
    const orders = Array.from(ordersMap.values()).map(rows => mapDatabaseRowsToOrder(rows));
    
    // Calculate pagination
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
    
    // Return standardized response
    const response = {
      success: true,
      data: {
        orders,
        pagination
      }
    };
    
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

    switch (order.orderstatus) {
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
      "UPDATE orders SET orderstatus = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
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

// Create position from a database order row (simpler version for shipped orders)
const insertPositionFromOrder = async (orderRow: any, portfolioId: string) => {
  try {
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
        orderRow.userid,  // Database row uses lowercase column names
        orderRow.productid,
        portfolioId,
        purchaseDate,
        parseFloat(orderRow.quantity),
        parseFloat(orderRow.totalprice),
        parseFloat(orderRow.totalprice), // Set marketPrice same as purchasePrice initially
        createdAt,
        updatedAt
      ]
    );

    console.log(`Created position ${positionId} for product ${orderRow.productid}, quantity: ${orderRow.quantity}`);
    return result.rows[0];
  } catch (error) {
    console.error(`Error creating position from order ${orderRow.id}:`, error);
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