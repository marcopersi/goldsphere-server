/**
 * Transactions Controller - tsoa implementation
 */

import {
  Controller,
  Get,
  Post,
  Route,
  Tags,
  Body,
  Path,
  Query,
  Response,
  SuccessResponse,
  Security,
  Request
} from "tsoa";
import { z } from "zod";
import { Transaction } from "@marcopersi/shared";
import { getPool } from "../dbConfig";
import { createLogger } from "../utils/logger";

const logger = createLogger("TransactionsController");

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const TransactionQueryParamsSchema = z.object({
  page: z.string().optional().transform(val => Math.max(1, Number.parseInt(val || "1", 10))),
  limit: z.string().optional().transform(val => Math.min(100, Math.max(1, Number.parseInt(val || "50", 10)))),
  type: z.enum(["buy", "sell"]).optional(),
  positionId: z.string().uuid({ message: "Invalid position ID format" }).optional(),
  dateFrom: z.string().datetime({ message: "Invalid date format" }).optional(),
  dateTo: z.string().datetime({ message: "Invalid date format" }).optional(),
  minQuantity: z.string().optional().transform(val => (val ? Number.parseFloat(val) : undefined)),
  maxQuantity: z.string().optional().transform(val => (val ? Number.parseFloat(val) : undefined)),
  minPrice: z.string().optional().transform(val => (val ? Number.parseFloat(val) : undefined)),
  maxPrice: z.string().optional().transform(val => (val ? Number.parseFloat(val) : undefined)),
  sortBy: z.enum(["date", "quantity", "price", "total", "createdAt"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

const CreateTransactionRequestSchema = z.object({
  positionId: z.string().uuid({ message: "Invalid position ID" }),
  type: z.enum(["buy", "sell"], { message: "Transaction type is required" }),
  date: z.string().datetime({ message: "Invalid date format. Expected ISO 8601 datetime" }),
  quantity: z.number().positive({ message: "Quantity must be positive" }),
  price: z.number().positive({ message: "Price must be positive" }),
  fees: z.number().min(0, { message: "Fees cannot be negative" }).default(0),
  notes: z.string().max(500, { message: "Notes cannot exceed 500 characters" }).optional()
});

const UuidPathSchema = z.object({
  id: z.string().uuid({ message: "Invalid transaction ID format. Expected UUID." })
});

// =============================================================================
// INTERFACES
// =============================================================================

interface TransactionsErrorResponse {
  success: false;
  error: string;
  details?: string;
  timestamp: string;
}

interface TransactionsPaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  offset: number;
  showing: number;
  from: number;
  to: number;
}

interface TransactionsSummary {
  totalQuantity: number;
  buyTransactions: number;
  sellTransactions: number;
  averagePrice: number;
  totalFees: number;
}

interface TransactionItem extends Transaction {
  total: number;
  productName?: string;
}

interface TransactionsListResponse {
  success: true;
  data: TransactionItem[];
  pagination: TransactionsPaginationInfo;
  summary: TransactionsSummary;
  filters: {
    type?: string;
    positionId?: string;
    dateFrom?: string;
    dateTo?: string;
    minQuantity?: number;
    maxQuantity?: number;
    minPrice?: number;
    maxPrice?: number;
    sortBy: string;
    sortOrder: string;
  };
  timestamp: string;
}

interface CreateTransactionRequest {
  positionId: string;
  type: "buy" | "sell";
  date: string;
  quantity: number;
  price: number;
  fees?: number;
  notes?: string;
}

interface ProductInfo {
  productId: string;
  productName: string;
  currentPrice: number;
  type: string;
  metal: string;
  weight: number;
}

interface TransactionCreateResponse {
  success: true;
  data: {
    id: string;
    positionId: string;
    userId: string;
    type: string;
    date: string;
    quantity: number;
    price: number;
    fees: number;
    notes?: string;
    createdAt: string;
    total: number;
    productInfo?: ProductInfo;
    summary: {
      transactionValue: number;
      feesPercentage: number;
      priceComparison?: {
        currentMarketPrice: number;
        priceDifference: number;
        priceChangePercent: number;
      };
    };
  };
  message: string;
  timestamp: string;
}

@Route("transactions")
@Tags("Transactions")
@Security("bearerAuth")
export class TransactionsController extends Controller {
  /**
   * Get transaction history with filtering and pagination
   */
  @Get()
  @SuccessResponse(200, "Transactions retrieved successfully")
  @Response<TransactionsErrorResponse>(400, "Invalid query parameters")
  @Response<TransactionsErrorResponse>(401, "Authentication required")
  @Response<TransactionsErrorResponse>(500, "Internal server error")
  public async getTransactions(
    @Request() request: any,
    @Query() page?: string,
    @Query() limit?: string,
    @Query() type?: "buy" | "sell",
    @Query() positionId?: string,
    @Query() dateFrom?: string,
    @Query() dateTo?: string,
    @Query() minQuantity?: string,
    @Query() maxQuantity?: string,
    @Query() minPrice?: string,
    @Query() maxPrice?: string,
    @Query() sortBy?: string,
    @Query() sortOrder?: string
  ): Promise<TransactionsListResponse | TransactionsErrorResponse> {
    try {
      // Get user ID from authenticated request
      const userId = request.user?.id;
      if (!userId) {
        this.setStatus(401);
        return {
          success: false,
          error: "Authentication required",
          details: "User must be authenticated to access transaction history",
          timestamp: new Date().toISOString()
        };
      }

      // Validate query parameters
      const queryParams = {
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
        sortBy: sortBy || "date",
        sortOrder: sortOrder || "desc"
      };

      const validationResult = TransactionQueryParamsSchema.safeParse(queryParams);
      if (!validationResult.success) {
        this.setStatus(400);
        return {
          success: false,
          error: "Invalid query parameters",
          details: validationResult.error.issues.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", "),
          timestamp: new Date().toISOString()
        };
      }

      const validated = validationResult.data;
      const offset = (validated.page - 1) * validated.limit;

      // Build dynamic WHERE clause
      const whereConditions = ["t.userId = $1"];
      const queryParamsArray: any[] = [userId];
      let paramIndex = 2;

      if (validated.type) {
        whereConditions.push(`t.type = $${paramIndex}`);
        queryParamsArray.push(validated.type);
        paramIndex++;
      }

      if (validated.positionId) {
        whereConditions.push(`t.positionId = $${paramIndex}`);
        queryParamsArray.push(validated.positionId);
        paramIndex++;
      }

      if (validated.dateFrom) {
        whereConditions.push(`t.date >= $${paramIndex}`);
        queryParamsArray.push(validated.dateFrom);
        paramIndex++;
      }

      if (validated.dateTo) {
        whereConditions.push(`t.date <= $${paramIndex}`);
        queryParamsArray.push(validated.dateTo);
        paramIndex++;
      }

      if (validated.minQuantity !== undefined) {
        whereConditions.push(`t.quantity >= $${paramIndex}`);
        queryParamsArray.push(validated.minQuantity);
        paramIndex++;
      }

      if (validated.maxQuantity !== undefined) {
        whereConditions.push(`t.quantity <= $${paramIndex}`);
        queryParamsArray.push(validated.maxQuantity);
        paramIndex++;
      }

      if (validated.minPrice !== undefined) {
        whereConditions.push(`t.price >= $${paramIndex}`);
        queryParamsArray.push(validated.minPrice);
        paramIndex++;
      }

      if (validated.maxPrice !== undefined) {
        whereConditions.push(`t.price <= $${paramIndex}`);
        queryParamsArray.push(validated.maxPrice);
        paramIndex++;
      }

      const whereClause = whereConditions.join(" AND ");

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM transactions t
        WHERE ${whereClause}
      `;
      const countResult = await getPool().query(countQuery, queryParamsArray);
      const total = Number.parseInt(countResult.rows[0].total);

      // Validate sort column
      const validSortColumns: Record<string, string> = {
        date: "t.date",
        quantity: "t.quantity",
        price: "t.price",
        total: "(t.quantity * t.price + COALESCE(t.fees, 0))",
        createdAt: "t.createdAt"
      };

      const sortColumn = validSortColumns[validated.sortBy] || "t.date";
      const orderDirection = validated.sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

      // Get transactions
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

      queryParamsArray.push(validated.limit, offset);
      const result = await getPool().query(query, queryParamsArray);

      // Transform results
      const transactions: TransactionItem[] = result.rows.map((row) => ({
        id: row.id,
        positionId: row.positionid,
        userId: row.userid,
        type: row.type,
        date: row.date,
        quantity: Number.parseFloat(row.quantity) || 0,
        price: Number.parseFloat(row.price) || 0,
        fees: Number.parseFloat(row.fees) || 0,
        notes: row.notes,
        createdAt: row.createdat,
        total: Number.parseFloat(row.total) || 0,
        productName: row.name || "Unknown Product"
      }));

      // Calculate pagination
      const totalPages = Math.ceil(total / validated.limit);
      const pagination: TransactionsPaginationInfo = {
        page: validated.page,
        limit: validated.limit,
        total,
        totalPages,
        hasNext: validated.page < totalPages,
        hasPrev: validated.page > 1,
        offset,
        showing: transactions.length,
        from: total > 0 ? offset + 1 : 0,
        to: offset + transactions.length
      };

      // Calculate summary
      const summary: TransactionsSummary = {
        totalQuantity: transactions.reduce((sum, t) => sum + t.quantity, 0),
        buyTransactions: transactions.filter((t) => t.type === "buy").length,
        sellTransactions: transactions.filter((t) => t.type === "sell").length,
        averagePrice: transactions.length > 0 ? transactions.reduce((sum, t) => sum + t.price, 0) / transactions.length : 0,
        totalFees: transactions.reduce((sum, t) => sum + (t.fees || 0), 0)
      };

      this.setStatus(200);
      return {
        success: true,
        data: transactions,
        pagination,
        summary,
        filters: {
          type: validated.type,
          positionId: validated.positionId,
          dateFrom: validated.dateFrom,
          dateTo: validated.dateTo,
          minQuantity: validated.minQuantity,
          maxQuantity: validated.maxQuantity,
          minPrice: validated.minPrice,
          maxPrice: validated.maxPrice,
          sortBy: validated.sortBy,
          sortOrder: validated.sortOrder
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error("Failed to fetch transactions", error);
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to fetch transactions",
        details: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Create a new transaction
   */
  @Post()
  @SuccessResponse(201, "Transaction created successfully")
  @Response<TransactionsErrorResponse>(400, "Invalid transaction data")
  @Response<TransactionsErrorResponse>(404, "Position not found")
  @Response<TransactionsErrorResponse>(500, "Internal server error")
  public async createTransaction(
    @Body() requestBody: CreateTransactionRequest
  ): Promise<TransactionCreateResponse | TransactionsErrorResponse> {
    try {
      // Validate request body
      const validationResult = CreateTransactionRequestSchema.safeParse(requestBody);
      if (!validationResult.success) {
        this.setStatus(400);
        return {
          success: false,
          error: "Invalid transaction data",
          details: validationResult.error.issues.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", "),
          timestamp: new Date().toISOString()
        };
      }

      const { positionId, type, date, quantity, price, fees = 0, notes } = validationResult.data;

      // Verify position exists
      const positionCheck = await getPool().query("SELECT user_id, productid FROM positions WHERE id = $1", [positionId]);

      if (positionCheck.rows.length === 0) {
        this.setStatus(404);
        return {
          success: false,
          error: "Position not found",
          details: `No position found with ID: ${positionId}`,
          timestamp: new Date().toISOString()
        };
      }

      const userId = positionCheck.rows[0].user_id;
      const productId = positionCheck.rows[0].productid;

      // Get product information
      const productInfo = await getPool().query(
        `
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
      `,
        [productId]
      );

      const product = productInfo.rows[0] || {};

      // Calculate total
      const transactionTotal = quantity * price + fees;

      // Business rule: Check quantity for sell transactions
      if (type === "sell") {
        const positionQuantityResult = await getPool().query("SELECT quantity FROM positions WHERE id = $1", [positionId]);

        const currentQuantity = Number.parseFloat(positionQuantityResult.rows[0]?.quantity || "0");

        if (currentQuantity < quantity) {
          this.setStatus(400);
          return {
            success: false,
            error: "Insufficient quantity for sale",
            details: `Current position quantity (${currentQuantity}) is less than sale quantity (${quantity})`,
            timestamp: new Date().toISOString()
          };
        }
      }

      // Insert transaction
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

      const result = await getPool().query(query, [positionId, userId, type, date, quantity, price, fees, notes]);

      const transaction = result.rows[0];

      this.setStatus(201);
      return {
        success: true,
        data: {
          id: transaction.id,
          positionId: transaction.positionid,
          userId: transaction.userid,
          type: transaction.type,
          date: transaction.date,
          quantity: Number.parseFloat(transaction.quantity) || 0,
          price: Number.parseFloat(transaction.price) || 0,
          fees: Number.parseFloat(transaction.fees) || 0,
          notes: transaction.notes,
          createdAt: transaction.createdat,
          total: transactionTotal,
          productInfo: product.productname
            ? {
                productId: product.id,
                productName: product.productname,
                currentPrice: Number.parseFloat(product.currentprice) || 0,
                type: product.type,
                metal: product.metal,
                weight: Number.parseFloat(product.weight) || 0
              }
            : undefined,
          summary: {
            transactionValue: transactionTotal,
            feesPercentage: price > 0 ? (fees / (quantity * price)) * 100 : 0,
            priceComparison: product.currentprice
              ? {
                  currentMarketPrice: Number.parseFloat(product.currentprice),
                  priceDifference: price - Number.parseFloat(product.currentprice),
                  priceChangePercent:
                    Number.parseFloat(product.currentprice) > 0
                      ? ((price - Number.parseFloat(product.currentprice)) / Number.parseFloat(product.currentprice)) * 100
                      : 0
                }
              : undefined
          }
        },
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} transaction created successfully`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error("Failed to create transaction", error);
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to create transaction",
        details: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get transaction by ID with enriched data
   */
  @Get("{id}")
  @SuccessResponse(200, "Transaction retrieved successfully")
  @Response<TransactionsErrorResponse>(400, "Invalid transaction ID")
  @Response<TransactionsErrorResponse>(404, "Transaction not found")
  @Response<TransactionsErrorResponse>(500, "Internal server error")
  public async getTransaction(@Path() id: string): Promise<any> {
    try {
      // Validate UUID
      const paramValidationResult = UuidPathSchema.safeParse({ id });
      if (!paramValidationResult.success) {
        this.setStatus(400);
        return {
          success: false,
          error: "Invalid transaction ID format",
          details: paramValidationResult.error.issues.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", "),
          timestamp: new Date().toISOString()
        };
      }

      // Enhanced query with joins
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
          p.purchasedate::text as positionPurchaseDate,
          p.purchaseprice as positionPurchasePrice,
          p.quantity as positionQuantity,
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

      const result = await getPool().query(query, [id]);

      if (result.rows.length === 0) {
        this.setStatus(404);
        return {
          success: false,
          error: "Transaction not found",
          details: `No transaction found with ID: ${id}`,
          timestamp: new Date().toISOString()
        };
      }

      const row = result.rows[0];

      // Build enriched response
      const transactionQuantity = Number.parseFloat(row.quantity) || 0;
      const transactionPrice = Number.parseFloat(row.price) || 0;
      const transactionFees = Number.parseFloat(row.fees) || 0;
      const transactionTotal = transactionQuantity * transactionPrice + transactionFees;
      const currentMarketValue = (Number.parseFloat(row.currentmarketprice) || 0) * transactionQuantity;
      const positionPurchaseValue = (Number.parseFloat(row.positionpurchaseprice) || 0) * transactionQuantity;

      const enrichedResponse = {
        id: row.id,
        positionId: row.positionid,
        userId: row.userid,
        type: row.type,
        date: row.date,
        quantity: transactionQuantity,
        price: transactionPrice,
        fees: transactionFees,
        notes: row.notes,
        createdAt: row.createdat,
        total: transactionTotal,
        position: row.productid
          ? {
              productId: row.productid,
              purchaseDate: row.positionpurchasedate,
              purchasePrice: Number.parseFloat(row.positionpurchaseprice) || 0,
              currentQuantity: Number.parseFloat(row.positionquantity) || 0
            }
          : undefined,
        product: row.name
          ? {
              productId: row.productid,
              productName: row.name,
              type: row.producttype,
              metal: row.metal,
              weight: Number.parseFloat(row.productweight) || 0,
              weightUnit: row.unitofmeasure,
              purity: Number.parseFloat(row.purity) || 0,
              currentMarketPrice: Number.parseFloat(row.currentmarketprice) || 0,
              currency: row.productcurrency,
              producer: row.producer
            }
          : undefined,
        analysis: {
          transactionValue: transactionTotal,
          feesPercentage: transactionPrice > 0 ? (transactionFees / (transactionQuantity * transactionPrice)) * 100 : 0,
          currentMarketValue,
          valueChange: currentMarketValue - transactionTotal,
          valueChangePercent: transactionTotal > 0 ? ((currentMarketValue - transactionTotal) / transactionTotal) * 100 : 0,
          comparedToPosition:
            positionPurchaseValue > 0
              ? {
                  positionPurchaseValue,
                  transactionPremium: transactionTotal - positionPurchaseValue,
                  transactionPremiumPercent: ((transactionTotal - positionPurchaseValue) / positionPurchaseValue) * 100
                }
              : undefined
        }
      };

      this.setStatus(200);
      return {
        success: true,
        data: enrichedResponse,
        message: "Transaction retrieved successfully",
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error("Failed to fetch transaction", error);
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to fetch transaction",
        details: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }
}
