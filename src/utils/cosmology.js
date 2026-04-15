/**
 * Cosmology utilities for ΛCDM model.
 *
 * Used by the cosmic web and CMB wall to compute comoving distances
 * and map between real-space and scene-space coordinates.
 */

// Cosmological parameters (Planck 2018)
export const H0 = 67.4        // km/s/Mpc
export const OMEGA_M = 0.315  // Matter density
export const OMEGA_L = 0.685  // Dark energy density

// Hubble constant converted to inverse years (for scale factor math)
// H0 [km/s/Mpc] × (1 Mpc / 3.086e19 km) × (3.156e7 s/yr) ≈ 6.89e-11 /yr for H0=67.4
const H0_PER_YEAR = H0 * 3.156e7 / 3.086e19

/**
 * Cosmological scale factor at a given time offset.
 *
 * Linear (first-order) approximation valid within ~±1 Gyr:
 *   a(t)/a_now ≈ 1 + H₀·Δt
 *
 * Past → smaller factor (galaxies closer). Future → larger (farther).
 * Clamped to a minimum of 0.01 so the Big Bang doesn't collapse to zero.
 */
export function cosmologicalScaleFactor(timeOffsetYears) {
  if (!timeOffsetYears) return 1
  return Math.max(0.01, 1 + H0_PER_YEAR * timeOffsetYears)
}

// Observable universe radius in light-years (comoving)
export const OBSERVABLE_RADIUS_LY = 46.5e9

// Log compression matching the rest of the scene
export function logCompressDistance(distLY) {
  return Math.log(1 + distLY) * 15.0
}

// Scene-space radius of the observable universe
export const OBSERVABLE_RADIUS_SCENE = logCompressDistance(OBSERVABLE_RADIUS_LY)
// ≈ 368 scene units

// Scale thresholds in scene units for LOD transitions
export const COSMIC_WEB_THRESHOLD = logCompressDistance(5e6)   // ~227 — cosmic web fades in
export const CMB_THRESHOLD = logCompressDistance(1e9)           // ~311 — CMB wall fades in
