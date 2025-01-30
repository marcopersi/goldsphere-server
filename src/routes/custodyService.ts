import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration

const router = Router();

// GET all custody services
router.get("/custodyServices", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, custodianId, custodyServiceName, fee, paymentFrequency, currencyId, maxWeight, createdAt, updatedAt FROM custodyService ORDER BY custodyServiceName");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching custody services:", error);
    res.status(500).json({ error: "Failed to fetch custody services", details: (error as Error).message });
  }
});

// POST new custody service
router.post("/custodyServices", async (req: Request, res: Response) => {
  const { custodianId, custodyServiceName, fee, paymentFrequency, currencyId, maxWeight } = req.body;
  try {
    const result = await pool.query("INSERT INTO custodyService (custodianId, custodyServiceName, fee, paymentFrequency, currencyId, maxWeight) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", [custodianId, custodyServiceName, fee, paymentFrequency, currencyId, maxWeight]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding custody service:", error);
    res.status(500).json({ error: "Failed to add custody service", details: (error as Error).message });
  }
});

// PUT update custody service
router.put("/custodyServices/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { custodianId, custodyServiceName, fee, paymentFrequency, currencyId, maxWeight } = req.body;
  try {
    const result = await pool.query("UPDATE custodyService SET custodianId = $1, custodyServiceName = $2, fee = $3, paymentFrequency = $4, currencyId = $5, maxWeight = $6, updatedAt = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *", [custodianId, custodyServiceName, fee, paymentFrequency, currencyId, maxWeight, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating custody service:", error);
    res.status(500).json({ error: "Failed to update custody service", details: (error as Error).message });
  }
});

// DELETE custody service
router.delete("/custodyServices/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM custodyService WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting custody service:", error);
    res.status(500).json({ error: "Failed to delete custody service", details: (error as Error).message });
  }
});

// GET custody service by id
router.get("/custodyServices/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT id, custodianId, custodyServiceName, fee, paymentFrequency, currencyId, maxWeight, createdAt, updatedAt FROM custodyService WHERE id = $1", [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching custody service:", error);
    res.status(500).json({ error: "Failed to fetch custody service", details: (error as Error).message });
  }
});

export default router;