Insert INTO custodyService(custodianId, custodyServiceName, fee, paymentFrequency, currencyId, maxWeight, createdAt)
values(
    (SELECT id FROM custodian WHERE custodianName = 'Loomis'),
    'Loomis Monthly Service',
    50.00,
    'monthly',
    (SELECT id FROM currency WHERE isoCode3 = 'USD'),
    1000,
    CURRENT_TIMESTAMP);

-- Insert sample products
INSERT INTO product (productName, productTypeId, metalId, issuingCountryId, producerId, fineWeight, unitOfMeasure, purity, price, currency, productYear, description, imageUrl, imageFilename, inStock, stockQuantity, minimumOrderQuantity, premiumPercentage, createdAt)
VALUES
    -- Gold Coins
    ('Gold Maple Leaf Coin', 
     (SELECT id FROM productType WHERE productTypeName = 'Coin'), 
     (SELECT id FROM metal WHERE metalName = 'Gold'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'Canada'), 
     (SELECT id FROM producer WHERE producerName = 'Royal Canadian Mint'),
        31.103, 'grams', 0.9999, 1500.00, 'USD', 2024, 'Canadian Gold Maple Leaf coin with 99.99% purity', '', '1-oz-Maple-Leaf.jpeg', true, 100, 1, 3.5, CURRENT_TIMESTAMP),
    ('Gold Krugerrand Coin', 
     (SELECT id FROM productType WHERE productTypeName = 'Coin'), 
     (SELECT id FROM metal WHERE metalName = 'Gold'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'South Africa'), 
     (SELECT id FROM producer WHERE producerName = 'Rand Refinery'),
        31.103, 'grams', 0.9167, 1480.00, 'USD', 2024, 'South African Gold Krugerrand coin', '', 'gold coin quarter ounce perth mint.jpg', true, 75, 1, 2.8, CURRENT_TIMESTAMP),
    ('Gold Philharmonic Coin', 
     (SELECT id FROM productType WHERE productTypeName = 'Coin'), 
     (SELECT id FROM metal WHERE metalName = 'Gold'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'Austria'), 
     (SELECT id FROM producer WHERE producerName = 'Austrian Mint'),
        31.103, 'grams', 0.9999, 1510.00, 'USD', 2024, 'Austrian Gold Philharmonic coin', '', '', true, 50, 1, 4.0, CURRENT_TIMESTAMP),

    -- Gold Bars
    ('Gold Cast Bar 100g Valcambi', 
     (SELECT id FROM productType WHERE productTypeName = 'Cast Bar'), 
     (SELECT id FROM metal WHERE metalName = 'Gold'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'Switzerland'), 
     (SELECT id FROM producer WHERE producerName = 'Valcambi'),
        100.00, 'grams', 0.9999, 5800.00, 'USD', 2024, '100g Gold cast bar from Valcambi', '', '', true, 25, 1, 2.5, CURRENT_TIMESTAMP),
    ('Gold Minted Bar 1oz Degussa', 
     (SELECT id FROM productType WHERE productTypeName = 'Minted Bar'), 
     (SELECT id FROM metal WHERE metalName = 'Gold'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'Germany'), 
     (SELECT id FROM producer WHERE producerName = 'Degussa'),
        31.103, 'grams', 0.9999, 1520.00, 'USD', 2024, '1oz Gold minted bar from Degussa', '', '1-oz-Goldbarren-argor-heraeus.jpeg', true, 40, 1, 3.0, CURRENT_TIMESTAMP),
    ('Gold CombiBar 50g Metalor', 
     (SELECT id FROM productType WHERE productTypeName = 'CombiBar'), 
     (SELECT id FROM metal WHERE metalName = 'Gold'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'Switzerland'), 
     (SELECT id FROM producer WHERE producerName = 'Metalor'),
        50.00, 'grams', 0.9999, 2900.00, 'USD', 2024, '50g Gold CombiBar from Metalor', '', '', true, 30, 1, 3.2, CURRENT_TIMESTAMP),

    -- Silver Coins
    ('Silver Eagle Coin', 
     (SELECT id FROM productType WHERE productTypeName = 'Coin'), 
     (SELECT id FROM metal WHERE metalName = 'Silver'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'USA'), 
     (SELECT id FROM producer WHERE producerName = 'United States Mint'),
        31.103, 'grams', 0.999, 30.00, 'USD', 2024, 'American Silver Eagle coin', '', '1-oz-American-Eagle.jpeg', true, 500, 1, 15.0, CURRENT_TIMESTAMP),
    ('Silver Philharmonic Coin', 
     (SELECT id FROM productType WHERE productTypeName = 'Coin'), 
     (SELECT id FROM metal WHERE metalName = 'Silver'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'Austria'), 
     (SELECT id FROM producer WHERE producerName = 'Austrian Mint'),
        31.103, 'grams', 0.999, 32.00, 'USD', 2024, 'Austrian Silver Philharmonic coin', '', '1-oz-silver-coin-us-mint.jpeg', true, 300, 1, 12.5, CURRENT_TIMESTAMP),

    -- Silver Bars
    ('Silver Cast Bar 1kg Valcambi', 
     (SELECT id FROM productType WHERE productTypeName = 'Cast Bar'), 
     (SELECT id FROM metal WHERE metalName = 'Silver'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'Switzerland'), 
     (SELECT id FROM producer WHERE producerName = 'Valcambi'),
        1000.00, 'grams', 0.999, 850.00, 'USD', 2024, '1kg Silver cast bar from Valcambi', '', 'valcambi-100-gram-silver-bar.jpeg', true, 100, 1, 5.0, CURRENT_TIMESTAMP),
    ('Silver Minted Bar 250g Degussa', 
     (SELECT id FROM productType WHERE productTypeName = 'Minted Bar'), 
     (SELECT id FROM metal WHERE metalName = 'Silver'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'Germany'), 
     (SELECT id FROM producer WHERE producerName = 'Degussa'),
        250.00, 'grams', 0.999, 215.00, 'USD', 2024, '250g Silver minted bar from Degussa', '', '', true, 75, 1, 8.0, CURRENT_TIMESTAMP),

    -- Palladium Products
    ('Palladium Maple Leaf Coin', 
     (SELECT id FROM productType WHERE productTypeName = 'Coin'), 
     (SELECT id FROM metal WHERE metalName = 'Palladium'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'Canada'), 
     (SELECT id FROM producer WHERE producerName = 'Royal Canadian Mint'),
        31.103, 'grams', 0.9995, 1100.00, 'USD', 2024, 'Canadian Palladium Maple Leaf coin', '', '', true, 20, 1, 6.0, CURRENT_TIMESTAMP),
    ('Palladium Cast Bar 100g Metalor', 
     (SELECT id FROM productType WHERE productTypeName = 'Cast Bar'), 
     (SELECT id FROM metal WHERE metalName = 'Palladium'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'Switzerland'), 
     (SELECT id FROM producer WHERE producerName = 'Metalor'),
        100.00, 'grams', 0.9995, 4100.00, 'USD', 2024, '100g Palladium cast bar from Metalor', '', '', true, 15, 1, 4.5, CURRENT_TIMESTAMP),

    -- Platinum Products
    ('Platinum Kangaroo Coin', 
     (SELECT id FROM productType WHERE productTypeName = 'Coin'), 
     (SELECT id FROM metal WHERE metalName = 'Platinum'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'Australia'), 
     (SELECT id FROM producer WHERE producerName = 'Perth Mint'),
        31.103, 'grams', 0.9995, 1000.00, 'USD', 2024, 'Australian Platinum Kangaroo coin', '', '', true, 25, 1, 5.5, CURRENT_TIMESTAMP),
    ('Platinum Cast Bar 50g Valcambi', 
     (SELECT id FROM productType WHERE productTypeName = 'Cast Bar'), 
     (SELECT id FROM metal WHERE metalName = 'Platinum'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'Switzerland'), 
     (SELECT id FROM producer WHERE producerName = 'Valcambi'),
        50.00, 'grams', 0.9995, 2600.00, 'USD', 2024, '50g Platinum cast bar from Valcambi', '', '1-oz-platinum-bar-royal-canadian-mint.png', true, 20, 1, 4.8, CURRENT_TIMESTAMP);

