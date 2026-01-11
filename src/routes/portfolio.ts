/**
 * Portfolio Management API Routes
 * Enhanced with comprehensive @marcopersi/shared package integration
 * 
 * Features:
 * - Portfolio CRUD with comprehensive validation
 * - Position aggregation and metal breakdown
 * - Performance metrics and gain/loss analysis
 * - Advanced filtering, sorting, and pagination
 */

import { Router, Request, Response } from "express";
import { getPool } from "../dbConfig";
import { v4 as uuidv4 } from 'uuid';
import { 
  PortfolioSummarySchema,
  UuidSchema,
  TimestampSchema
} from "@marcopersi/shared";
import { z } from 'zod';
import { PortfolioServiceFactory } from '../services/portfolio';

const router = Router();

// Initialize Portfolio service with factory
// Lazy service creation - gets current pool for testing
function getPortfolioService() {
  return PortfolioServiceFactory.create(getPool());
}

// =============================================================================
// LOCAL PORTFOLIO SCHEMAS (using shared package patterns)
// =============================================================================

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

// String transformation helpers
const stringToNumber = z.string().optional().transform(val => {
  if (!val) return undefined;
  const num = Number.parseInt(val, 10);
  return Number.isNaN(num) ? undefined : num;
});

const stringToFloat = z.string().optional().transform(val => {
  if (!val) return undefined;
  const num = Number.parseFloat(val);
  return Number.isNaN(num) ? undefined : num;
});

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
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  updatedAfter: z.string().optional(),
  updatedBefore: z.string().optional(),
  metal: z.enum(['gold', 'silver', 'platinum', 'palladium']).optional(),
  sortBy: z.enum(['portfolioName', 'totalValue', 'totalGainLoss', 'positionCount', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Type exports
type Portfolio = z.infer<typeof PortfolioSchema>;

// =============================================================================
// PORTFOLIO ANALYTICS HELPERS
// =============================================================================

// Calculate metal breakdown for a portfolio
const calculateMetalBreakdown = async (portfolioId: string) => {
  const query = `
    SELECT 
      m.metalname as metal,
      SUM(pos.quantity) as total_quantity,
      SUM(pos.quantity * pos.purchaseprice) as total_cost,
      SUM(pos.quantity * pos.marketprice) as total_value,
      COUNT(pos.id) as position_count
    FROM public.position pos
    JOIN public.product p ON pos.productid = p.id
    JOIN public.metal m ON p.metalid = m.id
    WHERE pos.portfolioid = $1
    GROUP BY m.metalname
  `;
  
  const result = await getPool().query(query, [portfolioId]);
  
  const breakdown = {
    gold: { value: 0, cost: 0, quantity: 0, gainLoss: 0, gainLossPercentage: 0, positionCount: 0 },
    silver: { value: 0, cost: 0, quantity: 0, gainLoss: 0, gainLossPercentage: 0, positionCount: 0 },
    platinum: { value: 0, cost: 0, quantity: 0, gainLoss: 0, gainLossPercentage: 0, positionCount: 0 },
    palladium: { value: 0, cost: 0, quantity: 0, gainLoss: 0, gainLossPercentage: 0, positionCount: 0 }
  };
  
  result.rows.forEach((row: any) => {
    const metal = row.metal.toLowerCase() as keyof typeof breakdown;
    if (breakdown[metal]) {
      const cost = Number.parseFloat(row.total_cost) || 0;
      const value = Number.parseFloat(row.total_value) || 0;
      const gainLoss = value - cost;
      
      breakdown[metal] = {
        value,
        cost,
        quantity: Number.parseFloat(row.total_quantity) || 0,
        gainLoss,
        gainLossPercentage: cost > 0 ? (gainLoss / cost) * 100 : 0,
        positionCount: Number.parseInt(row.position_count) || 0
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
        WHERE pos.portfolioid = p.id AND LOWER(m.metalname) = LOWER($${paramCount})
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

    const countResult = await getPool().query(countQuery, values);
    const total = Number.parseInt(countResult.rows[0].total);

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

    const dataResult = await getPool().query(dataQuery, values);

    const portfolios: Portfolio[] = dataResult.rows.map((row: any) => ({
      id: row.id,
      portfolioName: row.portfolioname,
      ownerId: row.ownerid,
      description: row.description,
      isActive: row.isactive,
      totalValue: Number.parseFloat(row.total_value) || 0,
      totalCost: Number.parseFloat(row.total_cost) || 0,
      totalGainLoss: Number.parseFloat(row.total_gain_loss) || 0,
      totalGainLossPercentage: Number.parseFloat(row.total_gain_loss_percentage) || 0,
      positionCount: Number.parseInt(row.position_count) || 0,
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
 * GET /portfolios/my - Get current user's portfolios
 */
router.get('/portfolios/my', async (req: Request, res: Response) => {
    try {
      // Extract user info from JWT token
      const authenticatedUser = (req as any).user;
    
      if (!authenticatedUser) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated"
        });
      }

      const userId = authenticatedUser.id;

      // Fetch user's portfolios from database
      const portfolioResult = await getPool().query(
        'SELECT * FROM portfolio WHERE ownerid = $1 ORDER BY createdat DESC',
        [userId]
      );

      // For each portfolio, fetch its positions
      const portfoliosWithPositions = await Promise.all(
        portfolioResult.rows.map(async (portfolio) => {
          try {
            // Fetch positions for this portfolio
            const positionsResult = await getPool().query(`
              SELECT p.*, 
                     cs.id as custody_service_id,
                     cs.custodyservicename as custody_service_name,
                     cs.fee as custody_service_fee,
                     cs.paymentfrequency as custody_payment_frequency,
                     c.isocode3 as custody_currency
              FROM position p
              LEFT JOIN custodyservice cs ON p.custodyserviceid = cs.id
              LEFT JOIN currency c ON cs.currencyid = c.id
              WHERE p.portfolioid = $1 
              ORDER BY p.createdat DESC
            `, [portfolio.id]);
            
            // Map positions using the same logic from position.ts
            const positions = await Promise.all(
              positionsResult.rows.map(async (row) => {
                // Fetch product information for each position
                const productResult = await getPool().query(`
                  SELECT p.*, pt.productTypeName as type, m.name as metal,
                         c.countryName as country, pr.producerName as producer
                  FROM product p
                  LEFT JOIN productType pt ON p.productTypeId = pt.id
                  LEFT JOIN metal m ON p.metalId = m.id
                  LEFT JOIN country c ON p.countryId = c.id
                  LEFT JOIN producer pr ON p.producerId = pr.id
                  WHERE p.id = $1
                `, [row.productid]);

                const product = productResult.rows.length > 0 ? {
                  id: productResult.rows[0].id,
                  name: productResult.rows[0].name,
                  type: productResult.rows[0].type,
                  metal: productResult.rows[0].metal,
                  weight: Number.parseFloat(productResult.rows[0].weight),
                  weightUnit: productResult.rows[0].weightunit,
                  purity: Number.parseFloat(productResult.rows[0].purity),
                  price: Number.parseFloat(productResult.rows[0].price),
                  currency: productResult.rows[0].currency,
                  producer: productResult.rows[0].producer,
                  country: productResult.rows[0].country,
                  year: productResult.rows[0].year || new Date().getFullYear(),
                  description: productResult.rows[0].description || '',
                  imageUrl: productResult.rows[0].imagefilename 
                    ? `/api/products/${productResult.rows[0].id}/image` 
                    : null,
                  inStock: productResult.rows[0].instock || false,
                  minimumOrderQuantity: productResult.rows[0].minimumorderquantity,
                  createdAt: productResult.rows[0].createdat,
                  updatedAt: productResult.rows[0].updatedat
                } : null;

                return {
                  id: row.id,
                  userId: row.userid,
                  productId: row.productid,
                  portfolioId: row.portfolioid,
                  product: product,
                  purchaseDate: row.purchasedate || new Date(),
                  purchasePrice: Number.parseFloat(row.purchaseprice),
                  marketPrice: Number.parseFloat(row.marketprice),
                  quantity: Number.parseFloat(row.quantity),
                  custodyServiceId: row.custodyserviceid || null,
                  custody: row.custody_service_id ? {
                    id: row.custody_service_id,
                    name: row.custody_service_name,
                    fee: Number.parseFloat(row.custody_service_fee),
                    paymentFrequency: row.custody_payment_frequency,
                    currency: row.custody_currency 
                  } : null,
                  status: row.status,
                  notes: row.notes || '',
                  createdAt: row.createdat || new Date(),
                  updatedAt: row.updatedat || new Date()
                };
              })
            );

            // Calculate portfolio summary
            const totalValue = positions.reduce((sum, pos) => sum + (pos.marketPrice * pos.quantity), 0);
            const totalCost = positions.reduce((sum, pos) => sum + (pos.purchasePrice * pos.quantity), 0);
            const totalGainLoss = totalValue - totalCost;
            const totalGainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

            return {
              id: portfolio.id,
              portfolioName: portfolio.portfolioname,
              ownerId: portfolio.ownerid,
              description: portfolio.description || '',
              totalValue,
              totalCost,
              totalGainLoss,
              totalGainLossPercentage,
              positionCount: positions.length,
              positions,
              createdAt: portfolio.createdat,
              updatedAt: portfolio.updatedat
            };
          } catch (positionError) {
            console.error(`Error fetching positions for portfolio ${portfolio.id}:`, positionError);
            // Return portfolio without positions if there's an error
            return {
              id: portfolio.id,
              portfolioName: portfolio.portfolioname,
              ownerId: portfolio.ownerid,
              description: portfolio.description || '',
              totalValue: 0,
              totalCost: 0,
              totalGainLoss: 0,
              totalGainLossPercentage: 0,
              positionCount: 0,
              positions: [],
              createdAt: portfolio.createdat,
              updatedAt: portfolio.updatedat
            };
          }
        })
      );

      res.json({
        success: true,
        data: portfoliosWithPositions,
        message: 'User portfolios with positions retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching user portfolios:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user portfolios',
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

    const portfolioResult = await getPool().query(portfolioQuery, [id]);

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
      totalValue: Number.parseFloat(row.total_value) || 0,
      totalCost: Number.parseFloat(row.total_cost) || 0,
      totalGainLoss: Number.parseFloat(row.total_gain_loss) || 0,
      totalGainLossPercentage: Number.parseFloat(row.total_gain_loss_percentage) || 0,
      positionCount: Number.parseInt(row.position_count) || 0,
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
    const portfolioExistsResult = await getPool().query(portfolioExistsQuery, [id]);
    
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

    const portfolioResult = await getPool().query(portfolioQuery, [id]);
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
    const userExistsResult = await getPool().query(userExistsQuery, [ownerId]);
    
    if (userExistsResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Owner user does not exist'
      });
    }

    // Check if user already has a portfolio with this name
    const existingPortfolioQuery = 'SELECT id FROM public.portfolio WHERE ownerid = $1 AND portfolioname = $2';
    const existingPortfolioResult = await getPool().query(existingPortfolioQuery, [ownerId, portfolioName]);
    
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

    const insertResult = await getPool().query(insertQuery, [
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
    const portfolioExistsResult = await getPool().query(portfolioExistsQuery, [id]);
    
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
      const duplicateResult = await getPool().query(duplicateQuery, [ownerId, updates.portfolioName, id]);
      
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

    const updateResult = await getPool().query(updateQuery, values);
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

    const analyticsResult = await getPool().query(analyticsQuery, [id]);
    const analytics = analyticsResult.rows[0] || { total_value: 0, total_cost: 0, position_count: 0 };

    const totalValue = Number.parseFloat(analytics.total_value) || 0;
    const totalCost = Number.parseFloat(analytics.total_cost) || 0;
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
      positionCount: Number.parseInt(analytics.position_count) || 0,
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

    const portfolioResult = await getPool().query(portfolioQuery, [id]);
    
    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found'
      });
    }

    const portfolio = portfolioResult.rows[0];
    const positionCount = Number.parseInt(portfolio.position_count) || 0;

    // Check if portfolio has positions - prevent deletion if it does
    if (positionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete portfolio with ${positionCount} positions. Please remove all positions first.`
      });
    }

    // Delete portfolio (hard delete since it's empty)
    const deleteQuery = 'DELETE FROM public.portfolio WHERE id = $1';
    await getPool().query(deleteQuery, [id]);

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

// GET portfolio positions
router.get("/portfolios", async (req: Request, res: Response) => {
  try {
    // Simple query to test basic functionality
    const result = await getPool().query("SELECT * FROM portfolio LIMIT 10");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching portfolios:", error);
    res.status(500).json({ error: "Failed to fetch portfolios", details: (error as Error).message });
  }
});

// POST new portfolio
router.post("/portfolios", async (req: Request, res: Response) => {
  const { portfolioName, ownerId } = req.body;
  try {
    const result = await getPool().query("INSERT INTO portfolio (portfolioName, ownerId) VALUES ($1, $2) RETURNING *", [portfolioName, ownerId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding portfolio:", error);
    res.status(500).json({ error: "Failed to add portfolio", details: (error as Error).message });
  }
});

// PUT update portfolio
router.put("/portfolios/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { portfolioName, ownerId } = req.body;
  try {
    const result = await getPool().query("UPDATE portfolio SET portfolioName = $1, ownerId = $2, updatedAt = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *", [portfolioName, ownerId, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating portfolio:", error);
    res.status(500).json({ error: "Failed to update portfolio", details: (error as Error).message });
  }
});

// DELETE portfolio
router.delete("/portfolios/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await getPool().query("DELETE FROM portfolio WHERE id = $1", [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    res.status(500).json({ error: "Failed to delete portfolio", details: (error as Error).message });
  }
});

