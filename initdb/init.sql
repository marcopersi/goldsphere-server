-- GoldSphere Database Initialization Script
-- This script creates the complete database schema and loads initial data

\echo 'Starting GoldSphere database initialization...'

-- Set some PostgreSQL configurations for better performance during setup
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

\echo 'Creating database schema...'
\i /docker-entrypoint-initdb.d/01-schema.sql

\echo 'Loading initial reference data...'
\i /docker-entrypoint-initdb.d/02-initialLoad.sql

\echo 'Loading sample data...'
\i /docker-entrypoint-initdb.d/03-sampleData.sql

\echo 'enhanced user registration...'
\i /docker-entrypoint-initdb.d/04-enhanced-user-registration.sql

\echo 'GoldSphere database initialization complete!'

-- Create some useful indexes for performance
\echo 'Creating performance indexes...'
CREATE INDEX IF NOT EXISTS idx_product_metal ON product(metalId);
CREATE INDEX IF NOT EXISTS idx_product_type ON product(productTypeId);
CREATE INDEX IF NOT EXISTS idx_product_producer ON product(producerId);
CREATE INDEX IF NOT EXISTS idx_product_country ON product(countryId);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(userId);
CREATE INDEX IF NOT EXISTS idx_position_user ON position(userId);
CREATE INDEX IF NOT EXISTS idx_transactions_position ON transactions(positionId);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

\echo 'Database setup completed successfully!'

-- Display summary information
\echo 'Database summary:'
SELECT 'Users' as table_name, count(*) as record_count FROM users
UNION ALL
SELECT 'Products', count(*) FROM product
UNION ALL
SELECT 'Metals', count(*) FROM metal
UNION ALL
SELECT 'Product Types', count(*) FROM productType
UNION ALL
SELECT 'Producers', count(*) FROM producer
UNION ALL
SELECT 'Countries', count(*) FROM country
UNION ALL
SELECT 'Custodians', count(*) FROM custodian
UNION ALL
SELECT 'Currencies', count(*) FROM currency;
