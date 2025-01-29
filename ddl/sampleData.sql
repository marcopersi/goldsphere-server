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
INSERT INTO product (productName, productTypeId, metalId, issuingCountryId, manufacturerId,fineWeight,unitOfMeasure, price, createdAt)
VALUES
    ('Gold Maple Leaf Coin', 
     (SELECT id FROM productType WHERE productTypeName = 'Coin'), 
     (SELECT id FROM metal WHERE metalName = 'Gold'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'Canada'), 
     (SELECT id FROM manufacturer WHERE manufacturerName = 'Royal Canadian Mint'),
        1.00, 'oz', 1500.00, CURRENT_TIMESTAMP),
    ('Silver Eagle Coin', 
     (SELECT id FROM productType WHERE productTypeName = 'Coin'), 
     (SELECT id FROM metal WHERE metalName = 'Silver'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'USA'), 
     (SELECT id FROM manufacturer WHERE manufacturerName = 'United States Mint'),
        1.00, 'oz', 30.00, CURRENT_TIMESTAMP),
    ('Platinum Kangaroo Coin', 
     (SELECT id FROM productType WHERE productTypeName = 'Coin'), 
     (SELECT id FROM metal WHERE metalName = 'Platinum'), 
     (SELECT id FROM issuingCountry WHERE issuingCountryName = 'Australia'), 
     (SELECT id FROM manufacturer WHERE manufacturerName = 'Perth Mint'),     
        1.00, 'oz', 1000.00, CURRENT_TIMESTAMP);

-- Insert sample users
INSERT INTO users (userName, email, passwordHash, createdAt)
VALUES
    ('John Doe', 'john.doe@example.com', 'hashed_password_1', CURRENT_TIMESTAMP),
    ('Jane Smith', 'jane.smith@example.com', 'hashed_password_2', CURRENT_TIMESTAMP)
    ON CONFLICT (email) DO NOTHING;

-- Insert sample portfolios
INSERT INTO portfolio (portfolioName, ownerId, createdAt)
VALUES
    ('John''s Portfolio', (SELECT id FROM users WHERE email = 'john.doe@example.com'), CURRENT_TIMESTAMP),
    ('Jane''s Portfolio', (SELECT id FROM users WHERE email = 'jane.smith@example.com'), CURRENT_TIMESTAMP);

-- Insert sample positions
INSERT INTO position (custodyServiceId, productId, purchaseDate, quantity, createdAt)
VALUES(
    (SELECT id FROM custodyService WHERE custodyServiceName = 'Loomis Monthly Service'),
    (SELECT id FROM product WHERE productName = 'Gold Maple Leaf Coin'),
    '2021-01-01', 1,
    CURRENT_TIMESTAMP),
    ((SELECT id FROM custodyService WHERE custodyServiceName = 'Loomis Monthly Service'),
    (SELECT id FROM product WHERE productName = 'Silver Eagle Coin'),
    '2021-01-01',1,
    CURRENT_TIMESTAMP);

INSERT INTO portfolioPosition(portfolioId, positionId, createdAt)
VALUES(
    (SELECT id FROM portfolio WHERE portfolioName = 'John''s Portfolio'),
    (SELECT id FROM position WHERE productId = (SELECT id FROM product WHERE productName = 'Gold Maple Leaf Coin')),
    CURRENT_TIMESTAMP),
    ((SELECT id FROM portfolio WHERE portfolioName = 'Jane''s Portfolio'),
    (SELECT id FROM position WHERE productId = (SELECT id FROM product WHERE productName = 'Silver Eagle Coin')),
    CURRENT_TIMESTAMP);

-- Insert sample orders
INSERT INTO orders (userId, productId, quantity, totalPrice, orderStatus, createdAt)
VALUES
    ((SELECT id FROM users WHERE email = 'john.doe@example.com'), 
     (SELECT id FROM product WHERE productName = 'Gold Maple Leaf Coin'), 
     10, 15000.00, 'pending', CURRENT_TIMESTAMP),
    ((SELECT id FROM users WHERE email = 'jane.smith@example.com'), 
     (SELECT id FROM product WHERE productName = 'Silver Eagle Coin'), 
     100, 3000.00, 'confirmed', CURRENT_TIMESTAMP);
