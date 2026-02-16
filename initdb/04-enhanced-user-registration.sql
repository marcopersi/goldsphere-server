-- Enhanced User Registration Schema Extensions
-- This file adds the necessary tables and columns for the comprehensive user registration system

-- Create user_profiles table for detailed personal information
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(10) CHECK (title IN ('Herr', 'Frau', 'Divers')),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  phone VARCHAR(20),
  gender VARCHAR(24) CHECK (gender IN ('male', 'female', 'diverse', 'prefer_not_to_say')),
  preferred_currency CHAR(3) REFERENCES currency(isocode3),
  preferred_payment_method VARCHAR(20) CHECK (preferred_payment_method IN ('bank_transfer', 'card', 'invoice')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Add constraint to ensure user is at least 18 years old
  CONSTRAINT user_must_be_adult CHECK (birth_date <= CURRENT_DATE - INTERVAL '18 years'),
  CONSTRAINT chk_user_profile_phone_e164 CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{1,14}$')
);

-- Create user_addresses table for comprehensive address information
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  countryId UUID REFERENCES country(id),
  postal_code VARCHAR(20),
  city VARCHAR(100),
  state VARCHAR(100), -- Canton/State name
  street VARCHAR(200),
  house_number VARCHAR(50),
  address_line2 VARCHAR(200),
  po_box VARCHAR(100),
  is_primary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure each user has only one primary address
  CONSTRAINT unique_primary_address_per_user 
    EXCLUDE (user_id WITH =) WHERE (is_primary = TRUE)
);

-- Create document_processing_log table for tracking document parsing
CREATE TABLE IF NOT EXISTS document_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  original_filename VARCHAR(255),
  processing_status VARCHAR(50) DEFAULT 'completed',
  extracted_fields JSONB, -- Store array of field names that were extracted
  was_processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create consent_log table for GDPR compliance and audit trail
CREATE TABLE IF NOT EXISTS consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL, -- 'terms_and_conditions', 'privacy_policy', etc.
  consent_given BOOLEAN NOT NULL,
  terms_version VARCHAR(50),
  consent_timestamp TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_verification_status table for tracking verification states
CREATE TABLE IF NOT EXISTS user_verification_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_verification_status VARCHAR(20) DEFAULT 'pending' CHECK (
    email_verification_status IN ('pending', 'verified', 'failed')
  ),
  email_verification_token UUID,
  email_verification_expires_at TIMESTAMP,
  identity_verification_status VARCHAR(20) DEFAULT 'pending' CHECK (
    identity_verification_status IN ('pending', 'verified', 'failed', 'rejected')
  ),
  identity_verification_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add triggers to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all relevant tables
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_addresses_updated_at ON user_addresses;
CREATE TRIGGER update_user_addresses_updated_at 
  BEFORE UPDATE ON user_addresses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_verification_status_updated_at ON user_verification_status;
