-- Drop tables if they exist (in correct order to avoid foreign key conflicts)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS position CASCADE;
DROP TABLE IF EXISTS custodyService CASCADE;
DROP TABLE IF EXISTS custodian CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS portfolio CASCADE;
DROP TABLE IF EXISTS producer CASCADE;
DROP TABLE IF EXISTS country CASCADE;
DROP TABLE IF EXISTS productType CASCADE;
DROP TABLE IF EXISTS metal CASCADE;
DROP TABLE IF EXISTS currency CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS transactionType;
DROP TYPE IF EXISTS positionStatus;
DROP TYPE IF EXISTS paymentFrequency;
DROP TYPE IF EXISTS orderStatus;
DROP TYPE IF EXISTS unitOfMeasure;

-- Create types
CREATE TYPE transactionType AS ENUM ('buy', 'sell');
CREATE TYPE positionStatus AS ENUM ('active', 'closed');
CREATE TYPE paymentFrequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'onetime');
CREATE TYPE orderStatus AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled');
CREATE TYPE unitOfMeasure as ENUM ('grams', 'troy_ounces', 'kilograms');

-- Create users table first (since other tables reference it for audit trail)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'user')),
    email_verified BOOLEAN DEFAULT FALSE,
    identity_verified BOOLEAN DEFAULT FALSE,
    terms_version VARCHAR(50) DEFAULT '1.0',
    terms_accepted_at TIMESTAMP,
    last_login TIMESTAMP,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

