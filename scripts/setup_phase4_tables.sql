-- Phase 4: Additional object type tables
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run

-- Galaxies table (OpenNGC + SDSS)
CREATE TABLE IF NOT EXISTS galaxies (
    id TEXT PRIMARY KEY,
    name TEXT,
    common_name TEXT,
    object_type TEXT,          -- 'galaxy', 'galaxy_pair', 'galaxy_triplet'
    morphology TEXT,           -- Hubble type: E0-E7, S0, Sa-Sd, SBa-SBd, Irr
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    z DOUBLE PRECISION NOT NULL,
    distance_ly DOUBLE PRECISION,
    ra DOUBLE PRECISION,
    dec DOUBLE PRECISION,
    magnitude DOUBLE PRECISION,
    surface_brightness DOUBLE PRECISION,
    redshift DOUBLE PRECISION,
    major_axis DOUBLE PRECISION,   -- arcminutes
    minor_axis DOUBLE PRECISION,   -- arcminutes
    position_angle DOUBLE PRECISION,
    color TEXT
);

CREATE INDEX IF NOT EXISTS idx_galaxies_distance ON galaxies (distance_ly);
CREATE INDEX IF NOT EXISTS idx_galaxies_magnitude ON galaxies (magnitude);
CREATE INDEX IF NOT EXISTS idx_galaxies_name ON galaxies (name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_galaxies_spatial ON galaxies (x, y, z);

ALTER TABLE galaxies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Galaxies are publicly readable" ON galaxies;
CREATE POLICY "Galaxies are publicly readable" ON galaxies FOR SELECT USING (true);
GRANT SELECT ON galaxies TO anon;
GRANT ALL ON galaxies TO service_role;

-- Nebulae table (OpenNGC)
CREATE TABLE IF NOT EXISTS nebulae (
    id TEXT PRIMARY KEY,
    name TEXT,
    common_name TEXT,
    object_type TEXT,          -- 'planetary_nebula', 'emission_nebula', 'reflection_nebula', 'dark_nebula', 'supernova_remnant'
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    z DOUBLE PRECISION NOT NULL,
    distance_ly DOUBLE PRECISION,
    ra DOUBLE PRECISION,
    dec DOUBLE PRECISION,
    magnitude DOUBLE PRECISION,
    surface_brightness DOUBLE PRECISION,
    major_axis DOUBLE PRECISION,   -- arcminutes
    minor_axis DOUBLE PRECISION,   -- arcminutes
    position_angle DOUBLE PRECISION,
    constellation TEXT,
    color TEXT
);

CREATE INDEX IF NOT EXISTS idx_nebulae_distance ON nebulae (distance_ly);
CREATE INDEX IF NOT EXISTS idx_nebulae_name ON nebulae (name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nebulae_spatial ON nebulae (x, y, z);

ALTER TABLE nebulae ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Nebulae are publicly readable" ON nebulae;
CREATE POLICY "Nebulae are publicly readable" ON nebulae FOR SELECT USING (true);
GRANT SELECT ON nebulae TO anon;
GRANT ALL ON nebulae TO service_role;

-- Star clusters table (OpenNGC)
CREATE TABLE IF NOT EXISTS clusters (
    id TEXT PRIMARY KEY,
    name TEXT,
    common_name TEXT,
    object_type TEXT,          -- 'open_cluster', 'globular_cluster'
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    z DOUBLE PRECISION NOT NULL,
    distance_ly DOUBLE PRECISION,
    ra DOUBLE PRECISION,
    dec DOUBLE PRECISION,
    magnitude DOUBLE PRECISION,
    major_axis DOUBLE PRECISION,
    minor_axis DOUBLE PRECISION,
    constellation TEXT,
    color TEXT
);

CREATE INDEX IF NOT EXISTS idx_clusters_distance ON clusters (distance_ly);
CREATE INDEX IF NOT EXISTS idx_clusters_name ON clusters (name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clusters_spatial ON clusters (x, y, z);

ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Clusters are publicly readable" ON clusters;
CREATE POLICY "Clusters are publicly readable" ON clusters FOR SELECT USING (true);
GRANT SELECT ON clusters TO anon;
GRANT ALL ON clusters TO service_role;

-- Exoplanets table (NASA Exoplanet Archive)
CREATE TABLE IF NOT EXISTS exoplanets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host_star TEXT,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    z DOUBLE PRECISION NOT NULL,
    distance_ly DOUBLE PRECISION,
    ra DOUBLE PRECISION,
    dec DOUBLE PRECISION,
    orbital_period DOUBLE PRECISION,     -- days
    semi_major_axis DOUBLE PRECISION,    -- AU
    eccentricity DOUBLE PRECISION,
    planet_radius DOUBLE PRECISION,      -- Earth radii
    planet_mass DOUBLE PRECISION,        -- Earth masses
    equilibrium_temp DOUBLE PRECISION,   -- Kelvin
    discovery_method TEXT,
    discovery_year INTEGER,
    host_star_temp DOUBLE PRECISION,     -- Kelvin
    host_star_luminosity DOUBLE PRECISION, -- solar luminosities
    host_star_radius DOUBLE PRECISION,   -- solar radii
    host_star_mass DOUBLE PRECISION,     -- solar masses
    hz_inner DOUBLE PRECISION,           -- habitable zone inner edge (AU)
    hz_outer DOUBLE PRECISION,           -- habitable zone outer edge (AU)
    in_habitable_zone BOOLEAN,
    color TEXT
);

CREATE INDEX IF NOT EXISTS idx_exoplanets_distance ON exoplanets (distance_ly);
CREATE INDEX IF NOT EXISTS idx_exoplanets_name ON exoplanets (name);
CREATE INDEX IF NOT EXISTS idx_exoplanets_host ON exoplanets (host_star) WHERE host_star IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exoplanets_spatial ON exoplanets (x, y, z);
CREATE INDEX IF NOT EXISTS idx_exoplanets_hz ON exoplanets (in_habitable_zone) WHERE in_habitable_zone = true;

ALTER TABLE exoplanets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Exoplanets are publicly readable" ON exoplanets;
CREATE POLICY "Exoplanets are publicly readable" ON exoplanets FOR SELECT USING (true);
GRANT SELECT ON exoplanets TO anon;
GRANT ALL ON exoplanets TO service_role;
