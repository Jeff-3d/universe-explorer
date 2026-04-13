/**
 * Coordinate conversion utilities for astronomical data.
 *
 * Coordinate system:
 *   x = distance * cos(dec) * cos(ra)
 *   y = distance * cos(dec) * sin(ra)
 *   z = distance * sin(dec)
 *
 * Distances are in light-years. RA is in degrees (0-360), Dec in degrees (-90 to +90).
 */

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI
const PARSEC_TO_LY = 3.26156

/**
 * Convert RA (degrees), Dec (degrees), and distance (light-years) to Cartesian x,y,z.
 */
export function raDecDistToCartesian(raDeg, decDeg, distanceLY) {
  const raRad = raDeg * DEG_TO_RAD
  const decRad = decDeg * DEG_TO_RAD
  return {
    x: distanceLY * Math.cos(decRad) * Math.cos(raRad),
    y: distanceLY * Math.cos(decRad) * Math.sin(raRad),
    z: distanceLY * Math.sin(decRad),
  }
}

/**
 * Convert Cartesian x,y,z to RA (degrees), Dec (degrees), and distance (light-years).
 */
export function cartesianToRaDecDist(x, y, z) {
  const dist = Math.sqrt(x * x + y * y + z * z)
  if (dist === 0) return { ra: 0, dec: 0, distance: 0 }
  const dec = Math.asin(z / dist) * RAD_TO_DEG
  let ra = Math.atan2(y, x) * RAD_TO_DEG
  if (ra < 0) ra += 360
  return { ra, dec, distance: dist }
}

/**
 * Convert RA from hours (0-24) to degrees (0-360).
 */
export function raHoursToDeg(raHours) {
  return raHours * 15.0
}

/**
 * Convert parsecs to light-years.
 */
export function parsecToLY(parsecs) {
  return parsecs * PARSEC_TO_LY
}

/**
 * Compute distance between two 3D points in light-years.
 */
export function distance3D(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}
