-- Drop tables if they exist
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS portfolioPosition CASCADE;
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

DROP TYPE IF EXISTS paymentFrequency;
DROP TYPE IF EXISTS orderStatus;
DROP TYPE IF EXISTS unitOfMeasure;

-- Create tables without foreign key references first
CREATE TABLE IF NOT EXISTS currency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isoCode2 CHAR(2) NOT NULL,
    isoCode3 CHAR(3) NOT NULL,
    isoNumericCode INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custodian (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custodianName TEXT NOT NULL UNIQUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS producer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producerName TEXT NOT NULL UNIQUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metalName TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS issuingCountry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issuingCountryName TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productType (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    productTypeName TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create types
CREATE TYPE paymentFrequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE orderStatus AS ENUM ('pending', 'confirmed', 'settled', 'delivered', 'closed');
CREATE TYPE unitOfMeasure as ENUM ('oz', 'g', 'kg', 'lb', 'troy oz', 'tola', 'grain', 'gram', 'kilogram', 'metric ton', 'pennyweight', 'ton');

-- Create tables with foreign key references
CREATE TABLE IF NOT EXISTS custodyService (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custodianId UUID NOT NULL REFERENCES custodian(id) ON DELETE CASCADE,
    custodyServiceName TEXT NOT NULL,
    fee NUMERIC(12, 2) NOT NULL,
    paymentFrequency paymentFrequency NOT NULL,
    currencyId UUID NOT NULL REFERENCES currency(id),
    maxWeight NUMERIC(12, 2),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    productName TEXT NOT NULL,
    productTypeId UUID NOT NULL REFERENCES productType(id),
    metalId UUID NOT NULL REFERENCES metal(id),
    issuingCountryId UUID NOT NULL REFERENCES issuingCountry(id),
    producerId UUID NOT NULL REFERENCES producer(id),
    fineWeight NUMERIC(12, 4),
    unitOfMeasure unitOfMeasure not NULL,
    price NUMERIC(12, 2) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS position (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custodyServiceId UUID REFERENCES custodyService(id) ON DELETE CASCADE,
    productId UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    purchaseDate DATE NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL,
    purchasePricePerUnit NUMERIC(12, 2) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolioName TEXT NOT NULL,
    ownerId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolioPosition (
    portfolioId UUID NOT NULL REFERENCES portfolio(id) ON DELETE CASCADE,
    positionId UUID NOT NULL REFERENCES position(id) ON DELETE CASCADE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    productId UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 2) NOT NULL,
    totalPrice NUMERIC(12, 2) NOT NULL,
    orderStatus orderStatus NOT NULL,
    custodyServiceId UUID REFERENCES custodyService(id),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


