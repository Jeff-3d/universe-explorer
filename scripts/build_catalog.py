"""
Process the raw HYG star catalog and upload to Supabase.

Transforms:
- RA (hours) + Dec (degrees) + distance (parsecs) -> Cartesian x,y,z in light-years
- Spectral type -> effective temperature -> blackbody RGB color
- Absolute magnitude -> luminosity (solar luminosities)
- Luminosity + temperature -> radius (solar radii)
- Mass estimated from mass-luminosity relation

Uploads processed stars to the Supabase 'stars' table in batches.
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

# Spectral type -> approximate effective temperature (K)
SPECTRAL_TEMP = {
    'O': 35000, 'B': 20000, 'A': 8500, 'F': 6500,
    'G': 5500,  'K': 4000,  'M': 3200, 'L': 1800,
    'T': 1200,  'Y': 500,
}

# More granular temperature lookup for subtypes
SPECTRAL_SUBTYPE_TEMP = {}
for sp, temp in SPECTRAL_TEMP.items():
    for sub in range(10):
        # Interpolate between this class and the next cooler one
        classes = list(SPECTRAL_TEMP.keys())
        idx = classes.index(sp)
        if idx + 1 < len(classes):
            next_temp = SPECTRAL_TEMP[classes[idx + 1]]
        else:
            next_temp = temp * 0.6
        t = temp - (temp - next_temp) * (sub / 10.0)
        SPECTRAL_SUBTYPE_TEMP[f'{sp}{sub}'] = t


def spectral_to_temperature(spect):
    """Convert spectral type string to effective temperature in Kelvin."""
    if not spect or not isinstance(spect, str) or len(spect) == 0:
        return None

    spect = spect.strip()
    if len(spect) == 0:
        return None

    # Try full subtype match (e.g., "G2")
    if len(spect) >= 2 and spect[0] in SPECTRAL_TEMP and spect[1].isdigit():
        key = spect[:2]
        if key in SPECTRAL_SUBTYPE_TEMP:
            return SPECTRAL_SUBTYPE_TEMP[key]

    # Fall back to just the class letter
    letter = spect[0].upper()
    if letter in SPECTRAL_TEMP:
        return SPECTRAL_TEMP[letter]

    return None


def temperature_to_color(temp):
    """
    Convert temperature (Kelvin) to approximate RGB hex color.
    Uses Tanner Helland's algorithm for blackbody color approximation.
    """
    if temp is None or temp <= 0:
        return '#FFFFFF'

    temp = max(1000, min(40000, temp))
    t = temp / 100.0

    # Red
    if t <= 66:
        r = 255
    else:
        r = 329.698727446 * ((t - 60) ** -0.1332047592)
        r = max(0, min(255, r))

    # Green
    if t <= 66:
        g = 99.4708025861 * math.log(t) - 161.1195681661
        g = max(0, min(255, g))
    else:
        g = 288.1221695283 * ((t - 60) ** -0.0755148492)
        g = max(0, min(255, g))

    # Blue
    if t >= 66:
        b = 255
    elif t <= 19:
        b = 0
    else:
        b = 138.5177312231 * math.log(t - 10) - 305.0447927307
        b = max(0, min(255, b))

    return f'#{int(r):02x}{int(g):02x}{int(b):02x}'


def color_index_to_temperature(ci):
    """Convert B-V color index to temperature using Ballesteros' formula."""
    if ci is None or np.isnan(ci):
        return None
    temp = 4600 * (1.0 / (0.92 * ci + 1.7) + 1.0 / (0.92 * ci + 0.62))
    return max(1000, min(50000, temp))


