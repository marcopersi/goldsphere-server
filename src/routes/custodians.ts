import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration
import { 
  Custodian,
  CustodianReference,
  RefDataCustodiansResponseSchema,
  CreateExtendedCustodianRequestSchema,
  UpdateCustodianRequestSchema,
  CustodianResponseSchema,
  CustodiansResponseSchema,
  CustodiansQuerySchema,
  mapDatabaseRowToCustodian as sharedMapDatabaseRowToCustodian
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

// GET all custodians with enhanced query parameters and response formatting
router.get("/custodians", async (req: Request, res: Response) => {
  try {
    // Parse and validate query parameters
    const queryValidation = CustodiansQuerySchema.safeParse(req.query);
    
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: queryValidation.error.issues
      });
    }
    
    const { page, limit, search, isActive, sortBy, sortOrder } = queryValidation.data;
    
    // Build dynamic query with filtering and pagination
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      whereConditions.push(`custodianName ILIKE $${paramIndex++}`);
      queryParams.push(`%${search}%`);
    }
    
    if (isActive !== undefined) {
      whereConditions.push(`isActive = $${paramIndex++}`);
      queryParams.push(isActive);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validate and construct ORDER BY clause
    const validSortColumns = ['custodianName', 'createdAt'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'custodianName';
    const sortDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM custodian ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get paginated results
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT id, custodianname, createdat, updatedat 
      FROM custodian 
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    queryParams.push(limit, offset);
    
    const result = await pool.query(dataQuery, queryParams);
    const custodiansData = result.rows.map(mapDatabaseRowToCustodian);
    
    // Format response with pagination
    const response = {
      success: true,
      data: {
        custodians: custodiansData,
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        }
      },
      message: `Retrieved ${custodiansData.length} custodians`
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error fetching custodians:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch custodians", 
      details: (error as Error).message 
    });
  }
});

// POST create new custodian with comprehensive validation
router.post("/custodians", async (req: Request, res: Response) => {
  try {
    // Validate request body using shared schema
    const validationResult = CreateExtendedCustodianRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid custodian data",
        details: validationResult.error.issues
      });
    }
    
    const custodianData = validationResult.data;
    
    // Check for duplicate custodian name
    const duplicateCheck = await pool.query("SELECT id FROM custodian WHERE custodianName = $1", [custodianData.name]);
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Custodian with this name already exists"
      });
    }
    
    // Insert new custodian with comprehensive data
    const result = await pool.query(
      "INSERT INTO custodian (custodianName, description, contactInfo, capabilities, isActive, certifications) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", 
      [
        custodianData.name,
        custodianData.description || null,
        custodianData.contactInfo ? JSON.stringify(custodianData.contactInfo) : null,
        custodianData.capabilities || [],
        custodianData.isActive ?? true,
        custodianData.certifications || []
      ]
    );
    
    const newCustodianData = mapDatabaseRowToCustodian(result.rows[0]);
    
    // Format response using shared schema
    const response = {
      success: true,
      data: newCustodianData,
      message: "Custodian created successfully"
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Error adding custodian:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to add custodian", 
      details: (error as Error).message 
    });
  }
});

// PUT update custodian with comprehensive validation and partial updates
router.put("/custodians/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.exec(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid custodian ID format" 
      });
    }
    
    // Validate request body using shared schema
    const validationResult = UpdateCustodianRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid custodian update data",
        details: validationResult.error.issues
      });
    }
    
    const custodianData = validationResult.data;
    
    // Check if custodian exists
    const existingResult = await pool.query("SELECT id FROM custodian WHERE id = $1", [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Custodian not found" 
      });
    }
    
    // Check for duplicate name if name is being updated
    if (custodianData.name) {
      const duplicateCheck = await pool.query("SELECT id FROM custodian WHERE custodianName = $1 AND id != $2", [custodianData.name, id]);
      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: "Custodian with this name already exists"
        });
      }
    }
    
    // Build dynamic update query with only provided fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (custodianData.name !== undefined) {
      updateFields.push(`custodianName = $${paramIndex++}`);
      updateValues.push(custodianData.name);
    }
    if (custodianData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(custodianData.description);
    }
    
    // Always update updatedAt
    updateFields.push(`updatedAt = CURRENT_TIMESTAMP`);
    
    if (updateFields.length === 1) { // Only updatedAt
      return res.status(400).json({ 
        success: false,
        error: "No fields to update" 
      });
    }
    
    // Add ID parameter for WHERE clause
    updateValues.push(id);
    
    const updateQuery = `
      UPDATE custodian 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, updateValues);
    const custodianUpdatedData = mapDatabaseRowToCustodian(result.rows[0]);
    
    // Format response using shared schema
    const response = {
      success: true,
      data: custodianUpdatedData,
      message: "Custodian updated successfully"
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error updating custodian:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update custodian", 
      details: (error as Error).message 
    });
  }
});

// DELETE custodian with enhanced validation and referential integrity checks
router.delete("/custodians/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.exec(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid custodian ID format" 
      });
    }
    
    // Check if custodian exists and get name for response
    const existingResult = await pool.query("SELECT id, custodianname FROM custodian WHERE id = $1", [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Custodian not found"
      });
    }
    
    const custodianName = existingResult.rows[0].custodianname;
    
    // Check for existing custody services referencing this custodian
    const custodyServiceCheck = await pool.query("SELECT id FROM custodyService WHERE custodianId = $1 LIMIT 1", [id]);
    if (custodyServiceCheck.rows.length > 0) {
      return res.status(409).json({ 
        success: false,
        error: "Cannot delete custodian with existing custody services" 
      });
    }
    
    // Delete the custodian
    await pool.query("DELETE FROM custodian WHERE id = $1", [id]);
    
    // Return success response with proper formatting
    const response = {
      success: true,
      message: `Custodian '${custodianName}' deleted successfully`
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error deleting custodian:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete custodian", 
      details: (error as Error).message 
    });
  }
});

// GET custodian by ID with enhanced validation and response formatting
router.get("/custodians/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.exec(id)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid custodian ID format" 
      });
    }
    
    const result = await pool.query("SELECT id, custodianname, createdat, updatedat FROM custodian WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Custodian not found"
      });
    }
    
    const custodianData = mapDatabaseRowToCustodian(result.rows[0]);
    
    // Format response using shared schema structure
    const response = {
      success: true,
      data: custodianData,
      message: "Custodian retrieved successfully"
    };
    
    res.json(response);
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