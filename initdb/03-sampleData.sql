-- =============================================================================
-- Sample Data: Custody Services & Products
-- =============================================================================
-- Prices based on spot prices as of February 2026:
--   Gold:      ~$5,062/oz
--   Silver:    ~$84/oz
--   Platinum:  ~$2,146/oz
--   Palladium: ~$1,731/oz
-- =============================================================================

-- Custody service
INSERT INTO custodyService(custodianId, custodyServiceName, fee, paymentFrequency, currencyId, maxWeight, createdat)
VALUES(
    (SELECT id FROM custodian WHERE custodianName = 'Loomis'),
    'Loomis Monthly Service',
    50.00,
    'monthly',
    (SELECT id FROM currency WHERE isoCode3 = 'USD'),
    1000,
    CURRENT_TIMESTAMP);

-- =============================================================================
-- Products
-- =============================================================================
-- Column order:
--   name, producttypeid, metalid, countryid, producerid,
--   weight, weightunit, purity, price, currency,
--   year, description, certifiedprovenance, imageurl, imagefilename,
--   instock, stockquantity, minimumorderquantity, premiumpercentage,
--   diameter, thickness, mintage, certification, createdat
-- =============================================================================

INSERT INTO product (
    name, producttypeid, metalid, countryid, producerid,
    weight, weightunit, purity, price, currency,
    year, description, certifiedprovenance, imageurl, imagefilename,
    instock, stockquantity, minimumorderquantity, premiumpercentage,
    diameter, thickness, mintage, certification, createdat
)
VALUES

-- ===================== GOLD COINS =====================

('American Gold Eagle 1oz',
 (SELECT id FROM productType WHERE productTypeName = 'Coin'),
 (SELECT id FROM metal WHERE name = 'Gold'),
 (SELECT id FROM country WHERE countryName = 'USA'),
 (SELECT id FROM producer WHERE producerName = 'United States Mint'),
 1.0000, 'troy_ounces', 0.9167, 5240.00, 'USD',
 2024,
 'Official gold bullion coin of the United States. Contains 1 troy oz of fine gold alloyed with silver and copper for durability. Features Lady Liberty (obverse) and a family of eagles (reverse).',
 TRUE, '', '1-oz-Gold-American-Eagle.jpeg',
 TRUE, 50, 1, 3.50,
 32.70, 2.87, NULL, NULL,
 CURRENT_TIMESTAMP),

('Canadian Gold Maple Leaf 1oz',
 (SELECT id FROM productType WHERE productTypeName = 'Coin'),
 (SELECT id FROM metal WHERE name = 'Gold'),
 (SELECT id FROM country WHERE countryName = 'Canada'),
 (SELECT id FROM producer WHERE producerName = 'Royal Canadian Mint'),
 1.0000, 'troy_ounces', 0.9999, 5214.00, 'USD',
 2024,
 'One of the purest gold coins in the world at .9999 fine gold. Features the iconic maple leaf design with advanced anti-counterfeiting DNA technology.',
 TRUE, '', '1-oz-Maple-Leaf.jpeg',
 TRUE, 100, 1, 3.00,
 30.00, 2.87, NULL, NULL,
 CURRENT_TIMESTAMP),

('Gold Krugerrand 1oz',
 (SELECT id FROM productType WHERE productTypeName = 'Coin'),
 (SELECT id FROM metal WHERE name = 'Gold'),
 (SELECT id FROM country WHERE countryName = 'South Africa'),
 (SELECT id FROM producer WHERE producerName = 'Rand Refinery'),
 1.0000, 'troy_ounces', 0.9167, 5204.00, 'USD',
 2024,
 'The worlds first modern gold bullion coin, minted since 1967. 22-karat gold alloyed with copper giving it a distinctive orange hue. Features Paul Kruger and a springbok antelope.',
 TRUE, '', 'Rand-Krugerrand-Coin.jpg',
 TRUE, 75, 1, 2.80,
 32.77, 2.84, NULL, NULL,
 CURRENT_TIMESTAMP),

('Gold Vienna Philharmonic 1oz',
 (SELECT id FROM productType WHERE productTypeName = 'Coin'),
 (SELECT id FROM metal WHERE name = 'Gold'),
 (SELECT id FROM country WHERE countryName = 'Austria'),
 (SELECT id FROM producer WHERE producerName = 'Austrian Mint'),
 1.0000, 'troy_ounces', 0.9999, 5265.00, 'USD',
 2024,
 'Europes most popular gold bullion coin at .9999 fine gold. Features the Great Organ of the Golden Hall of the Musikverein (obverse) and orchestral instruments (reverse).',
 TRUE, '', 'Gold Vienna Philharmonic Coin.jpg',
 TRUE, 50, 1, 4.00,
 37.00, 2.00, NULL, NULL,
 CURRENT_TIMESTAMP),

