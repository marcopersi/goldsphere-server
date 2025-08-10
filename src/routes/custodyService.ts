import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration
import { 
  CreateCustodyServiceRequestSchema,
  UpdateCustodyServiceRequestSchema,
  PaymentFrequency
} from "@marcopersi/shared";

const router = Router();

// Helper function to map database rows to custody service objects
function mapDatabaseRowToCustodyService(row: any) {
  return {
    id: row.id,
    custodianId: row.custodianid,
    serviceName: row.custodyservicename,
    fee: parseFloat(row.fee),
    paymentFrequency: PaymentFrequency.fromValue(row.paymentfrequency),
    currency: row.currencyid, // Will need to join with currency table to get currency code
    maxWeight: row.maxweight ? parseFloat(row.maxweight) : null,
    createdAt: row.createdat,
    updatedAt: row.updatedat
  };
}

// GET all custody services
router.get("/custodyServices", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT cs.id, cs.custodianId, cs.custodyServiceName, cs.fee, cs.paymentFrequency, 
             c.isocode3 as currency, cs.maxWeight, cs.createdAt, cs.updatedAt 
      FROM custodyService cs
      LEFT JOIN currency c ON cs.currencyId = c.id
      ORDER BY cs.custodyServiceName
    `);
    
    const custodyServicesData = result.rows.map(row => ({
      id: row.id,
      custodianId: row.custodianid,
      serviceName: row.custodyservicename,
      fee: parseFloat(row.fee),
      paymentFrequency: PaymentFrequency.fromValue(row.paymentfrequency),
      currency: row.currency,
      maxWeight: row.maxweight ? parseFloat(row.maxweight) : null,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    }));
    
    res.json({
      success: true,
      data: custodyServicesData
    });
  } catch (error) {
    console.error("Error fetching custody services:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch custody services", 
      details: (error as Error).message 
    });
  }
});

// POST new custody service
router.post("/custodyServices", async (req: Request, res: Response) => {
  try {
    const validatedData = CreateCustodyServiceRequestSchema.parse(req.body);
    const { custodianId, serviceName, fee, paymentFrequency, currency, maxWeight } = validatedData;
    
    // First, get the currency ID from the currency code
    const currencyResult = await pool.query("SELECT id FROM currency WHERE isocode3 = $1", [currency]);
    if (currencyResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid currency code"
      });
    }
    const currencyId = currencyResult.rows[0].id;
    
    const result = await pool.query(
      "INSERT INTO custodyService (custodianId, custodyServiceName, fee, paymentFrequency, currencyId, maxWeight) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", 
      [custodianId, serviceName, fee, paymentFrequency, currencyId, maxWeight]
    );
    
    const custodyServiceData = mapDatabaseRowToCustodyService(result.rows[0]);
    
    res.status(201).json({
      success: true,
      data: custodyServiceData
    });
  } catch (error) {
    console.error("Error adding custody service:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to add custody service", 
      details: (error as Error).message 
    });
  }
});

// PUT update custody service
router.put("/custodyServices/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = UpdateCustodyServiceRequestSchema.parse(req.body);
    const { custodianId, serviceName, fee, paymentFrequency, currency, maxWeight } = validatedData;
    
    // Get the currency ID from the currency code if provided
    let currencyId;
    if (currency) {
      const currencyResult = await pool.query("SELECT id FROM currency WHERE isocode3 = $1", [currency]);
      if (currencyResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid currency code"
        });
      }
      currencyId = currencyResult.rows[0].id;
    }
    
    const result = await pool.query(
      "UPDATE custodyService SET custodianId = $1, custodyServiceName = $2, fee = $3, paymentFrequency = $4, currencyId = $5, maxWeight = $6, updatedAt = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *", 
      [custodianId, serviceName, fee, paymentFrequency, currencyId, maxWeight, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Custody service not found"
      });
    }
    
    const custodyServiceData = mapDatabaseRowToCustodyService(result.rows[0]);
    res.json({
      success: true,
      data: custodyServiceData
    });
  } catch (error) {
    console.error("Error updating custody service:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update custody service", 
      details: (error as Error).message 
    });
  }
});

// DELETE custody service
router.delete("/custodyServices/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM custodyService WHERE id = $1 RETURNING *", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Custody service not found"
      });
    }
    
    res.json({
      success: true,
      data: { message: "Custody service deleted successfully" }
    });
  } catch (error) {
    console.error("Error deleting custody service:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete custody service", 
      details: (error as Error).message 
    });
  }
});

// GET custody service by id
router.get("/custodyServices/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT id, custodianId, custodyServiceName, fee, paymentFrequency, currencyId, maxWeight, createdAt, updatedAt FROM custodyService WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Custody service not found"
      });
    }
    
    const custodyServiceData = mapDatabaseRowToCustodyService(result.rows[0]);
    res.json({
      success: true,
      data: custodyServiceData
    });
  } catch (error) {
    console.error("Error fetching custody service:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch custody service", 
      details: (error as Error).message 
    });
  }
});

export default router;