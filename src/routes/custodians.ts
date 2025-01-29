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

// GET all custodians
router.get("/custodians", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, name, location, created_at, updated_at FROM custodians ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching custodians:", error);
    res.status(500).json({ error: "Failed to fetch custodians", details: (error as Error).message });
  }
});

// POST new custodian
router.post("/custodians", async (req: Request, res: Response) => {
  const { name, location } = req.body;
  try {
    const result = await pool.query("INSERT INTO custodians (name, location) VALUES ($1, $2) RETURNING *", [name, location]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding custodian:", error);
    res.status(500).json({ error: "Failed to add custodian", details: (error as Error).message });
  }
});

// PUT update custodian
router.put("/custodians/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, location } = req.body;
  try {
    const result = await pool.query("UPDATE custodians SET name = $1, location = $2 WHERE id = $3 RETURNING *", [name, location, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating custodian:", error);
    res.status(500).json({ error: "Failed to update custodian", details: (error as Error).message });
  }
});

// DELETE custodian
router.delete("/custodians/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM custodians WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting custodian:", error);
    res.status(500).json({ error: "Failed to delete custodian", details: (error as Error).message });
  }
});

export default router;