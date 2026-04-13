import { useStore } from '../store'

/**
 * Toggle buttons to show/hide object types with counts.
 * Positioned top-left below the title.
 */
export default function FilterBar() {
  const filters = useStore((s) => s.filters)
  const toggleFilter = useStore((s) => s.toggleFilter)
  const starCount = useStore((s) => s.starCount)
  const galaxyCount = useStore((s) => s.galaxyCount)
  const nebulaCount = useStore((s) => s.nebulaCount)
  const clusterCount = useStore((s) => s.clusterCount)
  const exoplanetCount = useStore((s) => s.exoplanetCount)

  const types = [
    { key: 'stars', label: 'Stars', count: starCount, color: '#FFF4EA' },
    { key: 'galaxies', label: 'Galaxies', count: galaxyCount, color: '#C4A5FF' },
    { key: 'nebulae', label: 'Nebulae', count: nebulaCount, color: '#FF6B8A' },
    { key: 'clusters', label: 'Clusters', count: clusterCount, color: '#6BC5FF' },
    { key: 'exoplanets', label: 'Exoplanets', count: exoplanetCount, color: '#7BFF8A' },
    { key: 'blackHoles', label: 'Black Holes', count: 0, color: '#888' },
  ]

  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map(({ key, label, count, color }) => (
        <button
          key={key}
          onClick={() => toggleFilter(key)}
          className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all
            border
            ${filters[key]
              ? 'bg-white/10 border-white/20 text-white/90'
              : 'bg-transparent border-white/5 text-white/30'
            }
            ${count === 0 ? 'opacity-40 cursor-default' : 'hover:bg-white/15 cursor-pointer'}
          `}
          disabled={count === 0}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: filters[key] ? color : 'transparent',
              border: `1px solid ${color}`,
              opacity: filters[key] ? 1 : 0.3,
            }}
          />
          {label}
          {count > 0 && (
            <span className="text-white/40 ml-0.5">
              {count.toLocaleString()}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
