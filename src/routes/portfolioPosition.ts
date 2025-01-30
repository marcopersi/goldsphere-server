import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration

const router = Router();

// GET all portfolio positions
router.get("/portfolioPositions", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, portfolioId, positionId, createdAt, updatedAt FROM portfolioPosition ORDER BY createdAt DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching portfolio positions:", error);
    res.status(500).json({ error: "Failed to fetch portfolio positions", details: (error as Error).message });
  }
});

// POST new portfolio position
router.post("/portfolioPositions", async (req: Request, res: Response) => {
  const { portfolioId, positionId } = req.body;
  try {
    const result = await pool.query("INSERT INTO portfolioPosition (portfolioId, positionId) VALUES ($1, $2) RETURNING *", [portfolioId, positionId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding portfolio position:", error);
    res.status(500).json({ error: "Failed to add portfolio position", details: (error as Error).message });
  }
});

// PUT update portfolio position
router.put("/portfolioPositions/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { portfolioId, positionId } = req.body;
  try {
    const result = await pool.query("UPDATE portfolioPosition SET portfolioId = $1, positionId = $2, updatedAt = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *", [portfolioId, positionId, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating portfolio position:", error);
    res.status(500).json({ error: "Failed to update portfolio position", details: (error as Error).message });
  }
});

// DELETE portfolio position
router.delete("/portfolioPositions/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM portfolioPosition WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting portfolio position:", error);
    res.status(500).json({ error: "Failed to delete portfolio position", details: (error as Error).message });
  }
});

// GET portfolio position by id
router.get("/portfolioPositions/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, portfolioId, positionId, createdAt, updatedAt FROM portfolioPosition WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching portfolio position:", error);
    res.status(500).json({ error: "Failed to fetch portfolio position", details: (error as Error).message });
  }
});

export default router;