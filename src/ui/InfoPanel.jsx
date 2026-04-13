import { useStore } from '../store'
import SizeComparison from './SizeComparison'

/**
 * Slide-in panel showing details of the selected celestial object.
 * Adapts display based on object type (star, galaxy, nebula, cluster, exoplanet).
 */
export default function InfoPanel() {
  const selectedObject = useStore((s) => s.selectedObject)
  const setSelectedObject = useStore((s) => s.setSelectedObject)
  const setCameraTarget = useStore((s) => s.setCameraTarget)

  if (!selectedObject) return null

  const obj = selectedObject
  const objType = obj._type || 'star'

  return (
    <div className="absolute top-4 right-4 w-80 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg p-4 z-20 pointer-events-auto text-white/90 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold leading-tight">
            {obj.common_name || obj.name || obj.id}
          </h2>
          {(obj.common_name || obj.name) && (
            <p className="text-xs text-white/40 mt-0.5">{obj.id}</p>
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
          style={{ backgroundColor: obj.color || '#fff' }}
        />
        <span className="text-xs uppercase tracking-wider text-white/60">
          {formatTypeBadge(obj, objType)}
        </span>
        {obj.constellation && (
          <span className="text-xs text-white/40">
            &middot; {obj.constellation}
          </span>
        )}
      </div>

      {/* Properties — type-specific */}
      <div className="space-y-1.5 text-sm">
        <InfoRow label="Distance" value={formatDistance(obj.distance_ly)} />

        {objType === 'star' && <StarDetails obj={obj} />}
        {objType === 'galaxy' && <GalaxyDetails obj={obj} />}
        {objType === 'nebula' && <NebulaDetails obj={obj} />}
        {objType === 'cluster' && <ClusterDetails obj={obj} />}
        {objType === 'exoplanet' && <ExoplanetDetails obj={obj} />}

        <InfoRow label="RA" value={obj.ra ? `${obj.ra.toFixed(4)}\u00b0` : null} />
        <InfoRow label="Dec" value={obj.dec ? `${obj.dec.toFixed(4)}\u00b0` : null} />
      </div>

      {/* Size comparisons */}
      <SizeComparison />

      {/* Travel button */}
      <button
        onClick={() => setCameraTarget(obj)}
        className="mt-4 w-full py-2 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-sm transition-colors"
      >
        Travel to {obj.common_name || obj.name || 'this object'}
      </button>
    </div>
  )
}

function StarDetails({ obj }) {
  return (
    <>
      <InfoRow label="Apparent mag" value={obj.magnitude?.toFixed(2)} />
      <InfoRow label="Absolute mag" value={obj.abs_magnitude?.toFixed(2)} />
      <InfoRow label="Temperature" value={obj.temperature ? `${obj.temperature.toLocaleString()} K` : null} />
      <InfoRow label="Luminosity" value={obj.luminosity ? `${formatNumber(obj.luminosity)} L\u2609` : null} />
      <InfoRow label="Radius" value={obj.radius ? `${formatNumber(obj.radius)} R\u2609` : null} />
      <InfoRow label="Mass" value={obj.mass ? `${formatNumber(obj.mass)} M\u2609` : null} />
      {(obj.vx || obj.vy || obj.vz) && (
        <InfoRow
          label="Velocity"
          value={`(${obj.vx?.toFixed(1)}, ${obj.vy?.toFixed(1)}, ${obj.vz?.toFixed(1)}) km/s`}
        />
      )}
    </>
  )
}

function GalaxyDetails({ obj }) {
  return (
    <>
      <InfoRow label="Magnitude" value={obj.magnitude?.toFixed(2)} />
      <InfoRow label="Morphology" value={obj.morphology} />
      <InfoRow label="Type" value={obj.object_type?.replace('_', ' ')} />
      <InfoRow label="Redshift" value={obj.redshift?.toFixed(6)} />
      <InfoRow label="Size" value={formatAngularSize(obj.major_axis, obj.minor_axis)} />
      <InfoRow label="Surface brightness" value={obj.surface_brightness?.toFixed(2)} />
    </>
  )
}

function NebulaDetails({ obj }) {
  return (
    <>
      <InfoRow label="Magnitude" value={obj.magnitude?.toFixed(2)} />
      <InfoRow label="Type" value={obj.object_type?.replace(/_/g, ' ')} />
      <InfoRow label="Size" value={formatAngularSize(obj.major_axis, obj.minor_axis)} />
      <InfoRow label="Surface brightness" value={obj.surface_brightness?.toFixed(2)} />
    </>
  )
}

function ClusterDetails({ obj }) {
  return (
    <>
      <InfoRow label="Magnitude" value={obj.magnitude?.toFixed(2)} />
      <InfoRow label="Type" value={obj.object_type?.replace(/_/g, ' ')} />
      <InfoRow label="Size" value={formatAngularSize(obj.major_axis, obj.minor_axis)} />
    </>
  )
}

function ExoplanetDetails({ obj }) {
  return (
    <>
      <InfoRow label="Host star" value={obj.host_star} />
      <InfoRow label="Radius" value={obj.planet_radius ? `${obj.planet_radius.toFixed(2)} R\u2295` : null} />
      <InfoRow label="Mass" value={obj.planet_mass ? `${formatNumber(obj.planet_mass)} M\u2295` : null} />
      <InfoRow label="Eq. temp" value={obj.equilibrium_temp ? `${obj.equilibrium_temp.toLocaleString()} K` : null} />
      <InfoRow label="Orbital period" value={obj.orbital_period ? `${formatNumber(obj.orbital_period)} days` : null} />
      <InfoRow label="Semi-major axis" value={obj.semi_major_axis ? `${obj.semi_major_axis.toFixed(4)} AU` : null} />
      <InfoRow label="Eccentricity" value={obj.eccentricity?.toFixed(4)} />
      <InfoRow label="Discovery" value={obj.discovery_method ? `${obj.discovery_method}${obj.discovery_year ? ` (${obj.discovery_year})` : ''}` : null} />
      {obj.in_habitable_zone !== null && obj.in_habitable_zone !== undefined && (
        <InfoRow
          label="Habitable zone"
          value={
            <span className={obj.in_habitable_zone ? 'text-green-400' : 'text-red-400'}>
              {obj.in_habitable_zone ? 'Inside' : 'Outside'}
            </span>
          }
        />
      )}
    </>
  )
}

function formatTypeBadge(obj, type) {
  switch (type) {
    case 'star':
      return `Star${obj.spectral_type ? ` \u00b7 ${obj.spectral_type}` : ''}`
    case 'galaxy':
      return `Galaxy${obj.morphology ? ` \u00b7 ${obj.morphology}` : ''}`
    case 'nebula':
      return obj.object_type?.replace(/_/g, ' ') || 'Nebula'
    case 'cluster':
      return obj.object_type?.replace(/_/g, ' ') || 'Cluster'
    case 'exoplanet':
      return 'Exoplanet'
    default:
      return type
  }
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
  if (ly < 1e9) return `${(ly / 1e6).toFixed(2)} MLY`
  return `${(ly / 1e9).toFixed(2)} BLY`
}

function formatNumber(n) {
  if (n === null || n === undefined) return null
  if (n < 0.01) return n.toExponential(2)
  if (n < 100) return n.toFixed(2)
  if (n < 1e6) return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return n.toExponential(2)
}

function formatAngularSize(major, minor) {
  if (!major) return null
  if (minor) return `${major.toFixed(1)}' × ${minor.toFixed(1)}'`
  return `${major.toFixed(1)}'`
}
