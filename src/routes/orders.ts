import { Router, Request, Response } from "express";
import pool from "../dbConfig";
import { v4 as uuidv4 } from 'uuid';
import { 
  Order,
  OrderType,
  OrderStatus,
  CurrencyEnum
} from "@marcopersi/shared";
import { 
  OrdersQuerySchema, 
  OrderResponse, 
  OrdersResponse
} from "../schemas/orders";
import { Pagination } from "../schemas/products";

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
    const query = OrdersQuerySchema.parse(req.query);
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
    
    const orders = Array.from(ordersMap.values()).map(rows => mapDatabaseRowsToOrder(rows)) as OrderResponse[];
    
    // Calculate pagination
    const totalPages = Math.ceil(total / limit);
    const pagination: Pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
    
    // Return standardized response
    const response: OrdersResponse = {
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

// POST new order(s)
router.post("/orders", async (req: Request, res: Response) => {
  const orders: Order[] = Array.isArray(req.body) ? req.body : [req.body];
  const insertedOrders = [];

  try {
    for (const order of orders) {
      // For each order, create separate database entries for each item
      // This maps the modern Order structure to the legacy database
      const orderResults = [];
      
      for (const item of order.items) {
        const result = await pool.query(
          "INSERT INTO orders (userId, productId, quantity, totalPrice, orderStatus, custodyServiceId) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
          [
            order.userId,
            item.productId,
            item.quantity,
            item.totalPrice,
            order.status,
            null // custodyServiceId - will be determined during order processing
          ]
        );
        orderResults.push(result.rows[0]);
      }
      
      // Convert back to modern Order structure for response
      const responseOrder: Order = {
        id: orderResults[0].id, // Use first item's ID as order ID
        userId: order.userId,
        type: order.type,
        status: order.status,
        items: order.items,
        subtotal: order.subtotal,
        fees: order.fees,
        taxes: order.taxes,
        totalAmount: order.totalAmount,
        currency: order.currency,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        tracking: order.tracking,
        notes: order.notes,
        createdAt: orderResults[0].createdat,
        updatedAt: orderResults[0].updatedat
      };
      
      insertedOrders.push(responseOrder);
    }
    res.status(201).json(insertedOrders);
  } catch (error) {
    console.error("Error adding order(s):", error);
    res.status(500).json({ error: "Failed to add order(s)", details: (error as Error).message });
  }
});

// process order
router.put("/orders/process/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log("Processing order with id:", id);
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
        console.debug("Order is now pending, will be confirmed...");
        newStatus = "confirmed";
        break;
      case "confirmed":
        console.debug("Order is now confirmed, will be settled...");
        newStatus = "settled";
        break;
      case "settled":
        console.debug("Order is now settled, will be delivered...");
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

    if (newStatus === "delivered") {
      const positions = await insertPosition(updatedOrder);
      const portfolioId = await findPortfolioId(updatedOrder.userid);
      if (portfolioId) {
        // Create portfolio positions for each position created
        for (const position of positions) {
          await insertPortfolioPosition(portfolioId, position.id);
        }
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

const insertPosition = async (order: Order) => {
  const positions = [];
  
  // Create a position for each order item
  for (const item of order.items) {
    const positionId = uuidv4();
    const purchaseDate = new Date();
    const createdAt = new Date();
    const updatedAt = new Date();

    const result = await pool.query(
      `INSERT INTO public."position"(
        id, custodyserviceid, productid, purchasedate, quantity, purchasepriceperunit, createdat, updatedat)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        positionId,
        null, // custodyserviceid - will be assigned when custody service is selected
        item.productId,
        purchaseDate,
        item.quantity,
        item.unitPrice,
        createdAt,
        updatedAt
      ]
    );

    positions.push(result.rows[0]);
  }

  return positions;
};

// Insert into portfolio position
const insertPortfolioPosition = async (portfolioId: string, positionId: string) => {
  const createdAt = new Date();
  const updatedAt = new Date();

  await pool.query(
    `INSERT INTO public.portfolioposition(
      portfolioid, positionid, createdat, updatedat)
      VALUES ($1, $2, $3, $4)`,
    [portfolioId, positionId, createdAt, updatedAt]
  );
};

const findPortfolioId = async (userId: string) => {
  const result = await pool.query(
    `SELECT id FROM public.portfolio WHERE ownerid = $1`, [userId]
  );

  return result.rows.length > 0 ? result.rows[0].id : null;
}

export default router;