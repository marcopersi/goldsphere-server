import { Router, Request, Response } from "express";
import pool from "../dbConfig";
import { 
  PositionSchema,
  PositionCreateRequestSchema,
  PositionUpdateRequestSchema,
  PositionsResponseSchema,
  UuidSchema,
  TimestampSchema
} from "@marcopersi/shared";
import { z } from 'zod';

const router = Router();

// Query schemas for filtering and pagination
const PositionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  portfolioId: z.string().optional().refine(val => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), 'Invalid portfolio ID format'),
  userId: z.string().optional().refine(val => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), 'Invalid user ID format'),
  status: z.enum(['active', 'closed']).optional(),
  productId: z.string().optional().refine(val => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), 'Invalid product ID format'),
  custodyServiceId: z.string().optional().refine(val => !val || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), 'Invalid custody service ID format'),
  sortBy: z.enum(['createdAt', 'updatedAt', 'purchaseDate', 'quantity', 'marketPrice']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

const PositionIdSchema = UuidSchema.transform(id => ({ id }));

// Helper function to map sort fields
const getSortColumn = (sortBy: string): string => {
  const sortMap: Record<string, string> = {
    'createdAt': 'createdat',
    'updatedAt': 'updatedat', 
    'purchaseDate': 'purchasedate',
    'quantity': 'quantity',
    'marketPrice': 'marketprice'
  };
  return sortMap[sortBy] || 'createdat';
};

// Helper function to build WHERE conditions
const buildWhereConditions = (filters: any) => {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const filterFields = [
    { key: 'portfolioid', value: filters.portfolioId },
    { key: 'userid', value: filters.userId },
    { key: 'status', value: filters.status },
    { key: 'productid', value: filters.productId },
    { key: 'custodyserviceid', value: filters.custodyServiceId }
  ];

  filterFields.forEach(field => {
    if (field.value) {
      conditions.push(`${field.key} = $${paramIndex++}`);
      params.push(field.value);
    }
  });

  return { conditions, params, paramIndex };
};

// Helper function to build SQL query with filters
const buildPositionsQuery = (filters: any) => {
  const { conditions, params, paramIndex } = buildWhereConditions(filters);
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortColumn = getSortColumn(filters.sortBy);
  const orderClause = `ORDER BY ${sortColumn} ${filters.sortOrder.toUpperCase()}`;
  const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  
  params.push(filters.limit, (filters.page - 1) * filters.limit);

  return {
    query: `SELECT * FROM position ${whereClause} ${orderClause} ${limitClause}`,
    countQuery: `SELECT COUNT(*) FROM position ${whereClause}`,
    params,
    countParams: params.slice(0, -2)
  };
};

// Helper function for position analytics
const calculatePositionAnalytics = (positions: any[]) => {
  if (positions.length === 0) {
    return {
      totalValue: 0,
      totalUnrealizedPnL: 0,
      totalQuantity: 0,
      activePositions: 0,
      closedPositions: 0,
      averagePurchasePrice: 0,
      averageMarketPrice: 0
    };
  }

  const totalValue = positions.reduce((sum, pos) => sum + (pos.marketPrice * pos.quantity), 0);
  const totalCost = positions.reduce((sum, pos) => sum + (pos.purchasePrice * pos.quantity), 0);
  const totalUnrealizedPnL = totalValue - totalCost;
  const totalQuantity = positions.reduce((sum, pos) => sum + pos.quantity, 0);
  const activePositions = positions.filter(pos => pos.status === 'active').length;
  const closedPositions = positions.filter(pos => pos.status === 'closed').length;
  
  const averagePurchasePrice = totalCost / totalQuantity;
  const averageMarketPrice = totalValue / totalQuantity;

  return {
    totalValue: parseFloat(totalValue.toFixed(2)),
    totalUnrealizedPnL: parseFloat(totalUnrealizedPnL.toFixed(2)),
    totalQuantity: parseFloat(totalQuantity.toFixed(2)),
    activePositions,
    closedPositions,
    averagePurchasePrice: parseFloat(averagePurchasePrice.toFixed(2)),
    averageMarketPrice: parseFloat(averageMarketPrice.toFixed(2))
  };
};

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
  
  // Fetch custody information if custodyServiceId exists
  let custody = null;
  if (row.custodyserviceid) {
    const custodyQuery = `
      SELECT 
        cs.id as custodyServiceId,
        cs.custodyServiceName,
        c.id as custodianId,
        c.custodianName,
        cs.fee,
        cs.paymentFrequency
      FROM custodyService cs
      JOIN custodian c ON cs.custodianId = c.id
      WHERE cs.id = $1
    `;
    const custodyResult = await pool.query(custodyQuery, [row.custodyserviceid]);
    if (custodyResult.rows.length > 0) {
      const custodyRow = custodyResult.rows[0];
      custody = {
        custodyServiceId: custodyRow.custodyserviceid,
        custodyServiceName: custodyRow.custodyservicename,
        custodianId: custodyRow.custodianid,
        custodianName: custodyRow.custodianname,
        fee: parseFloat(custodyRow.fee) || 0,
        paymentFrequency: custodyRow.paymentfrequency
      };
    }
  }
  
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
    custodyServiceId: row.custodyserviceid || null,
    custody: custody,
    status: row.status || 'active',
    notes: row.notes || '',
    createdAt: row.createdat || new Date(),
    updatedAt: row.updatedat || new Date()
  };
};

