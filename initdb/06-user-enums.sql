-- User Domain ENUM Types Migration
-- This migration creates proper PostgreSQL ENUMs for user-related fields
-- and migrates existing CHECK constraints to use these ENUMs

-- =============================================================================
-- STEP 1: Create ENUM types
-- =============================================================================

-- User Role ENUM
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('customer', 'admin', 'user');
    END IF;
END $$;

-- User Title ENUM
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_title') THEN
        CREATE TYPE user_title AS ENUM ('Herr', 'Frau', 'Divers');
    END IF;
END $$;

-- Email Verification Status ENUM
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_verification_status') THEN
        CREATE TYPE email_verification_status AS ENUM ('pending', 'verified', 'failed');
    END IF;
END $$;

-- Identity Verification Status ENUM
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'identity_verification_status') THEN
        CREATE TYPE identity_verification_status AS ENUM ('pending', 'verified', 'failed', 'rejected');
    END IF;
END $$;

-- =============================================================================
-- STEP 2: Migrate users.role column to ENUM
-- =============================================================================

-- Check if column is already using the enum type
DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role';
    
    IF col_type = 'character varying' THEN
        -- Drop default first (required for type change)
        ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
        
        -- Drop the existing CHECK constraint if it exists
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        
        -- Alter column to use ENUM
        ALTER TABLE users 
            ALTER COLUMN role TYPE user_role 
            USING role::user_role;
            
        -- Set default
        ALTER TABLE users 
            ALTER COLUMN role SET DEFAULT 'customer'::user_role;
    END IF;
END $$;

-- =============================================================================
-- STEP 3: Migrate user_profiles.title column to ENUM
-- =============================================================================

DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'title';
    
    IF col_type = 'character varying' THEN
        -- Drop the existing CHECK constraint if it exists
        ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_title_check;
        
        -- Alter column to use ENUM
        ALTER TABLE user_profiles 
            ALTER COLUMN title TYPE user_title 
            USING title::user_title;
    END IF;
END $$;

-- =============================================================================
-- STEP 4: Migrate user_verification_status columns to ENUMs
-- =============================================================================

DO $$
DECLARE
    col_type text;
BEGIN
    -- Migrate email_verification_status
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_name = 'user_verification_status' AND column_name = 'email_verification_status';
    
    IF col_type = 'character varying' THEN
        -- Drop default first (required for type change)
        ALTER TABLE user_verification_status ALTER COLUMN email_verification_status DROP DEFAULT;
        
        ALTER TABLE user_verification_status 
            DROP CONSTRAINT IF EXISTS user_verification_status_email_verification_status_check;
        
        ALTER TABLE user_verification_status 
            ALTER COLUMN email_verification_status TYPE email_verification_status 
            USING email_verification_status::email_verification_status;
            
        ALTER TABLE user_verification_status 
            ALTER COLUMN email_verification_status SET DEFAULT 'pending'::email_verification_status;
    END IF;
    
    -- Migrate identity_verification_status
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_name = 'user_verification_status' AND column_name = 'identity_verification_status';
    
    IF col_type = 'character varying' THEN
        -- Drop default first (required for type change)
        ALTER TABLE user_verification_status ALTER COLUMN identity_verification_status DROP DEFAULT;
        
        ALTER TABLE user_verification_status 
            DROP CONSTRAINT IF EXISTS user_verification_status_identity_verification_status_check;
        
        ALTER TABLE user_verification_status 
            ALTER COLUMN identity_verification_status TYPE identity_verification_status 
            USING identity_verification_status::identity_verification_status;
            
        ALTER TABLE user_verification_status 
            ALTER COLUMN identity_verification_status SET DEFAULT 'pending'::identity_verification_status;
    END IF;
END $$;

-- =============================================================================
-- STEP 5: Add comments for documentation
-- =============================================================================

COMMENT ON TYPE user_role IS 'User roles: customer (default), admin, user';
COMMENT ON TYPE user_title IS 'Personal titles: Herr, Frau, Divers';
COMMENT ON TYPE email_verification_status IS 'Email verification states: pending, verified, failed';
COMMENT ON TYPE identity_verification_status IS 'Identity verification states: pending, verified, failed, rejected';

-- =============================================================================
-- Verification queries (for manual testing)
-- =============================================================================
-- SELECT typname, enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname LIKE '%user%' OR typname LIKE '%verification%';
-- SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'users';
-- SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'user_profiles';
-- SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'user_verification_status';
