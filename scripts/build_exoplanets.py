"""
Process NASA Exoplanet Archive data and upload to Supabase.

Transforms:
- RA/Dec/distance -> Cartesian x,y,z in light-years
- Computes habitable zone boundaries from host star luminosity
- Determines if planet is in the habitable zone
- Assigns colors based on equilibrium temperature
"""
import os
import math
import json
import numpy as np
import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ['VITE_SUPABASE_URL']
SERVICE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
PC_TO_LY = 3.26156


def ra_dec_dist_to_xyz(ra_deg, dec_deg, dist_ly):
    """Convert RA (deg), Dec (deg), distance (LY) to Cartesian x, y, z."""
    ra_rad = math.radians(ra_deg)
    dec_rad = math.radians(dec_deg)
    cos_dec = math.cos(dec_rad)
    x = dist_ly * cos_dec * math.cos(ra_rad)
    y = dist_ly * cos_dec * math.sin(ra_rad)
    z = dist_ly * math.sin(dec_rad)
    return x, y, z


def planet_color(eq_temp, radius_earth):
    """Assign a color based on equilibrium temperature and size."""
    if eq_temp is not None and not np.isnan(eq_temp):
        if eq_temp > 2000:
            return '#FF4500'  # Lava world (ultra-hot)
        elif eq_temp > 1000:
            return '#FF8C00'  # Hot Jupiter / hot rocky
        elif eq_temp > 500:
            return '#DAA520'  # Warm
        elif eq_temp > 200:
            return '#7BFF8A'  # Temperate / habitable zone green
        else:
            return '#87CEEB'  # Cold / icy blue
    # Default by size
    if radius_earth is not None and not np.isnan(radius_earth):
        if radius_earth > 6:
            return '#DAA520'  # Gas giant
        elif radius_earth > 2:
            return '#87CEEB'  # Neptune-like
        else:
            return '#7BFF8A'  # Rocky
    return '#7BFF8A'