// GET all positions (global endpoint)
/**
 * @swagger
 * /positions:
 *   get:
 *     summary: Get all positions with advanced filtering and analytics
 *     tags: [Positions]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of positions per page
 *       - in: query
 *         name: portfolioId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by portfolio ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, closed]
 *         description: Filter by position status
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by product ID
 *       - in: query
 *         name: custodyServiceId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by custody service ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, purchaseDate, quantity, marketPrice]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of positions with pagination and analytics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PositionsResponse'
 *                 - type: object
 *                   properties:
 *                     analytics:
 *                       type: object
 *                       properties:
 *                         totalValue:
 *                           type: number
 *                           description: Total market value of positions
 *                         totalUnrealizedPnL:
 *                           type: number
 *                           description: Total unrealized profit/loss
 *                         totalQuantity:
 *                           type: number
 *                           description: Total quantity across all positions
 *                         activePositions:
 *                           type: integer
 *                           description: Number of active positions
 *                         closedPositions:
 *                           type: integer
 *                           description: Number of closed positions
 *                         averagePurchasePrice:
 *                           type: number
 *                           description: Average purchase price per unit
 *                         averageMarketPrice:
 *                           type: number
 *                           description: Average market price per unit
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get("/positions", async (req: Request, res: Response) => {
  try {
    console.log("Positions endpoint called");
    
    // Validate query parameters
    const validatedQuery = PositionsQuerySchema.parse(req.query);
    console.log("Query validation passed:", validatedQuery);

    // Get user from auth context
    const userId = (req as any).user.id;
    
    // Build filters
    const filters = {
      userId,
      portfolioId: validatedQuery.portfolioId,
      productId: validatedQuery.productId,
      status: validatedQuery.status,
      custodyServiceId: validatedQuery.custodyServiceId,
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      sortBy: validatedQuery.sortBy || 'createdAt',
      sortOrder: validatedQuery.sortOrder || 'desc'
    };

    // Get query and execute
    const { query, countQuery, params, countParams } = buildPositionsQuery(filters);
    
    const [positionsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / filters.limit);
    
    // Transform positions data
    const positions = positionsResult.rows.map((row: any) => ({
      id: row.id,
      userId: row.userid,
      portfolioId: row.portfolioid,
      productId: row.productid,
      purchaseDate: row.purchasedate,
      purchasePrice: Number(row.purchaseprice),
      marketPrice: Number(row.marketprice),
      quantity: Number(row.quantity),
      custodyServiceId: row.custodyserviceid,
      status: row.status,
      closedDate: row.closeddate,
      notes: row.notes,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    }));

    // Calculate analytics
    const analytics = calculatePositionAnalytics(positions);
    
    res.json({
      positions,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
        hasNext: filters.page < totalPages,
        hasPrevious: filters.page > 1
      },
      analytics
    });
  } catch (error) {
    console.error("Error in positions endpoint:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: "Invalid query parameters", 
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    } else {
      res.status(500).json({
        error: "Failed to fetch positions",
        details: (error as Error).message
      });
    }
  }
});// GET all positions (alternative global endpoint)
/**
 * @swagger
 * /global/positions:
 *   get:
 *     summary: Get all positions globally with advanced filtering and analytics
 *     tags: [Positions]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of positions per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, closed]
 *         description: Filter by position status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, purchaseDate, quantity, marketPrice]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Global list of positions with pagination and analytics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PositionsResponse'
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get("/global/positions", async (req: Request, res: Response) => {
  try {
    // Validate query parameters (excluding user/portfolio specific filters for global view)
    const globalQuery = PositionsQuerySchema.omit({ portfolioId: true, userId: true, productId: true, custodyServiceId: true }).parse(req.query);
    
    // Build and execute the query
    const { query, countQuery, params, countParams } = buildPositionsQuery(globalQuery);
    
    // Get total count and positions in parallel
    const [countResult, positionsResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(query, params)
    ]);

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / globalQuery.limit);

    // Convert each row to a proper Position object with full product data
    const positions = await Promise.all(
      positionsResult.rows.map(row => mapDatabaseRowToPosition(row))
    );

    // Calculate analytics
    const analytics = calculatePositionAnalytics(positions);

    // Build pagination
    const pagination = {
      page: globalQuery.page,
      limit: globalQuery.limit,
      total: totalCount,
      totalPages,
      hasNext: globalQuery.page < totalPages,
      hasPrevious: globalQuery.page > 1
    };

    // Validate response
    const response = PositionsResponseSchema.parse({
      positions,
      pagination
    });

    // Add analytics to response (not part of schema validation)
    res.json({
      ...response,
      analytics
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: "Invalid query parameters", 
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    } else {
      console.error("Error fetching global positions:", error);
      res.status(500).json({ 
        error: "Failed to fetch global positions", 
        details: (error as Error).message 
      });
    }
  }
});

/**
 * @swagger
 * /portfolios/{portfolioId}/positions:
 *   get:
 *     summary: Get positions by portfolio with advanced filtering and analytics
 *     tags: [Positions]
 *     parameters:
 *       - in: path
 *         name: portfolioId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Portfolio identifier
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of positions per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, closed]
 *         description: Filter by position status
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by product ID
 *       - in: query
 *         name: custodyServiceId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by custody service ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, purchaseDate, quantity, marketPrice]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of positions for the specified portfolio with custody information and analytics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PositionsResponse'
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.get("/portfolios/:portfolioId/positions", async (req: Request, res: Response) => {
  try {
    // Validate portfolio ID
    const { id: portfolioId } = PositionIdSchema.parse(req.params.portfolioId);
    
    // Validate query parameters and add portfolioId filter
    const validatedQuery = PositionsQuerySchema.parse({
      ...req.query,
      portfolioId
    });
    
    // Build and execute the query
    const { query, countQuery, params, countParams } = buildPositionsQuery(validatedQuery);
    
    // Get total count and positions in parallel
    const [countResult, positionsResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(query, params)
    ]);

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / validatedQuery.limit);

    // Convert each row to a proper Position object with full product data
    const positions = await Promise.all(
      positionsResult.rows.map(row => mapDatabaseRowToPosition(row))
    );

    // Calculate analytics
    const analytics = calculatePositionAnalytics(positions);

    // Build pagination
    const pagination = {
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      total: totalCount,
      totalPages,
      hasNext: validatedQuery.page < totalPages,
      hasPrevious: validatedQuery.page > 1
    };

    // Validate response
    const response = PositionsResponseSchema.parse({
      positions,
      pagination
    });

    // Add analytics to response (not part of schema validation)
    res.json({
      ...response,
      analytics
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: "Invalid parameters", 
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    } else {
      console.error("Error fetching portfolio positions:", error);
      res.status(500).json({ 
        error: "Failed to fetch portfolio positions", 
        details: (error as Error).message 
      });
    }
  }
});

/**
 * @swagger
 * /positions:
 *   post:
 *     summary: Create a new position with comprehensive validation
 *     tags: [Positions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/PositionCreateRequest'
 *               - type: object
 *                 required:
 *                   - userId
 *                   - portfolioId
 *                   - custodyServiceId
 *                 properties:
 *                   userId:
 *                     type: string
 *                     format: uuid
 *                     description: User identifier
 *                   portfolioId:
 *                     type: string
 *                     format: uuid
 *                     description: Portfolio identifier
 *                   marketPrice:
 *                     type: number
 *                     minimum: 0
 *                     description: Current market price per unit (optional, defaults to purchase price)
 *                   custodyServiceId:
 *                     type: string
 *                     format: uuid
 *                     description: Custody service for storing this position
 *                   purchaseDate:
 *                     type: string
 *                     format: date-time
 *                     description: Purchase date (optional, defaults to current time)
 *     responses:
 *       201:
 *         description: Position created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Position'
 *       400:
 *         description: Bad request - validation error
 *       500:
 *         description: Internal server error
 */
