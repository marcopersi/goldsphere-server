import { Router, Request, Response } from "express";
import pool from "../dbConfig"; // Import the shared pool configuration
import { 
  CreateExtendedCustodyServiceRequestSchema,
  UpdateExtendedCustodyServiceRequestSchema,
  CustodyServiceResponseSchema,
  CustodyServicesResponseSchema,
  CustodyServicesQuerySchema,
  mapDatabaseRowToCustodyService as sharedMapDatabaseRowToCustodyService
} from "@marcopersi/shared";

const router = Router();

// GET all custody services with enhanced query parameters and response formatting
router.get("/custodyServices", async (req: Request, res: Response) => {
  try {
    // Parse and validate query parameters
    const queryValidation = CustodyServicesQuerySchema.safeParse(req.query);
    
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: queryValidation.error.issues
      });
    }
    
    const { page, limit, search, custodianId, minFee, maxFee, paymentFrequency, currency, isActive, sortBy, sortOrder } = queryValidation.data;
    
    // Build dynamic query with filtering and pagination
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      whereConditions.push(`cs.custodyservicename ILIKE $${paramIndex++}`);
      queryParams.push(`%${search}%`);
    }
    
    if (custodianId) {
      whereConditions.push(`cs.custodianId = $${paramIndex++}`);
      queryParams.push(custodianId);
    }
    
    if (minFee !== undefined) {
      whereConditions.push(`cs.fee >= $${paramIndex++}`);
      queryParams.push(minFee);
    }
    
    if (maxFee !== undefined) {
      whereConditions.push(`cs.fee <= $${paramIndex++}`);
      queryParams.push(maxFee);
    }
    
    if (paymentFrequency) {
      whereConditions.push(`cs.paymentFrequency = $${paramIndex++}`);
      queryParams.push(paymentFrequency);
    }
    
    if (currency) {
      whereConditions.push(`curr.isocode3 = $${paramIndex++}`);
      queryParams.push(currency);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validate and construct ORDER BY clause
    const validSortColumns = ['custodyServiceName', 'fee', 'custodianName', 'createdAt'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'custodyServiceName';
    const sortDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) 
      FROM custodyService cs
      LEFT JOIN currency curr ON cs.currencyId = curr.id
      LEFT JOIN custodian c ON cs.custodianId = c.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get paginated results with enhanced data
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT cs.id, cs.custodianId, cs.custodyServiceName, cs.fee, cs.paymentFrequency, 
             curr.isocode3 as currencyCode, cs.maxWeight, cs.createdAt, cs.updatedAt,
             c.custodianName as custodianName
      FROM custodyService cs
      LEFT JOIN currency curr ON cs.currencyId = curr.id
      LEFT JOIN custodian c ON cs.custodianId = c.id
      ${whereClause}
      ORDER BY ${sortColumn === 'custodianName' ? 'c.custodianName' : 'cs.' + sortColumn} ${sortDirection}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    queryParams.push(limit, offset);
    
    const result = await pool.query(dataQuery, queryParams);
    
    // Map database results to proper format
    const custodyServicesData = result.rows.map(row => ({
      id: row.id,
      custodianId: row.custodianid,
      custodianName: row.custodianname,
      serviceName: row.custodyservicename,
      fee: parseFloat(row.fee),
      paymentFrequency: row.paymentfrequency,
      currency: row.currencycode || 'USD',
      maxWeight: row.maxweight ? parseFloat(row.maxweight) : null,
      createdAt: row.createdat ? row.createdat.toISOString() : new Date().toISOString(),
      updatedAt: row.updatedat ? row.updatedat.toISOString() : new Date().toISOString()
    }));
    
    // Format response with pagination
    const response = {
      success: true,
      data: {
        custodyServices: custodyServicesData,
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        }
      },
      message: `Retrieved ${custodyServicesData.length} custody services`
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error fetching custody services:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch custody services", 
      details: (error as Error).message 
    });
  }
});

