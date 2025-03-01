import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration
import fs from "fs";
import path from "path";

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
  const orderStatus = 'pending'; // Default order status
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
        newStatus = "confirmed";
        break;
      case "confirmed":
        newStatus = "settled";
        break;
      case "settled":
        newStatus = "delivered";
        break;
      case "delivered":
        newStatus = "delivered";
        break;
      default:
        res.status(400).json({ error: "Invalid order status" });
        return;
    }

    const result = await pool.query(
      "UPDATE orders SET orderstatus = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [newStatus, id]
    );
    res.json(result.rows[0]);
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

export default router;