-- ===================== GOLD BARS =====================

('Gold Cast Bar 100g Valcambi',
 (SELECT id FROM productType WHERE productTypeName = 'Cast Bar'),
 (SELECT id FROM metal WHERE name = 'Gold'),
 (SELECT id FROM country WHERE countryName = 'Switzerland'),
 (SELECT id FROM producer WHERE producerName = 'Valcambi'),
 100.0000, 'grams', 0.9999, 16680.00, 'USD',
 NULL,
 'LBMA-certified 100g gold cast bar from Valcambi, one of Switzerlands premier refiners. Each bar is individually serial-numbered and assayed.',
 TRUE, '', '100g-Valcambi-Gold-Cast-Bar.jpg',
 TRUE, 25, 1, 2.50,
 NULL, 9.00, NULL, 'LBMA Good Delivery',
 CURRENT_TIMESTAMP),

('Gold Minted Bar 1oz Degussa',
 (SELECT id FROM productType WHERE productTypeName = 'Minted Bar'),
 (SELECT id FROM metal WHERE name = 'Gold'),
 (SELECT id FROM country WHERE countryName = 'Germany'),
 (SELECT id FROM producer WHERE producerName = 'Degussa'),
 31.1035, 'grams', 0.9999, 5214.00, 'USD',
 NULL,
 'Precision-minted 1oz gold bar from Degussa with mirror-finish surface. Sealed in tamper-evident assay card with unique serial number.',
 TRUE, '', '1-oz-Goldbarren-argor-heraeus.jpeg',
 TRUE, 40, 1, 3.00,
 NULL, 2.00, NULL, 'LBMA Good Delivery',
 CURRENT_TIMESTAMP),

('Gold CombiBar 50g Metalor',
 (SELECT id FROM productType WHERE productTypeName = 'CombiBar'),
 (SELECT id FROM metal WHERE name = 'Gold'),
 (SELECT id FROM country WHERE countryName = 'Switzerland'),
 (SELECT id FROM producer WHERE producerName = 'Metalor'),
 50.0000, 'grams', 0.9999, 8400.00, 'USD',
 NULL,
 'Divisible 50g CombiBar consisting of 50 x 1g gold segments. Each segment is individually separable and stamped with weight and purity. Ideal for flexible investment and gifting.',
 TRUE, '', '50g-Metalor-Gold-Bar.jpg',
 TRUE, 30, 1, 3.20,
 NULL, 0.70, NULL, 'LBMA Good Delivery',
 CURRENT_TIMESTAMP),

-- ===================== SILVER COINS =====================

('American Silver Eagle 1oz',
 (SELECT id FROM productType WHERE productTypeName = 'Coin'),
 (SELECT id FROM metal WHERE name = 'Silver'),
 (SELECT id FROM country WHERE countryName = 'USA'),
 (SELECT id FROM producer WHERE producerName = 'United States Mint'),
 1.0000, 'troy_ounces', 0.9990, 96.70, 'USD',
 2024,
 'Americas premier silver bullion coin. Type 2 design featuring Walking Liberty (obverse) and a soaring eagle (reverse). .999 fine silver.',
 TRUE, '', '1-oz-Silver-American-Eagle.jpeg',
 TRUE, 500, 1, 15.00,
 40.60, 2.98, NULL, NULL,
 CURRENT_TIMESTAMP),

('Silver Vienna Philharmonic 1oz',
 (SELECT id FROM productType WHERE productTypeName = 'Coin'),
 (SELECT id FROM metal WHERE name = 'Silver'),
 (SELECT id FROM country WHERE countryName = 'Austria'),
 (SELECT id FROM producer WHERE producerName = 'Austrian Mint'),
 1.0000, 'troy_ounces', 0.9990, 94.60, 'USD',
 2024,
 'Silver version of Europes favourite bullion coin. Same elegant Philharmonic design as the gold version. .999 fine silver, legal tender in Austria (1.50 EUR face value).',
 TRUE, '', 'Silver Vienna Philharmonic Coin.jpg',
 TRUE, 300, 1, 12.50,
 37.00, 3.20, NULL, NULL,
 CURRENT_TIMESTAMP),

-- ===================== SILVER BARS =====================

