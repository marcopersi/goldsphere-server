/**
 * LBMA Controller - tsoa implementation
 * 
 * RESTful endpoints for LBMA benchmark prices and premium calculations.
 * LBMA (London Bullion Market Association) prices are official benchmark
 * prices for precious metals.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
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
import { requireAuthenticatedUser, AuthenticationError } from "../utils/auditTrail";
import {
  MarketDataServiceFactory,
  LbmaQuery,
  PriceTypeCode,
  PRICE_TYPE_CODES
} from "../services/market-data";
import {
  LbmaPrice,
  PriceType,
  PremiumConfig,
  PriceWithPremium
} from "../services/market-data/types/MarketDataTypes";

// ============================================================================
// Response Interfaces
// ============================================================================

interface LbmaErrorResponse {
  success: false;
  error: string;
  details?: string | string[];
}

interface PriceTypesResponse {
  success: true;
  data: PriceType[];
}

interface SingleLbmaPriceResponse {
  success: true;
  data: LbmaPrice;
}

interface LbmaHistoryResponse {
  success: true;
  data: LbmaPrice[];
  count: number;
}

interface FetchResultResponse {
  success: true;
  data: {
    metal: string;
    count: number;
    date?: string;
    startDate?: string;
    endDate?: string;
  };
  errors?: string[];
}

interface PremiumCalculationResponse {
  success: true;
  data: PriceWithPremium & {
    quantityOz: number;
    totalBasePrice: number;
    totalFinalPrice: number;
  };
}

interface PremiumConfigsResponse {
  success: true;
  data: PremiumConfig[];
}

interface CreateConfigResponse {
  success: true;
  data: { id: string };
}

interface UpdateConfigResponse {
  success: true;
  message: string;
}

interface CompareResponse {
  success: true;
  data: {
    metal: string;
    currency: string;
    lbmaPrice: number;
    spotPrice: number;
    difference: number;
    differencePercent: number;
    lbmaDate: Date;
    spotTimestamp: Date;
  };
}

// ============================================================================
// Request Interfaces
// ============================================================================

interface FetchHistoricalRequest {
  startDate: string;
  endDate: string;
}

interface FetchPricesRequest {
  date?: string;
}

interface CreatePremiumConfigRequest {
  name: string;
  description?: string;
  metalSymbol?: string;
  basePriceTypeId?: string;
  premiumPercent?: number;
  premiumFixedAmount?: number;
  currency?: string;
  minQuantityOz?: number;
  maxQuantityOz?: number;
  validFrom: string;
  validTo?: string;
  isActive?: boolean;
}

interface UpdatePremiumConfigRequest {
  name?: string;
  description?: string;
  metalSymbol?: string;
  basePriceTypeId?: string;
  premiumPercent?: number;
  premiumFixedAmount?: number;
  currency?: string;
  minQuantityOz?: number;
  maxQuantityOz?: number;
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getLbmaService() {
  return MarketDataServiceFactory.createLbmaService(getPool());
}

// ============================================================================
// Controller
// ============================================================================

@Route("lbma")
@Tags("LBMA Prices")
export class LbmaController extends Controller {
  /**
   * Get all available price types
   */
  @Get("price-types")
  @SuccessResponse(200, "List of price types")
  @Response<LbmaErrorResponse>(500, "Server error")
  public async getPriceTypes(): Promise<PriceTypesResponse> {
    try {
      const priceTypes = await getLbmaService().getPriceTypes();

      return {
        success: true,
        data: priceTypes
      };
    } catch (error) {
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to fetch price types",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get only benchmark (LBMA) price types
   */
  @Get("price-types/benchmark")
  @SuccessResponse(200, "List of benchmark price types")
  @Response<LbmaErrorResponse>(500, "Server error")
  public async getBenchmarkPriceTypes(): Promise<PriceTypesResponse> {
    try {
      const priceTypes = await getLbmaService().getBenchmarkPriceTypes();

      return {
        success: true,
        data: priceTypes
      };
    } catch (error) {
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to fetch benchmark price types",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get latest LBMA price for a metal
   * @param metalSymbol Metal symbol (AU, AG, PT, PD)
   * @param type Price type code (LBMA_AM, LBMA_PM, etc.) - default: LBMA_PM
   */
  @Get("price/{metalSymbol}")
  @SuccessResponse(200, "Latest LBMA price")
  @Response<LbmaErrorResponse>(400, "Invalid parameters")
  @Response<LbmaErrorResponse>(404, "No price found")
  @Response<LbmaErrorResponse>(500, "Server error")
  public async getLatestPrice(
    @Path() metalSymbol: string,
    @Query() type?: string
  ): Promise<SingleLbmaPriceResponse> {
    try {
      if (!metalSymbol || metalSymbol.trim() === "") {
        this.setStatus(400);
        throw { success: false, error: "Metal symbol is required" };
      }

      const priceType = (type?.toUpperCase() || "LBMA_PM") as PriceTypeCode;

      // Validate price type
      if (!PRICE_TYPE_CODES.includes(priceType)) {
        this.setStatus(400);
        throw {
          success: false,
          error: `Invalid price type. Valid types: ${PRICE_TYPE_CODES.join(", ")}`
        };
      }

      const price = await getLbmaService().getLatestLbmaPrice(
        metalSymbol.toUpperCase(),
        priceType
      );

      if (!price) {
        this.setStatus(404);
        throw { success: false, error: `No LBMA price found for ${metalSymbol}` };
      }

      return {
        success: true,
        data: price
      };
    } catch (error) {
      if ((error as { success?: boolean }).success === false) {
        throw error;
      }
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to fetch LBMA price",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get LBMA price for a specific date
   * @param metalSymbol Metal symbol (AU, AG, PT, PD)
   * @param date Date in YYYY-MM-DD format
   * @param type Price type code (default: LBMA_PM)
   */
  @Get("price/{metalSymbol}/{date}")
  @SuccessResponse(200, "LBMA price for date")
  @Response<LbmaErrorResponse>(400, "Invalid parameters")
  @Response<LbmaErrorResponse>(404, "No price found")
  @Response<LbmaErrorResponse>(500, "Server error")
  public async getPriceByDate(
    @Path() metalSymbol: string,
    @Path() date: string,
    @Query() type?: string
  ): Promise<SingleLbmaPriceResponse> {
    try {
      if (!metalSymbol || metalSymbol.trim() === "") {
        this.setStatus(400);
        throw { success: false, error: "Metal symbol is required" };
      }

      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        this.setStatus(400);
        throw { success: false, error: "Invalid date format. Use YYYY-MM-DD" };
      }

      const priceType = (type?.toUpperCase() || "LBMA_PM") as PriceTypeCode;

      const price = await getLbmaService().getLbmaPriceByDate(
        metalSymbol.toUpperCase(),
        parsedDate,
        priceType
      );

      if (!price) {
        this.setStatus(404);
        throw { success: false, error: `No LBMA price found for ${metalSymbol} on ${date}` };
      }

      return {
        success: true,
        data: price
      };
    } catch (error) {
      if ((error as { success?: boolean }).success === false) {
        throw error;
      }
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to fetch LBMA price",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get historical LBMA prices
   * @param metalSymbol Metal symbol
   * @param startDate Start date (ISO 8601)
   * @param endDate End date (ISO 8601)
   * @param type Price type code (default: LBMA_PM)
   * @param limit Maximum number of records (default: 100, max: 1000)
   */
  @Get("history/{metalSymbol}")
  @SuccessResponse(200, "Historical LBMA prices")
  @Response<LbmaErrorResponse>(400, "Invalid parameters")
  @Response<LbmaErrorResponse>(500, "Server error")
  public async getHistory(
    @Path() metalSymbol: string,
    @Query() startDate?: string,
    @Query() endDate?: string,
    @Query() type?: string,
    @Query() limit?: number
  ): Promise<LbmaHistoryResponse> {
    try {
      if (!metalSymbol || metalSymbol.trim() === "") {
        this.setStatus(400);
        throw { success: false, error: "Metal symbol is required" };
      }

      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        const parsed = new Date(startDate);
        if (!Number.isNaN(parsed.getTime())) {
          parsedStartDate = parsed;
        }
      }

      if (endDate) {
        const parsed = new Date(endDate);
        if (!Number.isNaN(parsed.getTime())) {
          parsedEndDate = parsed;
        }
      }

      const query: LbmaQuery = {
        metalSymbol: metalSymbol.toUpperCase(),
        priceTypeCode: (type as PriceTypeCode) || "LBMA_PM",
        limit: Math.min(limit || 100, 1000),
        startDate: parsedStartDate,
        endDate: parsedEndDate
      };

      const history = await getLbmaService().getLbmaHistory(query);

      return {
        success: true,
        data: history,
        count: history.length
      };
    } catch (error) {
      if ((error as { success?: boolean }).success === false) {
        throw error;
      }
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to fetch LBMA history",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get all today's LBMA fixings
   */
  @Get("fixings/today")
  @SuccessResponse(200, "Today's LBMA fixings")
  @Response<LbmaErrorResponse>(500, "Server error")
  public async getTodayFixings(): Promise<LbmaHistoryResponse> {
    try {
      const fixings = await getLbmaService().getTodayFixings();

      return {
        success: true,
        data: fixings,
        count: fixings.length
      };
    } catch (error) {
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to fetch today's fixings",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Fetch and store LBMA prices from external API (Admin only)
   * @param metalSymbol Metal symbol or 'all' for all metals
   * @param requestBody Optional date
   */
  @Post("fetch/{metalSymbol}")
  @Security("bearerAuth", ["admin"])
  @SuccessResponse(200, "Prices fetched successfully")
  @Response<LbmaErrorResponse>(400, "Invalid parameters")
  @Response<LbmaErrorResponse>(401, "Unauthorized")
  @Response<LbmaErrorResponse>(403, "Forbidden")
  @Response<LbmaErrorResponse>(500, "Server error")
  public async fetchPrices(
    @Path() metalSymbol: string,
    @Body() requestBody?: FetchPricesRequest
  ): Promise<FetchResultResponse> {
    try {
      let targetDate: Date | undefined;
      if (requestBody?.date) {
        targetDate = new Date(requestBody.date);
        if (Number.isNaN(targetDate.getTime())) {
          this.setStatus(400);
          throw { success: false, error: "Invalid date format. Use YYYY-MM-DD" };
        }
      }

      if (metalSymbol.toLowerCase() === "all") {
        // Fetch all metals
        const service = getLbmaService() as any;
        const result = await service.fetchAllLbmaPrices(targetDate);

        return {
          success: true,
          data: result.results
        };
      } else {
        const result = await getLbmaService().fetchAndStoreLbmaPrices(
          metalSymbol.toUpperCase(),
          targetDate
        );

        if (result.success) {
          return {
            success: true,
            data: {
              metal: metalSymbol.toUpperCase(),
              count: result.count,
              date: targetDate?.toISOString().split("T")[0] || "yesterday"
            }
          };
        } else {
          this.setStatus(500);
          throw {
            success: false,
            error: "Failed to fetch LBMA prices",
            details: result.errors
          };
        }
      }
    } catch (error) {
      if ((error as { success?: boolean }).success === false) {
        throw error;
      }
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to fetch LBMA prices",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Fetch historical LBMA prices for a date range (Admin only)
   * @param metalSymbol Metal symbol
   * @param requestBody Start and end dates
   */
  @Post("fetch-historical/{metalSymbol}")
  @Security("bearerAuth", ["admin"])
  @SuccessResponse(200, "Historical prices fetched")
  @Response<LbmaErrorResponse>(400, "Invalid parameters")
  @Response<LbmaErrorResponse>(401, "Unauthorized")
  @Response<LbmaErrorResponse>(403, "Forbidden")
  @Response<LbmaErrorResponse>(500, "Server error")
  public async fetchHistoricalPrices(
    @Path() metalSymbol: string,
    @Body() requestBody: FetchHistoricalRequest
  ): Promise<FetchResultResponse> {
    try {
      const { startDate, endDate } = requestBody;

      if (!startDate || !endDate) {
        this.setStatus(400);
        throw { success: false, error: "startDate and endDate are required" };
      }

      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
        this.setStatus(400);
        throw { success: false, error: "Invalid date format. Use YYYY-MM-DD" };
      }

      const result = await getLbmaService().fetchHistoricalLbmaPrices(
        metalSymbol.toUpperCase(),
        parsedStartDate,
        parsedEndDate
      );

      return {
        success: true,
        data: {
          metal: metalSymbol.toUpperCase(),
          count: result.count,
          startDate,
          endDate
        },
        errors: result.errors.length > 0 ? result.errors : undefined
      };
    } catch (error) {
      if ((error as { success?: boolean }).success === false) {
        throw error;
      }
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to fetch historical LBMA prices",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Calculate price with premium over LBMA benchmark
   * @param metalSymbol Metal symbol
   * @param quantity Quantity in troy ounces (default: 1)
   * @param currency Currency code (default: USD)
   * @param baseType Base price type (default: LBMA_PM)
   */
  @Get("premium/calculate/{metalSymbol}")
  @SuccessResponse(200, "Price with premium calculated")
  @Response<LbmaErrorResponse>(400, "Invalid parameters")
  @Response<LbmaErrorResponse>(404, "No pricing data available")
  @Response<LbmaErrorResponse>(500, "Server error")
  public async calculatePremium(
    @Path() metalSymbol: string,
    @Query() quantity?: number,
    @Query() currency?: string,
    @Query() baseType?: string
  ): Promise<PremiumCalculationResponse> {
    try {
      if (!metalSymbol || metalSymbol.trim() === "") {
        this.setStatus(400);
        throw { success: false, error: "Metal symbol is required" };
      }

      const qty = quantity || 1;
      const curr = (currency || "USD").toUpperCase();
      const priceType = (baseType as PriceTypeCode) || "LBMA_PM";

      const result = await getLbmaService().calculatePriceWithPremium(
        metalSymbol.toUpperCase(),
        qty,
        curr,
        priceType
      );

      if (!result) {
        this.setStatus(404);
        throw { success: false, error: `No pricing data available for ${metalSymbol}` };
      }

      return {
        success: true,
        data: {
          ...result,
          quantityOz: qty,
          totalBasePrice: result.basePrice * qty,
          totalFinalPrice: result.finalPrice * qty
        }
      };
    } catch (error) {
      if ((error as { success?: boolean }).success === false) {
        throw error;
      }
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to calculate price",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get active premium configurations
   * @param metal Optional metal symbol filter
   */
  @Get("premium/configs")
  @SuccessResponse(200, "Premium configurations")
  @Response<LbmaErrorResponse>(500, "Server error")
  public async getPremiumConfigs(
    @Query() metal?: string
  ): Promise<PremiumConfigsResponse> {
    try {
      const configs = await getLbmaService().getPremiumConfigs(
        metal?.toUpperCase()
      );

      return {
        success: true,
        data: configs
      };
    } catch (error) {
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to fetch premium configurations",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Create new premium configuration (Admin only)
   * @param requestBody Premium configuration data
   */
  @Post("premium/configs")
  @Security("bearerAuth", ["admin"])
  @SuccessResponse(201, "Configuration created")
  @Response<LbmaErrorResponse>(400, "Invalid data")
  @Response<LbmaErrorResponse>(401, "Unauthorized")
  @Response<LbmaErrorResponse>(403, "Forbidden")
  @Response<LbmaErrorResponse>(500, "Server error")
  public async createPremiumConfig(
    @Body() requestBody: CreatePremiumConfigRequest,
    @Request() request: ExpressRequest
  ): Promise<CreateConfigResponse> {
    try {
      const authenticatedUser = requireAuthenticatedUser(request);
      if (!requestBody.name || !requestBody.validFrom) {
        this.setStatus(400);
        throw { success: false, error: "name and validFrom are required" };
      }

      const id = await getLbmaService().savePremiumConfig({
        name: requestBody.name,
        description: requestBody.description,
        metalSymbol: requestBody.metalSymbol?.toUpperCase(),
        basePriceTypeId: requestBody.basePriceTypeId,
        premiumPercent: requestBody.premiumPercent,
        premiumFixedAmount: requestBody.premiumFixedAmount,
        currency: requestBody.currency || "USD",
        minQuantityOz: requestBody.minQuantityOz,
        maxQuantityOz: requestBody.maxQuantityOz,
        validFrom: new Date(requestBody.validFrom),
        validTo: requestBody.validTo ? new Date(requestBody.validTo) : undefined,
        isActive: requestBody.isActive !== false
      }, authenticatedUser);

      this.setStatus(201);
      return {
        success: true,
        data: { id }
      };
    } catch (error) {
      if ((error as { success?: boolean }).success === false) {
        throw error;
      }
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to create premium configuration",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Update premium configuration (Admin only)
   * @param id Configuration ID
   * @param requestBody Updated configuration data
   */
  @Patch("premium/configs/{id}")
  @Security("bearerAuth", ["admin"])
  @SuccessResponse(200, "Configuration updated")
  @Response<LbmaErrorResponse>(401, "Unauthorized")
  @Response<LbmaErrorResponse>(403, "Forbidden")
  @Response<LbmaErrorResponse>(500, "Server error")
  public async updatePremiumConfig(
    @Path() id: string,
    @Body() requestBody: UpdatePremiumConfigRequest,
    @Request() request: ExpressRequest
  ): Promise<UpdateConfigResponse> {
    try {
      const authenticatedUser = requireAuthenticatedUser(request);
      // Convert date strings to Date objects
      const updates: Partial<PremiumConfig> = {
        ...requestBody,
        validFrom: requestBody.validFrom ? new Date(requestBody.validFrom) : undefined,
        validTo: requestBody.validTo ? new Date(requestBody.validTo) : undefined
      };

      await getLbmaService().updatePremiumConfig(id, updates, authenticatedUser);

      return {
        success: true,
        message: "Premium configuration updated"
      };
    } catch (error) {
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to update premium configuration",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Compare LBMA benchmark price with current spot price
   * @param metalSymbol Metal symbol
   * @param currency Currency code (default: USD)
   */
  @Get("compare/{metalSymbol}")
  @SuccessResponse(200, "Price comparison")
  @Response<LbmaErrorResponse>(400, "Invalid parameters")
  @Response<LbmaErrorResponse>(404, "No comparison data available")
  @Response<LbmaErrorResponse>(500, "Server error")
  public async comparePrices(
    @Path() metalSymbol: string,
    @Query() currency?: string
  ): Promise<CompareResponse> {
    try {
      if (!metalSymbol || metalSymbol.trim() === "") {
        this.setStatus(400);
        throw { success: false, error: "Metal symbol is required" };
      }

      const curr = (currency || "USD").toUpperCase();

      const comparison = await getLbmaService().compareLbmaToSpot(
        metalSymbol.toUpperCase(),
        curr
      );

      if (!comparison) {
        this.setStatus(404);
        throw { success: false, error: `No comparison data available for ${metalSymbol}` };
      }

      return {
        success: true,
        data: {
          metal: metalSymbol.toUpperCase(),
          currency: curr,
          ...comparison
        }
      };
    } catch (error) {
      if ((error as { success?: boolean }).success === false) {
        throw error;
      }
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to compare prices",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}
