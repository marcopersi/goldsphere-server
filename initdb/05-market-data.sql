-- Market Data System Schema
-- Tables for storing real-time and historical precious metal market data

-- Market Data Provider Table
DROP TABLE IF EXISTS market_data_provider CASCADE;
CREATE TABLE IF NOT EXISTS market_data_provider (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    api_key_env_var VARCHAR(100) NOT NULL, -- Environment variable name for API key
    base_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    rate_limit_per_minute INTEGER DEFAULT 60,
    priority INTEGER DEFAULT 1, -- Lower number = higher priority for fallback
    last_success TIMESTAMP,
    last_failure TIMESTAMP,
    failure_count INTEGER DEFAULT 0,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy UUID REFERENCES users(id),
    updatedBy UUID REFERENCES users(id)
);

-- Current Market Prices (latest price for each metal)
DROP TABLE IF EXISTS market_price CASCADE;
CREATE TABLE IF NOT EXISTS market_price (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metal_id UUID NOT NULL REFERENCES metal(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES market_data_provider(id),
    price_per_troy_oz NUMERIC(12, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    bid NUMERIC(12, 4), -- Buying price
    ask NUMERIC(12, 4), -- Selling price
    high_24h NUMERIC(12, 4), -- 24-hour high
    low_24h NUMERIC(12, 4), -- 24-hour low
    change_24h NUMERIC(12, 4), -- 24-hour change
    change_percent_24h NUMERIC(5, 2), -- Percentage change
    timestamp TIMESTAMP NOT NULL,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one current price per metal per provider
    UNIQUE(metal_id, provider_id)
);

-- Historical Price Data
DROP TABLE IF EXISTS price_history CASCADE;
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metal_id UUID NOT NULL REFERENCES metal(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES market_data_provider(id),
    price_per_troy_oz NUMERIC(12, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    bid NUMERIC(12, 4),
    ask NUMERIC(12, 4),
    high NUMERIC(12, 4),
    low NUMERIC(12, 4),
    open NUMERIC(12, 4),
    close NUMERIC(12, 4),
    volume BIGINT,
    timestamp TIMESTAMP NOT NULL,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite index for efficient time-series queries
    UNIQUE(metal_id, provider_id, timestamp)
);

-- Market Data Cache (for rate limiting and performance)
DROP TABLE IF EXISTS market_data_cache CASCADE;
CREATE TABLE IF NOT EXISTS market_data_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    data JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_market_price_metal_id ON market_price(metal_id);
CREATE INDEX IF NOT EXISTS idx_market_price_timestamp ON market_price(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_price_provider_id ON market_price(provider_id);

CREATE INDEX IF NOT EXISTS idx_price_history_metal_id ON price_history(metal_id);
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_metal_time ON price_history(metal_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_provider_id ON price_history(provider_id);

CREATE INDEX IF NOT EXISTS idx_market_data_cache_key ON market_data_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_expires ON market_data_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_market_data_provider_active ON market_data_provider(is_active);
CREATE INDEX IF NOT EXISTS idx_market_data_provider_priority ON market_data_provider(priority);

-- Audit trail indexes
CREATE INDEX IF NOT EXISTS idx_market_data_provider_created_by ON market_data_provider(createdBy);
CREATE INDEX IF NOT EXISTS idx_market_data_provider_updated_by ON market_data_provider(updatedBy);

-- Comments for documentation
COMMENT ON TABLE market_data_provider IS 'Configuration for external market data API providers';
COMMENT ON TABLE market_price IS 'Current real-time market prices for precious metals';
COMMENT ON TABLE price_history IS 'Historical price data for trend analysis and charts';
COMMENT ON TABLE market_data_cache IS 'Cache layer for API responses to reduce external API calls';

COMMENT ON COLUMN market_data_provider.api_key_env_var IS 'Name of environment variable containing API key (e.g., METALS_API_KEY)';
COMMENT ON COLUMN market_data_provider.priority IS 'Provider priority for fallback (1 = primary, 2 = secondary, etc.)';
COMMENT ON COLUMN market_price.price_per_troy_oz IS 'Spot price per troy ounce in specified currency';
COMMENT ON COLUMN price_history.timestamp IS 'Time when this price was recorded';

-- Insert default market data providers
INSERT INTO market_data_provider (name, api_key_env_var, base_url, is_active, rate_limit_per_minute, priority)
VALUES 
    ('Metals-API', 'METALS_API_KEY', 'https://metals-api.com/api', true, 50, 1),
    ('GoldAPI', 'GOLD_API_KEY', 'https://www.goldapi.io/api', true, 50, 2)
ON CONFLICT (name) DO NOTHING;

-- Function to clean up old cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM market_data_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to archive old price history (keep last 2 years)
CREATE OR REPLACE FUNCTION archive_old_price_history()
RETURNS void AS $$
BEGIN
    DELETE FROM price_history 
    WHERE timestamp < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;
