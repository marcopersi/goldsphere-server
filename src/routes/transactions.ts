import { Router, Request, Response } from "express";
import { Transaction } from "@marcopersi/shared";
import pool from "../dbConfig";
import { z } from "zod";



// Transaction query parameters schema
const TransactionQueryParamsSchema = z.object({
  page: z.string().optional().transform(val => Math.max(1, parseInt(val || '1', 10))),
  limit: z.string().optional().transform(val => Math.min(100, Math.max(1, parseInt(val || '50', 10)))),
  type: z.enum(['buy', 'sell']).optional(),
  positionId: z.string().uuid({ message: 'Invalid position ID format' }).optional(),
  dateFrom: z.string().datetime({ message: 'Invalid date format' }).optional(),
  dateTo: z.string().datetime({ message: 'Invalid date format' }).optional(),
  minQuantity: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  maxQuantity: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  minPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  maxPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  sortBy: z.enum(['date', 'quantity', 'price', 'total', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Transaction create request validation schema  
const CreateTransactionRequestSchema = z.object({
  positionId: z.string().uuid({ message: 'Invalid position ID' }),
  type: z.enum(['buy', 'sell'], { message: 'Transaction type is required' }),
  date: z.string().datetime({ message: 'Invalid date format. Expected ISO 8601 datetime' }),
  quantity: z.number().positive({ message: 'Quantity must be positive' }),
  price: z.number().positive({ message: 'Price must be positive' }),
  fees: z.number().min(0, { message: 'Fees cannot be negative' }).default(0),
  notes: z.string().max(500, { message: 'Notes cannot exceed 500 characters' }).optional()
});

// UUID validation schema for path parameters
const UuidPathSchema = z.object({
  id: z.string().uuid({ message: 'Invalid transaction ID format. Expected UUID.' })
});

const router = Router();

// GET /api/transactions - Get transaction history with enhanced filtering and validation
router.get("/transactions", async (req: Request, res: Response): Promise<void> => {
  // Get user ID from authenticated request
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ 
      success: false,
      error: "Authentication required",
      details: "User must be authenticated to access transaction history",
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    // Validate and parse query parameters using comprehensive schema
    const validationResult = TransactionQueryParamsSchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: validationResult.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        timestamp: new Date().toISOString()
      });
      return;
    }

    const {
      page,
      limit,
      type,
      positionId,
      dateFrom,
      dateTo,
      minQuantity,
      maxQuantity,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder
    } = validationResult.data;

    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause based on filters
    const whereConditions = ['t.userId = $1'];
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (type) {
      whereConditions.push(`t.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (positionId) {
      whereConditions.push(`t.positionId = $${paramIndex}`);
      queryParams.push(positionId);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`t.date >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`t.date <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    if (minQuantity !== undefined) {
      whereConditions.push(`t.quantity >= $${paramIndex}`);
      queryParams.push(minQuantity);
      paramIndex++;
    }

    if (maxQuantity !== undefined) {
      whereConditions.push(`t.quantity <= $${paramIndex}`);
      queryParams.push(maxQuantity);
      paramIndex++;
    }

    if (minPrice !== undefined) {
      whereConditions.push(`t.price >= $${paramIndex}`);
      queryParams.push(minPrice);
      paramIndex++;
    }

    if (maxPrice !== undefined) {
      whereConditions.push(`t.price <= $${paramIndex}`);
      queryParams.push(maxPrice);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count with same filters
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      WHERE ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Validate sort column to prevent SQL injection
    const validSortColumns: Record<string, string> = {
      date: 't.date',
      quantity: 't.quantity', 
      price: 't.price',
      total: '(t.quantity * t.price + COALESCE(t.fees, 0))',
      createdAt: 't.createdAt'
    };

    const sortColumn = validSortColumns[sortBy] || 't.date';
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get transactions with enhanced data and pagination
    const query = `
      SELECT 
        t.id,
        t.positionid,
        t.userid, 
        t.type,
        t.date::text,
        t.quantity,
        t.price,
        COALESCE(t.fees, 0) as fees,
        t.notes,
        t.createdAt::text,
        (t.quantity * t.price + COALESCE(t.fees, 0)) AS total,
        p.productid,
        p.purchaseprice,
        pr.name,
        pr.metalid,
        pr.weight as productWeight
      FROM transactions t
      LEFT JOIN position p ON t.positionid = p.id
      LEFT JOIN product pr ON p.productid = pr.id
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${orderDirection}, t.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(query, queryParams);

    // Transform database results to proper transaction format
    const transactions: Transaction[] = result.rows.map(row => ({
      id: row.id,
      positionId: row.positionid,
      userId: row.userid,
      type: row.type,
      date: row.date,
      quantity: parseFloat(row.quantity) || 0,
      price: parseFloat(row.price) || 0,
      fees: parseFloat(row.fees) || 0,
      notes: row.notes,
      createdAt: row.createdat,
      total: parseFloat(row.total) || 0,
      productName: row.name || 'Unknown Product'
    }));

    // Calculate comprehensive pagination metadata
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      offset,
      showing: transactions.length,
      from: total > 0 ? offset + 1 : 0,
      to: offset + transactions.length
    };

    // Calculate summary statistics for the filtered results
    const summary = {
      totalQuantity: transactions.reduce((sum, t) => sum + t.quantity, 0),
      buyTransactions: transactions.filter(t => t.type === 'buy').length,
      sellTransactions: transactions.filter(t => t.type === 'sell').length,
      averagePrice: transactions.length > 0 ? 
        transactions.reduce((sum, t) => sum + t.price, 0) / transactions.length : 0,
      totalFees: transactions.reduce((sum, t) => sum + (t.fees || 0), 0)
    };

    res.json({ 
      success: true,
      data: transactions,
      pagination,
      summary,
      filters: {
        type,
        positionId,
        dateFrom,
        dateTo,
        minQuantity,
        maxQuantity,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch transactions", 
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/transactions - Create transaction with comprehensive validation
router.post("/transactions", async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body against comprehensive schema
    const validationResult = CreateTransactionRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: "Invalid transaction data",
        details: validationResult.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { positionId, type, date, quantity, price, fees = 0, notes } = validationResult.data;

    // Verify position exists and get user ownership
    const positionCheck = await pool.query(
      "SELECT user_id, productid FROM positions WHERE id = $1", 
      [positionId]
    );
    
    if (positionCheck.rows.length === 0) {
      res.status(404).json({ 
        success: false,
        error: "Position not found", 
        details: `No position found with ID: ${positionId}`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const userId = positionCheck.rows[0].user_id;
    const productId = positionCheck.rows[0].productid;

    // Get product information for transaction enrichment
    const productInfo = await pool.query(`
      SELECT 
        p.id,
        p.productname,
        p.price as currentPrice,
        pt.producttypename as type,
        m.name as metal,
        p.fineWeight as weight
      FROM product p
      LEFT JOIN producttype pt ON pt.id = p.producttypeid
      LEFT JOIN metal m ON m.id = p.metalid
      WHERE p.id = $1
    `, [productId]);

    const product = productInfo.rows[0] || {};

    // Calculate transaction total
    const transactionTotal = quantity * price + fees;

    // Additional business rule validations
    if (type === 'sell') {
      // For sell transactions, verify user has enough quantity
      const positionQuantityResult = await pool.query(
        "SELECT quantity FROM positions WHERE id = $1",
        [positionId]
      );
      
      const currentQuantity = parseFloat(positionQuantityResult.rows[0]?.quantity || 0);
      
      if (currentQuantity < quantity) {
        res.status(400).json({
          success: false,
          error: "Insufficient quantity for sale",
          details: `Current position quantity (${currentQuantity}) is less than sale quantity (${quantity})`,
          timestamp: new Date().toISOString()
        });
        return;
      }
    }

    // Insert transaction with comprehensive data
    const query = `
      INSERT INTO transactions (positionId, userId, type, date, quantity, price, fees, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        positionid,
        userid,
        type,
        date::text,
        quantity,
        price,
        fees,
        notes,
        createdat::text
    `;

    const result = await pool.query(query, [
      positionId, 
      userId, 
      type, 
      date, 
      quantity, 
      price, 
      fees, 
      notes
    ]);
    
    const transaction: Transaction = result.rows[0];

    // Enhanced response with product context and summary
    res.status(201).json({
      success: true,
      data: {
        ...transaction,
        total: transactionTotal,
        productInfo: product.productname ? {
          productId: product.id,
          productName: product.productname,
          currentPrice: parseFloat(product.currentprice) || 0,
          type: product.type,
          metal: product.metal,
          weight: parseFloat(product.weight) || 0
        } : undefined,
        summary: {
          transactionValue: transactionTotal,
          feesPercentage: price > 0 ? (fees / (quantity * price)) * 100 : 0,
          priceComparison: product.currentprice ? {
            currentMarketPrice: parseFloat(product.currentprice),
            priceDifference: price - parseFloat(product.currentprice),
            priceChangePercent: parseFloat(product.currentprice) > 0 ? 
              ((price - parseFloat(product.currentprice)) / parseFloat(product.currentprice)) * 100 : 0
          } : undefined
        }
      },
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} transaction created successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Failed to create transaction:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to create transaction", 
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/transactions/:id - Get transaction by ID with comprehensive validation and enrichment
router.get("/transactions/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate UUID format using schema
    const paramValidationResult = UuidPathSchema.safeParse(req.params);
    if (!paramValidationResult.success) {
      res.status(400).json({
        success: false,
        error: "Invalid transaction ID format",
        details: paramValidationResult.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { id } = paramValidationResult.data;

    // Enhanced query with product and position information
    const query = `
      SELECT 
        t.id,
        t.positionid,
        t.userid,
        t.type,
        t.date::text,
        t.quantity,
        t.price,
        COALESCE(t.fees, 0) as fees,
        t.notes,
        t.createdAt::text,
        (t.quantity * t.price + COALESCE(t.fees, 0)) AS total,
        -- Position information
        p.productid,
        p.purchasedate::text as positionPurchaseDate,
        p.purchaseprice as positionPurchasePrice,
        p.quantity as positionQuantity,
        -- Product information
        pr.name,
        pr.price as currentMarketPrice,
        pt.producttypename as productType,
        m.name as metal,
        pr.fineweight as productWeight,
        pr.unitofmeasure,
        pr.purity,
        pr.currency as productCurrency,
        prod.producername as producer
      FROM transactions t
      LEFT JOIN position p ON t.positionid = p.id
      LEFT JOIN product pr ON p.productid = pr.id
      LEFT JOIN producttype pt ON pr.producttypeid = pt.id
      LEFT JOIN metal m ON pr.metalid = m.id  
      LEFT JOIN producer prod ON pr.producerid = prod.id
      WHERE t.id = $1
    `;

    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ 
        success: false,
        error: "Transaction not found", 
        details: `No transaction found with ID: ${id}`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const row = result.rows[0];
    
    // Transform and enrich the transaction data
    const transaction: Transaction = {
      id: row.id,
      positionId: row.positionid,
      userId: row.userid,
      type: row.type,
      date: row.date,
      quantity: parseFloat(row.quantity) || 0,
      price: parseFloat(row.price) || 0,
      fees: parseFloat(row.fees) || 0,
      notes: row.notes,
      createdAt: row.createdat
    };

    // Calculate enhanced metrics
    const transactionTotal = transaction.quantity * transaction.price + transaction.fees;
    const currentMarketValue = (parseFloat(row.currentmarketprice) || 0) * transaction.quantity;
    const positionPurchaseValue = (parseFloat(row.positionpurchaseprice) || 0) * transaction.quantity;

    // Build comprehensive response with enriched data
    const enrichedResponse = {
      ...transaction,
      total: transactionTotal,
      position: row.productid ? {
        productId: row.productid,
        purchaseDate: row.positionpurchasedate,
        purchasePrice: parseFloat(row.positionpurchaseprice) || 0,
        currentQuantity: parseFloat(row.positionquantity) || 0
      } : undefined,
      product: row.productname ? {
        productId: row.productid,
        productName: row.productname,
        type: row.producttype,
        metal: row.metal,
        weight: parseFloat(row.productweight) || 0,
        weightUnit: row.unitofmeasure,
        purity: parseFloat(row.purity) || 0,
        currentMarketPrice: parseFloat(row.currentmarketprice) || 0,
        currency: row.productcurrency,
        producer: row.producer
      } : undefined,
      analysis: {
        transactionValue: transactionTotal,
        feesPercentage: transaction.price > 0 ? (transaction.fees / (transaction.quantity * transaction.price)) * 100 : 0,
        currentMarketValue,
        valueChange: currentMarketValue - transactionTotal,
        valueChangePercent: transactionTotal > 0 ? ((currentMarketValue - transactionTotal) / transactionTotal) * 100 : 0,
        comparedToPosition: positionPurchaseValue > 0 ? {
          positionPurchaseValue,
          transactionPremium: transactionTotal - positionPurchaseValue,
          transactionPremiumPercent: ((transactionTotal - positionPurchaseValue) / positionPurchaseValue) * 100
        } : undefined
      }
    };

    res.json({
      success: true,
      data: enrichedResponse,
      message: "Transaction retrieved successfully",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Failed to fetch transaction:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch transaction", 
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
