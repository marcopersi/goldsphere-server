/**
 * Currencies Controller - tsoa implementation
 */

import { Body, Controller, Delete, Get, Path, Post, Put, Response, Route, SuccessResponse, Tags } from "tsoa";
import { getPool } from "../dbConfig";
import { createLogger } from "../utils/logger";

const logger = createLogger("CurrenciesController");

interface Currency {
  id: string;
  isoCode2: string;
  isoCode3: string;
  isoNumericCode: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CurrencyRequest {
  isoCode2: string;
  isoCode3: string;
  isoNumericCode: number;
}

interface CurrenciesErrorResponse {
  error: string;
  details?: string;
}

@Route("currencies")
@Tags("References")
export class CurrenciesController extends Controller {
  @Get("/")
  @SuccessResponse(200, "Currencies list")
  @Response<CurrenciesErrorResponse>(500, "Server error")
  public async listCurrencies(): Promise<Currency[]> {
    try {
      const result = await getPool().query(
        "SELECT id, isocode2, isocode3, isonumericcode, createdAt, updatedAt FROM currency ORDER BY isocode3"
      );
      return result.rows.map(row => ({
        id: row.id,
        isoCode2: row.isocode2,
        isoCode3: row.isocode3,
        isoNumericCode: row.isonumericcode,
        createdAt: row.createdat,
        updatedAt: row.updatedat
      }));
    } catch (error) {
      logger.error("Failed to fetch currencies", error);
      this.setStatus(500);
      throw new Error("Failed to fetch currencies");
    }
  }

  @Post("/")
  @SuccessResponse(201, "Currency created")
  @Response<CurrenciesErrorResponse>(500, "Server error")
  public async createCurrency(@Body() requestBody: CurrencyRequest): Promise<Currency> {
    try {
      const result = await getPool().query(
        "INSERT INTO currency (isocode2, isocode3, isonumericcode) VALUES ($1, $2, $3) RETURNING *",
        [requestBody.isoCode2, requestBody.isoCode3, requestBody.isoNumericCode]
      );
      this.setStatus(201);
      return {
        id: result.rows[0].id,
        isoCode2: result.rows[0].isocode2,
        isoCode3: result.rows[0].isocode3,
        isoNumericCode: result.rows[0].isonumericcode,
        createdAt: result.rows[0].createdat,
        updatedAt: result.rows[0].updatedat
      };
    } catch (error) {
      logger.error("Failed to add currency", error);
      this.setStatus(500);
      throw new Error("Failed to add currency");
    }
  }

  @Put("/{id}")
  @SuccessResponse(200, "Currency updated")
  @Response<CurrenciesErrorResponse>(500, "Server error")
  public async updateCurrency(
    @Path() id: string,
    @Body() requestBody: CurrencyRequest
  ): Promise<Currency> {
    try {
      const result = await getPool().query(
        "UPDATE currency SET isocode2 = $1, isocode3 = $2, isonumericcode = $3, updatedat = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *",
        [requestBody.isoCode2, requestBody.isoCode3, requestBody.isoNumericCode, id]
      );
      return {
        id: result.rows[0].id,
        isoCode2: result.rows[0].isocode2,
        isoCode3: result.rows[0].isocode3,
        isoNumericCode: result.rows[0].isonumericcode,
        createdAt: result.rows[0].createdat,
        updatedAt: result.rows[0].updatedat
      };
    } catch (error) {
      logger.error("Failed to update currency", error, { id });
      this.setStatus(500);
      throw new Error("Failed to update currency");
    }
  }

  @Delete("/{id}")
  @SuccessResponse(204, "Currency deleted")
  @Response<CurrenciesErrorResponse>(500, "Server error")
  public async deleteCurrency(@Path() id: string): Promise<void> {
    try {
      await getPool().query("DELETE FROM currency WHERE id = $1", [id]);
      this.setStatus(204);
      return;
    } catch (error) {
      logger.error("Failed to delete currency", error, { id });
      this.setStatus(500);
      throw new Error("Failed to delete currency");
    }
  }

  @Get("/{id}")
  @SuccessResponse(200, "Currency details")
  @Response<CurrenciesErrorResponse>(404, "Currency not found")
  @Response<CurrenciesErrorResponse>(500, "Server error")
  public async getCurrencyById(@Path() id: string): Promise<Currency> {
    try {
      const result = await getPool().query(
        "SELECT id, isocode2, isocode3, isonumericcode, createdAt, updatedAt FROM currency WHERE id = $1",
        [id]
      );

      if (result.rows.length === 0) {
        this.setStatus(404);
        throw new Error("Currency not found");
      }

      return {
        id: result.rows[0].id,
        isoCode2: result.rows[0].isocode2,
        isoCode3: result.rows[0].isocode3,
        isoNumericCode: result.rows[0].isonumericcode,
        createdAt: result.rows[0].createdat,
        updatedAt: result.rows[0].updatedat
      };
    } catch (error) {
      logger.error("Failed to fetch currency", error, { id });
      if ((error as Error).message.includes("not found")) {
        this.setStatus(404);
        throw new Error("Currency not found");
      }
      this.setStatus(500);
      throw new Error("Failed to fetch currency");
    }
  }
}
