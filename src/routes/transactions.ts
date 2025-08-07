import { Router, Request, Response } from "express";
import { Transaction, TransactionCreateRequest, TransactionHistoryItem } from "@goldsphere/shared";
import pool from "../dbConfig";

const router = Router();

// GET /api/transactions - Get transaction history
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const query = `
      SELECT 
        t.id,
        t.positionId,
        t.userId, 
        t.type,
        t.date::text,
        t.quantity,
        t.price,
        t.fees,
        t.notes,
        t.createdAt::text,
        p.productname AS "productName",
        (t.quantity * t.price + COALESCE(t.fees, 0)) AS total
      FROM transactions t
      JOIN positions pos ON t.positionId = pos.id
      JOIN product p ON pos.product_id = p.id
      ORDER BY t.date DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [Number(limit), offset]);
    const transactions: TransactionHistoryItem[] = result.rows;

    res.json({ transactions });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// POST /api/transactions - Create transaction
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { positionId, type, date, quantity, price, fees = 0, notes }: TransactionCreateRequest = req.body;

  try {
    // Verify position exists
    const positionCheck = await pool.query("SELECT user_id FROM positions WHERE id = $1", [positionId]);
    if (positionCheck.rows.length === 0) {
      res.status(404).json({ error: "Position not found" });
      return;
    }

    const userId = positionCheck.rows[0].user_id;

    const query = `
      INSERT INTO transactions (positionId, userId, type, date, quantity, price, fees, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        positionId,
        userId,
        type,
        date::text,
        quantity,
        price,
        fees,
        notes,
        createdAt::text
    `;

    const result = await pool.query(query, [positionId, userId, type, date, quantity, price, fees, notes]);
    const transaction: Transaction = result.rows[0];

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Failed to create transaction:", error);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// GET /api/transactions/:id - Get transaction by ID
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        id,
        positionId,
        userId,
        type,
        date::text,
        quantity,
        price,
        fees,
        notes,
        createdAt::text
      FROM transactions 
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    const transaction: Transaction = result.rows[0];
    res.json(transaction);
  } catch (error) {
    console.error("Failed to fetch transaction:", error);
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});

export default router;
