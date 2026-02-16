/**
 * Custody Service Controller - tsoa implementation
 * 
 * Manages custody services (storage/vault offerings from custodians).
 * A Custodian can offer multiple Custody Services with different fees and terms.
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
import { 
  CustodyServiceFactory, 
  CustodyServiceDTO,
  CustodianWithServices
} from "../services/custody";

// ============================================================================
// Type Aliases
// ============================================================================

type PaymentFrequency = "monthly" | "quarterly" | "annual" | "onetime";

// ============================================================================
// Request/Response Interfaces
// ============================================================================

interface CustodyErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

interface CustodyPaginationInfo {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface CustodyServiceListResponse {
  success: true;
  data: CustodyServiceDTO[];
  total: number;
}

interface CustodyServicePaginatedResponse {
  success: true;
  data: {
    custodyServices: CustodyServiceDTO[];
    pagination: CustodyPaginationInfo;
  };
}

interface CustodyServiceResponse {
  success: true;
  data: CustodyServiceDTO;
  message?: string;
}

interface CustodyServiceDeleteResponse {
  success: true;
  message: string;
}

interface CustodiansWithServicesResponse {
  success: true;
  data: CustodianWithServices[];
}

interface CustodyServiceCreateRequest {
  /** Name of the custody service */
  serviceName: string;
  /** ID of the custodian offering this service */
  custodianId: string;
  /** Service fee */
  fee: number;
  /** Payment frequency */
  paymentFrequency: PaymentFrequency;
  /** Currency ISO code (e.g., 'CHF', 'EUR', 'USD') */
  currency: string;
  /** Maximum weight limit (optional) */
  maxWeight?: number;
}

interface CustodyServiceUpdateRequest {
  /** Updated service name */
  serviceName?: string;
  /** Updated custodian ID */
  custodianId?: string;
  /** Updated fee */
  fee?: number;
  /** Updated payment frequency */
  paymentFrequency?: PaymentFrequency;
  /** Updated currency ISO code */
  currency?: string;
  /** Updated max weight limit */
  maxWeight?: number;
}

// ============================================================================
// Controller
// ============================================================================

@Route("custody")
@Tags("Custody Services")
@Security("bearerAuth")
export class CustodyServiceController extends Controller {
  private readonly custodyService = CustodyServiceFactory.createService(getPool());

  /**
   * Get all custody services (simple list)
   * Returns a simple list of all custody services without pagination
   */
  @Get("/")
  @SuccessResponse(200, "List of custody services")
  @Response<CustodyErrorResponse>(500, "Server error")
  public async getAllCustodyServices(): Promise<CustodyServiceListResponse | CustodyErrorResponse> {
    const result = await this.custodyService.getCustodyServices({ limit: 100 });

    if (!result.success) {
      this.setStatus(500);
      return {
        success: false,
        error: result.message || "Failed to fetch custody services"
      };
    }

    return {
      success: true,
      data: result.data.custodyServices,
      total: result.data.custodyServices.length
    };
  }

  /**
   * Get custody services with pagination
   * Retrieve a paginated list of custody services with comprehensive filtering options
   * @param page Page number (default: 1)
   * @param limit Items per page (default: 20, max: 100)
   * @param search Search in service names
   * @param custodianId Filter by custodian ID
   * @param paymentFrequency Filter by payment frequency
   * @param sortBy Sort field
   * @param sortOrder Sort order
   */
  @Get("/custodyServices")
  @SuccessResponse(200, "Paginated list of custody services")
  @Response<CustodyErrorResponse>(400, "Invalid query parameters")
  @Response<CustodyErrorResponse>(500, "Server error")
  public async getCustodyServicesPaginated(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() search?: string,
    @Query() custodianId?: string,
    @Query() paymentFrequency?: PaymentFrequency,
    @Query() sortBy?: string,
    @Query() sortOrder?: "asc" | "desc"
  ): Promise<CustodyServicePaginatedResponse | { success: true; data: CustodyServiceDTO[] }> {
    // If no query parameters, return simple array format
    const hasParams = page || limit || search || custodianId || paymentFrequency || sortBy || sortOrder;
    
    if (!hasParams) {
      const result = await this.custodyService.getCustodyServices({ limit: 100 });
      return {
        success: true,
        data: result.data.custodyServices
      };
    }

    const serviceOptions = {
      page: page || 1,
      limit: Math.min(limit || 20, 100),
      search,
      custodianId,
      paymentFrequency,
      sortBy,
      sortOrder
    };

    const result = await this.custodyService.getCustodyServices(serviceOptions);

    if (!result.success) {
      this.setStatus(500);
      throw new Error(result.message || "Failed to fetch custody services");
    }

    return {
      success: true,
      data: {
        custodyServices: result.data.custodyServices,
        pagination: result.data.pagination
      }
    };
  }

