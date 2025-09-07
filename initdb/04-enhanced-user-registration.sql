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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Add constraint to ensure user is at least 18 years old
  CONSTRAINT user_must_be_adult CHECK (birth_date <= CURRENT_DATE - INTERVAL '18 years')
);

-- Create user_addresses table for comprehensive address information
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  countryId UUID REFERENCES country(id),
  postal_code VARCHAR(20) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL, -- Canton/State name
  street VARCHAR(200) NOT NULL, -- Street and house number
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

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'Stores detailed personal information for users';
COMMENT ON TABLE user_addresses IS 'Stores address information for users, supporting multiple addresses per user';
COMMENT ON TABLE document_processing_log IS 'Audit log for document parsing and AI extraction activities';
COMMENT ON TABLE consent_log IS 'GDPR-compliant consent tracking for legal compliance';
COMMENT ON TABLE user_verification_status IS 'Tracks email and identity verification status for each user';

COMMENT ON COLUMN user_profiles.title IS 'Personal title: Herr, Frau, or Divers';
COMMENT ON COLUMN user_addresses.countryId IS 'Foreign key to country table';
COMMENT ON COLUMN user_addresses.state IS 'Canton for Switzerland, State for other countries';
COMMENT ON COLUMN document_processing_log.extracted_fields IS 'JSON array of field names that were auto-filled by AI parsing';

-- Sample data for testing (optional - only for development)
-- INSERT INTO user_profiles (user_id, title, first_name, last_name, birth_date) 
-- SELECT id, 'Herr', 'Test', 'User', '1990-01-01' 
-- FROM users WHERE email = 'bank.technical@goldsphere.vault' AND NOT EXISTS (
--   SELECT 1 FROM user_profiles WHERE user_id = users.id
-- );
