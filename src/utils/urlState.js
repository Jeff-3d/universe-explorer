/**
 * URL state encoding/decoding for shareable views.
 *
 * Encodes camera position, orientation, selected object, and filters
 * into a compact URL hash that can be shared with others.
 */

/**
 * Encode current view state into URL hash.
 */
export function encodeViewState(camera, selectedObjectId, speedLevel) {
  const state = {
    p: [
      camera.position.x.toFixed(2),
      camera.position.y.toFixed(2),
      camera.position.z.toFixed(2),
    ],
    q: [
      camera.quaternion.x.toFixed(4),
      camera.quaternion.y.toFixed(4),
      camera.quaternion.z.toFixed(4),
      camera.quaternion.w.toFixed(4),
    ],
    s: speedLevel,
  }

  if (selectedObjectId) {
    state.o = selectedObjectId
  }

  return btoa(JSON.stringify(state))
}

/**
 * Decode view state from URL hash.
 * @returns {Object|null} Decoded state or null if invalid
 */
export function decodeViewState(hash) {
  try {
    const json = atob(hash)
    const state = JSON.parse(json)

    if (!state.p || !Array.isArray(state.p)) return null

    return {
      position: {
        x: parseFloat(state.p[0]),
        y: parseFloat(state.p[1]),
        z: parseFloat(state.p[2]),
      },
      quaternion: state.q ? {
        x: parseFloat(state.q[0]),
        y: parseFloat(state.q[1]),
        z: parseFloat(state.q[2]),
        w: parseFloat(state.q[3]),
      } : null,
      speedLevel: state.s || 0,
      selectedObjectId: state.o || null,
    }
  } catch {
    return null
  }
}

/**
 * Update browser URL with view state.
 */
export function pushViewState(encoded) {
  window.history.replaceState(null, '', `#${encoded}`)
}

/**
 * Get view state from current URL.
 */
export function getViewStateFromURL() {
  const hash = window.location.hash.slice(1)
  if (!hash) return null
  return decodeViewState(hash)
}
