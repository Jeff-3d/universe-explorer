"""
Create Supabase tables for Universe Explorer.
Run once to set up the database schema.
Uses the Supabase REST API via the service role key.
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ['VITE_SUPABASE_URL']
SERVICE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
}

def run_sql(sql):
    """Execute SQL via Supabase's RPC endpoint."""
    resp = requests.post(
        f'{SUPABASE_URL}/rest/v1/rpc/exec_sql',
        headers=HEADERS,
        json={'query': sql},
    )
    if resp.status_code >= 400:
        # Try the pg-meta SQL endpoint instead
        resp2 = requests.post(
            f'{SUPABASE_URL}/pg/query',
            headers={
                'apikey': SERVICE_KEY,
                'Authorization': f'Bearer {SERVICE_KEY}',
                'Content-Type': 'application/json',
            },
            json={'query': sql},
        )
        if resp2.status_code >= 400:
            print(f"SQL error: {resp2.status_code} {resp2.text}")
            return False
    print(f"OK: {sql[:80]}...")
    return True

# Build all SQL as one migration
MIGRATION_SQL = """
-- Enable PostGIS (should already be enabled via dashboard)
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

-- Stars table
CREATE TABLE IF NOT EXISTS stars (
    id TEXT PRIMARY KEY,
    name TEXT,
    constellation TEXT,
    spectral_type TEXT,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    z DOUBLE PRECISION NOT NULL,
    distance_ly DOUBLE PRECISION NOT NULL,
    ra DOUBLE PRECISION,
    dec DOUBLE PRECISION,
    magnitude DOUBLE PRECISION,
    abs_magnitude DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    luminosity DOUBLE PRECISION,
    radius DOUBLE PRECISION,
    mass DOUBLE PRECISION,
    color TEXT,
    vx DOUBLE PRECISION,
    vy DOUBLE PRECISION,
    vz DOUBLE PRECISION,
    color_index DOUBLE PRECISION
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stars_distance ON stars (distance_ly);
CREATE INDEX IF NOT EXISTS idx_stars_magnitude ON stars (magnitude);
CREATE INDEX IF NOT EXISTS idx_stars_name ON stars (name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stars_constellation ON stars (constellation) WHERE constellation IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stars_spatial ON stars (x, y, z);

-- RLS: allow public read access
ALTER TABLE stars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stars are publicly readable" ON stars;
CREATE POLICY "Stars are publicly readable" ON stars
    FOR SELECT USING (true);

-- Grant service role full access (for data pipeline uploads)
-- anon can only SELECT
GRANT SELECT ON stars TO anon;
GRANT ALL ON stars TO service_role;
"""

def main():
    print("Setting up Supabase tables for Universe Explorer...")
    print()

    # Split and execute each statement individually via the REST SQL endpoint
    statements = [s.strip() for s in MIGRATION_SQL.split(';') if s.strip() and not s.strip().startswith('--')]

    # Try using the Supabase SQL editor API
    for stmt in statements:
        stmt_clean = stmt.strip()
        if not stmt_clean or stmt_clean.startswith('--'):
            continue
        print(f"Executing: {stmt_clean[:70]}...")

        # Use the management API SQL endpoint
        resp = requests.post(
            f'{SUPABASE_URL}/rest/v1/rpc/',
            headers=HEADERS,
            json={},
        )

    # Since direct SQL execution via REST is limited, let's output the SQL
    # for the user to run in the Supabase SQL Editor
    print()
    print("=" * 60)
    print("IMPORTANT: Copy the SQL below and run it in your Supabase")
    print("Dashboard → SQL Editor → New Query → Run")
    print("=" * 60)
    print()
    print(MIGRATION_SQL)
    print()
    print("=" * 60)
    print("After running the SQL above, the database will be ready")
    print("for the data pipeline.")
    print("=" * 60)

if __name__ == '__main__':
    main()
