-- Script to insert 20 sample products

-- Fetching necessary IDs from reference tables
WITH product_types_cte AS (
    SELECT id, name FROM product_types
),
metals_cte AS (
    SELECT id, name FROM metals
),
issuing_countries_cte AS (
    SELECT id, name FROM issuing_countries
),
manufacturers_cte AS (
    SELECT id, name FROM manufacturers
)
-- Insert sample products
INSERT INTO products (name, product_type_id, metal_id, issuing_country_id, manufacturer_id, price, created_at)
VALUES
    ('Gold Maple Leaf Coin', 
     (SELECT id FROM product_types_cte WHERE name = 'Coin'), 
     (SELECT id FROM metals_cte WHERE name = 'Gold'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'Canada'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Royal Canadian Mint'), 
     1950.00, current_timestamp),

    ('Silver Kangaroo Coin', 
     (SELECT id FROM product_types_cte WHERE name = 'Coin'), 
     (SELECT id FROM metals_cte WHERE name = 'Silver'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'Australia'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Perth Mint'), 
     30.50, current_timestamp),

    ('Gold Krugerrand Coin', 
     (SELECT id FROM product_types_cte WHERE name = 'Coin'), 
     (SELECT id FROM metals_cte WHERE name = 'Gold'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'South Africa'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Rand Refinery'), 
     2000.00, current_timestamp),

    ('Platinum American Eagle Coin', 
     (SELECT id FROM product_types_cte WHERE name = 'Coin'), 
     (SELECT id FROM metals_cte WHERE name = 'Platinum'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'USA'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'The United States Mint'), 
     1000.00, current_timestamp),

    ('Silver Philharmonic Bar', 
     (SELECT id FROM product_types_cte WHERE name = 'Bar'), 
     (SELECT id FROM metals_cte WHERE name = 'Silver'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'Austria'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Münze Österreich AG'), 
     750.00, current_timestamp),

    ('Gold Panda Coin', 
     (SELECT id FROM product_types_cte WHERE name = 'Coin'), 
     (SELECT id FROM metals_cte WHERE name = 'Gold'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'China'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Shanghai Mint'), 
     1900.00, current_timestamp),

    ('Palladium Canadian Maple Leaf Coin', 
     (SELECT id FROM product_types_cte WHERE name = 'Coin'), 
     (SELECT id FROM metals_cte WHERE name = 'Palladium'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'Canada'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Royal Canadian Mint'), 
     2100.00, current_timestamp),

    ('Gold Britannia Coin', 
     (SELECT id FROM product_types_cte WHERE name = 'Coin'), 
     (SELECT id FROM metals_cte WHERE name = 'Gold'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'United Kingdom'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Royal Mint'), 
     1950.00, current_timestamp),

    ('Silver Lunar Series Coin', 
     (SELECT id FROM product_types_cte WHERE name = 'Coin'), 
     (SELECT id FROM metals_cte WHERE name = 'Silver'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'Australia'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Perth Mint'), 
     40.00, current_timestamp),

    ('Platinum Kangaroo Coin', 
     (SELECT id FROM product_types_cte WHERE name = 'Coin'), 
     (SELECT id FROM metals_cte WHERE name = 'Platinum'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'Australia'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Perth Mint'), 
     1200.00, current_timestamp),

    ('Gold Bar 1kg', 
     (SELECT id FROM product_types_cte WHERE name = 'Bar'), 
     (SELECT id FROM metals_cte WHERE name = 'Gold'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'Switzerland'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'PAMP Suisse'), 
     60000.00, current_timestamp),

    ('Silver Bar 1kg', 
     (SELECT id FROM product_types_cte WHERE name = 'Bar'), 
     (SELECT id FROM metals_cte WHERE name = 'Silver'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'Germany'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Heimerle + Meule GmbH Scheideanstalt'), 
     850.00, current_timestamp),

    ('Gold Bar 500g', 
     (SELECT id FROM product_types_cte WHERE name = 'Bar'), 
     (SELECT id FROM metals_cte WHERE name = 'Gold'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'Switzerland'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Valcambi'), 
     30000.00, current_timestamp),

    ('Platinum Bar 500g', 
     (SELECT id FROM product_types_cte WHERE name = 'Bar'), 
     (SELECT id FROM metals_cte WHERE name = 'Platinum'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'Switzerland'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Metalor'), 
     15000.00, current_timestamp),

    ('Gold Lunar Coin', 
     (SELECT id FROM product_types_cte WHERE name = 'Coin'), 
     (SELECT id FROM metals_cte WHERE name = 'Gold'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'Australia'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Perth Mint'), 
     2000.00, current_timestamp),

    ('Silver Britannia Coin', 
     (SELECT id FROM product_types_cte WHERE name = 'Coin'), 
     (SELECT id FROM metals_cte WHERE name = 'Silver'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'United Kingdom'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Royal Mint'), 
     35.00, current_timestamp),

    ('Palladium Bar 100g', 
     (SELECT id FROM product_types_cte WHERE name = 'Bar'), 
     (SELECT id FROM metals_cte WHERE name = 'Palladium'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'Switzerland'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Argor-Heraeus'), 
     7500.00, current_timestamp),

    ('Gold Eagle Coin', 
     (SELECT id FROM product_types_cte WHERE name = 'Coin'), 
     (SELECT id FROM metals_cte WHERE name = 'Gold'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'USA'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'The United States Mint'), 
     1950.00, current_timestamp),

    ('Silver Philharmonic Coin', 
     (SELECT id FROM product_types_cte WHERE name = 'Coin'), 
     (SELECT id FROM metals_cte WHERE name = 'Silver'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'Austria'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Münze Österreich AG'), 
     25.00, current_timestamp),

    ('Gold Krugerrand Bar', 
     (SELECT id FROM product_types_cte WHERE name = 'Bar'), 
     (SELECT id FROM metals_cte WHERE name = 'Gold'), 
     (SELECT id FROM issuing_countries_cte WHERE name = 'South Africa'), 
     (SELECT id FROM manufacturers_cte WHERE name = 'Rand Refinery'), 
     61000.00, current_timestamp);
