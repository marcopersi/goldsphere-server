-- Market Data Price Types Extension
-- Adds support for multiple price types (LBMA Benchmark, Spot, Realtime)
-- and LBMA-specific fixing data

-- ============================================
-- 1. Price Type Reference Table
-- ============================================
CREATE TABLE IF NOT EXISTS price_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_benchmark BOOLEAN DEFAULT FALSE,
    update_frequency_minutes INTEGER,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE price_type IS 'Reference table for different price types (LBMA, Spot, Realtime)';
COMMENT ON COLUMN price_type.code IS 'Unique code: LBMA_AM, LBMA_PM, SPOT, REALTIME';
COMMENT ON COLUMN price_type.is_benchmark IS 'TRUE for official benchmark prices like LBMA';
COMMENT ON COLUMN price_type.update_frequency_minutes IS 'Expected update frequency in minutes';

-- Insert default price types
INSERT INTO price_type (code, name, description, is_benchmark, update_frequency_minutes)
VALUES 
    ('LBMA_AM', 'LBMA Gold AM Fixing', 'London Bullion Market Association morning gold price fixing at 10:30 London time', TRUE, 1440),
    ('LBMA_PM', 'LBMA Gold PM Fixing', 'London Bullion Market Association afternoon gold price fixing at 15:00 London time', TRUE, 1440),
    ('LBMA_SILVER', 'LBMA Silver Fixing', 'London Bullion Market Association silver price fixing at 12:00 London time', TRUE, 1440),
    ('LBMA_PLATINUM_AM', 'LBMA Platinum AM Fixing', 'LPPM platinum morning fixing at 09:45 London time', TRUE, 1440),
    ('LBMA_PLATINUM_PM', 'LBMA Platinum PM Fixing', 'LPPM platinum afternoon fixing at 14:00 London time', TRUE, 1440),
    ('LBMA_PALLADIUM_AM', 'LBMA Palladium AM Fixing', 'LPPM palladium morning fixing at 09:45 London time', TRUE, 1440),
    ('LBMA_PALLADIUM_PM', 'LBMA Palladium PM Fixing', 'LPPM palladium afternoon fixing at 14:00 London time', TRUE, 1440),
    ('SPOT', 'Spot Price', 'Current market spot price from trading exchanges', FALSE, 5),
    ('REALTIME', 'Realtime Price', 'Live streaming price with minimal delay', FALSE, 0),
    ('BID', 'Bid Price', 'Current buying price (what buyers are willing to pay)', FALSE, 5),
    ('ASK', 'Ask Price', 'Current asking price (what sellers are asking)', FALSE, 5)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 2. LBMA Fixing Prices Table
-- ============================================
CREATE TABLE IF NOT EXISTS lbma_price (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metal_id UUID NOT NULL REFERENCES metal(id) ON DELETE CASCADE,
    price_type_id UUID NOT NULL REFERENCES price_type(id),
    fixing_date DATE NOT NULL,
    fixing_time TIME NOT NULL,
    price_usd NUMERIC(12, 4) NOT NULL,
    price_gbp NUMERIC(12, 4),
    price_eur NUMERIC(12, 4),
    price_chf NUMERIC(12, 4),
    participants INTEGER,
    source VARCHAR(50) DEFAULT 'LBMA',
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(metal_id, fixing_date, price_type_id)
);

COMMENT ON TABLE lbma_price IS 'Official LBMA benchmark fixing prices for precious metals';
COMMENT ON COLUMN lbma_price.fixing_date IS 'Date of the fixing';
COMMENT ON COLUMN lbma_price.fixing_time IS 'Time of the fixing in London timezone';
COMMENT ON COLUMN lbma_price.participants IS 'Number of participants in the fixing auction';
COMMENT ON COLUMN lbma_price.source IS 'Data source: LBMA, ICE, METALS_API';

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_lbma_price_metal_id ON lbma_price(metal_id);
CREATE INDEX IF NOT EXISTS idx_lbma_price_fixing_date ON lbma_price(fixing_date DESC);
CREATE INDEX IF NOT EXISTS idx_lbma_price_type ON lbma_price(price_type_id);
CREATE INDEX IF NOT EXISTS idx_lbma_price_metal_date ON lbma_price(metal_id, fixing_date DESC);

-- ============================================
-- 3. Add price_type_id to existing tables
-- ============================================
DO $$
BEGIN
    -- Add price_type_id to market_price if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'market_price' AND column_name = 'price_type_id'
    ) THEN
        ALTER TABLE market_price ADD COLUMN price_type_id UUID REFERENCES price_type(id);
        
        -- Set default to SPOT for existing records
        UPDATE market_price 
        SET price_type_id = (SELECT id FROM price_type WHERE code = 'SPOT')
        WHERE price_type_id IS NULL;
    END IF;

    -- Add price_type_id to price_history if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'price_history' AND column_name = 'price_type_id'
    ) THEN
        ALTER TABLE price_history ADD COLUMN price_type_id UUID REFERENCES price_type(id);
        
        -- Set default to SPOT for existing records
        UPDATE price_history 
        SET price_type_id = (SELECT id FROM price_type WHERE code = 'SPOT')
        WHERE price_type_id IS NULL;
    END IF;
END $$;

