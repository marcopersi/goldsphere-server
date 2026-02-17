/**
 * Portfolio Controller - tsoa implementation
 * 
 * Handles all portfolio-related endpoints including CRUD operations
 * and portfolio analytics/summaries.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Route,
  Path,
  Query,
  Body,
  Tags,
  SuccessResponse,
  Response,
  Security,
  Request
} from "tsoa";
import { getPool } from "../dbConfig";
import { requireAuthenticatedUser } from "../utils/auditTrail";
import { PortfolioServiceFactory } from "../services/portfolio";
import {
  PortfolioErrorCode,
  PortfolioSummary,
  PortfolioWithPositions,
  Position
} from "../services/portfolio/types/PortfolioTypes";
import * as express from "express";

// ============================================================================
// Response Interfaces
// ============================================================================

interface PortfolioErrorResponse {
  success: false;
  error?: string;
  message?: string;
  errors?: unknown[];
}

interface PortfolioListResponse {
  success: true;
  data: {
    portfolios: PortfolioSummary[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface PortfolioSingleResponse {
  success: true;
  data: {
    portfolio: PortfolioSummary;
  };
}

interface PortfolioWithPositionsResponse {
  success: true;
  data: PortfolioWithPositions;
}

interface PortfolioArrayResponse {
  success: true;
  data: PortfolioWithPositions[];
}

interface PortfolioDeleteResponse {
  success: true;
  message: string;
}

// ============================================================================
// Request Interfaces
// ============================================================================

interface CreatePortfolioRequest {
  portfolioName: string;
  ownerId: string;
  description?: string;
}

interface UpdatePortfolioRequest {
  portfolioName?: string;
  description?: string;
  isActive?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getPortfolioService() {
  return PortfolioServiceFactory.create(getPool());
}

function mapErrorCodeToStatus(code: PortfolioErrorCode): number {
  switch (code) {
    case PortfolioErrorCode.NOT_FOUND:
      return 404;
    case PortfolioErrorCode.VALIDATION_ERROR:
      return 400;
    case PortfolioErrorCode.DUPLICATE_NAME:
      return 409;
    case PortfolioErrorCode.OWNER_NOT_FOUND:
      return 400;
    case PortfolioErrorCode.HAS_POSITIONS:
      return 409;
    case PortfolioErrorCode.UNAUTHORIZED:
      return 403;
    default:
      return 500;
  }
}

function createHttpError(status: number, message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

// ============================================================================
// Controller
// ============================================================================

@Route("portfolios")
@Tags("Portfolios")
export class PortfolioController extends Controller {
  /**
   * Get all portfolios with advanced filtering
   * @param page Page number
   * @param limit Items per page
   * @param search Search in portfolio name
   * @param ownerId Filter by owner ID
   * @param isActive Filter by active status
   * @param minValue Minimum portfolio value
   * @param maxValue Maximum portfolio value
   * @param minPositionCount Minimum number of positions
   * @param maxPositionCount Maximum number of positions
   * @param minGainLoss Minimum gain/loss
   * @param maxGainLoss Maximum gain/loss
   * @param createdAfter Filter portfolios created after this date
   * @param createdBefore Filter portfolios created before this date
   * @param updatedAfter Filter portfolios updated after this date
   * @param updatedBefore Filter portfolios updated before this date
   * @param metal Filter by metal type
   * @param sortBy Sort field
   * @param sortOrder Sort order
   */
  @Get()
  @Security("bearerAuth")
  @SuccessResponse(200, "List of portfolios")
  @Response<PortfolioErrorResponse>(400, "Invalid query parameters")
  @Response<PortfolioErrorResponse>(401, "Unauthorized")
  @Response<PortfolioErrorResponse>(500, "Server error")
  public async getPortfolios(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() search?: string,
    @Query() ownerId?: string,
    @Query() isActive?: boolean,
    @Query() minValue?: number,
    @Query() maxValue?: number,
    @Query() minPositionCount?: number,
    @Query() maxPositionCount?: number,
    @Query() minGainLoss?: number,
    @Query() maxGainLoss?: number,
    @Query() createdAfter?: string,
    @Query() createdBefore?: string,
    @Query() updatedAfter?: string,
    @Query() updatedBefore?: string,
    @Query() metal?: "gold" | "silver" | "platinum" | "palladium",
    @Query() sortBy?: "portfolioName" | "totalValue" | "totalGainLoss" | "positionCount" | "createdAt" | "updatedAt",
    @Query() sortOrder?: "asc" | "desc"
  ): Promise<PortfolioListResponse> {
    try {
      const options = {
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
      };

      // Remove undefined values
      const cleanOptions = Object.fromEntries(
        Object.entries(options).filter(([_, v]) => v !== undefined)
      );

      const result = await getPortfolioService().getAllPortfolios(cleanOptions);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.setStatus(500);
      throw {
        success: false,
        message: "Failed to fetch portfolios",
        error: (error as Error).message
      };
    }
  }

  /**
   * Get current user's portfolios with positions
   */
  @Get("my")
  @Security("bearerAuth")
  @SuccessResponse(200, "User's portfolios with positions")
  @Response<PortfolioErrorResponse>(401, "Unauthorized")
  @Response<PortfolioErrorResponse>(500, "Server error")
  public async getMyPortfolios(
    @Request() request: express.Request
  ): Promise<PortfolioArrayResponse> {
    try {
      const authenticatedUser = requireAuthenticatedUser(request);

      const userId = authenticatedUser.id;
      const portfolioService = getPortfolioService();

      // Get user's portfolios - returns empty array if none exist (not an error)
      const portfoliosResult = await portfolioService.getUserPortfolios(userId);

      // Enrich each portfolio with positions
      const portfoliosWithPositions = await Promise.all(
        portfoliosResult.portfolios.map(async (portfolio) => {
          try {
            const result = await portfolioService.getPortfolioWithPositions(portfolio.id);
            if (!result.success) {
              console.error(`Failed to get positions for portfolio ${portfolio.id}:`, result.error);
              return { ...portfolio, positions: [] as Position[] };
            }
            if (!result.data) {
              return { ...portfolio, positions: [] as Position[] };
            }
            return result.data;
          } catch (err) {
            console.error(`Exception getting positions for portfolio ${portfolio.id}:`, err);
            return { ...portfolio, positions: [] as Position[] };
          }
        })
      );

      return {
        success: true,
        data: portfoliosWithPositions
      };
    } catch (error) {
      this.setStatus(500);
      throw new Error((error as Error).message || "Failed to fetch portfolios");
    }
  }

  /**
   * Get portfolio by ID
   * @param id Portfolio ID (UUID)
   */
  @Get("{id}")
  @Security("bearerAuth")
  @SuccessResponse(200, "Portfolio details")
  @Response<PortfolioErrorResponse>(400, "Invalid portfolio ID format")
  @Response<PortfolioErrorResponse>(401, "Unauthorized")
  @Response<PortfolioErrorResponse>(404, "Portfolio not found")
  @Response<PortfolioErrorResponse>(500, "Server error")
  public async getPortfolioById(@Path() id: string): Promise<PortfolioSingleResponse> {
    try {
      // Basic UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw createHttpError(400, "Invalid portfolio ID format");
      }

      const result = await getPortfolioService().getPortfolioById(id);

      if (!result.success) {
        const error = result.error;
        throw createHttpError(
          mapErrorCodeToStatus(error?.code || PortfolioErrorCode.INTERNAL_ERROR),
          error?.message || "Failed to fetch portfolio"
        );
      }

      if (!result.data) {
        throw createHttpError(500, "Failed to fetch portfolio");
      }

      return {
        success: true,
        data: { portfolio: result.data }
      };
    } catch (error) {
      const httpError = error as Error & { status?: number };
      if (typeof httpError.status === "number") {
        throw httpError;
      }
      throw createHttpError(500, "Failed to fetch portfolio");
    }
  }

  /**
   * Get portfolio summary with analytics and positions
   * @param id Portfolio ID (UUID)
   */
  @Get("{id}/summary")
  @Security("bearerAuth")
  @SuccessResponse(200, "Portfolio summary with positions")
  @Response<PortfolioErrorResponse>(400, "Invalid portfolio ID format")
  @Response<PortfolioErrorResponse>(401, "Unauthorized")
  @Response<PortfolioErrorResponse>(404, "Portfolio not found")
  @Response<PortfolioErrorResponse>(500, "Server error")
  public async getPortfolioSummary(@Path() id: string): Promise<PortfolioWithPositionsResponse> {
    try {
      // Basic UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        this.setStatus(400);
        throw { success: false, message: "Invalid portfolio ID format" };
      }

      const result = await getPortfolioService().getPortfolioWithPositions(id);

      if (!result.success) {
        const error = result.error;
        this.setStatus(mapErrorCodeToStatus(error?.code || PortfolioErrorCode.INTERNAL_ERROR));
        throw { success: false, message: error?.message || 'Failed to fetch portfolio summary' };
      }

      if (!result.data) {
        this.setStatus(500);
        throw { success: false, message: 'Failed to fetch portfolio summary' };
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      if ((error as { success?: boolean }).success === false) {
        throw error;
      }
      this.setStatus(500);
      throw {
        success: false,
        message: "Failed to fetch portfolio summary",
        error: (error as Error).message
      };
    }
  }

  /**
   * Create a new portfolio
   * @param requestBody Portfolio data
   */
  @Post()
  @Security("bearerAuth")
  @SuccessResponse(201, "Portfolio created")
  @Response<PortfolioErrorResponse>(400, "Invalid request data")
  @Response<PortfolioErrorResponse>(401, "Unauthorized")
  @Response<PortfolioErrorResponse>(409, "Duplicate portfolio name")
  @Response<PortfolioErrorResponse>(500, "Server error")
  public async createPortfolio(
    @Body() requestBody: CreatePortfolioRequest,
    @Request() request: express.Request
  ): Promise<PortfolioSingleResponse> {
    try {
      const authenticatedUser = (request as any).user;
      const result = await getPortfolioService().createPortfolio(requestBody, authenticatedUser);

      if (!result.success) {
        const error = result.error;
        this.setStatus(mapErrorCodeToStatus(error?.code || PortfolioErrorCode.INTERNAL_ERROR));
        throw { success: false, message: error?.message || 'Failed to create portfolio' };
      }

      if (!result.data) {
        this.setStatus(500);
        throw { success: false, message: 'Failed to create portfolio' };
      }

      this.setStatus(201);
      return {
        success: true,
        data: { portfolio: result.data }
      };
    } catch (error) {
      if ((error as { success?: boolean }).success === false) {
        throw error;
      }
      this.setStatus(500);
      throw {
        success: false,
        message: "Failed to create portfolio",
        error: (error as Error).message
      };
    }
  }

  /**
   * Update portfolio by ID
   * @param id Portfolio ID (UUID)
   * @param requestBody Updated portfolio data
   */
  @Put("{id}")
  @Security("bearerAuth")
  @SuccessResponse(200, "Portfolio updated")
  @Response<PortfolioErrorResponse>(400, "Invalid request data")
  @Response<PortfolioErrorResponse>(401, "Unauthorized")
  @Response<PortfolioErrorResponse>(404, "Portfolio not found")
  @Response<PortfolioErrorResponse>(409, "Duplicate portfolio name")
  @Response<PortfolioErrorResponse>(500, "Server error")
  public async updatePortfolio(
    @Path() id: string,
    @Body() requestBody: UpdatePortfolioRequest,
    @Request() request: express.Request
  ): Promise<PortfolioSingleResponse> {
    try {
      // Basic UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw createHttpError(400, "Invalid portfolio ID format");
      }

      const authenticatedUser = (request as any).user;
      const result = await getPortfolioService().updatePortfolio(id, requestBody, authenticatedUser);

      if (!result.success) {
        const error = result.error;
        throw createHttpError(
          mapErrorCodeToStatus(error?.code || PortfolioErrorCode.INTERNAL_ERROR),
          error?.message || "Failed to update portfolio"
        );
      }

      if (!result.data) {
        throw createHttpError(500, "Failed to update portfolio");
      }

      return {
        success: true,
        data: { portfolio: result.data }
      };
    } catch (error) {
      const httpError = error as Error & { status?: number };
      if (typeof httpError.status === "number") {
        throw httpError;
      }
      throw createHttpError(500, "Failed to update portfolio");
    }
  }

  /**
   * Delete portfolio by ID
   * @param id Portfolio ID (UUID)
   */
  @Delete("{id}")
  @Security("bearerAuth")
  @SuccessResponse(200, "Portfolio deleted")
  @Response<PortfolioErrorResponse>(400, "Invalid portfolio ID format")
  @Response<PortfolioErrorResponse>(401, "Unauthorized")
  @Response<PortfolioErrorResponse>(404, "Portfolio not found")
  @Response<PortfolioErrorResponse>(409, "Cannot delete portfolio with positions")
  @Response<PortfolioErrorResponse>(500, "Server error")
  public async deletePortfolio(
    @Path() id: string,
    @Request() request: express.Request
  ): Promise<PortfolioDeleteResponse> {
    try {
      // Basic UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw createHttpError(400, "Invalid portfolio ID format");
      }

      const portfolioService = getPortfolioService();

      // Check if can delete
      const canDeleteResult = await portfolioService.canDelete(id);
      if (!canDeleteResult.success) {
        const error = canDeleteResult.error;
        throw createHttpError(
          mapErrorCodeToStatus(error?.code || PortfolioErrorCode.INTERNAL_ERROR),
          error?.message || "Failed to validate portfolio deletion"
        );
      }

      if (!canDeleteResult.data) {
        throw createHttpError(500, "Failed to validate portfolio deletion");
      }

      if (!canDeleteResult.data.canDelete) {
        throw createHttpError(409, canDeleteResult.data.reason || "Portfolio cannot be deleted");
      }

      const authenticatedUser = (request as any).user;
      const result = await portfolioService.deletePortfolio(id, authenticatedUser);

      if (!result.success) {
        const error = result.error;
        throw createHttpError(
          mapErrorCodeToStatus(error?.code || PortfolioErrorCode.INTERNAL_ERROR),
          error?.message || "Failed to delete portfolio"
        );
      }

      return {
        success: true,
        message: "Portfolio deleted successfully"
      };
    } catch (error) {
      const httpError = error as Error & { status?: number };
      if (typeof httpError.status === "number") {
        throw httpError;
      }
      throw createHttpError(500, "Failed to delete portfolio");
    }
  }
}
