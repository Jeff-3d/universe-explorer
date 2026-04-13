# Universe Explorer

Interactive 3D visualization of the observable universe using real astronomical catalogs.

## Stack
- **Frontend:** React + Vite, React Three Fiber, Three.js, Tailwind CSS, Zustand
- **Backend:** Supabase (Postgres + PostGIS, REST API, Storage)
- **Data pipeline:** Python 3 (pandas, numpy, astropy, supabase-py)
- **Audio:** Web Audio API

## Dev Commands
```bash
# Frontend
npm install        # Install dependencies
npm run dev        # Start dev server
npm run build      # Production build

# Data pipeline
pip install -r requirements.txt
python scripts/fetch_hyg.py        # Download HYG star catalog
python scripts/fetch_ngc.py        # Download OpenNGC catalog
python scripts/fetch_exoplanets.py # Download NASA exoplanet data
python scripts/fetch_sdss.py       # Download SDSS galaxy data
python scripts/build_catalog.py    # Process + upload to Supabase
```

## Architecture
- `src/objects/` — R3F components for each celestial object type (StarField, GalaxyField, etc.)
- `src/shaders/` — GLSL shaders organized by object type
- `src/ui/` — React UI overlay components (InfoPanel, FilterBar, SearchBar, etc.)
- `src/hooks/` — Custom hooks (useCatalog, useCamera, useSpeed, etc.)
- `src/utils/` — Pure utility functions (coordinates, colors, cosmology, physics)
- `src/audio/` — Web Audio API sound engine and synthesizers
- `src/tours/` — Guided tour engine and tour data
- `scripts/` — Python data pipeline scripts
- `data/raw/` — Downloaded source CSVs (gitignored)

## Key Conventions
- Stars use `Points` geometry with custom ShaderMaterial (never individual meshes)
- All vertex shaders must implement floating origin (subtract camera position uniform)
- Supabase anon key is used in frontend; service role key only in Python scripts
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend), `SUPABASE_SERVICE_ROLE_KEY` (scripts only)
- Catalog data lives in Supabase, not in static JSON files
