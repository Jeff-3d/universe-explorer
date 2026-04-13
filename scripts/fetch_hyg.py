"""
Download the HYG star catalog and save to data/raw/hyg.csv.

The HYG database combines Hipparcos, Yale Bright Star, and Gliese catalogs
into a single dataset of ~120K nearby stars with positions, magnitudes,
spectral types, and proper motions.

Source: https://github.com/astronexus/HYG-Database
"""
import os
import requests

# HYG v4.1 from GitHub (latest uncompressed version)
HYG_URL = "https://raw.githubusercontent.com/astronexus/HYG-Database/master/hyg/CURRENT/hygdata_v41.csv"

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    output_path = os.path.join(RAW_DIR, 'hyg.csv')

    if os.path.exists(output_path):
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"HYG catalog already exists at {output_path} ({size_mb:.1f} MB)")
        resp = input("Re-download? (y/N): ").strip().lower()
        if resp != 'y':
            print("Skipping download.")
            return

    print(f"Downloading HYG v4.1 catalog from GitHub...")
    print(f"URL: {HYG_URL}")

    resp = requests.get(HYG_URL, stream=True, timeout=120)
    resp.raise_for_status()

    total = int(resp.headers.get('content-length', 0))
    downloaded = 0

    with open(output_path, 'wb') as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
            downloaded += len(chunk)
            if total:
                pct = downloaded / total * 100
                print(f"\r  {downloaded / 1024 / 1024:.1f} MB / {total / 1024 / 1024:.1f} MB ({pct:.0f}%)", end='', flush=True)
            else:
                print(f"\r  {downloaded / 1024 / 1024:.1f} MB downloaded...", end='', flush=True)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\nDone! Saved to {output_path} ({size_mb:.1f} MB)")

    # Quick validation
    with open(output_path, 'r') as f:
        header = f.readline().strip()
        line_count = sum(1 for _ in f)
    print(f"Columns: {header[:80]}...")
    print(f"Data rows: {line_count:,}")


if __name__ == '__main__':
    main()
