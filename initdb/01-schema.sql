-- Drop tables if they exist (in correct order to avoid foreign key conflicts)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS position CASCADE;
DROP TABLE IF EXISTS custodyService CASCADE;
DROP TABLE IF EXISTS custodian CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS portfolio CASCADE;
DROP TABLE IF EXISTS producer CASCADE;
DROP TABLE IF EXISTS issuingCountry CASCADE;
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
CREATE TYPE paymentFrequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE orderStatus AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE unitOfMeasure as ENUM ('grams', 'troy_ounces', 'kilograms');

-- Create tables without foreign key references first
CREATE TABLE IF NOT EXISTS currency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isoCode2 CHAR(2) NOT NULL,
    isoCode3 CHAR(3) NOT NULL UNIQUE,
    isoNumericCode INT NOT NULL UNIQUE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custodian (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custodianName TEXT NOT NULL UNIQUE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS producer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producerName TEXT NOT NULL UNIQUE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    symbol CHAR(2) NOT NULL UNIQUE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS issuingCountry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issuingCountryName TEXT NOT NULL,
    isocode2 CHAR(2) NOT NULL,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productType (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    productTypeName TEXT NOT NULL,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tables with foreign key references
CREATE TABLE IF NOT EXISTS custodyService (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custodianId UUID NOT NULL REFERENCES custodian(id) ON DELETE CASCADE,
    custodyServiceName TEXT NOT NULL,
    fee NUMERIC(12, 2) NOT NULL,
    paymentFrequency paymentFrequency NOT NULL,
    currencyId UUID NOT NULL REFERENCES currency(id),
    maxWeight NUMERIC(12, 2),
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    productTypeId UUID NOT NULL REFERENCES productType(id),
    metalId UUID NOT NULL REFERENCES metal(id),
    issuingCountryId UUID REFERENCES issuingCountry(id),
    producerId UUID NOT NULL REFERENCES producer(id),
    weight NUMERIC(12, 4) NOT NULL,
    weightUnit unitOfMeasure NOT NULL DEFAULT 'troy_ounces',
    purity NUMERIC(5, 4) NOT NULL DEFAULT 0.999 CHECK (purity >= 0 AND purity <= 1),
    price NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD')),
    year INTEGER,
    description TEXT,
    certifiedProvenance BOOLEAN NOT NULL DEFAULT FALSE,
    imageUrl TEXT NOT NULL DEFAULT '',
    imageData BYTEA,
    imageContentType VARCHAR(100),
    imageFilename VARCHAR(255),
    inStock BOOLEAN NOT NULL DEFAULT TRUE,
    stockQuantity INTEGER DEFAULT 0,
    minimumOrderQuantity INTEGER NOT NULL DEFAULT 1,
    premiumPercentage NUMERIC(5, 2),
    diameter NUMERIC(8, 2),
    thickness NUMERIC(8, 2),
    mintage INTEGER,
    certification TEXT,
    tags TEXT[],
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New Portfolio Management Tables (matching @goldsphere/shared types)

-- Legacy tables for backward compatibility (optional)
CREATE TABLE IF NOT EXISTS portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolioName TEXT NOT NULL,
    ownerId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS position (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    productId UUID NOT NULL REFERENCES product(id),
    portfolioId UUID NOT NULL REFERENCES portfolio(id) ON DELETE CASCADE,
    purchaseDate TIMESTAMP NOT NULL,
    purchasePrice NUMERIC(10,2) NOT NULL,
    marketPrice NUMERIC(10,2) NOT NULL,
    quantity NUMERIC(10,4) NOT NULL,
    custodyServiceId UUID,
    status positionStatus NOT NULL DEFAULT 'active',
    closedDate TIMESTAMP,
    notes TEXT,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    productId UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL,
    totalPrice NUMERIC(12, 2) NOT NULL,
    orderStatus orderStatus NOT NULL,
    custodyServiceId UUID,
    payment_intent_id VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
    paid_at TIMESTAMP,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for payment lookups
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id ON orders(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

