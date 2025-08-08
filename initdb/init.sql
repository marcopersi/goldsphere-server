-- Create database only if it doesn't exist
SELECT 'CREATE DATABASE goldsphere'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'goldsphere')\gexec

-- Create user only if it doesn't exist
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'user') THEN
      CREATE USER "user" WITH PASSWORD 'password';
   END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE goldsphere TO "user";
