import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store'

/**
 * Fetch all catalogs from Supabase and load into the store.
 *
 * Supabase REST API has a default row limit (1000). We paginate through
 * all rows using range headers to fetch full catalogs.
 */
const PAGE_SIZE = 1000

async function fetchAll(table, columns, onProgress) {
  const allRows = []
  let from = 0
  let keepGoing = true

  while (keepGoing) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1)
      .order('id')

    if (error) throw error

    if (data && data.length > 0) {
      allRows.push(...data)
      from += data.length
      if (onProgress) onProgress(allRows.length)
      if (data.length < PAGE_SIZE) {
        keepGoing = false
      }
    } else {
      keepGoing = false
    }
  }

  return allRows
}

// Column selections for each table
const STAR_COLUMNS = 'id,name,constellation,spectral_type,x,y,z,distance_ly,ra,dec,magnitude,abs_magnitude,temperature,luminosity,radius,mass,color,vx,vy,vz'
const GALAXY_COLUMNS = 'id,name,common_name,object_type,morphology,x,y,z,distance_ly,ra,dec,magnitude,surface_brightness,redshift,major_axis,minor_axis,position_angle,color'
const NEBULA_COLUMNS = 'id,name,common_name,object_type,x,y,z,distance_ly,ra,dec,magnitude,surface_brightness,major_axis,minor_axis,position_angle,constellation,color'
const CLUSTER_COLUMNS = 'id,name,common_name,object_type,x,y,z,distance_ly,ra,dec,magnitude,major_axis,minor_axis,constellation,color'
const EXOPLANET_COLUMNS = 'id,name,host_star,x,y,z,distance_ly,ra,dec,orbital_period,semi_major_axis,eccentricity,planet_radius,planet_mass,equilibrium_temp,discovery_method,discovery_year,host_star_temp,host_star_luminosity,host_star_radius,host_star_mass,hz_inner,hz_outer,in_habitable_zone,color'

export function useCatalog() {
  const setStars = useStore((s) => s.setStars)
  const setStarsError = useStore((s) => s.setStarsError)
  const setGalaxies = useStore((s) => s.setGalaxies)
  const setNebulae = useStore((s) => s.setNebulae)
  const setClusters = useStore((s) => s.setClusters)
  const setExoplanets = useStore((s) => s.setExoplanets)
  const setCatalogLoading = useStore((s) => s.setCatalogLoading)
  const starsLoading = useStore((s) => s.starsLoading)

  const loadStarted = useRef(false)

  useEffect(() => {
    // Only fetch once
    if (loadStarted.current) return
    loadStarted.current = true

    async function load() {
      try {
        // Fetch stars first (largest dataset, most important)
        console.time('fetchStars')
        const starData = await fetchAll('stars', STAR_COLUMNS, (loaded) => {
          console.log(`Loading stars: ${loaded.toLocaleString()}...`)
        })
        console.timeEnd('fetchStars')

        console.log(`Loaded ${starData.length.toLocaleString()} stars`)
        setStars(starData)

        // Fetch other catalogs in parallel
        console.time('fetchOtherCatalogs')
        const [galaxyData, nebulaData, clusterData, exoplanetData] = await Promise.all([
          fetchAll('galaxies', GALAXY_COLUMNS, (n) => console.log(`Loading galaxies: ${n}...`)),
          fetchAll('nebulae', NEBULA_COLUMNS, (n) => console.log(`Loading nebulae: ${n}...`)),
          fetchAll('clusters', CLUSTER_COLUMNS, (n) => console.log(`Loading clusters: ${n}...`)),
          fetchAll('exoplanets', EXOPLANET_COLUMNS, (n) => console.log(`Loading exoplanets: ${n}...`)),
        ])
        console.timeEnd('fetchOtherCatalogs')

        // Tag each object with its type for the UI
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
  }, [setStars, setStarsError, setGalaxies, setNebulae, setClusters, setExoplanets, setCatalogLoading])

  return { starsLoading }
}