router.post("/positions", async (req: Request, res: Response) => {
  try {
    // Validate the core position fields
    const validatedRequest = PositionCreateRequestSchema.parse(req.body);
    
    // Validate additional required fields
    const additionalFieldsSchema = z.object({
      userId: UuidSchema,
      portfolioId: UuidSchema,
      marketPrice: z.number().positive().optional(),
      custodyServiceId: UuidSchema,
      purchaseDate: TimestampSchema.optional()
    });
    
    const { userId, portfolioId, marketPrice, custodyServiceId, purchaseDate } = additionalFieldsSchema.parse(req.body);
    
    // Set default values
    const finalPurchaseDate = purchaseDate ? new Date(purchaseDate.toString()) : new Date();
    const finalMarketPrice = marketPrice || validatedRequest.purchasePrice;
    const now = new Date();

    // Insert position
    const result = await pool.query(
      `INSERT INTO position (
        userId, portfolioId, productId, purchaseDate, purchasePrice, marketPrice, 
        quantity, custodyServiceId, status, notes, 
        createdat, updatedat
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`, 
      [
        userId, 
        portfolioId, 
        validatedRequest.productId, 
        finalPurchaseDate, 
        validatedRequest.purchasePrice, 
        finalMarketPrice,
        validatedRequest.quantity, 
        custodyServiceId,
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
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    } else {
      console.error("Error adding position:", error);
      res.status(500).json({ 
        error: "Failed to add position", 
        details: (error as Error).message 
      });
    }
  }
});

/**
 * @swagger
 * /positions/{id}:
 *   put:
 *     summary: Update an existing position with comprehensive validation
 *     tags: [Positions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Position identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PositionUpdateRequest'
 *     responses:
 *       200:
 *         description: Position updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Position'
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: Position not found
 *       500:
 *         description: Internal server error
 */
router.put("/positions/:id", async (req: Request, res: Response) => {
  try {
    // Validate position ID
    const { id } = PositionIdSchema.parse(req.params.id);
    
    // Validate the request body
    const validatedRequest = PositionUpdateRequestSchema.parse(req.body);
    
    // Get the current position first
    const currentResult = await pool.query("SELECT * FROM position WHERE id = $1", [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "Position not found" });
    }
    
    const now = new Date();

    // Update only the fields that are allowed to be updated
    const result = await pool.query(
      `UPDATE position SET 
        marketPrice = COALESCE($1, marketPrice), 
        quantity = COALESCE($2, quantity), 
        status = COALESCE($3, status), 
        notes = COALESCE($4, notes), 
        updatedat = $5 
      WHERE id = $6 RETURNING *`, 
      [
        validatedRequest.marketPrice,
        validatedRequest.quantity,
        validatedRequest.status,
        validatedRequest.notes,
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
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    } else {
      console.error("Error updating position:", error);
      res.status(500).json({ 
        error: "Failed to update position", 
        details: (error as Error).message 
      });
    }
  }
});

/**
 * @swagger
 * /positions/{id}:
 *   delete:
 *     summary: Delete a position by ID
 *     tags: [Positions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Position identifier
 *     responses:
 *       204:
 *         description: Position deleted successfully
 *       400:
 *         description: Invalid position ID
 *       404:
 *         description: Position not found
 *       500:
 *         description: Internal server error
 */
router.delete("/positions/:id", async (req: Request, res: Response) => {
  try {
    // Validate position ID
    const { id } = PositionIdSchema.parse(req.params.id);
    
    const result = await pool.query("DELETE FROM position WHERE id = $1 RETURNING id", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Position not found" });
    }
    
    res.status(204).send();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: "Invalid position ID", 
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    } else {
      console.error("Error deleting position:", error);
      res.status(500).json({ 
        error: "Failed to delete position", 
        details: (error as Error).message 
      });
    }
  }
});

/**
 * @swagger
 * /positions/{id}:
 *   get:
 *     summary: Get position by ID with comprehensive validation
 *     tags: [Positions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Position identifier
 *     responses:
 *       200:
 *         description: Position details with custody information and product data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Position'
 *       400:
 *         description: Invalid position ID
 *       404:
 *         description: Position not found
 *       500:
 *         description: Internal server error
 */
router.get("/positions/:id", async (req: Request, res: Response) => {
  try {
    // Validate position ID
    const { id } = PositionIdSchema.parse(req.params.id);
    
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
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: "Invalid position ID", 
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    } else {
      console.error("Error fetching position:", error);
      res.status(500).json({ 
        error: "Failed to fetch position", 
        details: (error as Error).message 
      });
    }
  }
});

export default router;