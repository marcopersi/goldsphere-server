import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration

const router = Router();

// GET all custodians
router.get("/custodians", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, custodianName, createdAt, updatedAt FROM custodian ORDER BY custodianName");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching custodians:", error);
    res.status(500).json({ error: "Failed to fetch custodians", details: (error as Error).message });
  }
});

// POST new custodian
router.post("/custodians", async (req: Request, res: Response) => {
  const { custodianName } = req.body;
  try {
    const result = await pool.query("INSERT INTO custodian (custodianName) VALUES ($1) RETURNING *", [custodianName]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding custodian:", error);
    res.status(500).json({ error: "Failed to add custodian", details: (error as Error).message });
  }
});

// PUT update custodian
router.put("/custodians/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { custodianName } = req.body;
  try {
    const result = await pool.query("UPDATE custodian SET custodianName = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *", [custodianName, id]);
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
    await pool.query("DELETE FROM custodian WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting custodian:", error);
    res.status(500).json({ error: "Failed to delete custodian", details: (error as Error).message });
  }
});

// GET custodian by id
router.get("/custodians/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, custodianName, createdAt, updatedAt FROM custodian WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching custodian:", error);
    res.status(500).json({ error: "Failed to fetch custodian", details: (error as Error).message });
  }
});

export default router;