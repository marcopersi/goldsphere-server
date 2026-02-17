import { PositionSchema } from "@marcopersi/shared";
import { getPool } from "../../dbConfig";
import { PRODUCT_SELECT_QUERY } from "../../services/portfolio/repository/PortfolioQueries";
import { getApiBaseUrl } from "../../utils/getApiBaseUrl";
import type {
  PositionDetail,
  PositionResponse,
  PositionsCustodyInfo,
  PositionsProductInfo
} from "./PositionsTypes";

function toNumber(value: unknown, fieldName: string): number {
  const parsedValue = Number(value);
  if (Number.isNaN(parsedValue)) {
    throw new TypeError(`Invalid numeric value for ${fieldName}`);
  }

  return parsedValue;
}

function toOptionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return toNumber(value, fieldName);
}

function toDate(value: unknown, fieldName: string): Date {
  if (!(value instanceof Date)) {
    throw new TypeError(`Invalid date value for ${fieldName}`);
  }

  return value;
}

async function fetchProductForPosition(productId: string): Promise<PositionsProductInfo> {
  const result = await getPool().query(PRODUCT_SELECT_QUERY, [productId]);
  if (result.rows.length === 0) {
    throw new Error(`Product not found: ${productId}`);
  }

  const row = result.rows[0] as Record<string, unknown>;
  const apiBaseUrl = getApiBaseUrl();

  return {
    id: String(row.id),
    name: String(row.productname),
    type: String(row.producttype),
    productTypeId: String(row.producttypeid),
    metal: {
      id: String(row.metal_id),
      name: String(row.metalname),
      symbol: String(row.metal_symbol)
    },
    metalId: String(row.metalid),
    weight: toNumber(row.fineweight, "product.weight"),
    weightUnit: String(row.unitofmeasure),
    purity: toNumber(row.purity, "product.purity"),
    price: toNumber(row.price, "product.price"),
    currency: String(row.currency),
    producer: String(row.producer),
    producerId: String(row.producerid),
    country: row.country === null ? null : String(row.country),
    countryId: row.countryid === null || row.countryid === undefined ? undefined : String(row.countryid),
    year: toOptionalNumber(row.productyear, "product.year"),
    description: String(row.description ?? ""),
    imageUrl: `${apiBaseUrl}/api/products/${String(row.id)}/image`,
    inStock: Boolean(row.instock),
    stockQuantity: toNumber(row.stockquantity, "product.stockQuantity"),
    minimumOrderQuantity: toNumber(row.minimumorderquantity, "product.minimumOrderQuantity"),
    createdAt: toDate(row.createdat, "product.createdAt"),
    updatedAt: toDate(row.updatedat, "product.updatedAt")
  };
}

async function fetchCustodyForPosition(custodyServiceId: string): Promise<PositionsCustodyInfo | null> {
  const custodyQuery = `
    SELECT
      cs.id as custodyServiceId,
      cs.custodyServiceName,
      c.id as custodianId,
      c.custodianName,
      cs.fee,
      cs.paymentFrequency
    FROM custodyService cs
    JOIN custodian c ON cs.custodianId = c.id
    WHERE cs.id = $1
  `;

  const custodyResult = await getPool().query(custodyQuery, [custodyServiceId]);
  if (custodyResult.rows.length === 0) {
    return null;
  }

  const row = custodyResult.rows[0] as Record<string, unknown>;
  return {
    custodyServiceId: String(row.custodyserviceid),
    custodyServiceName: String(row.custodyservicename),
    custodianId: String(row.custodianid),
    custodianName: String(row.custodianname),
    fee: toNumber(row.fee, "custody.fee"),
    paymentFrequency: String(row.paymentfrequency)
  };
}

export async function mapDatabaseRowToPosition(row: Record<string, unknown>): Promise<PositionDetail> {
  const productId = String(row.productid);
  const product = await fetchProductForPosition(productId);

  const rawCustodyServiceId = row.custodyserviceid;
  const custodyServiceId =
    rawCustodyServiceId === null || rawCustodyServiceId === undefined
      ? null
      : String(rawCustodyServiceId);
  const custody = custodyServiceId ? await fetchCustodyForPosition(custodyServiceId) : null;

  return {
    id: String(row.id),
    userId: String(row.userid),
    productId,
    portfolioId: String(row.portfolioid),
    product,
    purchaseDate: toDate(row.purchasedate, "position.purchaseDate"),
    purchasePrice: toNumber(row.purchaseprice, "position.purchasePrice"),
    marketPrice: toNumber(row.marketprice, "position.marketPrice"),
    quantity: toNumber(row.quantity, "position.quantity"),
    custodyServiceId,
    custody,
    status: String(row.status),
    notes: String(row.notes ?? ""),
    createdAt: toDate(row.createdat, "position.createdAt"),
    updatedAt: toDate(row.updatedat, "position.updatedAt")
  };
}

export function toSchemaCompatiblePosition(position: PositionDetail): PositionResponse {
  const schemaCompatiblePosition = {
    ...position,
    custodyServiceId: position.custodyServiceId ?? undefined,
    custody: position.custody ?? undefined
  };

  return PositionSchema.parse(schemaCompatiblePosition);
}