// POST create new custody service with comprehensive validation
router.post("/custodyServices", async (req: Request, res: Response) => {
  try {
    // Parse and validate query parameters
    const queryValidation = CustodyServicesQuerySchema.safeParse(req.query);
    
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: queryValidation.error.issues
      });
    }
    
    const { page, limit, search, custodianId, minFee, maxFee, paymentFrequency, currency, isActive, sortBy, sortOrder } = queryValidation.data;
    
    // Build dynamic query with filtering and pagination
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      whereConditions.push(`cs.custodyServiceName ILIKE $${paramIndex++}`);
      queryParams.push(`%${search}%`);
    }
    
    if (custodianId) {
      whereConditions.push(`cs.custodianId = $${paramIndex++}`);
      queryParams.push(custodianId);
    }
    
    if (minFee !== undefined) {
      whereConditions.push(`cs.fee >= $${paramIndex++}`);
      queryParams.push(minFee);
    }
    
    if (maxFee !== undefined) {
      whereConditions.push(`cs.fee <= $${paramIndex++}`);
      queryParams.push(maxFee);
    }
    
    if (paymentFrequency) {
      whereConditions.push(`cs.paymentFrequency = $${paramIndex++}`);
      queryParams.push(paymentFrequency);
    }
    
    if (currency) {
      whereConditions.push(`c.isocode3 = $${paramIndex++}`);
      queryParams.push(currency);
    }
    
    if (isActive !== undefined) {
      whereConditions.push(`cs.isActive = $${paramIndex++}`);
      queryParams.push(isActive);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validate and construct ORDER BY clause
    const validSortColumns = ['custodyServiceName', 'fee', 'custodianName', 'createdAt'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'custodyServiceName';
    const sortDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) 
      FROM custodyService cs
      LEFT JOIN currency c ON cs.currencyId = c.id
      LEFT JOIN custodian cust ON cs.custodianId = cust.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get paginated results with enhanced data
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT cs.id, cs.custodianId, cs.custodyServiceName, cs.fee, cs.paymentFrequency, 
             c.isocode3 as currency, cs.maxWeight, cs.createdAt, cs.updatedAt,
             cust.custodianName as custodianName
      FROM custodyService cs
      LEFT JOIN currency c ON cs.currencyId = c.id
      LEFT JOIN custodian cust ON cs.custodianId = cust.id
      ${whereClause}
      ORDER BY ${sortColumn === 'custodianName' ? 'cust.custodianName' : 'cs.' + sortColumn} ${sortDirection}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    queryParams.push(limit, offset);
    
    const result = await pool.query(dataQuery, queryParams);
    const custodyServicesData = result.rows.map(row => ({
      id: row.id,
      custodianId: row.custodianid,
      custodianName: row.custodianname,
      serviceName: row.custodyservicename,
      fee: parseFloat(row.fee),
      paymentFrequency: row.paymentfrequency,
      currency: row.currency,
      maxWeight: row.maxweight ? parseFloat(row.maxweight) : null,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    }));
    
    // Format response with pagination
    const response = {
      success: true,
      data: {
        custodyServices: custodyServicesData,
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        }
      },
      message: `Retrieved ${custodyServicesData.length} custody services`
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error fetching custody services:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch custody services", 
      details: (error as Error).message 
    });
  }
});

// POST create new custody service with comprehensive validation
router.post("/custodyServices", async (req: Request, res: Response) => {
  try {
    // Validate request body using shared schema
    const validationResult = CreateExtendedCustodyServiceRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid custody service data",
        details: validationResult.error.issues
      });
    }
    
    const custodyServiceData = validationResult.data;
    
    // Validate that custodian exists
    const custodianCheck = await pool.query("SELECT id FROM custodian WHERE id = $1", [custodyServiceData.custodianId]);
    if (custodianCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid custodian ID"
      });
    }
    
    // Get the currency ID from the currency code
    const currencyResult = await pool.query("SELECT id FROM currency WHERE isocode3 = $1", [custodyServiceData.currency]);
    if (currencyResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid currency code"
      });
    }
    const currencyId = currencyResult.rows[0].id;
    
    // Check for duplicate service name for the same custodian
    const duplicateCheck = await pool.query(
      "SELECT id FROM custodyService WHERE custodianId = $1 AND custodyServiceName = $2", 
      [custodyServiceData.custodianId, custodyServiceData.serviceName]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Custody service with this name already exists for this custodian"
      });
    }
    
    // Insert new custody service with comprehensive data
    const result = await pool.query(
      `INSERT INTO custodyService (
        custodianId, custodyServiceName, serviceType, description, fee, 
        paymentFrequency, currencyId, maxWeight, weightUnit, supportedMetals,
        minimumValue, maximumValue, isActive
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`, 
      [
        custodyServiceData.custodianId,
        custodyServiceData.serviceName,
        custodyServiceData.serviceType || null,
        custodyServiceData.description || null,
        custodyServiceData.fee,
        custodyServiceData.paymentFrequency,
        currencyId,
        custodyServiceData.maxWeight || null,
        custodyServiceData.weightUnit || 'grams',
        custodyServiceData.supportedMetals || [],
        custodyServiceData.minimumValue || null,
        custodyServiceData.maximumValue || null,
        custodyServiceData.isActive ?? true
      ]
    );
    
    // Fetch the complete service data with joins
    const serviceResult = await pool.query(`
      SELECT cs.id, cs.custodianId, cs.custodyServiceName, cs.fee, cs.paymentFrequency, 
             c.isocode3 as currency, cs.maxWeight, cs.createdAt, cs.updatedAt,
             cust.custodianName as custodianName
      FROM custodyService cs
      LEFT JOIN currency c ON cs.currencyId = c.id
      LEFT JOIN custodian cust ON cs.custodianId = cust.id
      WHERE cs.id = $1
    `, [result.rows[0].id]);
    
    const custodyServiceResponse = {
      id: serviceResult.rows[0].id,
      custodianId: serviceResult.rows[0].custodianid,
      custodianName: serviceResult.rows[0].custodianname,
      serviceName: serviceResult.rows[0].custodyservicename,
      fee: parseFloat(serviceResult.rows[0].fee),
      paymentFrequency: serviceResult.rows[0].paymentfrequency,
      currency: serviceResult.rows[0].currency,
      maxWeight: serviceResult.rows[0].maxweight ? parseFloat(serviceResult.rows[0].maxweight) : null,
      createdAt: serviceResult.rows[0].createdat,
      updatedAt: serviceResult.rows[0].updatedat
    };
    
    // Format response using shared schema
    const response = {
      success: true,
      data: custodyServiceResponse,
      message: "Custody service created successfully"
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating custody service:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to create custody service", 
      details: (error as Error).message 
    });
  }
});

