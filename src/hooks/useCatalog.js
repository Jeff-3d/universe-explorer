import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store'

// Module-level guard: survives React StrictMode's double-invoke in dev, which
// would otherwise fire two concurrent loads and break the Supabase auth lock.
let loadStarted = false

/**
 * Fetch all catalogs from Supabase and load into the store.
 *
 * Stars (~109K) are loaded from a prebuilt JSON blob in Supabase Storage — one
 * request instead of 110 paginated REST calls. Regenerate the blob with
 * `python scripts/export_star_blob.py` after changes to the stars table.
 *
 * Smaller catalogs (galaxies/nebulae/clusters/exoplanets) issue a count query
 * and then fire every page range in parallel via Promise.all.
 */
const PAGE_SIZE = 1000

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const STAR_BLOB_URL = `${SUPABASE_URL}/storage/v1/object/public/catalog/stars.json`
const REST_URL = `${SUPABASE_URL}/rest/v1`
const AUTH_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
}

// Fetch all rows from a table in parallel pages. Uses raw fetch() rather than
// the supabase-js client because that client serializes requests through a
// gotrue auth lock, which cancels out our parallelism.
async function fetchAllParallel(table, columns) {
  const qs = new URLSearchParams({ select: columns, order: 'id.asc' })

  const countResp = await fetch(`${REST_URL}/${table}?${qs}&limit=1`, {
    headers: { ...AUTH_HEADERS, Prefer: 'count=exact', Range: '0-0' },
  })
  if (!countResp.ok) throw new Error(`count ${table} failed: ${countResp.status}`)
  const contentRange = countResp.headers.get('content-range') || ''
  const total = Number(contentRange.split('/')[1]) || 0
  if (total === 0) return []

  const pageCount = Math.ceil(total / PAGE_SIZE)
  const pages = await Promise.all(
    Array.from({ length: pageCount }, async (_, i) => {
      const r = await fetch(`${REST_URL}/${table}?${qs}`, {
        headers: {
          ...AUTH_HEADERS,
          Range: `${i * PAGE_SIZE}-${(i + 1) * PAGE_SIZE - 1}`,
        },
      })
      if (!r.ok) throw new Error(`${table} page ${i} failed: ${r.status}`)
      return r.json()
    })
  )

  return pages.flat()
}

async function fetchStarBlob(onProgress) {
  // The blob is served Brotli-compressed (~7.7 MB over wire, ~35 MB decoded).
  // Using resp.json() lets the browser parse as it decompresses — streaming
  // through a manual reader + Blob + JSON.parse is ~5× slower because it
  // allocates two extra copies of the 35 MB string.
  //
  // We emit indeterminate progress (0 → 0.9) while the request is in-flight
  // so the UI pill still animates, then snap to 1 on success.
  if (onProgress) onProgress(0.05)
  const tickInterval = setInterval(() => {
    const cur = useStore.getState().starLoadProgress || 0
    if (cur < 0.9) onProgress(cur + (0.9 - cur) * 0.1)
  }, 200)

  try {
    const resp = await fetch(STAR_BLOB_URL)
    if (!resp.ok) {
      throw new Error(`Failed to fetch star blob: ${resp.status} ${resp.statusText}`)
    }
    const data = await resp.json()
    return data
  } finally {
    clearInterval(tickInterval)
  }
}

const GALAXY_COLUMNS = 'id,name,common_name,object_type,morphology,x,y,z,distance_ly,ra,dec,magnitude,surface_brightness,redshift,major_axis,minor_axis,position_angle,color'
const NEBULA_COLUMNS = 'id,name,common_name,object_type,x,y,z,distance_ly,ra,dec,magnitude,surface_brightness,major_axis,minor_axis,position_angle,constellation,color'
const CLUSTER_COLUMNS = 'id,name,common_name,object_type,x,y,z,distance_ly,ra,dec,magnitude,major_axis,minor_axis,constellation,color'
const EXOPLANET_COLUMNS = 'id,name,host_star,x,y,z,distance_ly,ra,dec,orbital_period,semi_major_axis,eccentricity,planet_radius,planet_mass,equilibrium_temp,discovery_method,discovery_year,host_star_temp,host_star_luminosity,host_star_radius,host_star_mass,hz_inner,hz_outer,in_habitable_zone,color'

export function useCatalog() {
  const setStars = useStore((s) => s.setStars)
  const setStarsError = useStore((s) => s.setStarsError)
  const setStarLoadProgress = useStore((s) => s.setStarLoadProgress)
  const setGalaxies = useStore((s) => s.setGalaxies)
  const setNebulae = useStore((s) => s.setNebulae)
  const setClusters = useStore((s) => s.setClusters)
  const setExoplanets = useStore((s) => s.setExoplanets)
  const setCatalogLoading = useStore((s) => s.setCatalogLoading)
  const starsLoading = useStore((s) => s.starsLoading)

  useEffect(() => {
    if (loadStarted) return
    loadStarted = true

    async function load() {
      try {
        console.time('fetchStars')
        const starData = await fetchStarBlob((p) => {
          if (setStarLoadProgress) setStarLoadProgress(p)
        })
        console.timeEnd('fetchStars')
        console.log(`Loaded ${starData.length.toLocaleString()} stars`)
        setStars(starData)

        console.time('fetchOtherCatalogs')
        const [galaxyData, nebulaData, clusterData, exoplanetData] = await Promise.all([
          fetchAllParallel('galaxies', GALAXY_COLUMNS),
          fetchAllParallel('nebulae', NEBULA_COLUMNS),
          fetchAllParallel('clusters', CLUSTER_COLUMNS),
          fetchAllParallel('exoplanets', EXOPLANET_COLUMNS),
        ])
        console.timeEnd('fetchOtherCatalogs')

        galaxyData.forEach(g => g._type = 'galaxy')
        nebulaData.forEach(n => n._type = 'nebula')
        clusterData.forEach(c => c._type = 'cluster')
        exoplanetData.forEach(e => e._type = 'exoplanet')

        setGalaxies(galaxyData)
        setNebulae(nebulaData)
        setClusters(clusterData)
        setExoplanets(exoplanetData)
        setCatalogLoading(false)

        console.log(`Loaded ${galaxyData.length.toLocaleString()} galaxies, ` +
          `${nebulaData.length.toLocaleString()} nebulae, ` +
          `${clusterData.length.toLocaleString()} clusters, ` +
          `${exoplanetData.length.toLocaleString()} exoplanets`)
      } catch (err) {
        console.error('Failed to load catalog:', err)
        setStarsError(err.message)
      }
    }

    load()
  }, [setStars, setStarsError, setStarLoadProgress, setGalaxies, setNebulae, setClusters, setExoplanets, setCatalogLoading])

  return { starsLoading }
}
