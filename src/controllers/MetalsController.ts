/**
 * Metals Controller - tsoa implementation
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Put,
  Query,
  Response,
  Route,
  SuccessResponse,
  Tags
} from "tsoa";
import type { PaginationResponse } from "@marcopersi/shared";
import { getPool } from "../dbConfig";
import { ReferenceServiceFactory } from "../services/reference";
import type { IReferenceService } from "../services/reference/IReferenceService";
import type { MetalResponse } from "../services/reference/types/ReferenceTypes";
import { createLogger } from "../utils/logger";

const logger = createLogger("MetalsController");

function createHttpError(status: number, message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

interface MetalsErrorResponse {
  success: false;
  error: string;
  details?: string;
}

interface MetalRequest {
  metalName: string;
}

interface MetalsListResponse {
  success: true;
  data: {
    items: MetalResponse[];
    pagination: PaginationResponse;
  };
}

@Route("metals")
@Tags("References")
export class MetalsController extends Controller {
  private readonly referenceService: IReferenceService;

  constructor() {
    super();
    this.referenceService = ReferenceServiceFactory.createService(getPool());
  }

  @Get("/")
  @SuccessResponse(200, "Metals list")
  @Response<MetalsErrorResponse>(500, "Server error")
  public async listMetals(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() search?: string
  ): Promise<MetalsListResponse> {
    try {
      const result = await this.referenceService.listMetals({ page, limit, search });
      return {
        success: true,
        data: {
          items: result.items,
          pagination: result.pagination
        }
      };
    } catch (error) {
      logger.error("Failed to fetch metals", error);
      this.setStatus(500);
      throw new Error("Failed to fetch metals");
    }
  }

  @Post("/")
  @SuccessResponse(201, "Metal created")
  @Response<MetalsErrorResponse>(500, "Server error")
  public async createMetal(@Body() requestBody: MetalRequest): Promise<MetalResponse> {
    try {
      const result = await getPool().query(
        "INSERT INTO metal (name) VALUES ($1) RETURNING *",
        [requestBody.metalName]
      );
      this.setStatus(201);
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to add metal", error);
      this.setStatus(500);
      throw new Error("Failed to add metal");
    }
  }

  @Put("/{id}")
  @SuccessResponse(200, "Metal updated")
  @Response<MetalsErrorResponse>(500, "Server error")
  public async updateMetal(
    @Path() id: string,
    @Body() requestBody: MetalRequest
  ): Promise<MetalResponse> {
    try {
      const result = await getPool().query(
        "UPDATE metal SET name = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
        [requestBody.metalName, id]
      );
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to update metal", error, { id });
      this.setStatus(500);
      throw new Error("Failed to update metal");
    }
  }

  @Delete("/{id}")
  @SuccessResponse(204, "Metal deleted")
  @Response<MetalsErrorResponse>(500, "Server error")
  public async deleteMetal(@Path() id: string): Promise<void> {
    try {
      await getPool().query("DELETE FROM metal WHERE id = $1", [id]);
      this.setStatus(204);
      return;
    } catch (error) {
      logger.error("Failed to delete metal", error, { id });
      this.setStatus(500);
      throw new Error("Failed to delete metal");
    }
  }

  @Get("/{id}")
  @SuccessResponse(200, "Metal details")
  @Response<MetalsErrorResponse>(404, "Metal not found")
  @Response<MetalsErrorResponse>(500, "Server error")
  public async getMetalById(@Path() id: string): Promise<{ success: true; data: MetalResponse }> {
    try {
      const metal = await this.referenceService.getMetalById(id);
      return {
        success: true,
        data: metal
      };
    } catch (error) {
      logger.error("Failed to fetch metal", error, { id });
      const httpError = error as Error & { status?: number };
      if (typeof httpError.status === "number") {
        throw httpError;
      }

      if ((error as Error).message.includes("not found")) {
        throw createHttpError(404, "Metal not found");
      }
      throw createHttpError(500, "Failed to fetch metal");
    }
  }
}
