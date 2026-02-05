/**
 * Countries Controller - tsoa implementation
 */

import { Body, Controller, Delete, Get, Path, Post, Put, Response, Route, SuccessResponse, Tags } from "tsoa";
import { getPool } from "../dbConfig";
import { createLogger } from "../utils/logger";

const logger = createLogger("CountriesController");

interface Country {
  id: string;
  countryName: string;
  isoCode2: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CountryRequest {
  countryName: string;
  isoCode2: string;
}

interface CountriesErrorResponse {
  error: string;
  details?: string;
}

@Route("countries")
@Tags("References")
export class CountriesController extends Controller {
  @Get("/")
  @SuccessResponse(200, "Countries list")
  @Response<CountriesErrorResponse>(500, "Server error")
  public async listCountries(): Promise<Country[]> {
    try {
      const result = await getPool().query(
        "SELECT id, countryName, isoCode2, createdAt, updatedAt FROM country ORDER BY countryName"
      );
      return result.rows;
    } catch (error) {
      logger.error("Failed to fetch countries", error);
      this.setStatus(500);
      throw new Error("Failed to fetch countries");
    }
  }

  @Post("/")
  @SuccessResponse(201, "Country created")
  @Response<CountriesErrorResponse>(500, "Server error")
  public async createCountry(@Body() requestBody: CountryRequest): Promise<Country> {
    try {
      const result = await getPool().query(
        "INSERT INTO country (countryName, isoCode2) VALUES ($1, $2) RETURNING *",
        [requestBody.countryName, requestBody.isoCode2]
      );
      this.setStatus(201);
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to add country", error);
      this.setStatus(500);
      throw new Error("Failed to add country");
    }
  }

  @Put("/{id}")
  @SuccessResponse(200, "Country updated")
  @Response<CountriesErrorResponse>(500, "Server error")
  public async updateCountry(
    @Path() id: string,
    @Body() requestBody: CountryRequest
  ): Promise<Country> {
    try {
      const result = await getPool().query(
        "UPDATE country SET countryName = $1, isoCode2 = $2, updatedAt = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
        [requestBody.countryName, requestBody.isoCode2, id]
      );
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to update country", error, { id });
      this.setStatus(500);
      throw new Error("Failed to update country");
    }
  }

  @Delete("/{id}")
  @SuccessResponse(204, "Country deleted")
  @Response<CountriesErrorResponse>(500, "Server error")
  public async deleteCountry(@Path() id: string): Promise<void> {
    try {
      await getPool().query("DELETE FROM country WHERE id = $1", [id]);
      this.setStatus(204);
      return;
    } catch (error) {
      logger.error("Failed to delete country", error, { id });
      this.setStatus(500);
      throw new Error("Failed to delete country");
    }
  }

  @Get("/{id}")
  @SuccessResponse(200, "Country details")
  @Response<CountriesErrorResponse>(500, "Server error")
  public async getCountryById(@Path() id: string): Promise<Country> {
    try {
      const result = await getPool().query(
        "SELECT id, countryName, isoCode2, createdAt, updatedAt FROM country WHERE id = $1",
        [id]
      );
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to fetch country", error, { id });
      this.setStatus(500);
      throw new Error("Failed to fetch country");
    }
  }
}