CREATE TRIGGER update_user_verification_status_updated_at 
  BEFORE UPDATE ON user_verification_status 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_primary ON user_addresses(user_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_identity_verified ON users(identity_verified);

-- =============================================================================
-- STEP 9: Backfill core system user profiles (idempotent)
-- =============================================================================

-- Ensure core users always have profile rows with non-empty first/last names.
-- This keeps auth contract fields (firstName/lastName) stable for all environments.
INSERT INTO user_profiles (
  user_id,
  title,
  first_name,
  last_name,
  birth_date,
  phone,
  gender,
  preferred_currency,
  preferred_payment_method
)
SELECT
  u.id,
  NULL,
  CASE
    WHEN u.email = 'bank.technical@goldsphere.vault' THEN 'Bank'
    WHEN u.email = 'admin@goldsphere.vault' THEN 'Admin'
    ELSE 'System'
  END,
  CASE
    WHEN u.email = 'bank.technical@goldsphere.vault' THEN 'Technical'
    WHEN u.email = 'admin@goldsphere.vault' THEN 'User'
    ELSE 'Internal'
  END,
  DATE '1990-01-01',
  NULL,
  'prefer_not_to_say',
  'CHF',
  'bank_transfer'
FROM users u
WHERE u.email IN ('bank.technical@goldsphere.vault', 'admin@goldsphere.vault', 'system@internal')
ON CONFLICT (user_id) DO UPDATE SET
  first_name = CASE
    WHEN EXCLUDED.first_name IS NOT NULL AND btrim(EXCLUDED.first_name) <> '' THEN EXCLUDED.first_name
    ELSE user_profiles.first_name
  END,
  last_name = CASE
    WHEN EXCLUDED.last_name IS NOT NULL AND btrim(EXCLUDED.last_name) <> '' THEN EXCLUDED.last_name
    ELSE user_profiles.last_name
  END,
  birth_date = COALESCE(user_profiles.birth_date, EXCLUDED.birth_date),
  gender = COALESCE(user_profiles.gender, EXCLUDED.gender),
  preferred_currency = COALESCE(user_profiles.preferred_currency, EXCLUDED.preferred_currency),
  preferred_payment_method = COALESCE(user_profiles.preferred_payment_method, EXCLUDED.preferred_payment_method);

-- Repair any accidental empty names for core users.
UPDATE user_profiles up
SET
  first_name = CASE
    WHEN u.email = 'bank.technical@goldsphere.vault' THEN 'Bank'
    WHEN u.email = 'admin@goldsphere.vault' THEN 'Admin'
    ELSE 'System'
  END,
  last_name = CASE
    WHEN u.email = 'bank.technical@goldsphere.vault' THEN 'Technical'
    WHEN u.email = 'admin@goldsphere.vault' THEN 'User'
    ELSE 'Internal'
  END
FROM users u
WHERE up.user_id = u.id
  AND u.email IN ('bank.technical@goldsphere.vault', 'admin@goldsphere.vault', 'system@internal')
  AND (btrim(up.first_name) = '' OR btrim(up.last_name) = '');

-- Ensure verification rows exist for core users.
INSERT INTO user_verification_status (user_id, email_verification_status, identity_verification_status)
SELECT u.id, 'verified', 'verified'
FROM users u
WHERE u.email IN ('bank.technical@goldsphere.vault', 'admin@goldsphere.vault', 'system@internal')
ON CONFLICT (user_id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'Stores detailed personal information for users';
COMMENT ON TABLE user_addresses IS 'Stores address information for users, supporting multiple addresses per user';
COMMENT ON TABLE document_processing_log IS 'Audit log for document parsing and AI extraction activities';
COMMENT ON TABLE consent_log IS 'GDPR-compliant consent tracking for legal compliance';
COMMENT ON TABLE user_verification_status IS 'Tracks email and identity verification status for each user';

COMMENT ON COLUMN user_profiles.title IS 'Personal title: Herr, Frau, or Divers';
COMMENT ON COLUMN user_profiles.phone IS 'Phone number in E.164 format (e.g., +41791234567)';
COMMENT ON COLUMN user_profiles.gender IS 'Gender: male, female, diverse, prefer_not_to_say';
COMMENT ON COLUMN user_profiles.preferred_currency IS 'Preferred display currency (ISO 4217 alpha-3, e.g., CHF, EUR, USD)';
COMMENT ON COLUMN user_profiles.preferred_payment_method IS 'Preferred payment method: bank_transfer, card, invoice';
COMMENT ON COLUMN user_addresses.countryId IS 'Foreign key to country table';
COMMENT ON COLUMN user_addresses.state IS 'Canton for Switzerland, State for other countries';
COMMENT ON COLUMN user_addresses.street IS 'Street name';
COMMENT ON COLUMN user_addresses.house_number IS 'House or building number';
COMMENT ON COLUMN user_addresses.address_line2 IS 'Additional address information (optional)';
COMMENT ON COLUMN user_addresses.po_box IS 'PO box value (optional)';
COMMENT ON COLUMN document_processing_log.extracted_fields IS 'JSON array of field names that were auto-filled by AI parsing';

