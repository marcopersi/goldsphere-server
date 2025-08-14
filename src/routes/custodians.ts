import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration
import { 
  CreateCustodianRequestSchema,
  UpdateCustodianRequestSchema
} from "@marcopersi/shared";

const router = Router();

// Helper function to map database rows to custodian objects
function mapDatabaseRowToCustodian(row: any) {
  return {
    id: row.id,
    name: row.custodianname,
    createdAt: row.createdat,
    updatedAt: row.updatedat
  };
}

// GET all custodians
router.get("/custodians", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, custodianname, createdat, updatedat FROM custodian ORDER BY custodianname");
    
    const custodiansData = result.rows.map(mapDatabaseRowToCustodian);
    
    res.json({
      success: true,
      data: custodiansData
    });
  } catch (error) {
    console.error("Error fetching custodians:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch custodians", 
      details: (error as Error).message 
    });
  }
});

// POST new custodian
router.post("/custodians", async (req: Request, res: Response) => {
  try {
    const validatedData = CreateCustodianRequestSchema.parse(req.body);
    const { name } = validatedData;
    
    const result = await pool.query("INSERT INTO custodian (custodianName) VALUES ($1) RETURNING *", [name]);
    const custodianData = mapDatabaseRowToCustodian(result.rows[0]);
    
    res.status(201).json({
      success: true,
      data: custodianData
    });
  } catch (error) {
    console.error("Error adding custodian:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to add custodian", 
      details: (error as Error).message 
    });
  }
});

// PUT update custodian
router.put("/custodians/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = UpdateCustodianRequestSchema.parse(req.body);
    const { name } = validatedData;
    
    const result = await pool.query("UPDATE custodian SET custodianname = $1, updatedat = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *", [name, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Custodian not found"
      });
    }
    
    const custodianData = mapDatabaseRowToCustodian(result.rows[0]);
    res.json({
      success: true,
      data: custodianData
    });
  } catch (error) {
    console.error("Error updating custodian:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update custodian", 
      details: (error as Error).message 
    });
  }
});

// DELETE custodian
router.delete("/custodians/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM custodian WHERE id = $1 RETURNING *", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Custodian not found"
      });
    }
    
    res.json({
      success: true,
      data: { message: "Custodian deleted successfully" }
    });
  } catch (error) {
    console.error("Error deleting custodian:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete custodian", 
      details: (error as Error).message 
    });
  }
});

// GET custodian by id
router.get("/custodians/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT id, custodianname, createdat, updatedat FROM custodian WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Custodian not found"
      });
    }
    
    const custodianData = mapDatabaseRowToCustodian(result.rows[0]);
    res.json({
      success: true,
      data: custodianData
    });
  } catch (error) {
    console.error("Error fetching custodian:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch custodian", 
      details: (error as Error).message 
    });
  }
});

export default router;