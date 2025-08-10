
INSERT INTO productType (productTypeName, createdAt)
VALUES
    ('Coin', CURRENT_TIMESTAMP),
    ('Bar', CURRENT_TIMESTAMP),
    ('Medallion', CURRENT_TIMESTAMP),
    ('Jewelry', CURRENT_TIMESTAMP),
    ('Cast Bar', CURRENT_TIMESTAMP),
    ('Minted Bar', CURRENT_TIMESTAMP),
    ('CombiBar', CURRENT_TIMESTAMP);

INSERT INTO metal (metalName, metalSymbol, createdAt)
VALUES
    ('Gold', 'AU', CURRENT_TIMESTAMP),
    ('Silver', 'AG', CURRENT_TIMESTAMP),
    ('Palladium', 'PD', CURRENT_TIMESTAMP),
    ('Platinum', 'PT', CURRENT_TIMESTAMP);

INSERT INTO currency (isoCode2, isoCode3, isoNumericCode, createdAt)
VALUES
    ('US', 'USD', 840, CURRENT_TIMESTAMP),
    ('EU', 'EUR', 978, CURRENT_TIMESTAMP),
    ('CH', 'CHF', 756, CURRENT_TIMESTAMP),
    ('GB', 'GBP', 826, CURRENT_TIMESTAMP);

-- Insert sample issuing countries
INSERT INTO issuingCountry (issuingCountryName, isoCode2, createdAt)
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
INSERT INTO custodian (custodianName, createdAt)
VALUES
    ('Loomis', CURRENT_TIMESTAMP),
    ('Brinks', CURRENT_TIMESTAMP),
    ('Bank of Switzerland', CURRENT_TIMESTAMP),
    ('Home Storage', CURRENT_TIMESTAMP), -- Für Kunden, die selbst lagern
    ('Malca-Amit', CURRENT_TIMESTAMP),
    ('G4S Vaults', CURRENT_TIMESTAMP),
    ('Swiss Gold Safe', CURRENT_TIMESTAMP),
    ('Via Mat International', CURRENT_TIMESTAMP),
    ('Vault Services by Sequel', CURRENT_TIMESTAMP),
    ('Delaware Depository', CURRENT_TIMESTAMP),
    ('International Depository Services', CURRENT_TIMESTAMP);

-- Beispiel für eine bestehende Tabelle (z.B. producer)
INSERT INTO producer (producerName, createdAt) VALUES
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

-- Insert technical user for system operations
-- Password: bank_tech_secure_2024 (hashed with bcrypt)
INSERT INTO users (userName, email, passwordHash, createdAt)
VALUES
    ('Bank Technical User', 'bank.technical@goldsphere.vault', '$2b$10$.06T8FlnlaUi3AxhUQ3xiuI7X/YG0KzkAKx7FfQyCKxXgH2zdK.8G', CURRENT_TIMESTAMP);