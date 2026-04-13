import { useState, useMemo, useRef, useEffect } from 'react'
import { useStore } from '../store'

const TYPE_LABELS = {
  star: 'Star',
  galaxy: 'Galaxy',
  nebula: 'Nebula',
  cluster: 'Cluster',
  exoplanet: 'Exoplanet',
}

/**
 * Autocomplete search bar for finding objects by name.
 * Searches across all object types (stars, galaxies, nebulae, clusters, exoplanets).
 */
export default function SearchBar() {
  const stars = useStore((s) => s.stars)
  const galaxies = useStore((s) => s.galaxies)
  const nebulae = useStore((s) => s.nebulae)
  const clusters = useStore((s) => s.clusters)
  const exoplanets = useStore((s) => s.exoplanets)
  const setSelectedObject = useStore((s) => s.setSelectedObject)
  const setCameraTarget = useStore((s) => s.setCameraTarget)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  // Build a unified list of named objects for search
  const searchable = useMemo(() => {
    const items = []
    if (stars) {
      for (const s of stars) {
        if (s.name && s.name.trim()) items.push({ ...s, _type: 'star', _searchName: s.name.toLowerCase() })
      }
    }
    if (galaxies) {
      for (const g of galaxies) {
        const name = g.common_name || g.name
        if (name && name.trim()) items.push({ ...g, _searchName: name.toLowerCase() })
      }
    }
    if (nebulae) {
      for (const n of nebulae) {
        const name = n.common_name || n.name
        if (name && name.trim()) items.push({ ...n, _searchName: name.toLowerCase() })
      }
    }
    if (clusters) {
      for (const c of clusters) {
        const name = c.common_name || c.name
        if (name && name.trim()) items.push({ ...c, _searchName: name.toLowerCase() })
      }
    }
    if (exoplanets) {
      for (const e of exoplanets) {
        if (e.name && e.name.trim()) items.push({ ...e, _searchName: e.name.toLowerCase() })
      }
    }
    return items
  }, [stars, galaxies, nebulae, clusters, exoplanets])

  // Filter matches
  const matches = useMemo(() => {
    if (!query || query.length < 2) return []
    const q = query.toLowerCase()
    const results = []
    for (const item of searchable) {
      if (item._searchName.includes(q)) {
        results.push(item)
        if (results.length >= 30) break
      }
    }
    // Sort: exact prefix matches first, then by magnitude (brightest first)
    results.sort((a, b) => {
      const aPrefix = a._searchName.startsWith(q) ? 0 : 1
      const bPrefix = b._searchName.startsWith(q) ? 0 : 1
      if (aPrefix !== bPrefix) return aPrefix - bPrefix
      return (a.magnitude ?? 99) - (b.magnitude ?? 99)
    })
    return results.slice(0, 20)
  }, [query, searchable])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectObject(obj) {
    setSelectedObject(obj)
    setCameraTarget(obj)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function displayName(obj) {
    return obj.common_name || obj.name || obj.id
  }

  function subtitle(obj) {
    const parts = []
    const type = TYPE_LABELS[obj._type] || obj._type
    parts.push(type)
    if (obj.constellation) parts.push(obj.constellation)
    if (obj.distance_ly != null) {
      const d = obj.distance_ly
      if (d < 100) parts.push(`${d.toFixed(1)} LY`)
      else if (d < 1e6) parts.push(`${Math.round(d).toLocaleString()} LY`)
      else parts.push(`${(d / 1e6).toFixed(1)} MLY`)
    }
    return parts.join(' \u00b7 ')
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => query.length >= 2 && setOpen(true)}
        placeholder="Search the universe..."
        className="w-56 px-3 py-1.5 rounded bg-white/10 border border-white/15 text-sm text-white/90 placeholder-white/30 outline-none focus:border-white/30 focus:bg-white/15 transition-colors"
      />

      {/* Dropdown */}
      {open && matches.length > 0 && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 mt-1 w-72 max-h-64 overflow-y-auto bg-black/85 backdrop-blur-md border border-white/15 rounded-lg shadow-xl z-30"
        >
          {matches.map((obj) => (
            <button
              key={`${obj._type}-${obj.id}`}
              onClick={() => selectObject(obj)}
              className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: obj.color || '#fff' }}
              />
              <div className="min-w-0">
                <div className="text-sm text-white/90 truncate">
                  {displayName(obj)}
                </div>
                <div className="text-xs text-white/40 truncate">
                  {subtitle(obj)}
                </div>
              </div>
              {obj.magnitude != null && (
                <span className="ml-auto text-xs text-white/30 flex-shrink-0">
                  mag {obj.magnitude.toFixed(1)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && matches.length === 0 && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-black/85 backdrop-blur-md border border-white/15 rounded-lg p-3 text-sm text-white/40 z-30">
          No objects found
        </div>
      )}
    </div>
  )
}
