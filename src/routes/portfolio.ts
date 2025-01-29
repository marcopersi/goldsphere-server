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

// GET all portfolios
router.get("/portfolio", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, user_id,product_id,purchase_date,quantity, total_value,custody_service_id FROM portfolio ORDER BY purchase_date");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching portfolios:", error);
    res.status(500).json({ error: "Failed to fetch portfolios", details: (error as Error).message });
  }
});

// POST new portfolio
router.post("/portfolio", async (req: Request, res: Response) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query("INSERT INTO portfolio (name, description) VALUES ($1, $2) RETURNING *", [name, description]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding portfolio:", error);
    res.status(500).json({ error: "Failed to add portfolio", details: (error as Error).message });
  }
});

// PUT update portfolio
router.put("/portfolio/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const result = await pool.query("UPDATE portfolio SET name = $1, description = $2 WHERE id = $3 RETURNING *", [name, description, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating portfolio:", error);
    res.status(500).json({ error: "Failed to update portfolio", details: (error as Error).message });
  }
});

// DELETE portfolio
router.delete("/portfolio/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM portfolio WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    res.status(500).json({ error: "Failed to delete portfolio", details: (error as Error).message });
  }
});

export default router;