-- Insert sample users
INSERT INTO users (email, username, passwordhash, createdat, updatedat)
VALUES
    ('admin@goldsphere.vault', 'Admin User', '$2b$10$dummy.hash.for.admin.user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('bank.technical@goldsphere.vault', 'Bank Technical User', '$2b$10$dummy.hash.for.bank.technical.user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('john.doe@example.com', 'John Doe', '$2b$10$dummy.hash.for.john.doe', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('jane.smith@example.com', 'Jane Smith', '$2b$10$dummy.hash.for.jane.smith', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert sample portfolios for backward compatibility
INSERT INTO portfolio (portfolioName, ownerId, createdAt)
VALUES
    ('John''s Portfolio', (SELECT id FROM users WHERE email = 'john.doe@example.com'), CURRENT_TIMESTAMP),
    ('Jane''s Portfolio', (SELECT id FROM users WHERE email = 'jane.smith@example.com'), CURRENT_TIMESTAMP);

-- Insert sample positions
INSERT INTO positions (userId, productId, purchaseDate, purchasePrice, marketPrice, quantity, issuingCountry, producer, certifiedProvenance, status, notes, createdAt)
VALUES
    ((SELECT id FROM users WHERE email = 'john.doe@example.com'), 
     (SELECT id FROM product WHERE productName = 'Gold Maple Leaf Coin'),
     '2024-01-15T10:30:00Z', 1450.00, 1500.00, 5.0000, 'Canada', 'Royal Canadian Mint', true, 'active', 'Initial gold investment', CURRENT_TIMESTAMP),
    
    ((SELECT id FROM users WHERE email = 'jane.smith@example.com'), 
     (SELECT id FROM product WHERE productName = 'Silver Eagle Coin'),
     '2024-02-20T14:15:00Z', 28.50, 30.00, 100.0000, 'USA', 'United States Mint', true, 'active', 'Silver portfolio diversification', CURRENT_TIMESTAMP),
     
    ((SELECT id FROM users WHERE email = 'john.doe@example.com'), 
     (SELECT id FROM product WHERE productName = 'Gold Cast Bar 100g Valcambi'),
     '2024-03-10T09:45:00Z', 5750.00, 5800.00, 2.0000, 'Switzerland', 'Valcambi', true, 'active', 'Physical gold bars', CURRENT_TIMESTAMP),
     
    ((SELECT id FROM users WHERE email = 'jane.smith@example.com'), 
     (SELECT id FROM product WHERE productName = 'Platinum Kangaroo Coin'),
     '2024-01-25T16:20:00Z', 980.00, 1000.00, 3.0000, 'Australia', 'Perth Mint', true, 'closed', 'Sold for profit', CURRENT_TIMESTAMP);

-- Insert sample transactions
INSERT INTO transactions (positionId, userId, type, date, quantity, price, fees, notes, createdAt)
VALUES
    ((SELECT id FROM positions WHERE userId = (SELECT id FROM users WHERE email = 'john.doe@example.com') AND productId = (SELECT id FROM product WHERE productName = 'Gold Maple Leaf Coin')),
     (SELECT id FROM users WHERE email = 'john.doe@example.com'),
     'buy', '2024-01-15T10:30:00Z', 5.0000, 1450.00, 25.00, 'Initial purchase of 5 Gold Maple Leaf coins', CURRENT_TIMESTAMP),
     
    ((SELECT id FROM positions WHERE userId = (SELECT id FROM users WHERE email = 'jane.smith@example.com') AND productId = (SELECT id FROM product WHERE productName = 'Silver Eagle Coin')),
     (SELECT id FROM users WHERE email = 'jane.smith@example.com'),
     'buy', '2024-02-20T14:15:00Z', 100.0000, 28.50, 15.00, 'Bulk purchase of Silver Eagles', CURRENT_TIMESTAMP),
     
    ((SELECT id FROM positions WHERE userId = (SELECT id FROM users WHERE email = 'john.doe@example.com') AND productId = (SELECT id FROM product WHERE productName = 'Gold Cast Bar 100g Valcambi')),
     (SELECT id FROM users WHERE email = 'john.doe@example.com'),
     'buy', '2024-03-10T09:45:00Z', 2.0000, 5750.00, 35.00, 'Purchase of 2x 100g gold bars', CURRENT_TIMESTAMP),
     
    ((SELECT id FROM positions WHERE userId = (SELECT id FROM users WHERE email = 'jane.smith@example.com') AND productId = (SELECT id FROM product WHERE productName = 'Platinum Kangaroo Coin')),
     (SELECT id FROM users WHERE email = 'jane.smith@example.com'),
     'buy', '2024-01-25T16:20:00Z', 3.0000, 980.00, 20.00, 'Initial platinum investment', CURRENT_TIMESTAMP),
     
    ((SELECT id FROM positions WHERE userId = (SELECT id FROM users WHERE email = 'jane.smith@example.com') AND productId = (SELECT id FROM product WHERE productName = 'Platinum Kangaroo Coin')),
     (SELECT id FROM users WHERE email = 'jane.smith@example.com'),
     'sell', '2024-04-15T11:30:00Z', 3.0000, 1000.00, 30.00, 'Sold platinum for profit', CURRENT_TIMESTAMP);
