import { useStore } from '../store'

/**
 * Size comparison display for selected objects.
 *
 * When an object is selected, shows contextual size comparisons
 * like "X Earths would fit inside this star" or physical dimensions.
 */

const EARTH_RADIUS_SOLAR = 0.00916 // Earth radius in solar radii
const SUN_RADIUS_KM = 695700
const EARTH_RADIUS_KM = 6371

function formatNumber(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toFixed(n < 10 ? 1 : 0)
}

export default function SizeComparison() {
  const selectedObject = useStore((s) => s.selectedObject)

  if (!selectedObject) return null

  const comparisons = []
  const type = selectedObject._type

  if (!type || type === undefined) {
    // It's a star
    const radius = selectedObject.radius // in solar radii
    if (radius) {
      const radiusKm = radius * SUN_RADIUS_KM
      const earthsFit = Math.pow(radius / EARTH_RADIUS_SOLAR, 3)
      const sunsFit = Math.pow(radius, 3)

      comparisons.push(`Radius: ${formatNumber(radiusKm)} km`)

      if (radius > 1.1) {
        comparisons.push(`${formatNumber(earthsFit)} Earths would fit inside`)
        if (radius > 10) {
          comparisons.push(`${formatNumber(sunsFit)} Suns would fit inside`)
        }
      } else if (radius < 0.9) {
        comparisons.push(`${(radius * 100).toFixed(0)}% the size of our Sun`)
      }

      // Habitability context
      if (selectedObject.luminosity) {
        const hzInner = Math.sqrt(selectedObject.luminosity / 1.1)
        const hzOuter = Math.sqrt(selectedObject.luminosity / 0.53)
        comparisons.push(`Habitable zone: ${hzInner.toFixed(2)} - ${hzOuter.toFixed(2)} AU`)
      }
    }
  } else if (type === 'galaxy') {
    const major = selectedObject.major_axis
    if (major) {
      // Angular size in arcminutes → estimate physical size
      const dist = selectedObject.distance_ly
      if (dist) {
        const sizeKpc = (major / 60) * (Math.PI / 180) * (dist / 3261.56) // parsecs
        const sizeLY = sizeKpc * 3261.56
        if (sizeLY > 1000) {
          comparisons.push(`~${formatNumber(sizeLY)} LY across`)
          const mwRatio = sizeLY / 100000
          if (mwRatio > 0.1) {
            comparisons.push(`${(mwRatio * 100).toFixed(0)}% the size of the Milky Way`)
          }
        }
      }
    }
  } else if (type === 'exoplanet') {
    const pRadius = selectedObject.planet_radius
    const pMass = selectedObject.planet_mass

    if (pRadius) {
      const radiusKm = pRadius * EARTH_RADIUS_KM
      comparisons.push(`Radius: ${formatNumber(radiusKm)} km (${pRadius.toFixed(2)} Earths)`)
    }
    if (pMass) {
      comparisons.push(`Mass: ${pMass.toFixed(2)} Earths`)
    }
    if (selectedObject.equilibrium_temp) {
      const t = selectedObject.equilibrium_temp
      if (t > 500) comparisons.push('Surface: molten/volcanic')
      else if (t > 350) comparisons.push('Surface: too hot for liquid water')
      else if (t > 200) comparisons.push('Surface: potentially habitable')
      else comparisons.push('Surface: frozen')
    }
  }

  if (comparisons.length === 0) return null

  return (
    <div className="mt-2 space-y-0.5">
      {comparisons.map((text, i) => (
        <p key={i} className="text-[11px] text-white/40 leading-tight">
          {text}
        </p>
      ))}
    </div>
  )
}