-- Create lookup tables with audit trail columns
CREATE TABLE IF NOT EXISTS currency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isocode2 CHAR(2) NOT NULL,
    isocode3 CHAR(3) NOT NULL UNIQUE,
    isonumericcode INT NOT NULL UNIQUE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS custodian (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custodianname TEXT NOT NULL UNIQUE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS country (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    countryname TEXT NOT NULL,
    isocode2 CHAR(2) NOT NULL,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS producer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producername TEXT NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    countryId UUID REFERENCES country(id),
    websiteURL TEXT,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS metal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    symbol CHAR(2) NOT NULL UNIQUE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS productType (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producttypename TEXT NOT NULL,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

-- Create tables with foreign key references to other lookup tables
CREATE TABLE IF NOT EXISTS custodyService (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custodianid UUID NOT NULL REFERENCES custodian(id) ON DELETE CASCADE,
    custodyservicename TEXT NOT NULL,
    fee NUMERIC(12, 2) NOT NULL,
    paymentfrequency paymentFrequency NOT NULL,
    currencyid UUID NOT NULL REFERENCES currency(id),
    maxweight NUMERIC(12, 2),
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS product (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    producttypeid UUID NOT NULL REFERENCES productType(id),
    metalid UUID NOT NULL REFERENCES metal(id),
    countryid UUID REFERENCES country(id),
    producerid UUID NOT NULL REFERENCES producer(id),
    weight NUMERIC(12, 4) NOT NULL,
    weightunit unitOfMeasure NOT NULL DEFAULT 'troy_ounces',
    purity NUMERIC(5, 4) NOT NULL DEFAULT 0.999 CHECK (purity >= 0 AND purity <= 1),
    price NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD')),
    year INTEGER,
    description TEXT,
    certifiedprovenance BOOLEAN NOT NULL DEFAULT FALSE,
    imageurl TEXT NOT NULL DEFAULT '',
    imagedata BYTEA,
    imagecontentType VARCHAR(100),
    imagefilename VARCHAR(255),
    instock BOOLEAN NOT NULL DEFAULT TRUE,
    stockquantity INTEGER DEFAULT 0,
    minimumorderquantity INTEGER NOT NULL DEFAULT 1,
    premiumpercentage NUMERIC(5, 2),
    diameter NUMERIC(8, 2),
    thickness NUMERIC(8, 2),
    mintage INTEGER,
    certification TEXT,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

-- New Portfolio Management Tables (matching @goldsphere/shared types)

-- Legacy tables for backward compatibility (optional)
CREATE TABLE IF NOT EXISTS portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolioname TEXT NOT NULL,
    ownerid UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS position (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userid UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    productid UUID NOT NULL REFERENCES product(id),
    portfolioid UUID NOT NULL REFERENCES portfolio(id) ON DELETE CASCADE,
    purchasedate TIMESTAMP NOT NULL,
    purchaseprice NUMERIC(10,2) NOT NULL,
    marketprice NUMERIC(10,2) NOT NULL,
    quantity NUMERIC(10,4) NOT NULL,
    custodyserviceid UUID,
    status positionStatus NOT NULL DEFAULT 'active',
    closeddate TIMESTAMP,
    notes TEXT,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    positionId UUID NOT NULL REFERENCES position(id) ON DELETE CASCADE,
    userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type transactionType NOT NULL,
    date TIMESTAMP NOT NULL,
    quantity NUMERIC(10,4) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    fees NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userid UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    orderstatus orderStatus NOT NULL,
    custodyserviceid UUID,
    payment_intent_id VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
    paid_at TIMESTAMP,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderid UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    productid UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    productname VARCHAR NOT NULL,
    quantity NUMERIC NOT NULL,
    unitprice NUMERIC,
    totalprice NUMERIC NOT NULL,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

-- Index for payment lookups
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id ON orders(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Audit trail indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(createdBy);
CREATE INDEX IF NOT EXISTS idx_orders_updated_by ON orders(updatedBy);
CREATE INDEX IF NOT EXISTS idx_position_created_by ON position(createdBy);
CREATE INDEX IF NOT EXISTS idx_position_updated_by ON position(updatedBy);
CREATE INDEX IF NOT EXISTS idx_portfolio_created_by ON portfolio(createdBy);
CREATE INDEX IF NOT EXISTS idx_portfolio_updated_by ON portfolio(updatedBy);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(createdBy);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(createdBy);
CREATE INDEX IF NOT EXISTS idx_users_updated_by ON users(updatedBy);
CREATE INDEX IF NOT EXISTS idx_product_created_by ON product(createdBy);
CREATE INDEX IF NOT EXISTS idx_product_updated_by ON product(updatedBy);
CREATE INDEX IF NOT EXISTS idx_order_items_created_by ON order_items(createdBy);
CREATE INDEX IF NOT EXISTS idx_order_items_updated_by ON order_items(updatedBy);
CREATE INDEX IF NOT EXISTS idx_custodian_created_by ON custodian(createdBy);
CREATE INDEX IF NOT EXISTS idx_custodian_updated_by ON custodian(updatedBy);
CREATE INDEX IF NOT EXISTS idx_producer_created_by ON producer(createdBy);
CREATE INDEX IF NOT EXISTS idx_producer_updated_by ON producer(updatedBy);
CREATE INDEX IF NOT EXISTS idx_currency_created_by ON currency(createdBy);
CREATE INDEX IF NOT EXISTS idx_currency_updated_by ON currency(updatedBy);
CREATE INDEX IF NOT EXISTS idx_metal_created_by ON metal(createdBy);
CREATE INDEX IF NOT EXISTS idx_metal_updated_by ON metal(updatedBy);
CREATE INDEX IF NOT EXISTS idx_country_created_by ON country(createdBy);
CREATE INDEX IF NOT EXISTS idx_country_updated_by ON country(updatedBy);
CREATE INDEX IF NOT EXISTS idx_product_type_created_by ON productType(createdBy);
CREATE INDEX IF NOT EXISTS idx_product_type_updated_by ON productType(updatedBy);
CREATE INDEX IF NOT EXISTS idx_custody_service_created_by ON custodyService(createdBy);
CREATE INDEX IF NOT EXISTS idx_custody_service_updated_by ON custodyService(updatedBy);

-- Comments for documentation
COMMENT ON COLUMN orders.createdBy IS 'User ID who created this order';
COMMENT ON COLUMN orders.updatedBy IS 'User ID who last updated this order';
COMMENT ON COLUMN position.createdBy IS 'User ID who created this position';
COMMENT ON COLUMN position.updatedBy IS 'User ID who last updated this position';
COMMENT ON COLUMN portfolio.createdBy IS 'User ID who created this portfolio';
COMMENT ON COLUMN portfolio.updatedBy IS 'User ID who last updated this portfolio';
COMMENT ON COLUMN transactions.createdBy IS 'User ID who created this transaction';
COMMENT ON COLUMN users.createdBy IS 'User ID who created this user (for admin user creation)';
COMMENT ON COLUMN users.updatedBy IS 'User ID who last updated this user';
COMMENT ON COLUMN product.createdBy IS 'User ID who created this product';
COMMENT ON COLUMN product.updatedBy IS 'User ID who last updated this product';
COMMENT ON COLUMN order_items.createdBy IS 'User ID who created this order item';
COMMENT ON COLUMN order_items.updatedBy IS 'User ID who last updated this order item';
COMMENT ON COLUMN custodian.createdBy IS 'User ID who created this custodian';
COMMENT ON COLUMN custodian.updatedBy IS 'User ID who last updated this custodian';
COMMENT ON COLUMN producer.createdBy IS 'User ID who created this producer';
COMMENT ON COLUMN producer.updatedBy IS 'User ID who last updated this producer';
COMMENT ON COLUMN currency.createdBy IS 'User ID who created this currency';
COMMENT ON COLUMN currency.updatedBy IS 'User ID who last updated this currency';
COMMENT ON COLUMN metal.createdBy IS 'User ID who created this metal';
COMMENT ON COLUMN metal.updatedBy IS 'User ID who last updated this metal';
COMMENT ON COLUMN country.createdBy IS 'User ID who created this country';
COMMENT ON COLUMN country.updatedBy IS 'User ID who last updated this country';
COMMENT ON COLUMN productType.createdBy IS 'User ID who created this product type';
COMMENT ON COLUMN productType.updatedBy IS 'User ID who last updated this product type';
COMMENT ON COLUMN custodyService.createdBy IS 'User ID who created this custody service';
COMMENT ON COLUMN custodyService.updatedBy IS 'User ID who last updated this custody service';

