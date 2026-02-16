/**
 * Aggregated Reference Data Service
 *
 * Provides a single payload used by admin/client UIs
 * to bootstrap reference datasets.
 */

import { Pool } from 'pg';
import {
  CountryEnum,
  Custodian,
  CustodyServiceType,
  Metal,
  PaymentFrequency,
  ProductTypeEnum,
} from '@marcopersi/shared';
import { UserRole, UserTitle } from '../user/types/UserEnums';

export interface AggregatedReferenceData {
  metals: Array<{ symbol: string; name: string }>;
  productTypes: Array<{ name: string }>;
  countries: Array<{ code: string; name: string }>;
  weightUnits: Array<{ value: string; displayName: string; aliases: string[] }>;
  roles: Array<{ value: string; displayName: string }>;
  titles: Array<{ value: string; displayName: string }>;
  producers: Array<{ id: string; name: string }>;
  currencies: Array<{ id: string; isoCode2: string; isoCode3: string; isoNumericCode: number }>;
  custodians: Array<{ value: string; name: string }>;
  paymentFrequencies: Array<{ value: string; displayName: string; description: string }>;
  custodyServiceTypes: Array<{ value: string; displayName: string; description: string }>;
}

export class ReferenceDataAggregateService {
  constructor(private readonly pool: Pool) {}

  async getAll(): Promise<AggregatedReferenceData> {
    const [producersResult, currenciesResult] = await Promise.all([
      this.pool.query('SELECT id, producerName as name FROM producer ORDER BY producerName'),
      this.pool.query('SELECT id, isocode2, isocode3, isonumericcode FROM currency ORDER BY isocode3'),
    ]);

    return {
      metals: Metal.values().map((metal) => ({
        symbol: metal.symbol,
        name: metal.name,
      })),
      productTypes: ProductTypeEnum.values().map((productType) => ({
        name: productType.name,
      })),
      countries: CountryEnum.values().map((country) => ({
        code: country.code,
        name: country.name,
      })),
      weightUnits: [
        { value: 'grams', displayName: 'g', aliases: ['g', 'gram', 'grams'] },
        { value: 'kilograms', displayName: 'kg', aliases: ['kg', 'kilogram', 'kilograms'] },
        { value: 'troy_ounces', displayName: 'ozt', aliases: ['ozt', 'toz', 'troy_oz', 'troy ounce', 'troy ounces'] },
      ],
      roles: Object.values(UserRole).map((role) => ({
        value: role,
        displayName: role,
      })),
      titles: Object.values(UserTitle).map((title) => ({
        value: title,
        displayName: title,
      })),
      producers: producersResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
      })),
      currencies: currenciesResult.rows.map((row) => ({
        id: row.id,
        isoCode2: row.isocode2,
        isoCode3: row.isocode3,
        isoNumericCode: row.isonumericcode,
      })),
      custodians: Custodian.values().map((custodian) => ({
        value: custodian.value,
        name: custodian.name,
      })),
      paymentFrequencies: PaymentFrequency.values().map((frequency) => ({
        value: frequency.value,
        displayName: frequency.displayName,
        description: frequency.description,
      })),
      custodyServiceTypes: CustodyServiceType.values().map((serviceType) => ({
        value: serviceType.value,
        displayName: serviceType.displayName,
        description: serviceType.description,
      })),
    };
  }
}
