/**
 * Product Types Controller - tsoa implementation
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
import { getPool } from "../dbConfig";
import { ReferenceServiceFactory } from "../services/reference";
import type { IReferenceService } from "../services/reference/IReferenceService";
import type { ProductTypeResponse } from "../services/reference/types/ReferenceTypes";
import { createLogger } from "../utils/logger";
import { normalizePagination, type StandardPagination } from "../utils/paginationResponse";

const logger = createLogger("ProductTypesController");

function createHttpError(status: number, message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

interface ProductTypesErrorResponse {
  success: false;
  error: string;
  details?: string;
}

interface ProductTypeRequest {
  productTypeName: string;
}

interface ProductTypesListResponse {
  success: true;
  data: {
    items: ProductTypeResponse[];
    pagination: StandardPagination;
  };
}

@Route("productTypes")
@Tags("References")
export class ProductTypesController extends Controller {
  private readonly referenceService: IReferenceService;

  constructor() {
    super();
    this.referenceService = ReferenceServiceFactory.createService(getPool());
  }

  @Get("/")
  @SuccessResponse(200, "Product types list")
  @Response<ProductTypesErrorResponse>(500, "Server error")
  public async listProductTypes(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() search?: string
  ): Promise<ProductTypesListResponse> {
    try {
      const result = await this.referenceService.listProductTypes({ page, limit, search });
      return {
        success: true,
        data: {
          items: result.items,
          pagination: normalizePagination(result.pagination)
        }
      };
    } catch (error) {
      logger.error("Failed to fetch product types", error);
      this.setStatus(500);
      throw new Error("Failed to fetch product types");
    }
  }

  @Post("/")
  @SuccessResponse(201, "Product type created")
  @Response<ProductTypesErrorResponse>(500, "Server error")
  public async createProductType(
    @Body() requestBody: ProductTypeRequest
  ): Promise<ProductTypeResponse> {
    try {
      const result = await getPool().query(
        "INSERT INTO productType (productTypeName) VALUES ($1) RETURNING *",
        [requestBody.productTypeName]
      );
      this.setStatus(201);
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to add product type", error);
      this.setStatus(500);
      throw new Error("Failed to add product type");
    }
  }

  @Put("/{id}")
  @SuccessResponse(200, "Product type updated")
  @Response<ProductTypesErrorResponse>(500, "Server error")
  public async updateProductType(
    @Path() id: string,
    @Body() requestBody: ProductTypeRequest
  ): Promise<ProductTypeResponse> {
    try {
      const result = await getPool().query(
        "UPDATE productType SET productTypeName = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
        [requestBody.productTypeName, id]
      );
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to update product type", error, { id });
      this.setStatus(500);
      throw new Error("Failed to update product type");
    }
  }

  @Delete("/{id}")
  @SuccessResponse(204, "Product type deleted")
  @Response<ProductTypesErrorResponse>(500, "Server error")
  public async deleteProductType(@Path() id: string): Promise<void> {
    try {
      await getPool().query("DELETE FROM productType WHERE id = $1", [id]);
      this.setStatus(204);
      return;
    } catch (error) {
      logger.error("Failed to delete product type", error, { id });
      this.setStatus(500);
      throw new Error("Failed to delete product type");
    }
  }

  @Get("/{id}")
  @SuccessResponse(200, "Product type details")
  @Response<ProductTypesErrorResponse>(404, "Product type not found")
  @Response<ProductTypesErrorResponse>(500, "Server error")
  public async getProductTypeById(
    @Path() id: string
  ): Promise<{ success: true; data: ProductTypeResponse }> {
    try {
      const productType = await this.referenceService.getProductTypeById(id);
      return {
        success: true,
        data: productType
      };
    } catch (error) {
      logger.error("Failed to fetch product type", error, { id });
      const httpError = error as Error & { status?: number };
      if (typeof httpError.status === "number") {
        throw httpError;
      }

      if ((error as Error).message.includes("not found")) {
        throw createHttpError(404, "Product type not found");
      }
      throw createHttpError(500, "Failed to fetch product type");
    }
  }
}