// PUT update custody service with comprehensive validation
router.put("/custodyServices/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: "Invalid UUID format for custody service ID"
      });
    }
    
    // Validate request body using shared schema
    const validationResult = UpdateExtendedCustodyServiceRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid custody service update data",
        details: validationResult.error.issues
      });
    }
    
    const custodyServiceData = validationResult.data;
    
    // Check if custody service exists
    const existingService = await pool.query("SELECT * FROM custodyService WHERE id = $1", [id]);
    if (existingService.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Custody service not found"
      });
    }
    
    // Validate custodian exists if being updated
    if (custodyServiceData.custodianId && custodyServiceData.custodianId !== existingService.rows[0].custodianid) {
      const custodianCheck = await pool.query("SELECT id FROM custodian WHERE id = $1", [custodyServiceData.custodianId]);
      if (custodianCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid custodian ID"
        });
      }
    }
    
    // Get the currency ID from the currency code if provided
    let currencyId = existingService.rows[0].currencyid;
    if (custodyServiceData.currency) {
      const currencyResult = await pool.query("SELECT id FROM currency WHERE isocode3 = $1", [custodyServiceData.currency]);
      if (currencyResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid currency code"
        });
      }
      currencyId = currencyResult.rows[0].id;
    }
    
    // Check for duplicate service name if being updated
    if (custodyServiceData.serviceName && custodyServiceData.serviceName !== existingService.rows[0].custodyservicename) {
      const targetCustodianId = custodyServiceData.custodianId || existingService.rows[0].custodianid;
      const duplicateCheck = await pool.query(
        "SELECT id FROM custodyService WHERE custodianId = $1 AND custodyServiceName = $2 AND id != $3", 
        [targetCustodianId, custodyServiceData.serviceName, id]
      );
      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: "Custody service with this name already exists for this custodian"
        });
      }
    }
    
    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (custodyServiceData.custodianId !== undefined) {
      updateFields.push(`custodianId = $${paramIndex++}`);
      updateValues.push(custodyServiceData.custodianId);
    }
    if (custodyServiceData.serviceName !== undefined) {
      updateFields.push(`custodyServiceName = $${paramIndex++}`);
      updateValues.push(custodyServiceData.serviceName);
    }
    if (custodyServiceData.serviceType !== undefined) {
      updateFields.push(`serviceType = $${paramIndex++}`);
      updateValues.push(custodyServiceData.serviceType);
    }
    if (custodyServiceData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(custodyServiceData.description);
    }
    if (custodyServiceData.fee !== undefined) {
      updateFields.push(`fee = $${paramIndex++}`);
      updateValues.push(custodyServiceData.fee);
    }
    if (custodyServiceData.paymentFrequency !== undefined) {
      updateFields.push(`paymentFrequency = $${paramIndex++}`);
      updateValues.push(custodyServiceData.paymentFrequency);
    }
    if (custodyServiceData.currency !== undefined) {
      updateFields.push(`currencyId = $${paramIndex++}`);
      updateValues.push(currencyId);
    }
    if (custodyServiceData.maxWeight !== undefined) {
      updateFields.push(`maxWeight = $${paramIndex++}`);
      updateValues.push(custodyServiceData.maxWeight);
    }
    if (custodyServiceData.weightUnit !== undefined) {
      updateFields.push(`weightUnit = $${paramIndex++}`);
      updateValues.push(custodyServiceData.weightUnit);
    }
    if (custodyServiceData.supportedMetals !== undefined) {
      updateFields.push(`supportedMetals = $${paramIndex++}`);
      updateValues.push(custodyServiceData.supportedMetals);
    }
    if (custodyServiceData.minimumValue !== undefined) {
      updateFields.push(`minimumValue = $${paramIndex++}`);
      updateValues.push(custodyServiceData.minimumValue);
    }
    if (custodyServiceData.maximumValue !== undefined) {
      updateFields.push(`maximumValue = $${paramIndex++}`);
      updateValues.push(custodyServiceData.maximumValue);
    }
    if (custodyServiceData.isActive !== undefined) {
      updateFields.push(`isActive = $${paramIndex++}`);
      updateValues.push(custodyServiceData.isActive);
    }
    
    // Always update timestamp
    updateFields.push(`updatedAt = CURRENT_TIMESTAMP`);
    updateValues.push(id);
    
    if (updateFields.length === 1) { // Only timestamp was added
      return res.status(400).json({
        success: false,
        error: "No valid fields to update"
      });
    }
    
    const updateQuery = `UPDATE custodyService SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(updateQuery, updateValues);
    
    // Fetch the complete updated service data with joins
    const serviceResult = await pool.query(`
      SELECT cs.id, cs.custodianId, cs.custodyServiceName, cs.fee, cs.paymentFrequency, 
             c.isocode3 as currency, cs.maxWeight, cs.createdAt, cs.updatedAt,
             cust.custodianName as custodianName
      FROM custodyService cs
      LEFT JOIN currency c ON cs.currencyId = c.id
      LEFT JOIN custodian cust ON cs.custodianId = cust.id
      WHERE cs.id = $1
    `, [id]);
    
    const custodyServiceResponse = {
      id: serviceResult.rows[0].id,
      custodianId: serviceResult.rows[0].custodianid,
      custodianName: serviceResult.rows[0].custodianname,
      serviceName: serviceResult.rows[0].custodyservicename,
      fee: parseFloat(serviceResult.rows[0].fee),
      paymentFrequency: serviceResult.rows[0].paymentfrequency,
      currency: serviceResult.rows[0].currency,
      maxWeight: serviceResult.rows[0].maxweight ? parseFloat(serviceResult.rows[0].maxweight) : null,
      createdAt: serviceResult.rows[0].createdat,
      updatedAt: serviceResult.rows[0].updatedat
    };
    
    // Format response using shared schema
    const response = {
      success: true,
      data: custodyServiceResponse,
      message: "Custody service updated successfully"
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error updating custody service:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update custody service", 
      details: (error as Error).message 
    });
  }
});

// DELETE custody service with referential integrity checks
router.delete("/custodyServices/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", "i").exec(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid UUID format for custody service ID"
      });
    }
    
    // Check if custody service exists
    const existingService = await pool.query("SELECT id, custodyServiceName FROM custodyService WHERE id = $1", [id]);
    if (existingService.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Custody service not found"
      });
    }
    
    // Check for referential integrity - custody assignments
    const assignmentCheck = await pool.query("SELECT COUNT(*) FROM custodyAssignment WHERE custodyServiceId = $1", [id]);
    if (parseInt(assignmentCheck.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        error: "Cannot delete custody service - it has active custody assignments",
        details: `${assignmentCheck.rows[0].count} custody assignments reference this service`
      });
    }
    
    // Perform soft delete by marking as inactive instead of hard delete
    await pool.query("UPDATE custodyService SET isActive = false, updatedAt = CURRENT_TIMESTAMP WHERE id = $1", [id]);
    
    res.json({
      success: true,
      data: { 
        message: "Custody service deactivated successfully",
        serviceName: existingService.rows[0].custodyservicename
      }
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

// GET custody service by ID with comprehensive data
router.get("/custodyServices/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", "i").exec(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid UUID format for custody service ID"
      });
    }
    
    // Fetch custody service with joins for complete data
    const result = await pool.query(`
      SELECT cs.id, cs.custodianId, cs.custodyServiceName, cs.serviceType, cs.description,
             cs.fee, cs.paymentFrequency, c.isocode3 as currency, cs.maxWeight, cs.weightUnit,
             cs.supportedMetals, cs.minimumValue, cs.maximumValue, cs.isActive,
             cs.createdAt, cs.updatedAt, cust.custodianName as custodianName
      FROM custodyService cs
      LEFT JOIN currency c ON cs.currencyId = c.id
      LEFT JOIN custodian cust ON cs.custodianId = cust.id
      WHERE cs.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Custody service not found"
      });
    }
    
    const row = result.rows[0];
    const custodyServiceResponse = {
      id: row.id,
      custodianId: row.custodianid,
      custodianName: row.custodianname,
      serviceName: row.custodyservicename,
      serviceType: row.servicetype,
      description: row.description,
      fee: parseFloat(row.fee),
      paymentFrequency: row.paymentfrequency,
      currency: row.currency,
      maxWeight: row.maxweight ? parseFloat(row.maxweight) : null,
      weightUnit: row.weightunit || 'grams',
      supportedMetals: row.supportedmetals || [],
      minimumValue: row.minimumvalue ? parseFloat(row.minimumvalue) : null,
      maximumValue: row.maximumvalue ? parseFloat(row.maximumvalue) : null,
      isActive: row.isactive,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };
    
    // Format response using shared schema
    const response = {
      success: true,
      data: custodyServiceResponse
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error fetching custody service:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch custody service", 
      details: (error as Error).message 
    });
  }
});

