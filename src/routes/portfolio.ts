/**
 * Portfolio Management API Routes
 * Enhanced with comprehensive @marcopersi/shared package integration
 * 
 * Features:
 * - Portfolio CRUD with comprehensive validation
 * - Portfolio analytics and summary calculations
 * - Position aggregation and metal breakdown
 * - Performance metrics and gain/loss analysis
 * - Advanced filtering, sorting, and pagination
 */

import { Router, Request, Response } from "express";
import pool from "../dbConfig";
import { v4 as uuidv4 } from 'uuid';
import { 
  z,
  PortfolioSummarySchema,
  // Core validation schemas - using what's available in shared
  // We'll create local schemas following the established patterns
} from "@marcopersi/shared";

// =============================================================================
// LOCAL PORTFOLIO SCHEMAS (following shared package patterns)
// =============================================================================

// Basic UUID validation
const UuidSchema = z.string().uuid('Invalid UUID format');

// ISO timestamp validation  
const TimestampSchema = z.string().datetime('Invalid ISO datetime format');

// Core portfolio schema
const PortfolioSchema = z.object({
  id: UuidSchema,
  portfolioName: z.string().min(1).max(200),
  ownerId: UuidSchema,
  description: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
  totalValue: z.number().min(0).default(0),
  totalCost: z.number().min(0).default(0),
  totalGainLoss: z.number().default(0),
  totalGainLossPercentage: z.number().default(0),
  positionCount: z.number().int().min(0).default(0),
  lastUpdated: TimestampSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

// Portfolio creation request schema
const CreatePortfolioRequestSchema = z.object({
  portfolioName: z.string().min(1, 'Portfolio name is required').max(200, 'Portfolio name too long'),
  ownerId: UuidSchema,
  description: z.string().max(1000, 'Description too long').optional()
});

// Portfolio update request schema
const UpdatePortfolioRequestSchema = z.object({
  portfolioName: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional()
});

// String to number transformer
const stringToNumber = z.string().optional().transform(val => {
  if (!val) return undefined;
  const num = parseInt(val, 10);
  return isNaN(num) ? undefined : num;
});

// String to float transformer
const stringToFloat = z.string().optional().transform(val => {
  if (!val) return undefined;
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
});

// String to boolean transformer
const stringToBoolean = z.string().optional().transform(val => {
  if (val === 'true' || val === '1') return true;
  if (val === 'false' || val === '0') return false;
  return undefined;
});

// Portfolio query parameters schema
const PortfoliosQuerySchema = z.object({
  page: stringToNumber.transform(val => Math.max(1, val || 1)),
  limit: stringToNumber.transform(val => Math.min(100, Math.max(1, val || 20))),
  search: z.string().max(200).optional(),
  ownerId: UuidSchema.optional(),
  isActive: stringToBoolean,
  minValue: stringToFloat.transform(val => val && val >= 0 ? val : undefined),
  maxValue: stringToFloat.transform(val => val && val >= 0 ? val : undefined),
  minPositionCount: stringToNumber.transform(val => val && val >= 0 ? val : undefined),
  maxPositionCount: stringToNumber.transform(val => val && val >= 0 ? val : undefined),
  minGainLoss: stringToFloat,
  maxGainLoss: stringToFloat,
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  updatedAfter: z.string().datetime().optional(),
  updatedBefore: z.string().datetime().optional(),
  metal: z.enum(['gold', 'silver', 'platinum', 'palladium']).optional(),
  sortBy: z.enum(['portfolioName', 'totalValue', 'totalGainLoss', 'positionCount', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Pagination schema
const PaginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrevious: z.boolean()
});

// Response schemas
const PortfolioResponseSchema = z.object({
  success: z.boolean(),
  data: PortfolioSchema,
  message: z.string().optional()
});

const PortfoliosResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    portfolios: z.array(PortfolioSchema),
    pagination: PaginationSchema
  }),
  message: z.string().optional()
});

// Type exports
type Portfolio = z.infer<typeof PortfolioSchema>;
type CreatePortfolioRequest = z.infer<typeof CreatePortfolioRequestSchema>;
type UpdatePortfolioRequest = z.infer<typeof UpdatePortfolioRequestSchema>;
type PortfoliosQuery = z.infer<typeof PortfoliosQuerySchema>;

