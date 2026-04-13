import { useState, useMemo, useRef, useEffect } from 'react'
import { useStore } from '../store'

/**
 * Autocomplete search bar for finding stars by name.
 * Selecting a result sets it as the selected object and triggers fly-to.
 */
export default function SearchBar() {
  const stars = useStore((s) => s.stars)
  const setSelectedObject = useStore((s) => s.setSelectedObject)
  const setCameraTarget = useStore((s) => s.setCameraTarget)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  // Build a list of named stars for search (only stars with names)
  const namedStars = useMemo(() => {
    if (!stars) return []
    return stars.filter((s) => s.name && s.name.trim() !== '')
  }, [stars])

  // Filter matches
  const matches = useMemo(() => {
    if (!query || query.length < 2) return []
    const q = query.toLowerCase()
    const results = []
    for (const star of namedStars) {
      if (star.name.toLowerCase().includes(q)) {
        results.push(star)
        if (results.length >= 20) break
      }
    }
    // Sort: exact prefix matches first, then by magnitude (brightest first)
    results.sort((a, b) => {
      const aPrefix = a.name.toLowerCase().startsWith(q) ? 0 : 1
      const bPrefix = b.name.toLowerCase().startsWith(q) ? 0 : 1
      if (aPrefix !== bPrefix) return aPrefix - bPrefix
      return (a.magnitude ?? 99) - (b.magnitude ?? 99)
    })
    return results
  }, [query, namedStars])

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

  function selectStar(star) {
    setSelectedObject(star)
    setCameraTarget(star)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
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
        placeholder="Search stars..."
        className="w-56 px-3 py-1.5 rounded bg-white/10 border border-white/15 text-sm text-white/90 placeholder-white/30 outline-none focus:border-white/30 focus:bg-white/15 transition-colors"
      />

      {/* Dropdown */}
      {open && matches.length > 0 && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 mt-1 w-72 max-h-64 overflow-y-auto bg-black/85 backdrop-blur-md border border-white/15 rounded-lg shadow-xl z-30"
        >
          {matches.map((star) => (
            <button
              key={star.id}
              onClick={() => selectStar(star)}
              className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: star.color || '#fff' }}
              />
              <div className="min-w-0">
                <div className="text-sm text-white/90 truncate">
                  {star.name}
                </div>
                <div className="text-xs text-white/40 truncate">
                  {star.constellation && `${star.constellation} · `}
                  {star.distance_ly != null
                    ? `${star.distance_ly < 100 ? star.distance_ly.toFixed(1) : Math.round(star.distance_ly).toLocaleString()} LY`
                    : ''}
                  {star.spectral_type ? ` · ${star.spectral_type}` : ''}
                </div>
              </div>
              <span className="ml-auto text-xs text-white/30 flex-shrink-0">
                mag {star.magnitude?.toFixed(1)}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && matches.length === 0 && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-black/85 backdrop-blur-md border border-white/15 rounded-lg p-3 text-sm text-white/40 z-30">
          No stars found
        </div>
      )}
    </div>
  )
}
