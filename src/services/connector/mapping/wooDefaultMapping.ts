/**
 * WooCommerce Default Mapping Rules
 * 
 * Provides baseline mapping rules for WooCommerce payloads.
 */

import { ExternalMappingRule } from "../types/ExternalTypes";

export const defaultWooProductRules: ExternalMappingRule[] = [
  { sourceField: "name", targetField: "name", required: true, transform: { type: "string" } },
  { sourceField: "price", targetField: "price", required: true, transform: { type: "number" } },
  { sourceField: "currency", targetField: "currency", required: true, transform: { type: "currency" } },
  { sourceField: "description", targetField: "description", transform: { type: "string" } },
  { sourceField: "stock_quantity", targetField: "stockQuantity", transform: { type: "number" } },
  { sourceField: "stock_status", targetField: "inStock", transform: { type: "stockStatus" } },
  { sourceField: "images.0.src", targetField: "imageUrl", transform: { type: "string" } },
  { sourceField: "sku", targetField: "sku", transform: { type: "string" } }
];

export const defaultWooOrderRules: ExternalMappingRule[] = [
  { sourceField: "billing.email", targetField: "userEmail", required: true, transform: { type: "string" } },
  { sourceField: "status", targetField: "status", required: true, transform: {
    type: "enum",
    map: {
      pending: "PENDING",
      "on-hold": "PENDING",
      processing: "CONFIRMED",
      completed: "COMPLETED",
      cancelled: "CANCELLED",
      failed: "CANCELLED"
    }
  }},
  { sourceField: "currency", targetField: "currency", required: true, transform: { type: "currency" } },
  { sourceField: "total", targetField: "totalAmount", transform: { type: "number" } },
  { sourceField: "total_tax", targetField: "taxes", transform: { type: "number" } },
  { sourceField: "subtotal", targetField: "subtotal", transform: { type: "number" } }
];

export interface WooOrderItemMapping {
  externalProductId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface WooOrderItemsResult {
  items: WooOrderItemMapping[];
  errors: string[];
}

export function mapWooOrderLineItems(payload: Record<string, unknown>): WooOrderItemsResult {
  const errors: string[] = [];
  const items: WooOrderItemMapping[] = [];
  const lineItems = payload.line_items;

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return { items, errors: ["Missing line_items"] };
  }

  for (const item of lineItems) {
    if (!item || typeof item !== "object") {
      errors.push("Invalid line_item entry");
      continue;
    }

    const record = item as Record<string, unknown>;
    const rawProductId = record.product_id;
    const rawQuantity = record.quantity;
    const rawTotal = record.total;
    const rawSubtotal = record.subtotal;

    if (rawProductId === undefined || rawProductId === null) {
      errors.push("Missing line_item product_id");
      continue;
    }

    const quantity = Number(rawQuantity);
    const totalPrice = Number(rawTotal);
    const subtotal = Number(rawSubtotal);

    if (Number.isNaN(quantity) || quantity <= 0) {
      errors.push(`Invalid quantity for product ${rawProductId}`);
      continue;
    }

    const unitPrice = Number.isNaN(subtotal) ? totalPrice / quantity : subtotal / quantity;
    if (Number.isNaN(unitPrice)) {
      errors.push(`Invalid pricing for product ${rawProductId}`);
      continue;
    }

    items.push({
      externalProductId: String(rawProductId),
      quantity,
      unitPrice,
      totalPrice: Number.isNaN(totalPrice) ? unitPrice * quantity : totalPrice
    });
  }

  return { items, errors };
}
