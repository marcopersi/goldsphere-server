
-- Insert core reference data
INSERT INTO productType (productTypeName, createdat)
VALUES
    ('Coin', CURRENT_TIMESTAMP),
    ('Bar', CURRENT_TIMESTAMP),
    ('Medallion', CURRENT_TIMESTAMP),
    ('Jewelry', CURRENT_TIMESTAMP),
    ('Cast Bar', CURRENT_TIMESTAMP),
    ('Minted Bar', CURRENT_TIMESTAMP),
    ('CombiBar', CURRENT_TIMESTAMP);

INSERT INTO metal (name, symbol, createdat)
VALUES
    ('Gold', 'AU', CURRENT_TIMESTAMP),
    ('Silver', 'AG', CURRENT_TIMESTAMP),
    ('Palladium', 'PD', CURRENT_TIMESTAMP),
    ('Platinum', 'PT', CURRENT_TIMESTAMP);

INSERT INTO currency (isoCode2, isoCode3, isoNumericCode, createdat)
VALUES
    ('US', 'USD', 840, CURRENT_TIMESTAMP),
    ('EU', 'EUR', 978, CURRENT_TIMESTAMP),
    ('CH', 'CHF', 756, CURRENT_TIMESTAMP),
    ('GB', 'GBP', 826, CURRENT_TIMESTAMP),
    ('CA', 'CAD', 124, CURRENT_TIMESTAMP),
    ('AU', 'AUD', 036, CURRENT_TIMESTAMP);

-- Insert sample countries
INSERT INTO country (countryName, isoCode2, createdat)
VALUES
    ('Canada', 'CA', CURRENT_TIMESTAMP),
    ('USA', 'US', CURRENT_TIMESTAMP),
    ('Australia', 'AU', CURRENT_TIMESTAMP),
    ('South Africa', 'ZA', CURRENT_TIMESTAMP),
    ('Switzerland', 'CH', CURRENT_TIMESTAMP),
    ('China', 'CN', CURRENT_TIMESTAMP),
    ('Russia', 'RU', CURRENT_TIMESTAMP),
    ('Germany', 'DE', CURRENT_TIMESTAMP),
    ('Austria', 'AT', CURRENT_TIMESTAMP);

-- Insert sample custodians
INSERT INTO custodian (custodianName, createdat)
VALUES
    ('Home Delivery', CURRENT_TIMESTAMP),
    ('Loomis', CURRENT_TIMESTAMP),
    ('Brinks', CURRENT_TIMESTAMP),
    ('Bank of Switzerland', CURRENT_TIMESTAMP),
    ('Malca-Amit', CURRENT_TIMESTAMP),
    ('G4S Vaults', CURRENT_TIMESTAMP),
    ('Swiss Gold Safe', CURRENT_TIMESTAMP),
    ('Via Mat International', CURRENT_TIMESTAMP),
    ('Vault Services by Sequel', CURRENT_TIMESTAMP),
    ('Delaware Depository', CURRENT_TIMESTAMP),
    ('International Depository Services', CURRENT_TIMESTAMP);

-- Insert sample producers
INSERT INTO producer (producerName, createdat) VALUES
('Argor-Heraeus', CURRENT_TIMESTAMP),
('Asahi Refining', CURRENT_TIMESTAMP),
('Bayerisches Hauptmünzamt', CURRENT_TIMESTAMP),
('British Royal Mint', CURRENT_TIMESTAMP),
('Casa de Moneda de México', CURRENT_TIMESTAMP),
('Den Kongelige Mont, Kopenhagen', CURRENT_TIMESTAMP),
('Diverse serbische Münzprägeanstalten', CURRENT_TIMESTAMP),
('Eidgenössische Münzstätte Bern', CURRENT_TIMESTAMP),
('Heimerle + Meule GmbH Scheideanstalt', CURRENT_TIMESTAMP),
('Heraeus Precious Metals GmbH & Co. KG', CURRENT_TIMESTAMP),
('Johnson Matthey', CURRENT_TIMESTAMP),
('Kennecott Utah Copper', CURRENT_TIMESTAMP),
('KGHM Polska Miedź', CURRENT_TIMESTAMP),
('Korean Mint (KOMSCO)', CURRENT_TIMESTAMP),
('Lunar Mint New Zealand', CURRENT_TIMESTAMP),
('Chinese Gold Panda Mint', CURRENT_TIMESTAMP),
('Australian Gold Kangaroo Mint', CURRENT_TIMESTAMP),
('Polish State Mint', CURRENT_TIMESTAMP),
('Singapore Mint', CURRENT_TIMESTAMP),
('Banco de Mexico', CURRENT_TIMESTAMP),
('Perth Mint', CURRENT_TIMESTAMP),
('Swiss Mint', CURRENT_TIMESTAMP),
('United States Mint', CURRENT_TIMESTAMP),
('Royal Canadian Mint', CURRENT_TIMESTAMP),
('PAMP Suisse', CURRENT_TIMESTAMP),
('Metalor', CURRENT_TIMESTAMP),
('Umicore AG & Co. KG', CURRENT_TIMESTAMP),
('Valcambi', CURRENT_TIMESTAMP),
('Degussa', CURRENT_TIMESTAMP),
('Austrian Mint', CURRENT_TIMESTAMP),
('Rand Refinery', CURRENT_TIMESTAMP);

-- Insert users for testing and system operations
-- Passwords: bank.technical@goldsphere.vault = "GoldspherePassword", admin@goldsphere.vault = "admin123"
-- See CREDENTIALS.md for all system passwords
INSERT INTO users (id, email, passwordHash, role, email_verified, identity_verified, terms_version, terms_accepted_at, createdat, updatedat)
VALUES
    ('00000000-0000-0000-0000-000000000000', 'system@internal', '$2b$10$oWWBsW3k27.FHsrPkSp4quWD.hqcdk917aHcA9R4ITeU04uImejA2', 'user', TRUE, TRUE, '1.0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO users (email, passwordHash, role, email_verified, identity_verified, terms_version, terms_accepted_at, createdat, updatedat)
VALUES
    ('bank.technical@goldsphere.vault', '$2b$10$Qpvbznj0phc/iumR0YcUVezf0eWV6wR0j34KxK/WLR1VwGv8Wgmj6', 'user', TRUE, TRUE, '1.0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('admin@goldsphere.vault', '$2b$10$oWWBsW3k27.FHsrPkSp4quWD.hqcdk917aHcA9R4ITeU04uImejA2', 'admin', TRUE, TRUE, '1.0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert basic custody services including home delivery option
INSERT INTO custodyService (custodianId, custodyServiceName, fee, paymentFrequency, currencyId, maxWeight, createdat)
VALUES
    ((SELECT id FROM custodian WHERE custodianName = 'Home Delivery'),
     'Home Delivery',
     20.00,
     'onetime',
     (SELECT id FROM currency WHERE isoCode3 = 'CHF'),
     NULL,
     CURRENT_TIMESTAMP),
    ((SELECT id FROM custodian WHERE custodianName = 'Loomis'),
     'Loomis Standard Vault',
     25.00,
     'monthly',
     (SELECT id FROM currency WHERE isoCode3 = 'CHF'),
     5000.00,
     CURRENT_TIMESTAMP);