// GET all custodians with their custody services - comprehensive view
router.get("/custodians-with-services", async (req: Request, res: Response) => {
  try {
    // Optional query parameters for filtering
    const { search } = req.query;
    
    // Build dynamic query with optional filtering
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (search && typeof search === 'string') {
      whereConditions.push(`(c.custodianName ILIKE $${paramIndex} OR cs.custodyServiceName ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get all custodians with their services
    const query = `
      SELECT 
        c.id as custodian_id,
        c.custodianName as custodian_name,
        c.createdAt as custodian_created_at,
        c.updatedAt as custodian_updated_at,
        cs.id as service_id,
        cs.custodyServiceName as service_name,
        cs.fee as service_fee,
        cs.paymentFrequency as service_payment_frequency,
        curr.isocode3 as service_currency,
        cs.maxWeight as service_max_weight,
        cs.createdAt as service_created_at,
        cs.updatedAt as service_updated_at
      FROM custodian c
      LEFT JOIN custodyService cs ON c.id = cs.custodianId
      LEFT JOIN currency curr ON cs.currencyId = curr.id
      ${whereClause}
      ORDER BY c.custodianName ASC, cs.custodyServiceName ASC
    `;
    
    const result = await pool.query(query, queryParams);
    
    // Group the results by custodian
    const custodiansMap = new Map();
    
    for (const row of result.rows) {
      const custodianId = row.custodian_id;
      
      if (!custodiansMap.has(custodianId)) {
        custodiansMap.set(custodianId, {
          id: custodianId,
          name: row.custodian_name,
          createdAt: row.custodian_created_at ? row.custodian_created_at.toISOString() : new Date().toISOString(),
          updatedAt: row.custodian_updated_at ? row.custodian_updated_at.toISOString() : new Date().toISOString(),
          services: []
        });
      }
      
      // Add service if it exists (LEFT JOIN might return null services)
      if (row.service_id) {
        custodiansMap.get(custodianId).services.push({
          id: row.service_id,
          serviceName: row.service_name,
          fee: parseFloat(row.service_fee),
          paymentFrequency: row.service_payment_frequency,
          currency: row.service_currency || 'USD',
          maxWeight: row.service_max_weight ? parseFloat(row.service_max_weight) : null,
          createdAt: row.service_created_at ? row.service_created_at.toISOString() : new Date().toISOString(),
          updatedAt: row.service_updated_at ? row.service_updated_at.toISOString() : new Date().toISOString()
        });
      }
    }
    
    // Convert map to array
    const custodiansWithServices = Array.from(custodiansMap.values());
    
    // Calculate summary statistics
    const totalCustodians = custodiansWithServices.length;
    const totalServices = custodiansWithServices.reduce((sum, custodian) => sum + custodian.services.length, 0);
    const custodiansWithServices_count = custodiansWithServices.filter(c => c.services.length > 0).length;
    const custodiansWithoutServices = totalCustodians - custodiansWithServices_count;
    
    const response = {
      success: true,
      data: {
        custodians: custodiansWithServices,
        summary: {
          totalCustodians,
          totalServices,
          custodiansWithServices: custodiansWithServices_count,
          custodiansWithoutServices
        }
      },
      message: `Retrieved ${totalCustodians} custodians with ${totalServices} total services`
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error fetching custodians with services:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch custodians with services", 
      details: (error as Error).message 
    });
  }
});

export default router;