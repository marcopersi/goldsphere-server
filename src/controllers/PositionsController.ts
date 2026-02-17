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
import { createLogger } from "../utils/logger";
import {
  mapDatabaseRowToPosition,
  toSchemaCompatiblePosition
} from "./positions/PositionDataMapper";
import type {
  PositionResponse,
  PositionsErrorResponse,
  PositionsListResponse,
  PositionsPaginationInfo
} from "./positions/PositionsTypes";

const logger = createLogger("PositionsController");

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
        result.rows.map((row) => mapDatabaseRowToPosition(row as Record<string, unknown>))
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
        result.rows.map((row) => mapDatabaseRowToPosition(row as Record<string, unknown>))
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
  ): Promise<PositionResponse | PositionsErrorResponse> {
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
      const position = await mapDatabaseRowToPosition(result.rows[0] as Record<string, unknown>);
      const validatedPosition = toSchemaCompatiblePosition(position);

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
