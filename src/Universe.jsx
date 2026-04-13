import { useRef, useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import StarField from './objects/StarField'
import { useCatalog } from './hooks/useCatalog'
import { useCamera } from './hooks/useCamera'
import { useStore } from './store'

/**
 * Root Three.js scene component.
 *
 * Contains all 3D objects and controls. Rendered inside the R3F Canvas.
 * OrbitControls are temporary — will be replaced with custom flight
 * controls in Phase 6.
 */
export default function Universe() {
  const controlsRef = useRef()
  const setOrbitControlsRef = useStore((s) => s.setOrbitControlsRef)

  // Trigger catalog loading
  useCatalog()

  // Fly-to camera animation
  useCamera()

  // Share OrbitControls ref with the camera hook
  useEffect(() => {
    if (controlsRef.current) {
      setOrbitControlsRef(controlsRef.current)
    }
  }, [setOrbitControlsRef])

  return (
    <>
      {/* Minimal ambient light — space is dark */}
      <ambientLight intensity={0.1} />

      {/* Star field: 109K stars as a single Points draw call */}
      <StarField />

      {/* Orbit controls (temporary, replaced by flight controls in Phase 6) */}
      <OrbitControls
        ref={controlsRef}
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
