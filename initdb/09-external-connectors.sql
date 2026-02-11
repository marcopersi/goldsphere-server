-- External connectors schema (WooCommerce)

-- Drop in dependency order
DROP TABLE IF EXISTS external_order CASCADE;
DROP TABLE IF EXISTS external_product CASCADE;
DROP TABLE IF EXISTS external_reference CASCADE;
DROP TABLE IF EXISTS external_mapping_rule CASCADE;
DROP TABLE IF EXISTS external_sync_run CASCADE;
DROP TABLE IF EXISTS external_sync_config CASCADE;
DROP TABLE IF EXISTS external_credential CASCADE;
DROP TABLE IF EXISTS external_connector CASCADE;

CREATE TABLE IF NOT EXISTS external_connector (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    base_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    last_test_at TIMESTAMP,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS external_credential (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id UUID NOT NULL REFERENCES external_connector(id),
    encrypted_key TEXT NOT NULL,
    encrypted_secret TEXT NOT NULL,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS external_credential_connector_unique
    ON external_credential (connector_id);

CREATE TABLE IF NOT EXISTS external_sync_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id UUID NOT NULL REFERENCES external_connector(id),
    sync_products BOOLEAN NOT NULL DEFAULT TRUE,
    sync_orders BOOLEAN NOT NULL DEFAULT TRUE,
    mappings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS external_sync_config_connector_unique
    ON external_sync_config (connector_id);

CREATE TABLE IF NOT EXISTS external_sync_run (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id UUID NOT NULL REFERENCES external_connector(id),
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    stats_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS external_mapping_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id UUID NOT NULL REFERENCES external_connector(id),
    entity_type VARCHAR(20) NOT NULL,
    source_field TEXT NOT NULL,
    target_field TEXT NOT NULL,
    transform_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS external_reference (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    external_id TEXT NOT NULL,
    internal_id UUID NOT NULL,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS external_reference_unique
    ON external_reference (source, entity_type, external_id);

CREATE TABLE IF NOT EXISTS external_product (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id UUID NOT NULL REFERENCES external_connector(id),
    external_id TEXT NOT NULL,
    raw_payload_json JSONB NOT NULL,
    mapped_payload_json JSONB,
    status VARCHAR(20) NOT NULL,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS external_product_connector_external_unique
    ON external_product (connector_id, external_id);

CREATE TABLE IF NOT EXISTS external_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id UUID NOT NULL REFERENCES external_connector(id),
    external_id TEXT NOT NULL,
    raw_payload_json JSONB NOT NULL,
    mapped_payload_json JSONB,
    status VARCHAR(20) NOT NULL,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS external_order_connector_external_unique
    ON external_order (connector_id, external_id);

CREATE INDEX IF NOT EXISTS external_product_connector_idx
    ON external_product (connector_id);

CREATE INDEX IF NOT EXISTS external_order_connector_idx
    ON external_order (connector_id);
