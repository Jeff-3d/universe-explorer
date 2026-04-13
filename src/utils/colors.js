/**
 * Color utilities for stellar visualization.
 *
 * Maps star temperatures to physically-accurate blackbody colors
 * using Tanner Helland's approximation algorithm.
 */

/**
 * Convert effective temperature (Kelvin) to RGB hex color string.
 * Uses Tanner Helland's blackbody color approximation.
 */
export function temperatureToColor(temp) {
  if (!temp || temp <= 0) return '#ffffff'

  temp = Math.max(1000, Math.min(40000, temp))
  const t = temp / 100

  let r, g, b

  // Red
  if (t <= 66) {
    r = 255
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592)
    r = Math.max(0, Math.min(255, r))
  }

  // Green
  if (t <= 66) {
    g = 99.4708025861 * Math.log(t) - 161.1195681661
    g = Math.max(0, Math.min(255, g))
  } else {
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492)
    g = Math.max(0, Math.min(255, g))
  }

  // Blue
  if (t >= 66) {
    b = 255
  } else if (t <= 19) {
    b = 0
  } else {
    b = 138.5177312231 * Math.log(t - 10) - 305.0447927307
    b = Math.max(0, Math.min(255, b))
  }

  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`
}

/**
 * Convert hex color string to r,g,b floats (0-1) for Three.js.
 */
export function hexToRGBFloat(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 1, g: 1, b: 1 }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  }
}

/**
 * Spectral type class to approximate temperature.
 */
const SPECTRAL_TEMPS = {
  O: 35000, B: 20000, A: 8500, F: 6500,
  G: 5500, K: 4000, M: 3200, L: 1800,
  T: 1200, Y: 500,
}

/**
 * Convert spectral type string (e.g., "G2V") to approximate temperature.
 */
export function spectralToTemperature(spect) {
  if (!spect || spect.length === 0) return null

  // Try subtype (e.g., G2)
  if (spect.length >= 2 && spect[1] >= '0' && spect[1] <= '9') {
    const letter = spect[0].toUpperCase()
    const sub = parseInt(spect[1])
    const baseTemp = SPECTRAL_TEMPS[letter]
    if (baseTemp) {
      const classes = Object.keys(SPECTRAL_TEMPS)
      const idx = classes.indexOf(letter)
      const nextTemp = idx + 1 < classes.length ? SPECTRAL_TEMPS[classes[idx + 1]] : baseTemp * 0.6
      return baseTemp - (baseTemp - nextTemp) * (sub / 10)
    }
  }

  // Fall back to class letter
  const letter = spect[0].toUpperCase()
  return SPECTRAL_TEMPS[letter] || null
}
