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
