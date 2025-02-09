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

// POST new order
router.post("/orders", async (req: Request, res: Response) => {
  const { userId, productId, quantity, totalPrice, orderStatus, custodyServiceId } = req.body;
  try {
    const result = await pool.query("INSERT INTO orders (userId, productId, quantity, totalPrice, orderStatus, custodyServiceId) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", [userId, productId, quantity, totalPrice, orderStatus, custodyServiceId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding order:", error);
    res.status(500).json({ error: "Failed to add order", details: (error as Error).message });
  }
});

// PUT update order
router.put("/orders/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, productId, quantity, totalPrice, orderStatus, custodyServiceId } = req.body;
  try {
    const result = await pool.query("UPDATE orders SET userId = $1, productId = $2, quantity = $3, totalPrice = $4, orderStatus = $5, custodyServiceId = $6, updatedAt = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *", [userId, productId, quantity, totalPrice, orderStatus, custodyServiceId, id]);
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