const router = Router();

// =============================================================================
// PORTFOLIO ANALYTICS HELPERS
// =============================================================================

// Calculate metal breakdown for a portfolio
const calculateMetalBreakdown = async (portfolioId: string) => {
  const query = `
    SELECT 
      m.name as metal,
      SUM(pos.quantity) as total_quantity,
      SUM(pos.quantity * pos.purchaseprice) as total_cost,
      SUM(pos.quantity * pos.marketprice) as total_value,
      COUNT(pos.id) as position_count
    FROM public.position pos
    JOIN public.product p ON pos.productid = p.id
    JOIN public.metal m ON p.metalid = m.id
    WHERE pos.portfolioid = $1
    GROUP BY m.name
  `;
  
  const result = await pool.query(query, [portfolioId]);
  
  const breakdown = {
    gold: { value: 0, cost: 0, quantity: 0, gainLoss: 0, gainLossPercentage: 0, positionCount: 0 },
    silver: { value: 0, cost: 0, quantity: 0, gainLoss: 0, gainLossPercentage: 0, positionCount: 0 },
    platinum: { value: 0, cost: 0, quantity: 0, gainLoss: 0, gainLossPercentage: 0, positionCount: 0 },
    palladium: { value: 0, cost: 0, quantity: 0, gainLoss: 0, gainLossPercentage: 0, positionCount: 0 }
  };
  
  result.rows.forEach((row: any) => {
    const metal = row.metal.toLowerCase() as keyof typeof breakdown;
    if (breakdown[metal]) {
      const cost = parseFloat(row.total_cost) || 0;
      const value = parseFloat(row.total_value) || 0;
      const gainLoss = value - cost;
      
      breakdown[metal] = {
        value,
        cost,
        quantity: parseFloat(row.total_quantity) || 0,
        gainLoss,
        gainLossPercentage: cost > 0 ? (gainLoss / cost) * 100 : 0,
        positionCount: parseInt(row.position_count) || 0
      };
    }
  });
  
  return breakdown;
};

// =============================================================================
// PORTFOLIO CRUD ENDPOINTS
// =============================================================================

/**
 * GET /portfolios - Get portfolios with advanced filtering and analytics
 */
