import { useStore } from '../store'

/**
 * Slide-in panel showing details of the selected celestial object.
 * Glass-morphism styling with dark semi-transparent background.
 */
export default function InfoPanel() {
  const selectedObject = useStore((s) => s.selectedObject)
  const setSelectedObject = useStore((s) => s.setSelectedObject)
  const setCameraTarget = useStore((s) => s.setCameraTarget)

  if (!selectedObject) return null

  const star = selectedObject

  return (
    <div className="absolute top-4 right-4 w-80 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg p-4 z-20 pointer-events-auto text-white/90 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold leading-tight">
            {star.name || star.id}
          </h2>
          {star.name && (
            <p className="text-xs text-white/40 mt-0.5">{star.id}</p>
          )}
        </div>
        <button
          onClick={() => setSelectedObject(null)}
          className="text-white/40 hover:text-white/80 text-xl leading-none p-1 -mt-1 -mr-1"
        >
          &times;
        </button>
      </div>

      {/* Type badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: star.color || '#fff' }}
        />
        <span className="text-xs uppercase tracking-wider text-white/60">
          Star {star.spectral_type ? `\u00b7 ${star.spectral_type}` : ''}
        </span>
        {star.constellation && (
          <span className="text-xs text-white/40">
            \u00b7 {star.constellation}
          </span>
        )}
      </div>

      {/* Properties */}
      <div className="space-y-1.5 text-sm">
        <InfoRow label="Distance" value={formatDistance(star.distance_ly)} />
        <InfoRow label="Apparent mag" value={star.magnitude?.toFixed(2)} />
        <InfoRow label="Absolute mag" value={star.abs_magnitude?.toFixed(2)} />
        <InfoRow label="Temperature" value={star.temperature ? `${star.temperature.toLocaleString()} K` : null} />
        <InfoRow label="Luminosity" value={star.luminosity ? `${formatNumber(star.luminosity)} L\u2609` : null} />
        <InfoRow label="Radius" value={star.radius ? `${formatNumber(star.radius)} R\u2609` : null} />
        <InfoRow label="Mass" value={star.mass ? `${formatNumber(star.mass)} M\u2609` : null} />
        {(star.vx || star.vy || star.vz) && (
          <InfoRow
            label="Velocity"
            value={`(${star.vx?.toFixed(1)}, ${star.vy?.toFixed(1)}, ${star.vz?.toFixed(1)}) km/s`}
          />
        )}
        <InfoRow label="RA" value={star.ra ? `${star.ra.toFixed(4)}\u00b0` : null} />
        <InfoRow label="Dec" value={star.dec ? `${star.dec.toFixed(4)}\u00b0` : null} />
      </div>

      {/* Travel button */}
      <button
        onClick={() => setCameraTarget(star)}
        className="mt-4 w-full py-2 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-sm transition-colors"
      >
        Travel to {star.name || 'this star'}
      </button>
    </div>
  )
}

function InfoRow({ label, value }) {
  if (value === null || value === undefined) return null
  return (
    <div className="flex justify-between">
      <span className="text-white/50">{label}</span>
      <span className="text-white/90 font-mono text-xs">{value}</span>
    </div>
  )
}

function formatDistance(ly) {
  if (!ly && ly !== 0) return null
  if (ly < 0.01) return `${(ly * 63241).toFixed(0)} AU`
  if (ly < 100) return `${ly.toFixed(2)} LY`
  if (ly < 1e6) return `${ly.toLocaleString(undefined, { maximumFractionDigits: 0 })} LY`
  return `${(ly / 1e6).toFixed(2)} MLY`
}

function formatNumber(n) {
  if (n === null || n === undefined) return null
  if (n < 0.01) return n.toExponential(2)
  if (n < 100) return n.toFixed(2)
  if (n < 1e6) return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return n.toExponential(2)
}
