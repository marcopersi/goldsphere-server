import { Router, Request, Response } from "express";
import { Transaction, TransactionCreateRequest, TransactionHistoryItem } from "@marcopersi/shared";
import pool from "../dbConfig";

const router = Router();

// GET /api/transactions - Get transaction history for authenticated user
router.get("/transactions", async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  
  // Get user ID from authenticated request
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    // Get total count first
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      WHERE t.userId = $1
    `;
    
    const countResult = await pool.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].total);

    // Get transactions with pagination
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
        (t.quantity * t.price + COALESCE(t.fees, 0)) AS total
      FROM transactions t
      WHERE t.userId = $1
      ORDER BY t.date DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, Number(limit), offset]);
    const transactions: TransactionHistoryItem[] = result.rows;

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit));
    const pagination = {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
      hasNext: Number(page) < totalPages,
      hasPrev: Number(page) > 1
    };

    res.json({ 
      transactions,
      pagination 
    });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// POST /api/transactions - Create transaction
router.post("/transactions", async (req: Request, res: Response): Promise<void> => {
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
router.get("/transactions/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  console.log(`Transaction endpoint called with ID: "${id}"`);

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    console.log(`Invalid UUID format: "${id}"`);
    res.status(400).json({ error: "Invalid transaction ID format. Expected UUID." });
    return;
  }

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
