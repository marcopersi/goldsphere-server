import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration

const router = Router();

// GET all positions
router.get("/positions", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, custodyServiceId, productId, purchaseDate, quantity, createdAt, updatedAt FROM position ORDER BY createdAt DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({ error: "Failed to fetch positions", details: (error as Error).message });
  }
});

// POST new position
router.post("/positions", async (req: Request, res: Response) => {
  const { custodyServiceId, productId, purchaseDate, quantity } = req.body;
  try {
    const result = await pool.query("INSERT INTO position (custodyServiceId, productId, purchaseDate, quantity) VALUES ($1, $2, $3, $4) RETURNING *", [custodyServiceId, productId, purchaseDate, quantity]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding position:", error);
    res.status(500).json({ error: "Failed to add position", details: (error as Error).message });
  }
});

// PUT update position
router.put("/positions/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { custodyServiceId, productId, purchaseDate, quantity } = req.body;
  try {
    const result = await pool.query("UPDATE position SET custodyServiceId = $1, productId = $2, purchaseDate = $3, quantity = $4, updatedAt = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *", [custodyServiceId, productId, purchaseDate, quantity, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating position:", error);
    res.status(500).json({ error: "Failed to update position", details: (error as Error).message });
  }
});

// DELETE position
router.delete("/positions/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM position WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting position:", error);
    res.status(500).json({ error: "Failed to delete position", details: (error as Error).message });
  }
});

// GET position by id
router.get("/positions/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, custodyServiceId, productId, purchaseDate, quantity, createdAt, updatedAt FROM position WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching position:", error);
    res.status(500).json({ error: "Failed to fetch position", details: (error as Error).message });
  }
});

export default router;