def upload_to_supabase(records, table='stars', batch_size=500):
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
            print(f"\nError uploading batch {i // batch_size + 1}: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            # Try to continue with next batch
            continue

        uploaded += len(batch)
        pct = uploaded / total * 100
        print(f"\r  Uploaded {uploaded:,} / {total:,} stars ({pct:.0f}%)", end='', flush=True)

    print(f"\n  Upload complete: {uploaded:,} stars")
    return uploaded


def main():
    hyg_path = os.path.join(RAW_DIR, 'hyg.csv')
    if not os.path.exists(hyg_path):
        print(f"Error: {hyg_path} not found. Run fetch_hyg.py first.")
        return

    print("Loading HYG catalog...")
    df = pd.read_csv(hyg_path)
    print(f"  Raw rows: {len(df):,}")

    # Filter: keep stars with valid distances (dist > 0, dist < 10000 parsecs)
    df = df[df['dist'].notna() & (df['dist'] > 0) & (df['dist'] < 10000)].copy()
    print(f"  After distance filter (0 < dist < 10000 pc): {len(df):,}")

    # Convert distance from parsecs to light-years
    df['distance_ly'] = df['dist'] * PARSEC_TO_LY

    # RA in degrees (HYG stores RA in hours)
    df['ra_deg'] = df['ra'] * 15.0

    # Use pre-computed x,y,z from HYG (in parsecs) and convert to light-years
    df['x'] = df['x'] * PARSEC_TO_LY
    df['y'] = df['y'] * PARSEC_TO_LY
    df['z'] = df['z'] * PARSEC_TO_LY

    # Temperature from spectral type, falling back to color index
    print("Computing temperatures and colors...")
    df['temperature'] = df['spect'].apply(spectral_to_temperature)

    # Fill missing temperatures from B-V color index
    mask_no_temp = df['temperature'].isna()
    df.loc[mask_no_temp, 'temperature'] = df.loc[mask_no_temp, 'ci'].apply(color_index_to_temperature)
    temp_count = df['temperature'].notna().sum()
    print(f"  Stars with temperature: {temp_count:,} / {len(df):,}")

    # Color from temperature
    df['color'] = df['temperature'].apply(temperature_to_color)

    # Use pre-computed luminosity from HYG (in solar luminosities)
    df['luminosity'] = df['lum'].astype(float)

    # Radius from Stefan-Boltzmann: R = sqrt(L) / (T/T_sun)^2
    # In solar radii, where T_sun = 5778 K
    T_SUN = 5778.0
    df['radius'] = np.where(
        df['luminosity'].notna() & df['temperature'].notna() & (df['temperature'] > 0),
        np.sqrt(df['luminosity'].astype(float)) / np.power(df['temperature'].astype(float) / T_SUN, 2),
        None
    )

    # Mass from mass-luminosity relation: L ~ M^3.5 (main sequence approximation)
    # M = L^(1/3.5) = L^(2/7)
    df['mass'] = np.where(
        df['luminosity'].notna() & (df['luminosity'].astype(float) > 0),
        np.power(df['luminosity'].astype(float), 2.0 / 7.0),
        None
    )

    # Build records for upload
    print("Building upload records...")
    records = []
    for _, row in df.iterrows():
        record = {
            'id': f"HYG-{int(row['id'])}",
            'name': row.get('proper') if pd.notna(row.get('proper')) else None,
            'constellation': row.get('con') if pd.notna(row.get('con')) else None,
            'spectral_type': row.get('spect') if pd.notna(row.get('spect')) else None,
            'x': round(float(row['x']), 4),
            'y': round(float(row['y']), 4),
            'z': round(float(row['z']), 4),
            'distance_ly': round(float(row['distance_ly']), 4),
            'ra': round(float(row['ra_deg']), 6) if pd.notna(row.get('ra')) else None,
            'dec': round(float(row['dec']), 6) if pd.notna(row.get('dec')) else None,
            'magnitude': round(float(row['mag']), 3) if pd.notna(row.get('mag')) else None,
            'abs_magnitude': round(float(row['absmag']), 3) if pd.notna(row.get('absmag')) else None,
            'temperature': round(float(row['temperature'])) if pd.notna(row.get('temperature')) else None,
            'luminosity': round(float(row['luminosity']), 6) if pd.notna(row.get('luminosity')) else None,
            'radius': round(float(row['radius']), 4) if pd.notna(row.get('radius')) else None,
            'mass': round(float(row['mass']), 4) if pd.notna(row.get('mass')) else None,
            'color': row['color'] if row['color'] != '#FFFFFF' else None,
            'vx': round(float(row['vx']), 4) if pd.notna(row.get('vx')) else None,
            'vy': round(float(row['vy']), 4) if pd.notna(row.get('vy')) else None,
            'vz': round(float(row['vz']), 4) if pd.notna(row.get('vz')) else None,
            'color_index': round(float(row['ci']), 4) if pd.notna(row.get('ci')) else None,
        }
        records.append(record)

    print(f"  Total records to upload: {len(records):,}")

    # Spot checks
    print("\nSpot checks:")
    for name in ['Sol', 'Sirius', 'Betelgeuse', 'Proxima Centauri', 'Vega', 'Polaris']:
        matches = [r for r in records if r['name'] == name]
        if matches:
            s = matches[0]
            print(f"  {name}: dist={s['distance_ly']:.2f} LY, temp={s['temperature']}K, "
                  f"color={s['color']}, mag={s['magnitude']}, lum={s['luminosity']}")
        else:
            print(f"  {name}: NOT FOUND")

    # Upload to Supabase
    print(f"\nUploading to Supabase ({SUPABASE_URL})...")
    uploaded = upload_to_supabase(records, batch_size=500)

    print(f"\nPhase 1 data pipeline complete!")
    print(f"  Stars processed: {len(records):,}")
    print(f"  Stars uploaded: {uploaded:,}")


if __name__ == '__main__':
    main()
