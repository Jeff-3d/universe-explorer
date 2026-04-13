import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store'

/**
 * Fetch star catalog from Supabase and load into the store.
 *
 * Supabase REST API has a default row limit (1000). We paginate through
 * all rows using range headers to fetch the full 109K star catalog.
 */
const PAGE_SIZE = 1000

async function fetchAllStars(onProgress) {
  const allStars = []
  let from = 0
  let keepGoing = true

  while (keepGoing) {
    const { data, error } = await supabase
      .from('stars')
      .select('id,name,constellation,spectral_type,x,y,z,distance_ly,ra,dec,magnitude,abs_magnitude,temperature,luminosity,radius,mass,color,vx,vy,vz')
      .range(from, from + PAGE_SIZE - 1)
      .order('id')

    if (error) throw error

    if (data && data.length > 0) {
      allStars.push(...data)
      from += data.length
      if (onProgress) onProgress(allStars.length)
      if (data.length < PAGE_SIZE) {
        keepGoing = false
      }
    } else {
      keepGoing = false
    }
  }

  return allStars
}

export function useCatalog() {
  const setStars = useStore((s) => s.setStars)
  const setStarsError = useStore((s) => s.setStarsError)
  const starsLoading = useStore((s) => s.starsLoading)
  const stars = useStore((s) => s.stars)

  useEffect(() => {
    // Only fetch once
    if (stars !== null) return

    let cancelled = false

    async function load() {
      try {
        console.time('fetchStars')
        const data = await fetchAllStars((loaded) => {
          console.log(`Loading stars: ${loaded.toLocaleString()}...`)
        })
        console.timeEnd('fetchStars')

        if (!cancelled) {
          console.log(`Loaded ${data.length.toLocaleString()} stars from Supabase`)
          setStars(data)
        }
      } catch (err) {
        console.error('Failed to load stars:', err)
        if (!cancelled) {
          setStarsError(err.message)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [stars, setStars, setStarsError])

  return { starsLoading, stars }
}
