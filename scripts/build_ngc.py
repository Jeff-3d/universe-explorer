"""
Process the OpenNGC catalog and upload galaxies, nebulae, and clusters to Supabase.

NGC Type codes mapping:
  G, GPair, GTrpl, GGroup -> galaxies
  PN, Neb, HII, RfN, EmN, SNR, Cl+N (nebula part) -> nebulae
  OCl, GCl, *Ass -> clusters
  *, **, Other, Dup, NonEx, Nova -> skip
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
PARSEC_TO_LY = 3.26156

# NGC type -> our categories
GALAXY_TYPES = {'G', 'GPair', 'GTrpl', 'GGroup'}
NEBULA_TYPES = {'PN', 'Neb', 'HII', 'RfN', 'EmN', 'SNR', 'Cl+N'}
CLUSTER_TYPES = {'OCl', 'GCl', '*Ass'}

# NGC type -> our object_type string
TYPE_MAP = {
    'G': 'galaxy', 'GPair': 'galaxy_pair', 'GTrpl': 'galaxy_triplet', 'GGroup': 'galaxy_group',
    'PN': 'planetary_nebula', 'Neb': 'nebula', 'HII': 'emission_nebula',
    'RfN': 'reflection_nebula', 'EmN': 'emission_nebula', 'SNR': 'supernova_remnant',
    'Cl+N': 'cluster_nebula',
    'OCl': 'open_cluster', 'GCl': 'globular_cluster', '*Ass': 'stellar_association',
}

# Known distances for notable nearby objects (LY)
# These have negative or zero redshift, or inaccurate parallax measurements
KNOWN_DISTANCES = {
    'NGC0224': 2_537_000,     # Andromeda Galaxy (M31)
    'NGC0598': 2_730_000,     # Triangulum Galaxy (M33)
    'NGC4736': 16_800_000,    # M94
    'NGC5194': 23_160_000,    # Whirlpool Galaxy (M51)
    'NGC5457': 20_870_000,    # Pinwheel Galaxy (M101)
    'NGC0292': 200_000,       # Small Magellanic Cloud
    'NGC6822': 1_630_000,     # Barnard's Galaxy
    'IC0010':  2_200_000,     # IC 10 irregular galaxy
    'NGC0205': 2_690_000,     # M110 (satellite of M31)
    'NGC0221': 2_490_000,     # M32 (satellite of M31)
    'NGC1976': 1_344,         # Orion Nebula
    'NGC2070': 160_000,       # Tarantula Nebula (in LMC)
    'NGC3372': 8_500,         # Carina Nebula
    'NGC7293': 655,           # Helix Nebula
    'NGC6720': 2_567,         # Ring Nebula
    'NGC5139': 17_090,        # Omega Centauri
    'NGC0104': 13_000,        # 47 Tucanae
}

# Approximate colors by type
TYPE_COLORS = {
    'galaxy': '#C4A5FF', 'galaxy_pair': '#C4A5FF', 'galaxy_triplet': '#C4A5FF', 'galaxy_group': '#C4A5FF',
    'planetary_nebula': '#66FFB2', 'nebula': '#FF6B8A', 'emission_nebula': '#FF6B8A',
    'reflection_nebula': '#6BC5FF', 'supernova_remnant': '#FF9F43', 'cluster_nebula': '#FF6B8A',
    'open_cluster': '#6BC5FF', 'globular_cluster': '#FFD700', 'stellar_association': '#6BC5FF',
}


def parse_ra(ra_str):
    """Parse RA from HH:MM:SS.ss to degrees."""
    if not ra_str or not isinstance(ra_str, str):
        return None
    try:
        parts = ra_str.strip().split(':')
        h = float(parts[0])
        m = float(parts[1]) if len(parts) > 1 else 0
        s = float(parts[2]) if len(parts) > 2 else 0
        return (h + m / 60 + s / 3600) * 15.0
    except (ValueError, IndexError):
        return None


def parse_dec(dec_str):
    """Parse Dec from +DD:MM:SS.s to degrees."""
    if not dec_str or not isinstance(dec_str, str):
        return None
    try:
        dec_str = dec_str.strip()
        sign = -1 if dec_str.startswith('-') else 1
        dec_str = dec_str.lstrip('+-')
        parts = dec_str.split(':')
        d = float(parts[0])
        m = float(parts[1]) if len(parts) > 1 else 0
        s = float(parts[2]) if len(parts) > 2 else 0
        return sign * (d + m / 60 + s / 3600)
    except (ValueError, IndexError):
        return None


def ra_dec_dist_to_xyz(ra_deg, dec_deg, dist_ly):
    """Convert RA (deg), Dec (deg), distance (LY) to Cartesian x, y, z."""
    ra_rad = math.radians(ra_deg)
    dec_rad = math.radians(dec_deg)
    cos_dec = math.cos(dec_rad)
    x = dist_ly * cos_dec * math.cos(ra_rad)
    y = dist_ly * cos_dec * math.sin(ra_rad)
    z = dist_ly * math.sin(dec_rad)
    return x, y, z


def redshift_to_distance_ly(z):
    """
    Approximate comoving distance from redshift using simplified LCDM.
    Good to ~5% for z < 1. Uses Hubble law for small z, correction for larger.
    """
    if z is None or np.isnan(z) or z <= 0:
        return None
    c = 299792.458  # km/s
    H0 = 67.4  # km/s/Mpc
    MPC_TO_LY = 3.2616e6

    if z < 0.1:
        # Hubble law
        d_mpc = c * z / H0
    else:
        # Simple integral approximation for LCDM (Omega_m=0.315)
        # Using the Mattig formula with correction
        Om = 0.315
        Ol = 0.685
        # Numerical integration with 100 steps
        n_steps = 100
        dz = z / n_steps
        integral = 0
        for i in range(n_steps):
            zi = (i + 0.5) * dz
            E = math.sqrt(Om * (1 + zi) ** 3 + Ol)
            integral += dz / E
        d_mpc = c / H0 * integral

    return d_mpc * MPC_TO_LY


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


def process_ngc():
    ngc_path = os.path.join(RAW_DIR, 'ngc.csv')
    if not os.path.exists(ngc_path):
        print(f"Error: {ngc_path} not found. Run fetch_ngc.py first.")
        return

    print("Loading OpenNGC catalog...")
    df = pd.read_csv(ngc_path, sep=';')
    print(f"  Raw rows: {len(df):,}")

    # Parse coordinates
    df['ra_deg'] = df['RA'].apply(parse_ra)
    df['dec_deg'] = df['Dec'].apply(parse_dec)

    # Filter rows with valid coordinates
    df = df[df['ra_deg'].notna() & df['dec_deg'].notna()].copy()
    print(f"  With valid coords: {len(df):,}")

    # Skip duplicates, non-existent, and star-type entries
    df = df[~df['Type'].isin(['Dup', 'NonEx', '*', '**', 'Other', 'Nova'])].copy()
    print(f"  After filtering non-objects: {len(df):,}")

    galaxies = []
    nebulae = []
    clusters = []

    for _, row in df.iterrows():
        obj_type = row['Type']
        ra = row['ra_deg']
        dec = row['dec_deg']
        name = row['Name']

        # Determine distance
        dist_ly = None
        obj_id = name.replace(' ', '')

        # Check known distances first
        if obj_id in KNOWN_DISTANCES:
            dist_ly = KNOWN_DISTANCES[obj_id]

        # For galaxies: use redshift if available (only positive = receding)
        if dist_ly is None and obj_type in GALAXY_TYPES:
            redshift = row.get('Redshift')
            if pd.notna(redshift) and redshift > 0:
                dist_ly = redshift_to_distance_ly(redshift)

        # For non-galaxy objects: use parallax if available
        if dist_ly is None and obj_type not in GALAXY_TYPES:
            pax = row.get('Pax')
            if pd.notna(pax) and pax > 0:
                dist_pc = 1000.0 / pax  # parallax in mas -> distance in parsecs
                dist_ly = dist_pc * PARSEC_TO_LY

        # For objects without distance, assign a rough estimate based on type
        if dist_ly is None:
            if obj_type in GALAXY_TYPES:
                dist_ly = 100_000_000
            elif obj_type in CLUSTER_TYPES:
                dist_ly = 10_000
            elif obj_type in NEBULA_TYPES:
                dist_ly = 5_000

        if dist_ly is None or dist_ly <= 0:
            continue

        # Convert to Cartesian
        x, y, z = ra_dec_dist_to_xyz(ra, dec, dist_ly)

        mapped_type = TYPE_MAP.get(obj_type, obj_type)
        color = TYPE_COLORS.get(mapped_type, '#FFFFFF')

        # Common names
        common_name = row.get('Common names')
        if pd.notna(common_name) and common_name.strip():
            common_name = common_name.strip().split(',')[0].strip()
        else:
            common_name = None

        # Magnitudes
        v_mag = row.get('V-Mag')
        v_mag = float(v_mag) if pd.notna(v_mag) else None
        b_mag = row.get('B-Mag')
        b_mag = float(b_mag) if pd.notna(b_mag) else None
        mag = v_mag if v_mag is not None else b_mag

        surf_br = row.get('SurfBr')
        surf_br = float(surf_br) if pd.notna(surf_br) else None

        major = row.get('MajAx')
        major = float(major) if pd.notna(major) else None
        minor = row.get('MinAx')
        minor = float(minor) if pd.notna(minor) else None
        pa = row.get('PosAng')
        pa = float(pa) if pd.notna(pa) else None

        base = {
            'id': name.replace(' ', ''),
            'name': name,
            'common_name': common_name,
            'x': round(x, 4),
            'y': round(y, 4),
            'z': round(z, 4),
            'distance_ly': round(dist_ly, 4),
            'ra': round(ra, 6),
            'dec': round(dec, 6),
            'magnitude': round(mag, 3) if mag is not None else None,
            'major_axis': round(major, 2) if major is not None else None,
            'minor_axis': round(minor, 2) if minor is not None else None,
            'color': color,
        }

        if obj_type in GALAXY_TYPES:
            redshift = row.get('Redshift')
            galaxies.append({
                **base,
                'object_type': mapped_type,
                'morphology': row.get('Hubble') if pd.notna(row.get('Hubble')) else None,
                'surface_brightness': round(surf_br, 3) if surf_br else None,
                'redshift': round(float(redshift), 6) if pd.notna(redshift) else None,
                'position_angle': round(pa, 1) if pa is not None else None,
            })
        elif obj_type in NEBULA_TYPES:
            nebulae.append({
                **base,
                'object_type': mapped_type,
                'surface_brightness': round(surf_br, 3) if surf_br else None,
                'position_angle': round(pa, 1) if pa is not None else None,
                'constellation': row.get('Const') if pd.notna(row.get('Const')) else None,
            })
        elif obj_type in CLUSTER_TYPES:
            clusters.append({
                **base,
                'object_type': mapped_type,
                'constellation': row.get('Const') if pd.notna(row.get('Const')) else None,
            })

    print(f"\n  Galaxies:  {len(galaxies):,}")
    print(f"  Nebulae:   {len(nebulae):,}")
    print(f"  Clusters:  {len(clusters):,}")

    # Spot checks
    print("\nSpot checks:")
    for name_check in ['NGC0224', 'NGC1976', 'NGC5139', 'NGC6720']:
        for lst, label in [(galaxies, 'galaxy'), (nebulae, 'nebula'), (clusters, 'cluster')]:
            matches = [r for r in lst if r['id'] == name_check]
            if matches:
                r = matches[0]
                print(f"  {r['name']} ({label}): dist={r['distance_ly']:,.0f} LY, "
                      f"common_name={r.get('common_name')}, mag={r.get('magnitude')}")

    return galaxies, nebulae, clusters


def main():
    galaxies, nebulae, clusters = process_ngc()

    print(f"\nUploading to Supabase ({SUPABASE_URL})...")

    if galaxies:
        upload_to_supabase(galaxies, 'galaxies')
    if nebulae:
        upload_to_supabase(nebulae, 'nebulae')
    if clusters:
        upload_to_supabase(clusters, 'clusters')

    print("\nOpenNGC processing complete!")


if __name__ == '__main__':
    main()
