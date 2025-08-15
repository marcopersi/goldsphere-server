import { Router, Request, Response } from "express";
import pool from "../dbConfig";

const router = Router();

// Temporary simple endpoint for testing
router.get("/positions", async (req: Request, res: Response) => {
  try {
    console.log("Positions endpoint called");
    
    const result = await pool.query("SELECT * FROM position ORDER BY createdat DESC LIMIT 10");
    console.log("Query result:", result.rows.length, "rows");

    // Return basic response structure
    const response = {
      positions: result.rows,
      pagination: {
        page: 1,
        limit: 10,
        total: result.rows.length,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false
      }
    };

    console.log("Sending response");
    res.json(response);
  } catch (error) {
    console.error("Error in positions endpoint:", error);
    res.status(500).json({ 
      error: "Failed to fetch positions", 
      details: (error as Error).message 
    });
  }
});

export default router;
