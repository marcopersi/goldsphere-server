-- Drop tables if they exist
DROP TABLE IF EXISTS portfolio CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS custody_services CASCADE;
DROP TABLE IF EXISTS custodians CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS manufacturers CASCADE;
DROP TABLE IF EXISTS issuing_countries CASCADE;
DROP TABLE IF EXISTS product_types CASCADE;
DROP TABLE IF EXISTS metals CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Name des Metalls (z. B. Gold, Silber)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Name des Produkttyps (z. B. Coin, Bar)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custodians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Name des Verwahrers (z. B. Loomis, Brinks)
    location TEXT,             -- Standort des Verwahrers
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS issuing_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Name des Ausgabelandes (z. B. USA, Canada)
    iso_code CHAR(2) NOT NULL, -- ISO Country Code (z. B. US, CA)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manufacturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Name des Herstellers
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial data
INSERT INTO metals (name) VALUES
('Gold'),
('Silver'),
('Platinum'),
('Palladium')
ON CONFLICT (name) DO NOTHING;

INSERT INTO issuing_countries (name, iso_code) VALUES
('Canada', 'CA'),
('Switzerland', 'CH'),
('South Africa', 'ZA'),
('Germany', 'DE'),
('Austria', 'AT'),
('USA', 'US'),
('Australia', 'AU'),
('China', 'CN'),
('Russia', 'RU'),
('United Kingdom', 'GB')
ON CONFLICT (name) DO NOTHING;

-- Insert initial data
INSERT INTO product_types (name) VALUES
('Coin'),
('Bar'),
('Token'),
('Medallion')
ON CONFLICT (name) DO NOTHING;

INSERT INTO custodians (name, location) VALUES
('Loomis', 'Switzerland'),
('Brinks', 'Germany'),
('Bank of Switzerland', 'Switzerland'),
('Home Storage', NULL) -- Für Kunden, die selbst lagern
ON CONFLICT (name) DO NOTHING;

INSERT INTO manufacturers (name, created_at) VALUES
  ('Argor-Heraeus', CURRENT_TIMESTAMP),
  ('Asahi Refining', CURRENT_TIMESTAMP),
  ('Bayerisches Hauptmünzamt', CURRENT_TIMESTAMP),
  ('British Royal Mint', CURRENT_TIMESTAMP),
  ('Casa de Moneda de México', CURRENT_TIMESTAMP),
  ('Den Kongelige Mont, Kopenhagen', CURRENT_TIMESTAMP),
  ('Diverse serbische Münzprägeanstalten', CURRENT_TIMESTAMP),
  ('Eidgenössische Münzstätte Bern', CURRENT_TIMESTAMP),
  ('Heimerle + Meule GmbH Scheideanstalt', CURRENT_TIMESTAMP),
  ('Johnson Matthey', CURRENT_TIMESTAMP),
  ('Körmöcbányai Pénzverde (Münze Kremnitz)', CURRENT_TIMESTAMP),
  ('Lunar Mint Australia', CURRENT_TIMESTAMP),
  ('Metalor', CURRENT_TIMESTAMP),
  ('Münze Österreich AG', CURRENT_TIMESTAMP),
  ('PAMP Suisse', CURRENT_TIMESTAMP),
  ('Perth Mint', CURRENT_TIMESTAMP),
  ('Rand Refinery', CURRENT_TIMESTAMP),
  ('Royal Canadian Mint', CURRENT_TIMESTAMP),
  ('Royal Mint', CURRENT_TIMESTAMP),
  ('Shanghai Mint', CURRENT_TIMESTAMP),
  ('Swiss Mint', CURRENT_TIMESTAMP),
  ('The United States Mint', CURRENT_TIMESTAMP),
  ('Valcambi', CURRENT_TIMESTAMP),
  ('jew. staatliche Prägestätten', CURRENT_TIMESTAMP),
  ('Lunar Mint New Zealand', CURRENT_TIMESTAMP),
  ('Chinese Gold Panda Mint', CURRENT_TIMESTAMP),
  ('Australian Gold Kangaroo Mint', CURRENT_TIMESTAMP),
  ('Polish State Mint', CURRENT_TIMESTAMP),
  ('Singapore Mint', CURRENT_TIMESTAMP),
  ('Banco de Mexico', CURRENT_TIMESTAMP),
  ('Korean Mint (KOMSCO)', CURRENT_TIMESTAMP)
  ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    product_type_id UUID NOT NULL REFERENCES product_types(id),
    metal_id UUID NOT NULL REFERENCES metals(id),
    issuing_country_id UUID NOT NULL REFERENCES issuing_countries(id),
    manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
    price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custody_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custodian_id UUID NOT NULL REFERENCES custodians(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    fee NUMERIC(12, 2) NOT NULL,
    max_weight NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    purchase_date DATE NOT NULL,
    quantity NUMERIC NOT NULL,
    total_value NUMERIC(12, 2) NOT NULL,
    custody_service_id UUID REFERENCES custody_services(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    status TEXT DEFAULT 'Pending',
    custody_service_id UUID REFERENCES custody_services(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


