#!/bin/bash
# This script is auto-run by the Postgres Docker image on first startup.
# It creates all databases required by the Friday Portal services.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Main portal database (already created via POSTGRES_DB, but ensure it exists)
    SELECT 'CREATE DATABASE friday_portal'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'friday_portal')\gexec

    -- LangFuse observability database
    SELECT 'CREATE DATABASE langfuse'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'langfuse')\gexec

    -- Grant full access to the friday user
    GRANT ALL PRIVILEGES ON DATABASE friday_portal TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE langfuse TO $POSTGRES_USER;
EOSQL

echo "All databases created successfully."