('Silver Cast Bar 1kg Valcambi',
 (SELECT id FROM productType WHERE productTypeName = 'Cast Bar'),
 (SELECT id FROM metal WHERE name = 'Silver'),
 (SELECT id FROM country WHERE countryName = 'Switzerland'),
 (SELECT id FROM producer WHERE producerName = 'Valcambi'),
 1000.0000, 'grams', 0.9990, 2835.00, 'USD',
 NULL,
 'LBMA-certified 1kg silver cast bar from Valcambi. Hand-poured with unique texture. Serial-numbered and assay-certified for purity.',
 TRUE, '', '1-kilo-valcambi-silver-bar.jpg',
 TRUE, 100, 1, 5.00,
 NULL, 14.00, NULL, 'LBMA Good Delivery',
 CURRENT_TIMESTAMP),

('Silver Cast Bar 100g Valcambi',
 (SELECT id FROM productType WHERE productTypeName = 'Cast Bar'),
 (SELECT id FROM metal WHERE name = 'Silver'),
 (SELECT id FROM country WHERE countryName = 'Switzerland'),
 (SELECT id FROM producer WHERE producerName = 'Valcambi'),
 100.0000, 'grams', 0.9990, 286.00, 'USD',
 NULL,
 'LBMA-certified 100g silver cast bar from Valcambi. Compact size ideal for building a silver position. Serial-numbered with assay certificate.',
 TRUE, '', '100g-valcambi-silver-bar.jpeg',
 TRUE, 10, 1, 6.00,
 NULL, 8.00, NULL, 'LBMA Good Delivery',
 CURRENT_TIMESTAMP),

-- ===================== PALLADIUM =====================

('Palladium Maple Leaf 1oz',
 (SELECT id FROM productType WHERE productTypeName = 'Coin'),
 (SELECT id FROM metal WHERE name = 'Palladium'),
 (SELECT id FROM country WHERE countryName = 'Canada'),
 (SELECT id FROM producer WHERE producerName = 'Royal Canadian Mint'),
 1.0000, 'troy_ounces', 0.9995, 1835.00, 'USD',
 2024,
 'One of very few palladium bullion coins worldwide. .9995 fine palladium featuring the iconic maple leaf. Legal tender in Canada ($50 CAD face value).',
 TRUE, '', 'Palladium-Maple-Leaf-Coin.jpg',
 TRUE, 20, 1, 6.00,
 33.00, 2.50, NULL, NULL,
 CURRENT_TIMESTAMP),

('Palladium Cast Bar 100g Argor-Heraeus',
 (SELECT id FROM productType WHERE productTypeName = 'Cast Bar'),
 (SELECT id FROM metal WHERE name = 'Palladium'),
 (SELECT id FROM country WHERE countryName = 'Switzerland'),
 (SELECT id FROM producer WHERE producerName = 'Argor-Heraeus'),
 100.0000, 'grams', 0.9995, 5820.00, 'USD',
 NULL,
 'LBMA-certified 100g palladium cast bar from Argor-Heraeus, a leading Swiss LBMA-accredited refinery. Serial-numbered with assay certificate.',
 TRUE, '', '100g-Palladium-cast-bar-argor.png',
 TRUE, 15, 1, 4.50,
 NULL, 5.50, NULL, 'LBMA Good Delivery',
 CURRENT_TIMESTAMP),

-- ===================== PLATINUM =====================

('Platinum Kangaroo 1oz',
 (SELECT id FROM productType WHERE productTypeName = 'Coin'),
 (SELECT id FROM metal WHERE name = 'Platinum'),
 (SELECT id FROM country WHERE countryName = 'Australia'),
 (SELECT id FROM producer WHERE producerName = 'Perth Mint'),
 1.0000, 'troy_ounces', 0.9995, 2264.00, 'USD',
 2024,
 'Australian Platinum Kangaroo coin from Perth Mint. .9995 fine platinum featuring a kangaroo design that changes annually. Legal tender in Australia ($100 AUD face value).',
 TRUE, '', 'Platinum-Kangaroo-Coin.png',
 TRUE, 25, 1, 5.50,
 32.10, 2.80, NULL, NULL,
 CURRENT_TIMESTAMP),

('Platinum Cast Bar 50g Valcambi',
 (SELECT id FROM productType WHERE productTypeName = 'Cast Bar'),
 (SELECT id FROM metal WHERE name = 'Platinum'),
 (SELECT id FROM country WHERE countryName = 'Switzerland'),
 (SELECT id FROM producer WHERE producerName = 'Valcambi'),
 50.0000, 'grams', 0.9995, 3615.00, 'USD',
 NULL,
 'LBMA-certified 50g platinum cast bar from Valcambi. Hand-poured with individual serial number and assay certificate. Compact investment-grade platinum.',
 TRUE, '', '1-oz-platinum-bar-royal-canadian-mint.png',
 TRUE, 20, 1, 4.80,
 NULL, 4.50, NULL, 'LBMA Good Delivery',
 CURRENT_TIMESTAMP);
