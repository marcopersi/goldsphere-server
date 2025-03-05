import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Load SQL query from file
const queries = fs.readFileSync(path.join(__dirname, "../queries/queries.json"), "utf8");

// GET all orders
router.get("/orders", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(JSON.parse(queries).getOrders);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders", details: (error as Error).message });
  }
});

// POST new order(s)
router.post("/orders", async (req: Request, res: Response) => {
  const orders = Array.isArray(req.body) ? req.body : [req.body];
  const orderStatus = 'pending'; 
  const insertedOrders = [];

  try {
    for (const order of orders) {
      const { userId, productId, quantity, totalPrice, custodyServiceId } = order;
      const result = await pool.query(
        "INSERT INTO orders (userId, productId, quantity, totalPrice, orderStatus, custodyServiceId) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [userId, productId, quantity, totalPrice, orderStatus, custodyServiceId]
      );
      insertedOrders.push(result.rows[0]);
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
      const position = await insertPosition(updatedOrder);
      const portfolioId = await findPortfolioId(updatedOrder.userid);
      if (portfolioId) {
        await insertPortfolioPosition(portfolioId, position.id);
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

const insertPosition = async (order: any) => {
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
      order.custodyserviceid,
      order.productid,
      purchaseDate,
      order.quantity,
      order.totalprice / order.quantity,
      createdAt,
      updatedAt
    ]
  );

  return result.rows[0];
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