-- User Account Status and Profile Extensions Migration
-- This migration adds account status management and extended profile fields
-- to the users table for comprehensive user management functionality.

-- =============================================================================
-- STEP 1: Create account_status ENUM type
-- =============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
        CREATE TYPE account_status AS ENUM ('active', 'blocked', 'suspended', 'deleted');
        
        COMMENT ON TYPE account_status IS 'User account status for access control and lifecycle management';
    END IF;
END $$;

-- =============================================================================
-- STEP 2: Create gender ENUM type
-- =============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_type') THEN
        CREATE TYPE gender_type AS ENUM ('male', 'female', 'diverse', 'not_specified');
        
        COMMENT ON TYPE gender_type IS 'Gender identification for user profiles';
    END IF;
END $$;

-- =============================================================================
-- STEP 3: Add new columns to users table
-- =============================================================================

-- Account status management columns
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS account_status account_status DEFAULT 'active' NOT NULL;

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS block_reason TEXT;

-- Extended profile columns
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS gender gender_type DEFAULT 'not_specified';

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS preferred_currency_id UUID REFERENCES currency(id) ON DELETE SET NULL;

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'de';

-- =============================================================================
-- STEP 4: Create indexes for performance optimization
-- =============================================================================

-- Index for account status queries (e.g., finding all blocked users)
CREATE INDEX IF NOT EXISTS idx_users_account_status 
  ON users(account_status);

-- Index for phone number lookup
CREATE INDEX IF NOT EXISTS idx_users_phone_number 
  ON users(phone_number) 
  WHERE phone_number IS NOT NULL;

-- Composite index for blocked users with blocking admin
CREATE INDEX IF NOT EXISTS idx_users_blocked_info 
  ON users(account_status, blocked_at, blocked_by) 
  WHERE account_status IN ('blocked', 'suspended');

-- Index for user preferences (currency and language)
CREATE INDEX IF NOT EXISTS idx_users_preferences 
  ON users(preferred_currency_id, preferred_language);

-- =============================================================================
-- STEP 5: Add check constraints for data integrity
-- =============================================================================

-- Ensure blocked_at is set when account is blocked
ALTER TABLE users 
  ADD CONSTRAINT chk_blocked_at_required 
  CHECK (
    (account_status IN ('blocked', 'suspended') AND blocked_at IS NOT NULL) 
    OR 
    (account_status NOT IN ('blocked', 'suspended'))
  );

-- Ensure blocked_by is set when account is blocked
ALTER TABLE users 
  ADD CONSTRAINT chk_blocked_by_required 
  CHECK (
    (account_status IN ('blocked', 'suspended') AND blocked_by IS NOT NULL) 
    OR 
    (account_status NOT IN ('blocked', 'suspended'))
  );

-- Validate phone number format (basic E.164 format)
ALTER TABLE users 
  ADD CONSTRAINT chk_phone_number_format 
  CHECK (
    phone_number IS NULL 
    OR 
    phone_number ~ '^\+?[1-9]\d{1,14}$'
  );

-- Validate preferred_language code (ISO 639-1 two-letter codes)
ALTER TABLE users 
  ADD CONSTRAINT chk_preferred_language_format 
  CHECK (
    preferred_language ~ '^[a-z]{2}$'
  );

-- =============================================================================
-- STEP 6: Add comments for documentation
-- =============================================================================

COMMENT ON COLUMN users.account_status IS 
  'Account status: active (normal use), blocked (admin blocked), suspended (temporary), deleted (soft delete)';

COMMENT ON COLUMN users.blocked_at IS 
  'Timestamp when account was blocked/suspended. Required when account_status is blocked or suspended.';

COMMENT ON COLUMN users.blocked_by IS 
  'User ID of admin who blocked/suspended the account. Required when account_status is blocked or suspended.';

COMMENT ON COLUMN users.block_reason IS 
  'Admin-provided reason for blocking/suspending the account. Used for audit trail and user communication.';

COMMENT ON COLUMN users.phone_number IS 
  'User phone number in E.164 format (e.g., +41791234567). Optional field for contact and 2FA.';

COMMENT ON COLUMN users.gender IS 
  'User gender identification: male, female, diverse, or not_specified. Optional field for personalization.';

COMMENT ON COLUMN users.preferred_currency_id IS 
  'Foreign key to currency table. User preferred currency for displaying prices and account balances.';

COMMENT ON COLUMN users.preferred_language IS 
  'User preferred language code (ISO 639-1, e.g., "de", "en", "fr"). Used for UI localization.';

-- =============================================================================
-- STEP 7: Update existing rows (set default values for new columns)
-- =============================================================================

-- Update existing users to have default values
UPDATE users 
SET 
  account_status = 'active',
  gender = 'not_specified',
  preferred_language = 'de'
WHERE 
  account_status IS NULL 
  OR gender IS NULL 
  OR preferred_language IS NULL;

-- =============================================================================
-- STEP 8: Grant necessary permissions (if needed)
-- =============================================================================

-- Grant permissions to application role (adjust role name as needed)
-- GRANT SELECT, INSERT, UPDATE ON users TO app_role;
-- GRANT USAGE ON TYPE account_status TO app_role;
-- GRANT USAGE ON TYPE gender_type TO app_role;

-- =============================================================================
-- Migration completed successfully
-- =============================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 08-user-account-status.sql completed successfully';
    RAISE NOTICE 'Added account_status, blocking fields, and extended profile fields to users table';
    RAISE NOTICE 'Created indexes: idx_users_account_status, idx_users_phone_number, idx_users_blocked_info, idx_users_preferences';
END $$;
