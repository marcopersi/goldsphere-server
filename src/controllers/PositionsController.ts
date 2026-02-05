/**
 * Positions Controller - tsoa implementation
 */

import {
  Controller,
  Get,
  Path,
  Query,
  Response,
  Route,
  SuccessResponse,
  Tags,
  Security
} from "tsoa";
import { getPool } from "../dbConfig";
import { PositionSchema } from "@marcopersi/shared";
import { createLogger } from "../utils/logger";

const logger = createLogger("PositionsController");

// Interfaces for responses
interface PositionsErrorResponse {
  success: false;
  error: string;
  details?: string;
}

interface PositionsPaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PositionsProductInfo {
  id: string;
  name: string;
  type: string;
  metal: string;
  weight: number;
  weightUnit: string;
  purity: number;
  price: number;
  currency: string;
  producer: string;
  country: string | null;
  year?: number;
  description: string;
  imageUrl: string | null;
  inStock: boolean;
  minimumOrderQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PositionsCustodyInfo {
  custodyServiceId: string;
  custodyServiceName: string;
  custodianId: string;
  custodianName: string;
  fee: number;
  paymentFrequency: string;
}

interface PositionDetail {
  id: string;
  userId: string;
  productId: string;
  portfolioId: string;
  product: PositionsProductInfo;
  purchaseDate: Date;
  purchasePrice: number;
  marketPrice: number;
  quantity: number;
  custodyServiceId: string | null;
  custody: PositionsCustodyInfo | null;
  status: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PositionsListResponse {
  positions: PositionDetail[];
  pagination: PositionsPaginationInfo;
  filters?: {
    status: string;
  };
}

// Helper function to fetch full product data for a position
const fetchProductForPosition = async (productId: string): Promise<PositionsProductInfo> => {
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
      country.countryName AS country,
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
    LEFT JOIN country ON country.id = product.countryId
    WHERE product.id = $1
  `;

  const result = await getPool().query(productQuery, [productId]);
  if (result.rows.length === 0) {
    throw new Error(`Product not found: ${productId}`);
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.productname,
    type: row.producttype,
    metal: row.metalname,
    weight: Number.parseFloat(row.fineweight) || 0,
    weightUnit: row.unitofmeasure,
    purity: Number.parseFloat(row.purity) || 0.999,
    price: Number.parseFloat(row.price) || 0,
    currency: row.currency,
    producer: row.producer,
    country: row.country || null,
    year: row.productyear || undefined,
    description: row.description || "",
    imageUrl: row.imageurl ? `/api/products/${row.productid}/image` : null,
    inStock: row.instock ?? true,
    minimumOrderQuantity: row.minimumorderquantity || 1,
    createdAt: row.createdat || new Date(),
    updatedAt: row.updatedat || new Date()
  };
};

// Helper function to convert database row to Position object
const mapDatabaseRowToPosition = async (row: any): Promise<PositionDetail> => {
  const product = await fetchProductForPosition(row.productid);

  // Fetch custody information if custodyServiceId exists
  let custody: PositionsCustodyInfo | null = null;
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
    const custodyResult = await getPool().query(custodyQuery, [row.custodyserviceid]);
    if (custodyResult.rows.length > 0) {
      const custodyRow = custodyResult.rows[0];
      custody = {
        custodyServiceId: custodyRow.custodyserviceid,
        custodyServiceName: custodyRow.custodyservicename,
        custodianId: custodyRow.custodianid,
        custodianName: custodyRow.custodianname,
        fee: Number.parseFloat(custodyRow.fee) || 0,
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
    purchasePrice: Number.parseFloat(row.purchaseprice) || 0,
    marketPrice: Number.parseFloat(row.marketprice) || 0,
    quantity: Number.parseFloat(row.quantity) || 0,
    custodyServiceId: row.custodyserviceid || null,
    custody: custody,
    status: row.status || "active",
    notes: row.notes || "",
    createdAt: row.createdat || new Date(),
    updatedAt: row.updatedat || new Date()
  };
};

@Route("positions")
@Tags("Positions")
@Security("bearerAuth")
export class PositionsController extends Controller {
  /**
   * Get all positions with optional pagination and status filtering
   * @param page Page number (default: 1)
   * @param limit Items per page (default: 20, max: 100)
   * @param status Status filter: 'active' (default), 'closed', or 'all'
   */
  @Get()
  @SuccessResponse(200, "Positions retrieved successfully")
  @Response<PositionsErrorResponse>(400, "Invalid request parameters")
  @Response<PositionsErrorResponse>(500, "Internal server error")
  public async getPositions(
    @Query() page = 1,
    @Query() limit = 20,
    @Query() status = "active"
  ): Promise<PositionsListResponse | PositionsErrorResponse> {
    try {
      // Validate parameters
      const validatedPage = Math.max(1, page);
      const validatedLimit = Math.min(100, Math.max(1, limit));
      const offset = (validatedPage - 1) * validatedLimit;

      // Validate status filter
      if (!["active", "closed", "all"].includes(status)) {
        this.setStatus(400);
        return {
          success: false,
          error: "Invalid status filter. Must be 'active', 'closed', or 'all'"
        };
      }

      // Build WHERE clause based on status
      let whereClause = "";
      if (status === "active") {
        whereClause = "WHERE status = 'active'";
      } else if (status === "closed") {
        whereClause = "WHERE status = 'closed'";
      }
      // For 'all' status, whereClause remains empty

      // Get total count
      const countResult = await getPool().query(
        `SELECT COUNT(*) as total FROM position ${whereClause}`
      );
      const total = Number.parseInt(countResult.rows[0]?.total || "0", 10);

      // Get positions
      const result = await getPool().query(
        `SELECT * FROM position ${whereClause} ORDER BY createdat DESC LIMIT $1 OFFSET $2`,
        [validatedLimit, offset]
      );

      const positions = await Promise.all(
        result.rows.map((row) => mapDatabaseRowToPosition(row))
      );

      const pagination: PositionsPaginationInfo = {
        page: validatedPage,
        limit: validatedLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / validatedLimit)),
        hasNext: offset + positions.length < total,
        hasPrev: validatedPage > 1
      };

      this.setStatus(200);
      return {
        positions,
        pagination,
        filters: {
          status
        }
      };
    } catch (error) {
      logger.error("Error fetching positions", error);
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to fetch positions",
        details: (error as Error).message
      };
    }
  }

  /**
   * Get positions by portfolio ID
   * @param portfolioId Portfolio identifier
   */
  @Get("portfolios/{portfolioId}/positions")
  @SuccessResponse(200, "Portfolio positions retrieved successfully")
  @Response<PositionsErrorResponse>(500, "Internal server error")
  public async getPortfolioPositions(
    @Path() portfolioId: string
  ): Promise<PositionsListResponse | PositionsErrorResponse> {
    try {
      const result = await getPool().query(
        `SELECT * FROM position WHERE portfolioId = $1 ORDER BY createdat DESC`,
        [portfolioId]
      );

      const positions = await Promise.all(
        result.rows.map((row) => mapDatabaseRowToPosition(row))
      );

      const pagination: PositionsPaginationInfo = {
        page: 1,
        limit: result.rows.length,
        total: result.rows.length,
        totalPages: Math.max(1, Math.ceil(result.rows.length / 10)),
        hasNext: false,
        hasPrev: false
      };

      this.setStatus(200);
      return {
        positions,
        pagination
      };
    } catch (error) {
      logger.error("Error fetching portfolio positions", error);
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to fetch portfolio positions",
        details: (error as Error).message
      };
    }
  }

  /**
   * Get position by ID
   * @param id Position identifier
   */
  @Get("{id}")
  @SuccessResponse(200, "Position retrieved successfully")
  @Response<PositionsErrorResponse>(404, "Position not found")
  @Response<PositionsErrorResponse>(500, "Internal server error")
  public async getPosition(
    @Path() id: string
  ): Promise<any> {
    try {
      const result = await getPool().query("SELECT * FROM position WHERE id = $1", [id]);

      if (result.rows.length === 0) {
        this.setStatus(404);
        return {
          success: false,
          error: "Position not found"
        };
      }

      // Convert the result to a proper Position object
      const position = await mapDatabaseRowToPosition(result.rows[0]);

      // Validate the response with schema from @marcopersi/shared
      const validatedPosition = PositionSchema.parse(position);

      this.setStatus(200);
      return validatedPosition;
    } catch (error) {
      logger.error("Error fetching position", error);
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to fetch position",
        details: (error as Error).message
      };
    }
  }
}
