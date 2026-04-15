"""
Export the full stars table to a single JSON blob and upload to Supabase Storage.

The frontend fetches this blob in one request instead of paginating the REST API,
cutting catalog load time from ~30-60s to ~1-3s.

Run after every stars table update:
    python scripts/export_star_blob.py
"""
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.environ['VITE_SUPABASE_URL'].rstrip('/')
SERVICE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
BUCKET = 'catalog'
OBJECT_PATH = 'stars.json'
PAGE_SIZE = 1000

STAR_COLUMNS = (
    'id,name,constellation,spectral_type,x,y,z,distance_ly,ra,dec,'
    'magnitude,abs_magnitude,temperature,luminosity,radius,mass,color,'
    'vx,vy,vz'
)

AUTH_HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
}


def ensure_bucket():
    r = requests.get(f'{SUPABASE_URL}/storage/v1/bucket', headers=AUTH_HEADERS, timeout=30)
    r.raise_for_status()
    existing = {b['name'] for b in r.json()}
    if BUCKET in existing:
        print(f'Bucket "{BUCKET}" already exists')
        return

    print(f'Creating bucket "{BUCKET}" (public)...')
    r = requests.post(
        f'{SUPABASE_URL}/storage/v1/bucket',
        headers={**AUTH_HEADERS, 'Content-Type': 'application/json'},
        json={'id': BUCKET, 'name': BUCKET, 'public': True},
        timeout=30,
    )
    r.raise_for_status()


def fetch_all_stars():
    rows = []
    offset = 0
    while True:
        r = requests.get(
            f'{SUPABASE_URL}/rest/v1/stars',
            headers={**AUTH_HEADERS, 'Range-Unit': 'items', 'Range': f'{offset}-{offset + PAGE_SIZE - 1}'},
            params={'select': STAR_COLUMNS, 'order': 'id.asc'},
            timeout=60,
        )
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        rows.extend(batch)
        print(f'  fetched {len(rows):,} stars')
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows


def upload_blob(payload: bytes):
    url = f'{SUPABASE_URL}/storage/v1/object/{BUCKET}/{OBJECT_PATH}'
    headers = {
        **AUTH_HEADERS,
        'Content-Type': 'application/json',
        'cache-control': 'public, max-age=300',
        'x-upsert': 'true',
    }
    r = requests.post(url, headers=headers, data=payload, timeout=120)
    if r.status_code == 409:
        # already exists — use PUT to overwrite
        r = requests.put(url, headers=headers, data=payload, timeout=120)
    r.raise_for_status()


def main():
    ensure_bucket()

    print('Fetching stars from Supabase...')
    stars = fetch_all_stars()
    print(f'Fetched {len(stars):,} stars total')

    print('Serializing to JSON...')
    payload = json.dumps(stars, separators=(',', ':')).encode('utf-8')
    print(f'Payload size: {len(payload) / 1e6:.1f} MB')

    print(f'Uploading to {BUCKET}/{OBJECT_PATH}...')
    upload_blob(payload)

    public_url = f'{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{OBJECT_PATH}'
    print(f'Done. Public URL: {public_url}')


if __name__ == '__main__':
    main()