-- ============================================
-- 4. Premium Configuration Table
-- ============================================
CREATE TABLE IF NOT EXISTS price_premium_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    metal_id UUID REFERENCES metal(id),
    base_price_type_id UUID REFERENCES price_type(id),
    premium_percent NUMERIC(8, 6),
    premium_fixed_amount NUMERIC(12, 4),
    currency VARCHAR(3) DEFAULT 'USD',
    min_quantity_oz NUMERIC(12, 4),
    max_quantity_oz NUMERIC(12, 4),
    valid_from DATE NOT NULL,
    valid_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

COMMENT ON TABLE price_premium_config IS 'Configuration for price premiums over benchmark prices';
COMMENT ON COLUMN price_premium_config.premium_percent IS 'Premium as decimal (0.025 = 2.5%)';
COMMENT ON COLUMN price_premium_config.premium_fixed_amount IS 'Fixed premium amount per troy oz';
COMMENT ON COLUMN price_premium_config.min_quantity_oz IS 'Minimum quantity for this premium tier';
COMMENT ON COLUMN price_premium_config.max_quantity_oz IS 'Maximum quantity for this premium tier';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_premium_config_metal ON price_premium_config(metal_id);
CREATE INDEX IF NOT EXISTS idx_premium_config_active ON price_premium_config(is_active, valid_from, valid_to);

-- ============================================
-- 5. Provider LBMA Support Mapping
-- ============================================
DO $$
BEGIN
    -- Add supports_lbma column to market_data_provider if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'market_data_provider' AND column_name = 'supports_lbma'
    ) THEN
        ALTER TABLE market_data_provider ADD COLUMN supports_lbma BOOLEAN DEFAULT FALSE;
        ALTER TABLE market_data_provider ADD COLUMN supports_realtime BOOLEAN DEFAULT FALSE;
        ALTER TABLE market_data_provider ADD COLUMN lbma_endpoint TEXT;
        
        -- Update Metals-API to support LBMA
        UPDATE market_data_provider 
        SET supports_lbma = TRUE, 
            lbma_endpoint = '/historical-lbma/'
        WHERE name = 'Metals-API';
        
        -- GoldAPI also supports LBMA historical
        UPDATE market_data_provider 
        SET supports_lbma = TRUE
        WHERE name = 'GoldAPI';
    END IF;
END $$;

-- ============================================
-- 6. Useful Functions
-- ============================================

-- Get latest LBMA price for a metal
CREATE OR REPLACE FUNCTION get_latest_lbma_price(
    p_metal_symbol VARCHAR(5),
    p_fixing_type VARCHAR(20) DEFAULT 'LBMA_PM'
)
RETURNS TABLE (
    metal_symbol VARCHAR(5),
    fixing_date DATE,
    fixing_time TIME,
    price_usd NUMERIC(12,4),
    price_eur NUMERIC(12,4),
    price_gbp NUMERIC(12,4),
    price_chf NUMERIC(12,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.symbol as metal_symbol,
        lp.fixing_date,
        lp.fixing_time,
        lp.price_usd,
        lp.price_eur,
        lp.price_gbp,
        lp.price_chf
    FROM lbma_price lp
    JOIN metal m ON lp.metal_id = m.id
    JOIN price_type pt ON lp.price_type_id = pt.id
    WHERE m.symbol = p_metal_symbol
    AND pt.code = p_fixing_type
    ORDER BY lp.fixing_date DESC, lp.fixing_time DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Calculate premium price
CREATE OR REPLACE FUNCTION calculate_premium_price(
    p_base_price NUMERIC(12,4),
    p_metal_id UUID,
    p_quantity_oz NUMERIC(12,4) DEFAULT 1
)
RETURNS NUMERIC(12,4) AS $$
DECLARE
    v_premium_percent NUMERIC(8,6);
    v_premium_fixed NUMERIC(12,4);
    v_final_price NUMERIC(12,4);
BEGIN
    -- Get applicable premium config
    SELECT premium_percent, premium_fixed_amount
    INTO v_premium_percent, v_premium_fixed
    FROM price_premium_config
    WHERE metal_id = p_metal_id
    AND is_active = TRUE
    AND valid_from <= CURRENT_DATE
    AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
    AND (min_quantity_oz IS NULL OR min_quantity_oz <= p_quantity_oz)
    AND (max_quantity_oz IS NULL OR max_quantity_oz >= p_quantity_oz)
    ORDER BY min_quantity_oz DESC NULLS LAST
    LIMIT 1;
    
    -- Calculate final price
    v_final_price := p_base_price;
    
    IF v_premium_percent IS NOT NULL THEN
        v_final_price := v_final_price * (1 + v_premium_percent);
    END IF;
    
    IF v_premium_fixed IS NOT NULL THEN
        v_final_price := v_final_price + v_premium_fixed;
    END IF;
    
    RETURN COALESCE(v_final_price, p_base_price);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. Sample Premium Configurations
-- ============================================
INSERT INTO price_premium_config (name, description, metal_id, premium_percent, valid_from, is_active)
SELECT 
    'Standard Gold Premium',
    'Default 2.5% premium over LBMA for retail gold',
    m.id,
    0.025,
    CURRENT_DATE,
    TRUE
FROM metal m WHERE m.symbol = 'AU'
ON CONFLICT DO NOTHING;

INSERT INTO price_premium_config (name, description, metal_id, premium_percent, valid_from, is_active)
SELECT 
    'Standard Silver Premium',
    'Default 5% premium over LBMA for retail silver',
    m.id,
    0.05,
    CURRENT_DATE,
    TRUE
FROM metal m WHERE m.symbol = 'AG'
ON CONFLICT DO NOTHING;
