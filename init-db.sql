-- Ensure the user exists with proper permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'mal_user') THEN
        CREATE USER mal_user WITH PASSWORD 'your_password';
    END IF;
END
$$;

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE mal_db TO mal_user;

-- Make mal_user the owner of the database
ALTER DATABASE mal_db OWNER TO mal_user; 