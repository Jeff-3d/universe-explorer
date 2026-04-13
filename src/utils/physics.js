/**
 * Physics utilities for position estimation and motion projection.
 *
 * Handles:
 * - Light-travel-time correction (estimated present positions)
 * - Proper motion projection (where will stars be in N years)
 * - Habitable zone computation
 */

const C_LY_PER_YEAR = 1.0 // Speed of light: 1 LY/year by definition
const KM_S_TO_LY_YEAR = 1.0 / 299792.458 * 365.25 * 24 * 3600 / (9.461e12)
// Actually: 1 km/s ≈ 1.022e-6 LY/year

/**
 * Compute estimated present position of a star.
 *
 * We observe stars as they were when their light left — for a star
 * 100 LY away, we see it as it was 100 years ago. If it has a known
 * velocity, we can estimate where it is "right now."
 *
 * @param {Object} star - Star with x, y, z (LY), vx, vy, vz (km/s), distance_ly
 * @returns {Object} { x, y, z } estimated present position in LY
 */
export function estimatePresentPosition(star) {
  if (!star.vx && !star.vy && !star.vz) {
    return { x: star.x, y: star.y, z: star.z }
  }

  const dist = star.distance_ly || Math.sqrt(star.x * star.x + star.y * star.y + star.z * star.z)
  const travelTimeYears = dist // Light travel time = distance in LY

  // Convert velocity from km/s to LY/year
  // 1 km/s ≈ 1.022e-6 LY/year
  const vxLY = (star.vx || 0) * 1.022e-6
  const vyLY = (star.vy || 0) * 1.022e-6
  const vzLY = (star.vz || 0) * 1.022e-6

  return {
    x: star.x + vxLY * travelTimeYears,
    y: star.y + vyLY * travelTimeYears,
    z: star.z + vzLY * travelTimeYears,
  }
}

/**
 * Project a star's position forward or backward in time.
 *
 * @param {Object} star - Star with x, y, z and velocity
 * @param {number} deltaYears - Years to project (positive = future, negative = past)
 * @returns {Object} { x, y, z } projected position
 */
export function projectPosition(star, deltaYears) {
  const vxLY = (star.vx || 0) * 1.022e-6
  const vyLY = (star.vy || 0) * 1.022e-6
  const vzLY = (star.vz || 0) * 1.022e-6

  return {
    x: star.x + vxLY * deltaYears,
    y: star.y + vyLY * deltaYears,
    z: star.z + vzLY * deltaYears,
  }
}

/**
 * Compute velocity magnitude from components.
 * @param {Object} star - Star with vx, vy, vz in km/s
 * @returns {number} Total velocity in km/s
 */
export function totalVelocity(star) {
  const vx = star.vx || 0
  const vy = star.vy || 0
  const vz = star.vz || 0
  return Math.sqrt(vx * vx + vy * vy + vz * vz)
}

/**
 * Compute habitable zone boundaries from stellar luminosity.
 * @param {number} luminosity - Stellar luminosity in solar luminosities
 * @returns {Object} { inner, outer } in AU
 */
export function habitableZone(luminosity) {
  if (!luminosity || luminosity <= 0) return { inner: 0.9, outer: 1.4 }
  return {
    inner: Math.sqrt(luminosity / 1.1),
    outer: Math.sqrt(luminosity / 0.53),
  }
}
