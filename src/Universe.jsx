import { useCallback } from 'react'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import StarField from './objects/StarField'
import StarCloseup from './objects/StarCloseup'
import ObjectField from './objects/ObjectField'
import GalaxySprite from './objects/GalaxySprite'
import CosmicWeb from './objects/CosmicWeb'
import CMBWall from './objects/CMBWall'
import WarpEffect from './objects/WarpEffect'
import WarpTunnel from './objects/WarpTunnel'
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

      {/* Star close-up: detailed sphere when camera is near a star */}
      <StarCloseup />

      {/* Galaxies: 10K+ as purple-tinted points */}
      <ObjectField
        objects={galaxies}
        visible={galaxiesVisible}
        scaleMode={scaleMode}
        onSelect={onSelect}
        baseSize={5}
      />

      {/* Galaxy sprites: detailed billboards for nearby galaxies */}
      <GalaxySprite />

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

      {/* Cosmic web: large-scale filamentary structure */}
      <CosmicWeb />

      {/* CMB wall: observable universe boundary */}
      <CMBWall />

      {/* Warp speed effects */}
      <WarpEffect />
      <WarpTunnel />

      {/* Post-processing pipeline */}
      <EffectComposer>
        {/* Bloom: bright stars naturally glow */}
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.8}
          mipmapBlur
        />
        {/* Vignette: subtle edge darkening */}
        <Vignette
          offset={0.3}
          darkness={0.6}
          blendFunction={BlendFunction.NORMAL}
        />
        {/* Film grain: very subtle noise for cinematic feel */}
        <Noise
          premultiply
          blendFunction={BlendFunction.ADD}
          opacity={0.03}
        />
      </EffectComposer>
    </>
  )
}
