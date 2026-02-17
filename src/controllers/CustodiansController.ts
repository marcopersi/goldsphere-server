/**
 * Custodians Controller - tsoa implementation
 * 
 * Manages custodian entities (vault/storage providers for precious metals).
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
import type { Request as ExpressRequest } from "express";
import { getPool } from "../dbConfig";
import { requireAuthenticatedUser } from "../utils/auditTrail";
import { CustodianServiceFactory, CustodianDTO } from "../services/custodian";

// ============================================================================
// Request/Response Interfaces
// ============================================================================

interface CustodianErrorResponse {
  success: false;
  error: string;
  details?: {
    fields?: Array<{
      path: string;
      message: string;
    }>;
  };
}

interface CustodianListResponse {
  success: true;
  data: CustodianDTO[];
  total: number;
}

interface CustodianPaginationInfo {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface CustodianPaginatedResponse {
  success: true;
  data: {
    custodians: CustodianDTO[];
    pagination: CustodianPaginationInfo;
  };
}

interface CustodianResponse {
  success: true;
  data: CustodianDTO;
  message?: string;
}

interface CustodianDeleteResponse {
  success: true;
  message: string;
}

interface CustodianCreateRequest {
  /** Name of the custodian */
  name: string;
}

interface CustodianUpdateRequest {
  /** Updated name of the custodian */
  name: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapSortBy(sortBy: string | undefined): "custodianName" | "createdAt" | undefined {
  if (!sortBy) return undefined;
  if (sortBy === "name") return "custodianName";
  if (sortBy === "updatedAt") return "createdAt";
  if (sortBy === "custodianName" || sortBy === "createdAt") return sortBy;
  return undefined;
}

function createHttpError(status: number, message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

// ============================================================================
// Controller
// ============================================================================

@Route("custodians")
@Tags("Custodians")
@Security("bearerAuth")
export class CustodiansController extends Controller {
  private readonly custodianService = CustodianServiceFactory.createService(getPool());

  /**
   * Get all custodians (simple list)
   * Returns a simple list of all custodians without pagination
   */
  @Get("/")
  @SuccessResponse(200, "List of custodians")
  @Response<CustodianErrorResponse>(500, "Server error")
  public async getAllCustodians(): Promise<CustodianListResponse> {
    const result = await this.custodianService.getCustodians({ limit: 100 });

    if (!result.success) {
      this.setStatus(500);
      throw new Error(result.message || "Failed to fetch custodians");
    }

    return {
      success: true,
      data: result.data.custodians,
      total: result.data.pagination.totalItems
    };
  }

  /**
   * Get custodians with pagination
   * Retrieve a paginated list of custodians with filtering and sorting options
   * @param page Page number (default: 1)
   * @param limit Items per page (default: 20, max: 100)
   * @param search Search in custodian names
   * @param sortBy Sort field
   * @param sortOrder Sort order
   * @param isActive Filter by active status
   * @param region Filter by region
   */
  @Get("/custodians")
  @SuccessResponse(200, "Paginated list of custodians")
  @Response<CustodianErrorResponse>(400, "Invalid query parameters")
  @Response<CustodianErrorResponse>(500, "Server error")
  public async getCustodiansPaginated(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() search?: string,
    @Query() sortBy?: "custodianName" | "createdAt" | "name" | "updatedAt",
    @Query() sortOrder?: "asc" | "desc",
    @Query() isActive?: boolean,
    @Query() region?: string
  ): Promise<CustodianPaginatedResponse | { success: true; data: CustodianDTO[] }> {
    // If no query parameters, return simple array format
    if (!page && !limit && !search && !sortBy && !sortOrder && isActive === undefined && !region) {
      const result = await this.custodianService.getCustodians({ limit: 100 });

      return {
        success: true,
        data: result.data.custodians
      };
    }

    const serviceOptions = {
      page: page || 1,
      limit: Math.min(limit || 20, 100),
      isActive,
      search,
      sortOrder,
      sortBy: mapSortBy(sortBy)
    };

    const result = await this.custodianService.getCustodians(serviceOptions);

    if (!result.success) {
      this.setStatus(500);
      throw new Error(result.message || "Failed to fetch custodians");
    }

    return {
      success: true,
      data: {
        custodians: result.data.custodians,
        pagination: result.data.pagination
      }
    };
  }

  /**
   * Create a new custodian
   * @param requestBody Custodian creation data
   */
  @Post("/")
  @SuccessResponse(201, "Custodian created successfully")
  @Response<CustodianErrorResponse>(400, "Invalid request data")
  @Response<CustodianErrorResponse>(409, "Custodian with this name already exists")
  @Response<CustodianErrorResponse>(500, "Server error")
  public async createCustodian(
    @Body() requestBody: CustodianCreateRequest,
    @Request() request: ExpressRequest
  ): Promise<CustodianResponse> {
    const authenticatedUser = requireAuthenticatedUser(request);
    const result = await this.custodianService.createCustodian({ name: requestBody.name }, authenticatedUser);

    if (!result.success || !result.data) {
      if (result.error?.includes("already exists")) {
        this.setStatus(409);
      } else {
        this.setStatus(400);
      }
      throw new Error(result.error || "Failed to create custodian");
    }

    this.setStatus(201);
    return {
      success: true,
      data: result.data,
      message: result.message
    };
  }

  /**
   * Get custodian by ID
   * @param id Custodian ID (UUID)
   */
  @Get("/custodians/{id}")
  @SuccessResponse(200, "Custodian details")
  @Response<CustodianErrorResponse>(400, "Invalid custodian ID")
  @Response<CustodianErrorResponse>(404, "Custodian not found")
  @Response<CustodianErrorResponse>(500, "Server error")
  public async getCustodianById(
    @Path() id: string
  ): Promise<CustodianResponse> {
    const result = await this.custodianService.getCustodianById(id);

    if (!result.success || !result.data) {
      if (result.error?.includes("not found")) {
        throw createHttpError(404, result.error || "Failed to fetch custodian");
      } else if (result.error?.includes("Invalid")) {
        throw createHttpError(400, result.error || "Failed to fetch custodian");
      } else {
        throw createHttpError(500, result.error || "Failed to fetch custodian");
      }
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  }

  /**
   * Update a custodian
   * @param id Custodian ID (UUID)
   * @param requestBody Updated custodian data
   */
  @Put("/custodians/{id}")
  @SuccessResponse(200, "Custodian updated successfully")
  @Response<CustodianErrorResponse>(400, "Invalid request data")
  @Response<CustodianErrorResponse>(404, "Custodian not found")
  @Response<CustodianErrorResponse>(500, "Server error")
  public async updateCustodian(
    @Path() id: string,
    @Body() requestBody: CustodianUpdateRequest,
    @Request() request: ExpressRequest
  ): Promise<CustodianResponse> {
    const authenticatedUser = requireAuthenticatedUser(request);
    const result = await this.custodianService.updateCustodian(id, { name: requestBody.name }, authenticatedUser);

    if (!result.success || !result.data) {
      if (result.error?.includes("not found")) {
        throw createHttpError(404, result.error || "Failed to update custodian");
      } else if (result.error?.includes("Invalid")) {
        throw createHttpError(400, result.error || "Failed to update custodian");
      } else {
        throw createHttpError(500, result.error || "Failed to update custodian");
      }
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  }

  /**
   * Delete a custodian
   * @param id Custodian ID (UUID)
   */
  @Delete("/custodians/{id}")
  @SuccessResponse(200, "Custodian deleted successfully")
  @Response<CustodianErrorResponse>(400, "Invalid custodian ID")
  @Response<CustodianErrorResponse>(404, "Custodian not found")
  @Response<CustodianErrorResponse>(409, "Cannot delete custodian with existing custody services")
  @Response<CustodianErrorResponse>(500, "Server error")
  public async deleteCustodian(
    @Path() id: string,
    @Request() request: ExpressRequest
  ): Promise<CustodianDeleteResponse> {
    const authenticatedUser = requireAuthenticatedUser(request);
    const result = await this.custodianService.deleteCustodian(id, authenticatedUser);

    if (!result.success) {
      if (result.error?.includes("not found")) {
        throw createHttpError(404, result.error || "Failed to delete custodian");
      } else if (result.error?.includes("Cannot delete")) {
        throw createHttpError(409, result.error || "Failed to delete custodian");
      } else if (result.error?.includes("Invalid")) {
        throw createHttpError(400, result.error || "Failed to delete custodian");
      } else {
        throw createHttpError(500, result.error || "Failed to delete custodian");
      }
    }

    return {
      success: true,
      message: result.message || "Custodian deleted successfully"
    };
  }
}
