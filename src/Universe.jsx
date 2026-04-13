import { OrbitControls } from '@react-three/drei'
import StarField from './objects/StarField'
import { useCatalog } from './hooks/useCatalog'

/**
 * Root Three.js scene component.
 *
 * Contains all 3D objects and controls. Rendered inside the R3F Canvas.
 * OrbitControls are temporary — will be replaced with custom flight
 * controls in Phase 6.
 */
export default function Universe() {
  // Trigger catalog loading
  useCatalog()

  return (
    <>
      {/* Minimal ambient light — space is dark */}
      <ambientLight intensity={0.1} />

      {/* Star field: 109K stars as a single Points draw call */}
      <StarField />

      {/* Orbit controls (temporary, replaced by flight controls in Phase 6) */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={0.1}
        maxDistance={100000}
        zoomSpeed={2}
        rotateSpeed={0.5}
      />
    </>
  )
}
