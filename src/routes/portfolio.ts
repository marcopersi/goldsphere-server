import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration
import fs from "fs";
import path from "path";

const router = Router();

// Load SQL query from file
const queries = fs.readFileSync(path.join(__dirname, "../queries/queries.json"), "utf8");

// GET portfolio positions
router.get("/portfolios", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(JSON.parse(queries).getPortfolioPositions);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching portfolios:", error);
    res.status(500).json({ error: "Failed to fetch portfolios", details: (error as Error).message });
  }
});

// POST new portfolio
router.post("/portfolios", async (req: Request, res: Response) => {
  const { portfolioName, ownerId } = req.body;
  try {
    const result = await pool.query("INSERT INTO portfolio (portfolioName, ownerId) VALUES ($1, $2) RETURNING *", [portfolioName, ownerId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding portfolio:", error);
    res.status(500).json({ error: "Failed to add portfolio", details: (error as Error).message });
  }
});

// PUT update portfolio
router.put("/portfolios/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { portfolioName, ownerId } = req.body;
  try {
    const result = await pool.query("UPDATE portfolio SET portfolioName = $1, ownerId = $2, updatedAt = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *", [portfolioName, ownerId, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating portfolio:", error);
    res.status(500).json({ error: "Failed to update portfolio", details: (error as Error).message });
  }
});

// DELETE portfolio
router.delete("/portfolios/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM portfolio WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    res.status(500).json({ error: "Failed to delete portfolio", details: (error as Error).message });
  }
});

// GET portfolio by id
router.get("/portfolios/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, portfolioName, ownerId, createdAt, updatedAt FROM portfolio WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    res.status(500).json({ error: "Failed to fetch portfolio", details: (error as Error).message });
  }
});

export default router;