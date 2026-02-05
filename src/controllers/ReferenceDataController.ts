/**
 * Reference Data Controller - tsoa implementation
 * 
 * Provides combined reference data for clients.
 */

import { Controller, Get, Route, Tags, Response, SuccessResponse } from "tsoa";
import { getPool } from "../dbConfig";
import {
  Metal,
  ProductTypeEnum,
  CountryEnum,
  Custodian,
  PaymentFrequency,
  CustodyServiceType
} from "@marcopersi/shared";
import { createLogger } from "../utils/logger";

const logger = createLogger("ReferenceDataController");

interface ReferenceData {
  metals: Array<{ symbol: string; name: string }>;
  productTypes: Array<{ name: string }>;
  countries: Array<{ code: string; name: string }>;
  producers: Array<{ id: string; name: string }>;
  currencies: Array<{ id: string; isoCode2: string; isoCode3: string; isoNumericCode: number }>;
  custodians: Array<{ value: string; name: string }>;
  paymentFrequencies: Array<{ value: string; displayName: string; description: string }>;
  custodyServiceTypes: Array<{ value: string; displayName: string; description: string }>;
}

interface ReferenceDataResponse {
  success: boolean;
  data: ReferenceData;
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
      const producersResult = await getPool().query(
        "SELECT id, producerName as name FROM producer ORDER BY producerName"
      );
      const currenciesResult = await getPool().query(
        "SELECT id, isocode2, isocode3, isonumericcode FROM currency ORDER BY isocode3"
      );

      const referenceData: ReferenceData = {
        metals: Metal.values().map(metal => ({
          symbol: metal.symbol,
          name: metal.name
        })),
        productTypes: ProductTypeEnum.values().map(productType => ({
          name: productType.name
        })),
        countries: CountryEnum.values().map(country => ({
          code: country.code,
          name: country.name
        })),
        producers: producersResult.rows.map(row => ({
          id: row.id,
          name: row.name
        })),
        currencies: currenciesResult.rows.map(row => ({
          id: row.id,
          isoCode2: row.isocode2,
          isoCode3: row.isocode3,
          isoNumericCode: row.isonumericcode
        })),
        custodians: Custodian.values().map(custodian => ({
          value: custodian.value,
          name: custodian.name
        })),
        paymentFrequencies: PaymentFrequency.values().map(frequency => ({
          value: frequency.value,
          displayName: frequency.displayName,
          description: frequency.description
        })),
        custodyServiceTypes: CustodyServiceType.values().map(serviceType => ({
          value: serviceType.value,
          displayName: serviceType.displayName,
          description: serviceType.description
        }))
      };

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
