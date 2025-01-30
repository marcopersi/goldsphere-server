import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration

const router = Router();

// GET all currencies
router.get("/currencies", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, isoCode2, isoCode3, isoNumericCode, createdAt, updatedAt FROM currency ORDER BY isoCode3");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching currencies:", error);
    res.status(500).json({ error: "Failed to fetch currencies", details: (error as Error).message });
  }
});

// POST new currency
router.post("/currencies", async (req: Request, res: Response) => {
  const { isoCode2, isoCode3, isoNumericCode } = req.body;
  try {
    const result = await pool.query("INSERT INTO currency (isoCode2, isoCode3, isoNumericCode) VALUES ($1, $2, $3) RETURNING *", [isoCode2, isoCode3, isoNumericCode]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding currency:", error);
    res.status(500).json({ error: "Failed to add currency", details: (error as Error).message });
  }
});

// PUT update currency
router.put("/currencies/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isoCode2, isoCode3, isoNumericCode } = req.body;
  try {
    const result = await pool.query("UPDATE currency SET isoCode2 = $1, isoCode3 = $2, isoNumericCode = $3, updatedAt = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *", [isoCode2, isoCode3, isoNumericCode, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating currency:", error);
    res.status(500).json({ error: "Failed to update currency", details: (error as Error).message });
  }
});

// DELETE currency
router.delete("/currencies/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM currency WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting currency:", error);
    res.status(500).json({ error: "Failed to delete currency", details: (error as Error).message });
  }
});

// GET currency by id
router.get("/currencies/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, isoCode2, isoCode3, isoNumericCode, createdAt, updatedAt FROM currency WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching currency:", error);
    res.status(500).json({ error: "Failed to fetch currency", details: (error as Error).message });
  }
});

export default router;