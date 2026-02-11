import { ExternalMappingServiceImpl } from "../../src/services/connector/impl/ExternalMappingServiceImpl";
import { mapWooOrderLineItems } from "../../src/services/connector/mapping/wooDefaultMapping";
import { decryptSecret, encryptSecret } from "../../src/utils/crypto";

const mappingService = new ExternalMappingServiceImpl();

describe("Connector crypto", () => {
  beforeAll(() => {
    const key = Buffer.alloc(32, 1).toString("base64");
    process.env.CONNECTOR_CREDENTIAL_KEY = key;
  });

  it("encrypts and decrypts secrets", () => {
    const secret = "woo-secret";
    const encrypted = encryptSecret(secret);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(secret);
  });
});

describe("External mapping service", () => {
  it("maps required fields and reports missing fields", () => {
    const result = mappingService.mapExternalProduct(
      { price: "12.34" },
      [
        { sourceField: "name", targetField: "name", required: true, transform: { type: "string" } },
        { sourceField: "price", targetField: "price", required: true, transform: { type: "number" } }
      ]
    );

    expect(result.mappedPayload.price).toBe(12.34);
    expect(result.errors).toContain("Missing source field: name");
  });

  it("maps stock status to boolean", () => {
    const result = mappingService.mapExternalProduct(
      { stock_status: "instock" },
      [{ sourceField: "stock_status", targetField: "inStock", required: true, transform: { type: "stockStatus" } }]
    );

    expect(result.mappedPayload.inStock).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("Woo order line items mapping", () => {
  it("maps line items into pricing fields", () => {
    const result = mapWooOrderLineItems({
      line_items: [{ product_id: 123, quantity: 2, subtotal: "10", total: "12" }]
    });

    expect(result.errors).toHaveLength(0);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      externalProductId: "123",
      quantity: 2,
      unitPrice: 5,
      totalPrice: 12
    });
  });

  it("returns error when missing line items", () => {
    const result = mapWooOrderLineItems({});
    expect(result.errors).toContain("Missing line_items");
  });
});
