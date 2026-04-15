import { useStore } from '../store'

/**
 * Small floating toggle that pins the camera's orbit target to the origin,
 * so left-drag rotates the entire scene around (0, 0, 0) instead of panning.
 *
 * Press `O` or click the button. Any WASD movement exits orbit mode.
 */
export default function OrbitToggle() {
  const orbitTarget = useStore((s) => s.orbitTarget)
  const setOrbitTarget = useStore((s) => s.setOrbitTarget)

  const isOriginOrbit = !!(orbitTarget && orbitTarget.x === 0 && orbitTarget.y === 0 && orbitTarget.z === 0)

  const toggle = () => {
    if (isOriginOrbit) setOrbitTarget(null)
    else setOrbitTarget({ x: 0, y: 0, z: 0 })
  }

  return (
    <button
      onClick={toggle}
      title="Rotate the scene around its center (hotkey: O). Drag to spin, WASD to exit."
      className={`absolute pointer-events-auto z-10 rounded px-3 py-1 text-xs border transition-colors ${
        isOriginOrbit
          ? 'bg-blue-500/30 border-blue-400/40 text-white/90'
          : 'bg-black/40 border-white/10 text-white/50 hover:text-white/80'
      }`}
      style={{ bottom: '60px', right: '80px' }}
    >
      {isOriginOrbit ? 'Orbit: On (drag to spin)' : 'Orbit View'}
    </button>
  )
}
