import { Router, Request, Response } from "express";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD), // Ensure password is a string
  database: process.env.DB_NAME,
});

// GET all orders
router.get("/orders", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders", details: (error as Error).message });
  }
});

// POST new order
router.post("/orders", async (req: Request, res: Response) => {
  const { user_id, product_id, quantity, total_price, status, custody_service_id } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO orders (user_id, product_id, quantity, total_price, status, custody_service_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [user_id, product_id, quantity, total_price, status, custody_service_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding order:", error);
    res.status(500).json({ error: "Failed to add order", details: (error as Error).message });
  }
});

// PUT update order
router.put("/orders/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { user_id, product_id, quantity, total_price, status, custody_service_id } = req.body;
  try {
    const result = await pool.query(
      "UPDATE orders SET user_id = $1, product_id = $2, quantity = $3, total_price = $4, status = $5, custody_service_id = $6 WHERE id = $7 RETURNING *",
      [user_id, product_id, quantity, total_price, status, custody_service_id, id]
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

export default router;