def upload_to_supabase(records, table, batch_size=500):
    """Upload records to Supabase in batches via REST API."""
    headers = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
    }

    total = len(records)
    uploaded = 0

    for i in range(0, total, batch_size):
        batch = records[i:i + batch_size]
        resp = requests.post(
            f'{SUPABASE_URL}/rest/v1/{table}',
            headers=headers,
            data=json.dumps(batch),
        )
        if resp.status_code >= 400:
            print(f"\nError uploading batch to {table}: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            continue
        uploaded += len(batch)
        pct = uploaded / total * 100
        print(f"\r  Uploaded {uploaded:,} / {total:,} to {table} ({pct:.0f}%)", end='', flush=True)

    print(f"\n  Upload complete: {uploaded:,} records to {table}")
    return uploaded


def main():
    exo_path = os.path.join(RAW_DIR, 'exoplanets.csv')
    if not os.path.exists(exo_path):
        print(f"Error: {exo_path} not found. Run fetch_exoplanets.py first.")
        return

    print("Loading NASA Exoplanet Archive data...")
    df = pd.read_csv(exo_path)
    print(f"  Raw rows: {len(df):,}")

    # Filter: need RA, Dec, and distance
    df = df[df['ra'].notna() & df['dec'].notna() & df['sy_dist'].notna()].copy()
    df = df[df['sy_dist'] > 0].copy()
    print(f"  With valid coords + distance: {len(df):,}")

    # Distance from parsecs to light-years
    df['distance_ly'] = df['sy_dist'] * PC_TO_LY

    records = []
    for _, row in df.iterrows():
        ra = float(row['ra'])
        dec = float(row['dec'])
        dist_ly = float(row['distance_ly'])

        x, y, z = ra_dec_dist_to_xyz(ra, dec, dist_ly)

        # Habitable zone from host star luminosity
        # Inner: sqrt(L / 1.1) AU, Outer: sqrt(L / 0.53) AU
        st_lum = row.get('st_lum')
        hz_inner = None
        hz_outer = None
        in_hz = None

        if pd.notna(st_lum) and st_lum > 0:
            # st_lum from NASA archive is log10(L/Lsun)
            lum_solar = 10 ** float(st_lum)
            hz_inner = math.sqrt(lum_solar / 1.1)
            hz_outer = math.sqrt(lum_solar / 0.53)

            sma = row.get('pl_orbsmax')
            if pd.notna(sma) and sma > 0:
                in_hz = hz_inner <= float(sma) <= hz_outer
        else:
            lum_solar = None

        eq_temp = row.get('pl_eqt')
        eq_temp = float(eq_temp) if pd.notna(eq_temp) else None

        pl_radius = row.get('pl_rade')
        pl_radius = float(pl_radius) if pd.notna(pl_radius) else None

        pl_mass = row.get('pl_bmasse')
        pl_mass = float(pl_mass) if pd.notna(pl_mass) else None

        color = planet_color(eq_temp, pl_radius)

        # Clean planet name for use as ID
        pl_name = str(row['pl_name']).strip()
        pl_id = pl_name.replace(' ', '_').replace('+', 'p').replace('-', 'm')

        record = {
            'id': pl_id,
            'name': pl_name,
            'host_star': str(row['hostname']).strip() if pd.notna(row.get('hostname')) else None,
            'x': round(x, 4),
            'y': round(y, 4),
            'z': round(z, 4),
            'distance_ly': round(dist_ly, 4),
            'ra': round(ra, 6),
            'dec': round(dec, 6),
            'orbital_period': round(float(row['pl_orbper']), 6) if pd.notna(row.get('pl_orbper')) else None,
            'semi_major_axis': round(float(row['pl_orbsmax']), 6) if pd.notna(row.get('pl_orbsmax')) else None,
            'eccentricity': round(float(row['pl_orbeccen']), 6) if pd.notna(row.get('pl_orbeccen')) else None,
            'planet_radius': round(pl_radius, 4) if pl_radius is not None else None,
            'planet_mass': round(pl_mass, 4) if pl_mass is not None else None,
            'equilibrium_temp': round(eq_temp) if eq_temp is not None else None,
            'discovery_method': str(row['discoverymethod']).strip() if pd.notna(row.get('discoverymethod')) else None,
            'discovery_year': int(row['disc_year']) if pd.notna(row.get('disc_year')) else None,
            'host_star_temp': round(float(row['st_teff'])) if pd.notna(row.get('st_teff')) else None,
            'host_star_luminosity': round(float(10 ** float(row['st_lum'])), 6) if pd.notna(row.get('st_lum')) else None,
            'host_star_radius': round(float(row['st_rad']), 4) if pd.notna(row.get('st_rad')) else None,
            'host_star_mass': round(float(row['st_mass']), 4) if pd.notna(row.get('st_mass')) else None,
            'hz_inner': round(hz_inner, 6) if hz_inner is not None else None,
            'hz_outer': round(hz_outer, 6) if hz_outer is not None else None,
            'in_habitable_zone': in_hz,
            'color': color,
        }
        records.append(record)

    print(f"\n  Total exoplanets to upload: {len(records):,}")

    # Stats
    hz_count = sum(1 for r in records if r['in_habitable_zone'] is True)
    print(f"  In habitable zone: {hz_count}")

    # Spot checks
    print("\nSpot checks:")
    for name_check in ['Kepler-442 b', 'Proxima Cen b', 'TRAPPIST-1 e', '51 Peg b']:
        matches = [r for r in records if r['name'] == name_check]
        if matches:
            r = matches[0]
            print(f"  {r['name']}: dist={r['distance_ly']:.1f} LY, "
                  f"radius={r['planet_radius']} Re, temp={r['equilibrium_temp']}K, "
                  f"HZ={r['in_habitable_zone']}")
        else:
            print(f"  {name_check}: NOT FOUND")

    # Upload
    print(f"\nUploading to Supabase ({SUPABASE_URL})...")
    upload_to_supabase(records, 'exoplanets')

    print("\nExoplanet processing complete!")


if __name__ == '__main__':
    main()
