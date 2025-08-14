import { Router, Request, Response } from "express";
import pool from "../dbConfig";
import { 
  PositionSchema,
  PositionCreateRequestSchema,
  PositionUpdateRequestSchema,
  PositionsResponseSchema} from "@marcopersi/shared";
import { z } from 'zod';

const router = Router();

// Helper function to fetch full product data for a position
const fetchProductForPosition = async (productId: string) => {
  const productQuery = `
    SELECT 
      product.id, 
      product.name AS productname, 
      productType.productTypeName AS producttype, 
      metal.name AS metalname, 
      product.weight AS fineweight, 
      product.weightUnit AS unitofmeasure, 
      product.purity,
      product.price,
      product.currency,
      producer.producerName AS producer,
      issuingCountry.issuingCountryName AS country,
      product.year AS productyear,
      product.description,
      product.imageFilename AS imageurl,
      product.inStock,
      product.minimumOrderQuantity,
      product.createdat,
      product.updatedat
    FROM product 
    JOIN productType ON productType.id = product.productTypeId 
    JOIN metal ON metal.id = product.metalId 
    JOIN producer ON producer.id = product.producerId
    LEFT JOIN issuingCountry ON issuingCountry.id = product.issuingCountryId
    WHERE product.id = $1
  `;
  
  const result = await pool.query(productQuery, [productId]);
  if (result.rows.length === 0) {
    throw new Error(`Product not found: ${productId}`);
  }
  
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.productname,
    type: row.producttype,
    metal: row.metalname,
    weight: parseFloat(row.fineweight) || 0,
    weightUnit: row.unitofmeasure,
    purity: parseFloat(row.purity) || 0.999,
    price: parseFloat(row.price) || 0,
    currency: row.currency,
    producer: row.producer,
    country: row.country || null,
    year: row.productyear || undefined,
    description: row.description || '',
    imageUrl: row.imageurl || '',
    inStock: row.instock ?? true,
    minimumOrderQuantity: row.minimumorderquantity || 1,
    createdAt: row.createdat || new Date(),
    updatedAt: row.updatedat || new Date()
  };
};

// Helper function to convert database row to Position object
const mapDatabaseRowToPosition = async (row: any) => {
  const product = await fetchProductForPosition(row.productid);
  
  return {
    id: row.id,
    userId: row.userid,
    productId: row.productid,
    portfolioId: row.portfolioid,
    product: product,
    purchaseDate: row.purchasedate || new Date(),
    purchasePrice: parseFloat(row.purchaseprice) || 0,
    marketPrice: parseFloat(row.marketprice) || 0,
    quantity: parseFloat(row.quantity) || 0,
    status: row.status || 'active',
    notes: row.notes || '',
    createdAt: row.createdat || new Date(),
    updatedAt: row.updatedat || new Date()
  };
};

// GET all positions (global endpoint)
router.get("/positions", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM position ORDER BY createdat DESC");
    
    // Convert each row to a proper Position object with full product data
    const positions = await Promise.all(
      result.rows.map(row => mapDatabaseRowToPosition(row))
    );

    const pagination = {
      page: 1,
      limit: result.rows.length,
      total: result.rows.length,
      totalPages: Math.max(1, Math.ceil(result.rows.length / 10)),
      hasNext: false,
      hasPrev: false
    };

    res.json({
      positions: positions || [],
      pagination
    });
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({ error: "Failed to fetch positions", details: (error as Error).message });
  }
});

// GET all positions (alternative global endpoint)
router.get("/global/positions", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM position ORDER BY createdat DESC");
    
    // Convert each row to a proper Position object with full product data
    const positions = await Promise.all(
      result.rows.map(row => mapDatabaseRowToPosition(row))
    );

    const pagination = {
      page: 1,
      limit: result.rows.length,
      total: result.rows.length,
      totalPages: Math.max(1, Math.ceil(result.rows.length / 10)),
      hasNext: false,
      hasPrev: false
    };

    res.json({
      positions: positions || [],
      pagination
    });
  } catch (error) {
    console.error("Error fetching global positions:", error);
    res.status(500).json({ error: "Failed to fetch global positions", details: (error as Error).message });
  }
});