  /**
   * Get default custody service
   * Returns the default Home Delivery custody service
   */
  @Get("/custodyServices/default")
  @SuccessResponse(200, "Default custody service")
  @Response<CustodyErrorResponse>(404, "Default custody service not found")
  @Response<CustodyErrorResponse>(500, "Server error")
  public async getDefaultCustodyService(): Promise<CustodyServiceResponse> {
    const result = await this.custodyService.getDefaultCustodyService();

    if (!result.success || !result.data) {
      this.setStatus(result.error?.includes("not found") ? 404 : 500);
      throw new Error(result.error || "Failed to fetch default custody service");
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  }

  /**
   * Get custody service by ID
   * @param id Custody service ID (UUID)
   */
  @Get("/custodyServices/{id}")
  @SuccessResponse(200, "Custody service details")
  @Response<CustodyErrorResponse>(400, "Invalid custody service ID")
  @Response<CustodyErrorResponse>(404, "Custody service not found")
  @Response<CustodyErrorResponse>(500, "Server error")
  public async getCustodyServiceById(
    @Path() id: string
  ): Promise<CustodyServiceResponse> {
    const result = await this.custodyService.getCustodyServiceById(id);

    if (!result.success || !result.data) {
      if (result.error?.includes("not found")) {
        this.setStatus(404);
      } else if (result.error?.includes("Invalid")) {
        this.setStatus(400);
      } else {
        this.setStatus(500);
      }
      throw new Error(result.error || "Failed to fetch custody service");
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  }

  /**
   * Create a new custody service
   * @param requestBody Custody service creation data
   */
  @Post("/")
  @SuccessResponse(201, "Custody service created successfully")
  @Response<CustodyErrorResponse>(400, "Invalid request data")
  @Response<CustodyErrorResponse>(409, "Service with this name already exists")
  @Response<CustodyErrorResponse>(500, "Server error")
  public async createCustodyService(
    @Body() requestBody: CustodyServiceCreateRequest,
    @Request() request: ExpressRequest
  ): Promise<CustodyServiceResponse> {
    const createDTO = {
      custodyServiceName: requestBody.serviceName,
      custodianId: requestBody.custodianId,
      fee: requestBody.fee,
      paymentFrequency: requestBody.paymentFrequency,
      currency: requestBody.currency,
      maxWeight: requestBody.maxWeight
    };

    const authenticatedUser = requireAuthenticatedUser(request);
    const result = await this.custodyService.createCustodyService(createDTO, authenticatedUser);

    if (!result.success || !result.data) {
      if (result.error?.includes("already exists")) {
        this.setStatus(409);
      } else if (result.error?.includes("not found") || result.error?.includes("Invalid")) {
        this.setStatus(400);
      } else {
        this.setStatus(500);
      }
      throw new Error(result.error || "Failed to create custody service");
    }

    this.setStatus(201);
    return {
      success: true,
      data: result.data,
      message: result.message
    };
  }

  /**
   * Update a custody service
   * @param id Custody service ID (UUID)
   * @param requestBody Updated custody service data
   */
  @Put("/custodyServices/{id}")
  @SuccessResponse(200, "Custody service updated successfully")
  @Response<CustodyErrorResponse>(400, "Invalid request data")
  @Response<CustodyErrorResponse>(404, "Custody service not found")
  @Response<CustodyErrorResponse>(409, "Service with this name already exists")
  @Response<CustodyErrorResponse>(500, "Server error")
  public async updateCustodyService(
    @Path() id: string,
    @Body() requestBody: CustodyServiceUpdateRequest,
    @Request() request: ExpressRequest
  ): Promise<CustodyServiceResponse> {
    const updateDTO = {
      custodyServiceName: requestBody.serviceName,
      custodianId: requestBody.custodianId,
      fee: requestBody.fee,
      paymentFrequency: requestBody.paymentFrequency,
      currency: requestBody.currency,
      maxWeight: requestBody.maxWeight
    };

    const authenticatedUser = requireAuthenticatedUser(request);
    const result = await this.custodyService.updateCustodyService(id, updateDTO, authenticatedUser);

    if (!result.success || !result.data) {
      if (result.error?.includes("not found")) {
        this.setStatus(404);
      } else if (result.error?.includes("Invalid")) {
        this.setStatus(400);
      } else if (result.error?.includes("already exists")) {
        this.setStatus(409);
      } else {
        this.setStatus(500);
      }
      throw new Error(result.error || "Failed to update custody service");
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  }

  /**
   * Delete a custody service
   * @param id Custody service ID (UUID)
   */
  @Delete("/custodyServices/{id}")
  @SuccessResponse(200, "Custody service deleted successfully")
  @Response<CustodyErrorResponse>(400, "Invalid custody service ID")
  @Response<CustodyErrorResponse>(404, "Custody service not found")
  @Response<CustodyErrorResponse>(409, "Cannot delete service with active positions")
  @Response<CustodyErrorResponse>(500, "Server error")
  public async deleteCustodyService(
    @Path() id: string,
    @Request() request: ExpressRequest
  ): Promise<CustodyServiceDeleteResponse> {
    const authenticatedUser = requireAuthenticatedUser(request);
    const result = await this.custodyService.deleteCustodyService(id, authenticatedUser);

    if (!result.success) {
      if (result.error?.includes("not found")) {
        this.setStatus(404);
      } else if (result.error?.includes("Cannot delete")) {
        this.setStatus(409);
      } else if (result.error?.includes("Invalid")) {
        this.setStatus(400);
      } else {
        this.setStatus(500);
      }
      throw new Error(result.error || "Failed to delete custody service");
    }

    return {
      success: true,
      message: result.message || "Custody service deleted successfully"
    };
  }

  /**
   * Get all custodians with their custody services
   * Comprehensive view of all custodians and their associated services
   * @param search Optional search in custodian names
   */
  @Get("/custodians-with-services")
  @SuccessResponse(200, "Custodians with their services")
  @Response<CustodyErrorResponse>(500, "Server error")
  public async getCustodiansWithServices(
    @Query() search?: string
  ): Promise<CustodiansWithServicesResponse> {
    const result = await this.custodyService.getCustodiansWithServices(search);

    if (!result.success || !result.data) {
      this.setStatus(500);
      throw new Error(result.message || "Failed to fetch custodians with services");
    }

    return {
      success: true,
      data: result.data
    };
  }
}
