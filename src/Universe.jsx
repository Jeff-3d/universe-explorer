import { useCallback } from 'react'
import StarField from './objects/StarField'
import ObjectField from './objects/ObjectField'
import { useCatalog } from './hooks/useCatalog'
import { useCamera } from './hooks/useCamera'
import { useFlightControls } from './hooks/useFlightControls'
import { useStore } from './store'

/**
 * Root Three.js scene component.
 *
 * Contains all 3D objects and the custom flight controller.
 */
export default function Universe() {
  const setSelectedObject = useStore((s) => s.setSelectedObject)

  // Object data
  const galaxies = useStore((s) => s.galaxies)
  const nebulae = useStore((s) => s.nebulae)
  const clusters = useStore((s) => s.clusters)
  const exoplanets = useStore((s) => s.exoplanets)
  const scaleMode = useStore((s) => s.scaleMode)

  // Filter visibility
  const galaxiesVisible = useStore((s) => s.filters.galaxies)
  const nebulaeVisible = useStore((s) => s.filters.nebulae)
  const clustersVisible = useStore((s) => s.filters.clusters)
  const exoplanetsVisible = useStore((s) => s.filters.exoplanets)

  // Trigger catalog loading
  useCatalog()

  // Flight controls (WASD + mouse look + scroll speed)
  useFlightControls()

  // Fly-to camera animation
  useCamera()

  const onSelect = useCallback((obj) => {
    setSelectedObject(obj)
  }, [setSelectedObject])

  return (
    <>
      {/* Minimal ambient light — space is dark */}
      <ambientLight intensity={0.1} />

      {/* Star field: 109K stars as a single Points draw call */}
      <StarField />

      {/* Galaxies: 10K+ as purple-tinted points */}
      <ObjectField
        objects={galaxies}
        visible={galaxiesVisible}
        scaleMode={scaleMode}
        onSelect={onSelect}
        baseSize={5}
      />

      {/* Nebulae: ~430 as pink/red points */}
      <ObjectField
        objects={nebulae}
        visible={nebulaeVisible}
        scaleMode={scaleMode}
        onSelect={onSelect}
        baseSize={6}
      />

      {/* Clusters: ~918 as blue points */}
      <ObjectField
        objects={clusters}
        visible={clustersVisible}
        scaleMode={scaleMode}
        onSelect={onSelect}
        baseSize={4}
      />

      {/* Exoplanets: ~6K as green points */}
      <ObjectField
        objects={exoplanets}
        visible={exoplanetsVisible}
        scaleMode={scaleMode}
        onSelect={onSelect}
        baseSize={2}
      />
    </>
  )
}