// GET positions by portfolio
router.get("/portfolios/:portfolioId/positions", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT * FROM position 
      WHERE portfolioId = $1 
      ORDER BY createdat DESC
    `, [req.params.portfolioId]);
    
    const positions = await Promise.all(
      result.rows.map(row => mapDatabaseRowToPosition(row))
    );

    const pagination = {
      page: 1,
      limit: result.rows.length,
      total: result.rows.length,
      totalPages: Math.max(1, Math.ceil(result.rows.length / 10)),
      hasNext: false,
      hasPrev: false
    };

    res.json({
      positions,
      pagination
    });
  } catch (error) {
    console.error("Error fetching portfolio positions:", error);
    res.status(500).json({ error: "Failed to fetch portfolio positions", details: (error as Error).message });
  }
});

// POST new position
router.post("/positions", async (req: Request, res: Response) => {
  try {
    // Validate the request body against the schema (core position fields)
    const validatedRequest = PositionCreateRequestSchema.parse(req.body);
    
    // Get additional fields from request body (these are not in the create schema but needed for database)
    const { userId, portfolioId, marketPrice } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    // Add purchaseDate if not provided
    const purchaseDate = req.body.purchaseDate ? new Date(req.body.purchaseDate) : new Date();
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO position (
        userId, portfolioId, productId, purchaseDate, purchasePrice, marketPrice, 
        quantity, issuingCountry, producer, certifiedProvenance, status, notes, 
        createdat, updatedat
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`, 
      [
        userId, 
        portfolioId, 
        validatedRequest.productId, 
        purchaseDate, 
        validatedRequest.purchasePrice, 
        marketPrice || validatedRequest.purchasePrice, // Use purchase price as default market price
        validatedRequest.quantity, 
        validatedRequest.issuingCountry, 
        validatedRequest.producer, 
        validatedRequest.certifiedProvenance, 
        'active', // Default status
        validatedRequest.notes || '',
        now,
        now
      ]
    );

    // Convert the result to a proper Position object
    const position = await mapDatabaseRowToPosition(result.rows[0]);
    
    // Validate the response
    const validatedPosition = PositionSchema.parse(position);
    
    res.status(201).json(validatedPosition);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: "Validation error", 
        details: error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    } else {
      console.error("Error adding position:", error);
      res.status(500).json({ error: "Failed to add position", details: (error as Error).message });
    }
  }
});

// PUT update position
router.put("/positions/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate the request body against the update schema (only allows certain fields)
    const validatedRequest = PositionUpdateRequestSchema.parse(req.body);
    
    // Get the current position first
    const currentResult = await pool.query("SELECT * FROM position WHERE id = $1", [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "Position not found" });
    }
    
    const currentPosition = currentResult.rows[0];
    const now = new Date();

    // Update only the fields that are allowed to be updated
    const result = await pool.query(
      `UPDATE position SET 
        marketPrice = $1, quantity = $2, status = $3, notes = $4, updatedat = $5 
      WHERE id = $6 RETURNING *`, 
      [
        validatedRequest.marketPrice ?? currentPosition.marketprice,
        validatedRequest.quantity ?? currentPosition.quantity,
        validatedRequest.status ?? currentPosition.status,
        validatedRequest.notes ?? currentPosition.notes,
        now,
        id
      ]
    );

    // Convert the result to a proper Position object
    const position = await mapDatabaseRowToPosition(result.rows[0]);
    
    // Validate the response
    const validatedPosition = PositionSchema.parse(position);
    
    res.json(validatedPosition);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: "Validation error", 
        details: error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    } else {
      console.error("Error updating position:", error);
      res.status(500).json({ error: "Failed to update position", details: (error as Error).message });
    }
  }
});

// DELETE position
router.delete("/positions/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM position WHERE id = $1 RETURNING id", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Position not found" });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting position:", error);
    res.status(500).json({ error: "Failed to delete position", details: (error as Error).message });
  }
});

// GET position by id
router.get("/positions/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM position WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Position not found" });
    }

    // Convert the result to a proper Position object
    const position = await mapDatabaseRowToPosition(result.rows[0]);
    
    // Validate the response
    const validatedPosition = PositionSchema.parse(position);
    
    res.json(validatedPosition);
  } catch (error) {
    console.error("Error fetching position:", error);
    res.status(500).json({ error: "Failed to fetch position", details: (error as Error).message });
  }
});

export default router;