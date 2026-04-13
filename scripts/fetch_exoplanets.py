"""
Download confirmed exoplanets from the NASA Exoplanet Archive TAP service.

Fetches key planetary and host star properties for all confirmed exoplanets.
"""
import os
import requests

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
os.makedirs(RAW_DIR, exist_ok=True)

# NASA Exoplanet Archive TAP query
TAP_URL = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync'

# Select columns we need
QUERY = """
SELECT
    pl_name, hostname,
    ra, dec, sy_dist,
    pl_orbper, pl_orbsmax, pl_orbeccen,
    pl_rade, pl_bmasse,
    pl_eqt,
    discoverymethod, disc_year,
    st_teff, st_lum, st_rad, st_mass,
    st_spectype
FROM ps
WHERE default_flag = 1
"""

def main():
    out_path = os.path.join(RAW_DIR, 'exoplanets.csv')

    if os.path.exists(out_path):
        size_mb = os.path.getsize(out_path) / 1e6
        print(f"Exoplanet data already downloaded: {out_path} ({size_mb:.1f} MB)")
        return

    print("Downloading exoplanet data from NASA Exoplanet Archive...")
    params = {
        'query': QUERY.strip(),
        'format': 'csv',
    }

    resp = requests.get(TAP_URL, params=params, timeout=120)
    resp.raise_for_status()

    with open(out_path, 'wb') as f:
        f.write(resp.content)

    size_mb = os.path.getsize(out_path) / 1e6
    lines = resp.text.count('\n') - 1  # subtract header
    print(f"Downloaded: {out_path}")
    print(f"  Size: {size_mb:.1f} MB, {lines:,} exoplanets")

if __name__ == '__main__':
    main()
