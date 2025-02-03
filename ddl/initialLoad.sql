
INSERT INTO productType (productTypeName, createdAt)
VALUES
    ('Coin', CURRENT_TIMESTAMP),
    ('Bar', CURRENT_TIMESTAMP),
    ('Medallion', CURRENT_TIMESTAMP),
    ('Jewelry', CURRENT_TIMESTAMP),
    ('Cast Bar', CURRENT_TIMESTAMP),
    ('Minted Bar', CURRENT_TIMESTAMP),
    ('CombiBar', CURRENT_TIMESTAMP);

INSERT INTO metal (metalName, createdAt)
VALUES
    ('Gold', CURRENT_TIMESTAMP),
    ('Silver', CURRENT_TIMESTAMP),
    ('Palladium', CURRENT_TIMESTAMP),
    ('Platinum', CURRENT_TIMESTAMP);

INSERT INTO currency (isoCode2, isoCode3, isoNumericCode, createdAt)
VALUES
    ('US', 'USD', 840, CURRENT_TIMESTAMP),
    ('EU', 'EUR', 978, CURRENT_TIMESTAMP),
    ('CH', 'CHF', 756, CURRENT_TIMESTAMP),
    ('GB', 'GBP', 826, CURRENT_TIMESTAMP);

-- Insert sample issuing countries
INSERT INTO issuingCountry (issuingCountryName, createdAt)
VALUES
    ('Canada', CURRENT_TIMESTAMP),
    ('USA', CURRENT_TIMESTAMP),
    ('Australia', CURRENT_TIMESTAMP),
    ('South Africa', CURRENT_TIMESTAMP),
    ('Switzerland', CURRENT_TIMESTAMP),
    ('China', CURRENT_TIMESTAMP),
    ('Russia', CURRENT_TIMESTAMP),
    ('Germany', CURRENT_TIMESTAMP),
    ('Austria', CURRENT_TIMESTAMP);

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