/**
 * Market Data Controller - tsoa implementation
 * 
 * RESTful endpoints for precious metal market data including
 * current prices, historical data, and provider management.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Route,
  Path,
  Query,
  Tags,
  SuccessResponse,
  Response,
  Security
} from "tsoa";
import { getPool } from "../dbConfig";
import { MarketDataServiceFactory, MarketDataQuery } from "../services/market-data";
import {
  MarketPrice,
  PriceHistory,
  PriceUpdateResult,
  MarketDataProvider
} from "../services/market-data/types/MarketDataTypes";

// ============================================================================
// Response Interfaces
// ============================================================================

interface MarketDataErrorResponse {
  success: false;
  error: string;
  details?: string;
}

interface SinglePriceResponse {
  success: true;
  data: MarketPrice;
}

interface MultiplePricesResponse {
  success: true;
  data: Record<string, MarketPrice>;
}

interface HistoryResponse {
  success: true;
  data: PriceHistory[];
  count: number;
}

interface UpdateResponse {
  success: true;
  data: PriceUpdateResult;
}

interface UpdateErrorResponse {
  success: false;
  error: string;
  details?: string[];
}

interface ProvidersResponse {
  success: true;
  data: MarketDataProvider[];
}

interface CacheCleanupResponse {
  success: true;
  message: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getMarketDataService() {
  return MarketDataServiceFactory.create(getPool());
}

// ============================================================================
// Controller
// ============================================================================

@Route("market-data")
@Tags("Market Data")
export class MarketDataController extends Controller {
  /**
   * Get current market price for a specific metal
   * @param metalSymbol Metal symbol (e.g., XAU for gold, XAG for silver)
   * @param currency Currency code (default: USD)
   */
  @Get("price/{metalSymbol}")
  @SuccessResponse(200, "Current market price")
  @Response<MarketDataErrorResponse>(400, "Metal symbol is required")
  @Response<MarketDataErrorResponse>(404, "No market data found")
  @Response<MarketDataErrorResponse>(500, "Server error")
  public async getCurrentPrice(
    @Path() metalSymbol: string,
    @Query() currency?: string
  ): Promise<SinglePriceResponse | MarketDataErrorResponse> {
    try {
      if (!metalSymbol || metalSymbol.trim() === "") {
        this.setStatus(400);
        return { success: false, error: "Metal symbol is required" };
      }

      const currencyCode = (currency || "USD").toUpperCase();
      const price = await getMarketDataService().getCurrentPrice(
        metalSymbol.toUpperCase(),
        currencyCode
      );

      if (!price) {
        this.setStatus(404);
        return { success: false, error: `No market data found for ${metalSymbol}` };
      }

      return {
        success: true,
        data: price
      };
    } catch (error) {
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to fetch market price",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get current prices for multiple metals
   * @param symbols Comma-separated metal symbols (e.g., XAU,XAG,XPT)
   * @param currency Currency code (default: USD)
   */
  @Get("prices")
  @SuccessResponse(200, "Current prices for requested metals")
  @Response<MarketDataErrorResponse>(400, "At least one metal symbol is required")
  @Response<MarketDataErrorResponse>(500, "Server error")
  public async getMultiplePrices(
    @Query() symbols?: string,
    @Query() currency?: string
  ): Promise<MultiplePricesResponse | MarketDataErrorResponse> {
    try {
      if (!symbols || symbols.trim() === "") {
        this.setStatus(400);
        return { success: false, error: "At least one metal symbol is required" };
      }

      const currencyCode = (currency || "USD").toUpperCase();
      const metalSymbols = symbols.split(",").map(s => s.trim().toUpperCase());

      const prices = await Promise.all(
        metalSymbols.map(symbol =>
          getMarketDataService().getCurrentPrice(symbol, currencyCode)
        )
      );

      const result = prices.reduce((acc, price, index) => {
        if (price) {
          acc[metalSymbols[index]] = price;
        }
        return acc;
      }, {} as Record<string, MarketPrice>);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to fetch market prices",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get historical price data for a metal
   * @param metalSymbol Metal symbol
   * @param startDate Start date (ISO 8601)
   * @param endDate End date (ISO 8601)
   * @param currency Currency code (default: USD)
   * @param limit Maximum number of records (default: 100, max: 1000)
   */
  @Get("history/{metalSymbol}")
  @SuccessResponse(200, "Historical price data")
  @Response<MarketDataErrorResponse>(400, "Invalid parameters")
  @Response<MarketDataErrorResponse>(500, "Server error")
  public async getHistoricalPrices(
    @Path() metalSymbol: string,
    @Query() startDate?: string,
    @Query() endDate?: string,
    @Query() currency?: string,
    @Query() limit?: number
  ): Promise<HistoryResponse | MarketDataErrorResponse> {
    try {
      if (!metalSymbol || metalSymbol.trim() === "") {
        this.setStatus(400);
        return { success: false, error: "Metal symbol is required" };
      }

      // Parse dates if provided
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate);
        if (Number.isNaN(parsedStartDate.getTime())) {
          this.setStatus(400);
          return { success: false, error: "Invalid startDate format" };
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate);
        if (Number.isNaN(parsedEndDate.getTime())) {
          this.setStatus(400);
          return { success: false, error: "Invalid endDate format" };
        }
      }

      const query: MarketDataQuery = {
        metalSymbol: metalSymbol.toUpperCase(),
        currency: (currency || "USD").toUpperCase(),
        limit: Math.min(limit || 100, 1000),
        startDate: parsedStartDate,
        endDate: parsedEndDate
      };

      const history = await getMarketDataService().getHistoricalPrices(query);

      return {
        success: true,
        data: history,
        count: history.length
      };
    } catch (error) {
      this.setStatus(500);
      return {
        success: false,
        error: "Failed to fetch price history",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Manually trigger price update from external APIs (Admin only)
   */
  @Post("update")
  @Security("bearerAuth", ["admin"])
  @SuccessResponse(200, "Prices updated successfully")
  @Response<MarketDataErrorResponse>(401, "Unauthorized")
  @Response<MarketDataErrorResponse>(403, "Forbidden - Admin access required")
  @Response<UpdateErrorResponse>(500, "Failed to update prices")
  public async triggerPriceUpdate(): Promise<UpdateResponse> {
    try {
      const result = await getMarketDataService().updatePricesFromApi();

      if (result.success) {
        return {
          success: true,
          data: result
        };
      } else {
        this.setStatus(500);
        throw {
          success: false,
          error: "Failed to update prices",
          details: result.errors
        };
      }
    } catch (error) {
      if ((error as { success?: boolean }).success === false) {
        throw error;
      }
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to update market prices",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get status of all market data providers
   */
  @Get("providers")
  @SuccessResponse(200, "Provider status list")
  @Response<MarketDataErrorResponse>(500, "Server error")
  public async getProviderStatus(): Promise<ProvidersResponse> {
    try {
      const providers = await getMarketDataService().getProviderStatus();

      return {
        success: true,
        data: providers
      };
    } catch (error) {
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to fetch provider status",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Clear expired cache entries (Admin only)
   */
  @Delete("cache")
  @Security("bearerAuth", ["admin"])
  @SuccessResponse(200, "Cache cleanup completed")
  @Response<MarketDataErrorResponse>(401, "Unauthorized")
  @Response<MarketDataErrorResponse>(403, "Forbidden - Admin access required")
  @Response<MarketDataErrorResponse>(500, "Server error")
  public async cleanupCache(): Promise<CacheCleanupResponse> {
    try {
      await getMarketDataService().cleanupCache();

      return {
        success: true,
        message: "Cache cleanup completed"
      };
    } catch (error) {
      this.setStatus(500);
      throw {
        success: false,
        error: "Failed to cleanup cache",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}
