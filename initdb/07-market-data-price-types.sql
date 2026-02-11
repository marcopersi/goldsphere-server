-- Market Data Price Types Extension
-- Adds support for multiple price types (Spot, Realtime, Bid, Ask)

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

COMMENT ON TABLE price_type IS 'Reference table for different price types (Spot, Realtime, Bid, Ask)';
COMMENT ON COLUMN price_type.code IS 'Unique code: SPOT, REALTIME, BID, ASK';
COMMENT ON COLUMN price_type.is_benchmark IS 'TRUE for official benchmark prices';
COMMENT ON COLUMN price_type.update_frequency_minutes IS 'Expected update frequency in minutes';

-- Insert default price types
INSERT INTO price_type (code, name, description, is_benchmark, update_frequency_minutes)
VALUES 
    ('SPOT', 'Spot Price', 'Current market spot price from trading exchanges', FALSE, 5),
    ('REALTIME', 'Realtime Price', 'Live streaming price with minimal delay', FALSE, 0),
    ('BID', 'Bid Price', 'Current buying price (what buyers are willing to pay)', FALSE, 5),
    ('ASK', 'Ask Price', 'Current asking price (what sellers are asking)', FALSE, 5)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 2. Add price_type_id to existing tables
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
-- 3. Provider Realtime Support
-- ============================================
DO $$
BEGIN
    -- Add supports_realtime column to market_data_provider if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'market_data_provider' AND column_name = 'supports_realtime'
    ) THEN
        ALTER TABLE market_data_provider ADD COLUMN supports_realtime BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
