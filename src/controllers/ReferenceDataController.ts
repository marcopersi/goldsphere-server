/**
 * Reference Data Controller - tsoa implementation
 * 
 * Provides combined reference data for clients.
 */

import { Controller, Get, Route, Tags, Response, SuccessResponse } from "tsoa";
import { getPool } from "../dbConfig";
import { createLogger } from "../utils/logger";
import { AggregatedReferenceData, ReferenceDataAggregateService } from "../services/reference/ReferenceDataAggregateService";

const logger = createLogger("ReferenceDataController");

interface ReferenceDataResponse {
  success: boolean;
  data: AggregatedReferenceData;
}

interface ReferenceDataErrorResponse {
  success: false;
  error: string;
  details?: string;
}

@Route("references")
@Tags("References")
export class ReferenceDataController extends Controller {
  /**
   * Get all reference data
   */
  @Get("/")
  @SuccessResponse(200, "Reference data")
  @Response<ReferenceDataErrorResponse>(500, "Server error")
  public async getAllReferenceData(): Promise<ReferenceDataResponse> {
    try {
      const service = new ReferenceDataAggregateService(getPool());
      const referenceData = await service.getAll();

      return {
        success: true,
        data: referenceData
      };
    } catch (error) {
      logger.error("Failed to fetch reference data", error);
      this.setStatus(500);
      throw new Error("Failed to fetch reference data");
    }
  }
}
