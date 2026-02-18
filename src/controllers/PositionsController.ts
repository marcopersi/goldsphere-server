/**
 * Positions Controller - tsoa implementation
 */

import {
  Controller,
  Get,
  Path,
  Query,
  Request,
  Response,
  Route,
  SuccessResponse,
  Tags,
  Security
} from "tsoa";
import type { Request as ExpressRequest } from "express";
import { getPool } from "../dbConfig";
import { createLogger } from "../utils/logger";
import { requireAuthenticatedUser } from "../utils/auditTrail";
import {
  mapDatabaseRowToPosition,
  toSchemaCompatiblePosition
} from "./positions/PositionDataMapper";
import { normalizePagination } from "../utils/paginationResponse";
import type {
  PositionResponse,
  PositionsErrorResponse,
  PositionsListResponse,
  PositionsPaginationInfo
} from "./positions/PositionsTypes";

const logger = createLogger("PositionsController");

function isAdminRole(role: string): boolean {
  return role === "admin";
}

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
    @Request() request: ExpressRequest,
    @Query() page = 1,
    @Query() limit = 20,
    @Query() status = "active"
  ): Promise<PositionsListResponse | PositionsErrorResponse> {
    try {
      const authenticatedUser = requireAuthenticatedUser(request);
      const isAdmin = isAdminRole(authenticatedUser.role);

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

      // Build WHERE clause based on role + status
      const whereConditions: string[] = [];
      const queryParams: Array<string | number> = [];

      if (!isAdmin) {
        queryParams.push(authenticatedUser.id);
        whereConditions.push(`userid = $${queryParams.length}`);
      }

      if (status === "active") {
        whereConditions.push("status = 'active'");
      } else if (status === "closed") {
        whereConditions.push("status = 'closed'");
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

      // Get total count
      const countResult = await getPool().query(
        `SELECT COUNT(*) as total FROM position ${whereClause}`,
        queryParams
      );
      const total = Number.parseInt(countResult.rows[0]?.total || "0", 10);

      // Get positions
      const positionsParams = [...queryParams, validatedLimit, offset];
      const result = await getPool().query(
        `SELECT * FROM position ${whereClause} ORDER BY createdat DESC LIMIT $${positionsParams.length - 1} OFFSET $${positionsParams.length}`,
        positionsParams
      );

      const positions = await Promise.all(
        result.rows.map((row) => mapDatabaseRowToPosition(row as Record<string, unknown>))
      );

      const pagination: PositionsPaginationInfo = normalizePagination({
        page: validatedPage,
        limit: validatedLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / validatedLimit))
      });

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
    @Request() request: ExpressRequest,
    @Path() portfolioId: string
  ): Promise<PositionsListResponse | PositionsErrorResponse> {
    try {
      const authenticatedUser = requireAuthenticatedUser(request);
      const isAdmin = isAdminRole(authenticatedUser.role);

      const queryParams: string[] = [portfolioId];
      let whereClause = "WHERE portfolioId = $1";

      if (!isAdmin) {
        queryParams.push(authenticatedUser.id);
        whereClause += " AND userId = $2";
      }

      const result = await getPool().query(
        `SELECT * FROM position ${whereClause} ORDER BY createdat DESC`,
        queryParams
      );

      const positions = await Promise.all(
        result.rows.map((row) => mapDatabaseRowToPosition(row as Record<string, unknown>))
      );

      const pagination: PositionsPaginationInfo = normalizePagination({
        page: 1,
        limit: Math.max(1, result.rows.length),
        total: result.rows.length,
        totalPages: Math.max(1, Math.ceil(result.rows.length / 10))
      });

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
    @Request() request: ExpressRequest,
    @Path() id: string
  ): Promise<PositionResponse | PositionsErrorResponse> {
    try {
      const authenticatedUser = requireAuthenticatedUser(request);
      const isAdmin = isAdminRole(authenticatedUser.role);

      const queryParams: string[] = [id];
      let whereClause = "WHERE id = $1";

      if (!isAdmin) {
        queryParams.push(authenticatedUser.id);
        whereClause += " AND userId = $2";
      }

      const result = await getPool().query(`SELECT * FROM position ${whereClause}`, queryParams);

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
