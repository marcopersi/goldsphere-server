import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration

const router = Router();

// GET all transactions
router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, positionId, userId, type, date, quantity, price, fees, notes, createdAt FROM transactions ORDER BY date DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions", details: (error as Error).message });
  }
});

// GET transactions by position ID
router.get("/transactions/position/:positionId", async (req: Request, res: Response) => {
  const { positionId } = req.params;
  try {
    const result = await pool.query("SELECT id, positionId, userId, type, date, quantity, price, fees, notes, createdAt FROM transactions WHERE positionId = $1 ORDER BY date DESC", [positionId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching transactions for position:", error);
    res.status(500).json({ error: "Failed to fetch transactions for position", details: (error as Error).message });
  }
});

// GET transactions by user ID
router.get("/transactions/user/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const result = await pool.query("SELECT id, positionId, userId, type, date, quantity, price, fees, notes, createdAt FROM transactions WHERE userId = $1 ORDER BY date DESC", [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching transactions for user:", error);
    res.status(500).json({ error: "Failed to fetch transactions for user", details: (error as Error).message });
  }
});

// POST new transaction
router.post("/transactions", async (req: Request, res: Response) => {
  const { positionId, userId, type, date, quantity, price, fees, notes } = req.body;
  try {
    const result = await pool.query("INSERT INTO transactions (positionId, userId, type, date, quantity, price, fees, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *", [positionId, userId, type, date, quantity, price, fees, notes]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding transaction:", error);
    res.status(500).json({ error: "Failed to add transaction", details: (error as Error).message });
  }
});

// PUT update transaction
router.put("/transactions/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { positionId, userId, type, date, quantity, price, fees, notes } = req.body;
  try {
    const result = await pool.query("UPDATE transactions SET positionId = $1, userId = $2, type = $3, date = $4, quantity = $5, price = $6, fees = $7, notes = $8 WHERE id = $9 RETURNING *", [positionId, userId, type, date, quantity, price, fees, notes, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ error: "Failed to update transaction", details: (error as Error).message });
  }
});

// DELETE transaction
router.delete("/transactions/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM transactions WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ error: "Failed to delete transaction", details: (error as Error).message });
  }
});

export default router;
