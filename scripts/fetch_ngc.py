"""
Download the OpenNGC catalog (galaxies, nebulae, clusters).

Source: https://github.com/mattiaverga/OpenNGC
Contains ~13,000 NGC/IC objects with coordinates, types, sizes, magnitudes.
"""
import os
import requests

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
os.makedirs(RAW_DIR, exist_ok=True)

# OpenNGC CSV from GitHub
NGC_URL = 'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv'

def main():
    out_path = os.path.join(RAW_DIR, 'ngc.csv')

    if os.path.exists(out_path):
        size_mb = os.path.getsize(out_path) / 1e6
        print(f"OpenNGC already downloaded: {out_path} ({size_mb:.1f} MB)")
        return

    print(f"Downloading OpenNGC catalog from GitHub...")
    resp = requests.get(NGC_URL, timeout=60)
    resp.raise_for_status()

    with open(out_path, 'wb') as f:
        f.write(resp.content)

    size_mb = os.path.getsize(out_path) / 1e6
    lines = resp.text.count('\n')
    print(f"Downloaded: {out_path}")
    print(f"  Size: {size_mb:.1f} MB, ~{lines:,} rows")

if __name__ == '__main__':
    main()
