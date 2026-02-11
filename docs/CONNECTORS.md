# External Connectors

## Purpose

This document defines the first external commerce connector scope and the planned architecture for syncing external shop data into goldsphere.

## Scope (MVP)

- Connector type: WooCommerce only
- Direction: read-only (no write-back)
- Sync targets: products and orders (products are required for meaningful order imports)
- Trigger: manual sync in Admin UI (scheduler and webhooks come later)

## WooCommerce API Capabilities (v3)

- Base URL: https://{shop-domain}
- API root: /wp-json/wc/v3
- Auth: consumer key + consumer secret (basic auth over HTTPS)
- Products
  - List: GET /products
  - Detail: GET /products/{id}
  - Variations: GET /products/{id}/variations
  - Key fields: id, name, sku, price, regular_price, sale_price, stock_status, categories, attributes, variations, images, meta_data
- Orders
  - List: GET /orders
  - Detail: GET /orders/{id}
  - Key fields: id, status, currency, total, payment_method, billing, shipping, line_items, tax_lines, shipping_lines, fee_lines, coupon_lines, meta_data
- Pagination and filters
  - Pagination: page, per_page
  - Date filters: after, before, modified_after, modified_before
  - Other filters: status, search, sku (products)
- Errors and rate limits
  - Respect API errors and retry only for transient failures
  - Log response status and error payloads for diagnostics

## Admin Flow (Connectivity)

1. Admin opens Connectivity section.
2. Connector list shows WooCommerce (others hidden for now).
3. Admin enters baseUrl, consumerKey, consumerSecret.
4. Click Test Connection -> validate auth and base URL.
5. Enable sync toggles: Products, Orders.
6. Save configuration.
7. Optional: Run Sync Now for products and orders.
8. View last sync status, errors, and counts.

## Service and Repository Design

Create a new service module with the same DI and factory patterns as existing services.

- Location: src/services/connector/
- Interfaces
  - IConnectorService: admin flow orchestration, test connection, run sync
  - IExternalSyncService: product and order sync pipeline
  - IExternalMappingService: apply mapping rules and validate required fields
  - IExternalConnectorRepository: persistence for configs, credentials, runs
  - IExternalDataRepository: persistence for external_product and external_order
  - IWooCommerceClient: API wrapper (HTTP, pagination, retries)
- Implementations
  - ConnectorServiceImpl
  - ExternalSyncServiceImpl
  - ExternalMappingServiceImpl
  - ExternalConnectorRepositoryImpl
  - ExternalDataRepositoryImpl
  - WooCommerceClientImpl
- Factory
  - ConnectorServiceFactory with DI for repositories and clients

Service responsibilities

- ConnectorServiceImpl
  - Validate config inputs
  - Test connection
  - Trigger sync runs
- ExternalSyncServiceImpl
  - Sync products first, then orders
  - Track sync runs and outcomes
  - Enforce idempotency with external_reference
- ExternalMappingServiceImpl
  - Validate mappings
  - Apply transforms
  - Emit validation errors for missing required fields
- Repositories
  - Provide CRUD for connector config, credentials, sync runs
  - Store raw payloads and mapped payloads

## Database Tables (Draft)

Use dedicated external tables for ETL and mapping stability.

- external_connector
  - id (uuid, pk)
  - type (varchar, e.g. woocommerce)
  - base_url (text)
  - status (varchar: active, disabled, error)
  - last_test_at (timestamp)
  - created_at, updated_at
- external_credential
  - id (uuid, pk)
  - connector_id (fk)
  - encrypted_key (text)
  - encrypted_secret (text)
  - created_at, updated_at
- external_sync_config
  - id (uuid, pk)
  - connector_id (fk)
  - sync_products (boolean)
  - sync_orders (boolean)
  - mappings_json (jsonb)
  - created_at, updated_at
- external_sync_run
  - id (uuid, pk)
  - connector_id (fk)
  - status (varchar: running, success, failed)
  - started_at, finished_at
  - stats_json (jsonb)
- external_mapping_rule
  - id (uuid, pk)
  - connector_id (fk)
  - entity_type (varchar: product, order)
  - source_field, target_field (text)
  - transform_json (jsonb)
  - created_at, updated_at
- external_reference
  - id (uuid, pk)
  - source (varchar)
  - entity_type (varchar)
  - external_id (text)
  - internal_id (uuid)
  - created_at, updated_at
  - unique index on (source, entity_type, external_id)
- external_product
  - id (uuid, pk)
  - connector_id (fk)
  - external_id (text)
  - raw_payload_json (jsonb)
  - mapped_payload_json (jsonb)
  - status (varchar: pending, mapped, failed)
  - created_at, updated_at
- external_order
  - id (uuid, pk)
  - connector_id (fk)
  - external_id (text)
  - raw_payload_json (jsonb)
  - mapped_payload_json (jsonb)
  - status (varchar: pending, mapped, failed)
  - created_at, updated_at

## Database Migrations (SQL Draft)

Create one migration that adds all tables and indexes.