router.get('/portfolios', async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const queryResult = PortfoliosQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: queryResult.error.issues
      });
    }

    const {
      page,
      limit,
      search,
      ownerId,
      isActive,
      minValue,
      maxValue,
      minPositionCount,
      maxPositionCount,
      minGainLoss,
      maxGainLoss,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      metal,
      sortBy,
      sortOrder
    } = queryResult.data;

    // Build WHERE conditions
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      conditions.push(`p.portfolioname ILIKE $${paramCount}`);
      values.push(`%${search}%`);
    }

    if (ownerId) {
      paramCount++;
      conditions.push(`p.ownerid = $${paramCount}`);
      values.push(ownerId);
    }

    if (isActive !== undefined) {
      paramCount++;
      conditions.push(`COALESCE(p.isactive, true) = $${paramCount}`);
      values.push(isActive);
    }

    if (minValue !== undefined) {
      paramCount++;
      conditions.push(`portfolio_stats.total_value >= $${paramCount}`);
      values.push(minValue);
    }

    if (maxValue !== undefined) {
      paramCount++;
      conditions.push(`portfolio_stats.total_value <= $${paramCount}`);
      values.push(maxValue);
    }

    if (minPositionCount !== undefined) {
      paramCount++;
      conditions.push(`portfolio_stats.position_count >= $${paramCount}`);
      values.push(minPositionCount);
    }

    if (maxPositionCount !== undefined) {
      paramCount++;
      conditions.push(`portfolio_stats.position_count <= $${paramCount}`);
      values.push(maxPositionCount);
    }

    if (minGainLoss !== undefined) {
      paramCount++;
      conditions.push(`portfolio_stats.total_gain_loss >= $${paramCount}`);
      values.push(minGainLoss);
    }

    if (maxGainLoss !== undefined) {
      paramCount++;
      conditions.push(`portfolio_stats.total_gain_loss <= $${paramCount}`);
      values.push(maxGainLoss);
    }

    if (createdAfter) {
      paramCount++;
      conditions.push(`p.createdat >= $${paramCount}`);
      values.push(createdAfter);
    }

    if (createdBefore) {
      paramCount++;
      conditions.push(`p.createdat <= $${paramCount}`);
      values.push(createdBefore);
    }

    if (updatedAfter) {
      paramCount++;
      conditions.push(`p.updatedat >= $${paramCount}`);
      values.push(updatedAfter);
    }

    if (updatedBefore) {
      paramCount++;
      conditions.push(`p.updatedat <= $${paramCount}`);
      values.push(updatedBefore);
    }

    if (metal) {
      paramCount++;
      conditions.push(`EXISTS (
        SELECT 1 FROM public.position pos 
        JOIN public.product prod ON pos.productid = prod.id 
        JOIN public.metal m ON prod.metalid = m.id
        WHERE pos.portfolioid = p.id AND LOWER(m.name) = LOWER($${paramCount})
      )`);
      values.push(metal);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    const orderByMap: Record<string, string> = {
      portfolioName: 'p.portfolioname',
      totalValue: 'portfolio_stats.total_value',
      totalGainLoss: 'portfolio_stats.total_gain_loss',
      positionCount: 'portfolio_stats.position_count',
      createdAt: 'p.createdat',
      updatedAt: 'p.updatedat'
    };

    const orderByColumn = orderByMap[sortBy] || 'p.createdat';
    const orderByClause = `ORDER BY ${orderByColumn} ${sortOrder.toUpperCase()}`;

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM public.portfolio p
      LEFT JOIN (
        SELECT 
          pos.portfolioid,
          SUM(pos.quantity * COALESCE(pos.marketprice, pos.purchaseprice, 0)) as total_value,
          SUM(pos.quantity * COALESCE(pos.purchaseprice, 0)) as total_cost,
          COUNT(pos.id) as position_count
        FROM public.position pos
        GROUP BY pos.portfolioid
      ) portfolio_stats ON p.id = portfolio_stats.portfolioid
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Main query with portfolio analytics
    const dataQuery = `
      SELECT 
        p.id,
        p.portfolioname,
        p.ownerid,
        p.description,
        COALESCE(p.isactive, true) as isactive,
        COALESCE(portfolio_stats.total_value, 0) as total_value,
        COALESCE(portfolio_stats.total_cost, 0) as total_cost,
        COALESCE(portfolio_stats.total_value - portfolio_stats.total_cost, 0) as total_gain_loss,
        CASE 
          WHEN portfolio_stats.total_cost > 0 
          THEN ((portfolio_stats.total_value - portfolio_stats.total_cost) / portfolio_stats.total_cost) * 100
          ELSE 0
        END as total_gain_loss_percentage,
        COALESCE(portfolio_stats.position_count, 0) as position_count,
        GREATEST(p.updatedat, COALESCE(portfolio_stats.last_position_update, p.updatedat)) as last_updated,
        p.createdat,
        p.updatedat
      FROM public.portfolio p
      LEFT JOIN (
        SELECT 
          pos.portfolioid,
          SUM(pos.quantity * COALESCE(pos.marketprice, pos.purchaseprice, 0)) as total_value,
          SUM(pos.quantity * COALESCE(pos.purchaseprice, 0)) as total_cost,
          COUNT(pos.id) as position_count,
          MAX(pos.updatedat) as last_position_update
        FROM public.position pos
        GROUP BY pos.portfolioid
      ) portfolio_stats ON p.id = portfolio_stats.portfolioid
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    values.push(limit, offset);

    const dataResult = await pool.query(dataQuery, values);

    const portfolios: Portfolio[] = dataResult.rows.map((row: any) => ({
      id: row.id,
      portfolioName: row.portfolioname,
      ownerId: row.ownerid,
      description: row.description,
      isActive: row.isactive,
      totalValue: parseFloat(row.total_value) || 0,
      totalCost: parseFloat(row.total_cost) || 0,
      totalGainLoss: parseFloat(row.total_gain_loss) || 0,
      totalGainLossPercentage: parseFloat(row.total_gain_loss_percentage) || 0,
      positionCount: parseInt(row.position_count) || 0,
      lastUpdated: row.last_updated,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    }));

    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };

    res.json({
      success: true,
      data: {
        portfolios,
        pagination
      },
      message: `Retrieved ${portfolios.length} portfolios`
    });

  } catch (error) {
    console.error('Error fetching portfolios:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch portfolios',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
});

/**
 * GET /portfolios/:id - Get portfolio by ID with detailed analytics
 */
router.get('/portfolios/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate portfolio ID
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid portfolio ID format'
      });
    }

    // Get portfolio with analytics
    const portfolioQuery = `
      SELECT 
        p.id,
        p.portfolioname,
        p.ownerid,
        p.description,
        COALESCE(p.isactive, true) as isactive,
        COALESCE(portfolio_stats.total_value, 0) as total_value,
        COALESCE(portfolio_stats.total_cost, 0) as total_cost,
        COALESCE(portfolio_stats.total_value - portfolio_stats.total_cost, 0) as total_gain_loss,
        CASE 
          WHEN portfolio_stats.total_cost > 0 
          THEN ((portfolio_stats.total_value - portfolio_stats.total_cost) / portfolio_stats.total_cost) * 100
          ELSE 0
        END as total_gain_loss_percentage,
        COALESCE(portfolio_stats.position_count, 0) as position_count,
        GREATEST(p.updatedat, COALESCE(portfolio_stats.last_position_update, p.updatedat)) as last_updated,
        p.createdat,
        p.updatedat
      FROM public.portfolio p
      LEFT JOIN (
        SELECT 
          pos.portfolioid,
          SUM(pos.quantity * COALESCE(pos.marketprice, pos.purchaseprice, 0)) as total_value,
          SUM(pos.quantity * COALESCE(pos.purchaseprice, 0)) as total_cost,
          COUNT(pos.id) as position_count,
          MAX(pos.updatedat) as last_position_update
        FROM public.position pos
        GROUP BY pos.portfolioid
      ) portfolio_stats ON p.id = portfolio_stats.portfolioid
      WHERE p.id = $1
    `;

    const portfolioResult = await pool.query(portfolioQuery, [id]);

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }

    const row = portfolioResult.rows[0];
    const portfolio: Portfolio = {
      id: row.id,
      portfolioName: row.portfolioname,
      ownerId: row.ownerid,
      description: row.description,
      isActive: row.isactive,
      totalValue: parseFloat(row.total_value) || 0,
      totalCost: parseFloat(row.total_cost) || 0,
      totalGainLoss: parseFloat(row.total_gain_loss) || 0,
      totalGainLossPercentage: parseFloat(row.total_gain_loss_percentage) || 0,
      positionCount: parseInt(row.position_count) || 0,
      lastUpdated: row.last_updated,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };

    res.json({
      success: true,
      data: portfolio,
      message: 'Portfolio retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch portfolio',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
});

/**
 * GET /portfolios/:id/summary - Get comprehensive portfolio summary using shared PortfolioSummarySchema
 */
router.get('/portfolios/:id/summary', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate portfolio ID
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid portfolio ID format'
      });
    }

    // Check if portfolio exists
    const portfolioExistsQuery = 'SELECT id FROM public.portfolio WHERE id = $1';
    const portfolioExistsResult = await pool.query(portfolioExistsQuery, [id]);
    
    if (portfolioExistsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }

    // Get basic portfolio data
    const portfolioQuery = `
      SELECT 
        p.id,
        p.portfolioname,
        p.ownerid,
        p.description,
        COALESCE(p.isactive, true) as isactive,
        p.createdat,
        p.updatedat
      FROM public.portfolio p
      WHERE p.id = $1
    `;

    const portfolioResult = await pool.query(portfolioQuery, [id]);
    const portfolioData = portfolioResult.rows[0];

    // Calculate comprehensive analytics
    const metalBreakdown = await calculateMetalBreakdown(id);

    // Calculate totals from metal breakdown
    const totalValue = Object.values(metalBreakdown).reduce((sum: number, metal: any) => sum + metal.value, 0);
    const totalCost = Object.values(metalBreakdown).reduce((sum: number, metal: any) => sum + metal.cost, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    const positionCount = Object.values(metalBreakdown).reduce((sum: number, metal: any) => sum + metal.positionCount, 0);

    // Build portfolio summary following the shared schema structure
    const portfolioSummary = {
      id: portfolioData.id,
      portfolioName: portfolioData.portfolioname,
      ownerId: portfolioData.ownerid,
      description: portfolioData.description,
      isActive: portfolioData.isactive,
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercentage,
      positionCount,
      metalBreakdown: {
        gold: metalBreakdown.gold,
        silver: metalBreakdown.silver,
        platinum: metalBreakdown.platinum,
        palladium: metalBreakdown.palladium
      },
      lastUpdated: new Date().toISOString(),
      createdAt: portfolioData.createdat,
      updatedAt: portfolioData.updatedat
    };

    // Validate against shared schema
    const validationResult = PortfolioSummarySchema.safeParse(portfolioSummary);
    if (!validationResult.success) {
      console.warn('Portfolio summary validation failed:', validationResult.error);
      // Continue with unvalidated data for now, but log the issue
    }

    res.json({
      success: true,
      data: portfolioSummary,
      message: 'Portfolio summary retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching portfolio summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch portfolio summary',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
});

/**
 * POST /portfolios - Create new portfolio
 */
router.post('/portfolios', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const bodyValidation = CreatePortfolioRequestSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: bodyValidation.error.issues
      });
    }

    const { portfolioName, ownerId, description } = bodyValidation.data;

    // Check if user exists
    const userExistsQuery = 'SELECT id FROM public.users WHERE id = $1';
    const userExistsResult = await pool.query(userExistsQuery, [ownerId]);
    
    if (userExistsResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Owner user does not exist'
      });
    }

    // Check if user already has a portfolio with this name
    const existingPortfolioQuery = 'SELECT id FROM public.portfolio WHERE ownerid = $1 AND portfolioname = $2';
    const existingPortfolioResult = await pool.query(existingPortfolioQuery, [ownerId, portfolioName]);
    
    if (existingPortfolioResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A portfolio with this name already exists for this user'
      });
    }

    // Create portfolio
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const insertQuery = `
      INSERT INTO public.portfolio (
        id, portfolioname, ownerid, description, isactive, createdat, updatedat
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const insertResult = await pool.query(insertQuery, [
      id,
      portfolioName,
      ownerId,
      description,
      true,
      now,
      now
    ]);

    const createdRow = insertResult.rows[0];
    const portfolio: Portfolio = {
      id: createdRow.id,
      portfolioName: createdRow.portfolioname,
      ownerId: createdRow.ownerid,
      description: createdRow.description,
      isActive: createdRow.isactive,
      totalValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
      totalGainLossPercentage: 0,
      positionCount: 0,
      lastUpdated: createdRow.updatedat,
      createdAt: createdRow.createdat,
      updatedAt: createdRow.updatedat
    };

    res.status(201).json({
      success: true,
      data: portfolio,
      message: 'Portfolio created successfully'
    });

  } catch (error) {
    console.error('Error creating portfolio:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create portfolio',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
});

/**
 * PUT /portfolios/:id - Update portfolio
 */
router.put('/portfolios/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate portfolio ID
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid portfolio ID format'
      });
    }

    // Validate request body
    const bodyValidation = UpdatePortfolioRequestSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: bodyValidation.error.issues
      });
    }

    const updates = bodyValidation.data;

    // Check if portfolio exists
    const portfolioExistsQuery = 'SELECT id, ownerid FROM public.portfolio WHERE id = $1';
    const portfolioExistsResult = await pool.query(portfolioExistsQuery, [id]);
    
    if (portfolioExistsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }

    const ownerId = portfolioExistsResult.rows[0].ownerid;

    // If updating portfolio name, check for duplicates
    if (updates.portfolioName) {
      const duplicateQuery = 'SELECT id FROM public.portfolio WHERE ownerid = $1 AND portfolioname = $2 AND id != $3';
      const duplicateResult = await pool.query(duplicateQuery, [ownerId, updates.portfolioName, id]);
      
      if (duplicateResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A portfolio with this name already exists for this user'
        });
      }
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (updates.portfolioName !== undefined) {
      paramCount++;
      updateFields.push(`portfolioname = $${paramCount}`);
      values.push(updates.portfolioName);
    }

    if (updates.description !== undefined) {
      paramCount++;
      updateFields.push(`description = $${paramCount}`);
      values.push(updates.description);
    }

    if (updates.isActive !== undefined) {
      paramCount++;
      updateFields.push(`isactive = $${paramCount}`);
      values.push(updates.isActive);
    }

    // Always update the updatedAt timestamp
    paramCount++;
    updateFields.push(`updatedat = $${paramCount}`);
    values.push(new Date().toISOString());

    // Add portfolio ID for WHERE clause
    paramCount++;
    values.push(id);

    const updateQuery = `
      UPDATE public.portfolio 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const updateResult = await pool.query(updateQuery, values);
    const updatedRow = updateResult.rows[0];

    // Get updated portfolio with analytics
    const analyticsQuery = `
      SELECT 
        COALESCE(portfolio_stats.total_value, 0) as total_value,
        COALESCE(portfolio_stats.total_cost, 0) as total_cost,
        COALESCE(portfolio_stats.position_count, 0) as position_count
      FROM public.portfolio p
      LEFT JOIN (
        SELECT 
          pos.portfolioid,
          SUM(pos.quantity * COALESCE(pos.marketprice, pos.purchaseprice, 0)) as total_value,
          SUM(pos.quantity * COALESCE(pos.purchaseprice, 0)) as total_cost,
          COUNT(pos.id) as position_count
        FROM public.position pos
        GROUP BY pos.portfolioid
      ) portfolio_stats ON p.id = portfolio_stats.portfolioid
      WHERE p.id = $1
    `;

    const analyticsResult = await pool.query(analyticsQuery, [id]);
    const analytics = analyticsResult.rows[0] || { total_value: 0, total_cost: 0, position_count: 0 };

    const totalValue = parseFloat(analytics.total_value) || 0;
    const totalCost = parseFloat(analytics.total_cost) || 0;
    const totalGainLoss = totalValue - totalCost;

    const portfolio: Portfolio = {
      id: updatedRow.id,
      portfolioName: updatedRow.portfolioname,
      ownerId: updatedRow.ownerid,
      description: updatedRow.description,
      isActive: updatedRow.isactive,
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercentage: totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0,
      positionCount: parseInt(analytics.position_count) || 0,
      lastUpdated: updatedRow.updatedat,
      createdAt: updatedRow.createdat,
      updatedAt: updatedRow.updatedat
    };

    res.json({
      success: true,
      data: portfolio,
      message: 'Portfolio updated successfully'
    });

  } catch (error) {
    console.error('Error updating portfolio:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update portfolio',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
});

/**
 * DELETE /portfolios/:id - Delete portfolio (with position check)
 */
router.delete('/portfolios/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate portfolio ID
    const idValidation = UuidSchema.safeParse(id);
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid portfolio ID format'
      });
    }

    // Check if portfolio exists and get position count
    const portfolioQuery = `
      SELECT 
        p.id,
        p.portfolioname,
        COUNT(pos.id) as position_count
      FROM public.portfolio p
      LEFT JOIN public.position pos ON p.id = pos.portfolioid
      WHERE p.id = $1
      GROUP BY p.id, p.portfolioname
    `;

    const portfolioResult = await pool.query(portfolioQuery, [id]);
    
    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }

    const portfolio = portfolioResult.rows[0];
    const positionCount = parseInt(portfolio.position_count) || 0;

    // Check if portfolio has positions - prevent deletion if it does
    if (positionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete portfolio with ${positionCount} positions. Please remove all positions first.`
      });
    }

    // Delete portfolio (hard delete since it's empty)
    const deleteQuery = 'DELETE FROM public.portfolio WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: `Portfolio "${portfolio.portfolioname}" deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting portfolio:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete portfolio',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
});

export default router;