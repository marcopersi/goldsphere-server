import { Router, Request, Response } from "express";
import pool from "../dbConfig";

const router = Router();

// GET all positions
router.get("/positions", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM positions ORDER BY createdAt DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch positions" });
  }
});

// GET positions by portfolio
router.get("/portfolios/:portfolioId/positions", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM positions WHERE portfolioid = $1 ORDER BY createdAt DESC", [req.params.portfolioId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch portfolio positions" });
  }
});

// POST new position
router.post("/positions", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "INSERT INTO positions (userId, portfolioId, productId, purchaseDate, purchasePrice, marketPrice, quantity, issuingCountry, producer, certifiedProvenance, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *", 
      [req.body.userId, req.body.portfolioId, req.body.productId, req.body.purchaseDate, req.body.purchasePrice, req.body.marketPrice, req.body.quantity, req.body.issuingCountry, req.body.producer, req.body.certifiedProvenance, req.body.status, req.body.notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to add position" });
  }
});

// PUT update position
router.put("/positions/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "UPDATE positions SET userId = $1, portfolioId = $2, productId = $3, purchaseDate = $4, purchasePrice = $5, marketPrice = $6, quantity = $7, issuingCountry = $8, producer = $9, certifiedProvenance = $10, status = $11, notes = $12, updatedAt = CURRENT_TIMESTAMP WHERE id = $13 RETURNING *", 
      [req.body.userId, req.body.portfolioId, req.body.productId, req.body.purchaseDate, req.body.purchasePrice, req.body.marketPrice, req.body.quantity, req.body.issuingCountry, req.body.producer, req.body.certifiedProvenance, req.body.status, req.body.notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update position" });
  }
});

// DELETE position
router.delete("/positions/:id", async (req: Request, res: Response) => {
  try {
    await pool.query("DELETE FROM positions WHERE id = $1", [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete position" });
  }
});

// GET position by id
router.get("/positions/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM positions WHERE id = $1", [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch position" });
  }
});

export default router;