```sql
CREATE TABLE external_connector (
  id uuid PRIMARY KEY,
  type varchar(50) NOT NULL,
  base_url text NOT NULL,
  status varchar(20) NOT NULL,
  last_test_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE external_credential (
  id uuid PRIMARY KEY,
  connector_id uuid NOT NULL REFERENCES external_connector(id),
  encrypted_key text NOT NULL,
  encrypted_secret text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE external_sync_config (
  id uuid PRIMARY KEY,
  connector_id uuid NOT NULL REFERENCES external_connector(id),
  sync_products boolean NOT NULL DEFAULT true,
  sync_orders boolean NOT NULL DEFAULT true,
  mappings_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE external_sync_run (
  id uuid PRIMARY KEY,
  connector_id uuid NOT NULL REFERENCES external_connector(id),
  status varchar(20) NOT NULL,
  started_at timestamp NOT NULL,
  finished_at timestamp,
  stats_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE external_mapping_rule (
  id uuid PRIMARY KEY,
  connector_id uuid NOT NULL REFERENCES external_connector(id),
  entity_type varchar(20) NOT NULL,
  source_field text NOT NULL,
  target_field text NOT NULL,
  transform_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE external_reference (
  id uuid PRIMARY KEY,
  source varchar(50) NOT NULL,
  entity_type varchar(20) NOT NULL,
  external_id text NOT NULL,
  internal_id uuid NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX external_reference_unique
  ON external_reference (source, entity_type, external_id);

CREATE TABLE external_product (
  id uuid PRIMARY KEY,
  connector_id uuid NOT NULL REFERENCES external_connector(id),
  external_id text NOT NULL,
  raw_payload_json jsonb NOT NULL,
  mapped_payload_json jsonb,
  status varchar(20) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE external_order (
  id uuid PRIMARY KEY,
  connector_id uuid NOT NULL REFERENCES external_connector(id),
  external_id text NOT NULL,
  raw_payload_json jsonb NOT NULL,
  mapped_payload_json jsonb,
  status varchar(20) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX external_product_connector_idx
  ON external_product (connector_id);

CREATE INDEX external_order_connector_idx
  ON external_order (connector_id);
```

Credential handling

- Store credentials in the database, encrypted at rest.
- Do not log raw credentials.
- Use a dedicated settings or system settings table or a focused credentials table.

## Sync Flow (MVP)

1. Test connection.
2. Run product sync (full sync, paginated).
3. Run order sync (full sync + delta by updated date).
4. Persist raw payloads to external tables.
5. Apply mapping rules to create internal entities.
6. Upsert using external_reference to keep idempotency.

## Admin API Design (Draft)

Use a new controller for admin connectivity. Endpoints use admin auth.

- GET /admin/connectors
  - Response: list connectors with status and last sync run
- POST /admin/connectors
  - Body: { type, baseUrl, consumerKey, consumerSecret, syncProducts, syncOrders }
  - Response: created connector summary
- PUT /admin/connectors/{id}
  - Body: { baseUrl, consumerKey?, consumerSecret?, syncProducts, syncOrders }
  - Response: updated connector summary
- POST /admin/connectors/{id}/test
  - Response: { success, message }
- POST /admin/connectors/{id}/sync
  - Body: { syncProducts, syncOrders }
  - Response: { runId, status }
- GET /admin/connectors/{id}/runs
  - Response: list sync runs with stats and errors

DTO sketch

- ConnectorCreateRequest
  - type: 'woocommerce'
  - baseUrl: string
  - consumerKey: string
  - consumerSecret: string
  - syncProducts: boolean
  - syncOrders: boolean
- ConnectorUpdateRequest
  - baseUrl: string
  - consumerKey?: string
  - consumerSecret?: string
  - syncProducts: boolean
  - syncOrders: boolean
- ConnectorSummaryResponse
  - id, type, baseUrl, status, lastTestAt
  - syncProducts, syncOrders
  - lastRun?: { id, status, startedAt, finishedAt, stats }

## Mapping Rules

Provide a default mapping template for WooCommerce orders, and allow a custom mapping per connector.

Required mapping for orders

- userId
  - Default: lookup by Woo billing.email -> users.email
  - If no user found: mark external_order as failed, include error message
- type
  - Default: BUY
- status
  - Map Woo status to internal order status
  - Example: pending, on-hold -> PENDING; processing -> CONFIRMED; completed -> COMPLETED; cancelled, failed -> CANCELLED
- currency
- items
  - Each line_item maps to productId and quantity
  - productId lookup by Woo product_id or SKU using external_reference
  - If no product match: mark external_order as failed
- pricing
  - subtotal, taxes, totalAmount from Woo order totals

Required mapping for products

- product identity
  - external_id: Woo product id
  - SKU optional but recommended for matching
- product fields
  - name, price, currency, inStock, stockQuantity, description, images
- internal product type mapping
  - Map Woo category/attribute to internal productType and metal
  - Use mapping rules to map category names to internal enums

Transforms

- Enum mapping: Woo order status -> internal status
- Currency normalization: ISO 3-letter currency code
- Price normalization: ensure numeric decimal

Validation

- Block sync if required fields are missing
- Record mapping errors in external_order or external_product

## Test Coverage Plan

- Unit tests
  - WooCommerce client pagination and error handling
  - Mapping transforms and required field validation
  - Idempotency logic for external_reference
- Repository tests (integration)
  - CRUD for connectors, credentials, configs, runs
  - Insert and update of external_product and external_order
- Service tests
  - Sync order of operations (products before orders)
  - Proper run status updates on success and failure
- Controller tests
  - Test connection endpoint
  - Trigger sync endpoint
  - Config CRUD endpoints
- Negative tests
  - Invalid credentials
  - Mapping missing required fields
  - Partial sync failures

## Future Iterations

- Scheduler for periodic syncs.
- Webhooks for near-real-time updates.
- Additional connectors (Shopify, Magento).
