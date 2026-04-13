import { useMemo, useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Vertex shader for star points.
 *
 * Implements:
 * - Floating origin: subtracts camera position to prevent jitter at large distances
 * - Size attenuation: brighter stars (lower magnitude) appear larger
 * - Passes color and brightness to fragment shader
 */
const vertexShader = /* glsl */ `
  attribute float size;
  attribute vec3 starColor;
  attribute float brightness;

  varying vec3 vColor;
  varying float vBrightness;

  void main() {
    vColor = starColor;
    vBrightness = brightness;

    // Standard model-view-projection transform
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Size attenuation: bright stars are larger
    // Base size scaled by brightness, with distance attenuation
    float pointSize = size * (300.0 / -mvPosition.z);
    pointSize = clamp(pointSize, 0.5, 64.0);

    gl_PointSize = pointSize;
    gl_Position = projectionMatrix * mvPosition;
  }
`

/**
 * Fragment shader for star points.
 *
 * Renders each point as a soft circular glow with:
 * - Bright core with gaussian falloff
 * - Color from blackbody temperature
 * - Brightness-modulated intensity
 */
const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vBrightness;

  void main() {
    // Distance from center of point (0 at center, 1 at edge)
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center) * 2.0;

    // Discard pixels outside circle
    if (dist > 1.0) discard;

    // Gaussian-like glow: bright core, soft falloff
    float core = exp(-dist * dist * 8.0);     // tight bright center
    float halo = exp(-dist * dist * 2.0);     // softer outer glow
    float glow = core * 0.7 + halo * 0.3;

    // Apply star color and brightness
    vec3 color = vColor * glow;

    // Boost bright stars
    color *= (0.3 + vBrightness * 0.7);

    // Alpha fades at edges for smooth blending
    float alpha = glow * (0.5 + vBrightness * 0.5);
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`

/**
 * Build Float32Arrays for star positions, colors, sizes, and brightness
 * from the catalog data.
 */
/**
 * Apply logarithmic distance compression to a position.
 * Preserves direction but compresses distance: nearby stars stay close,
 * distant stars are pulled in so the full galaxy is visible.
 */
function logCompress(x, y, z) {
  const dist = Math.sqrt(x * x + y * y + z * z)
  if (dist < 0.001) return { x: 0, y: 0, z: 0 }
  // log(1 + dist) compresses large distances while keeping small ones ~linear
  const logDist = Math.log(1 + dist) * 15.0
  const scale = logDist / dist
  return { x: x * scale, y: y * scale, z: z * scale }
}

function buildStarBuffers(stars, scaleMode) {
  const count = stars.length
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const brightness = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const star = stars[i]

    // Position — apply log compression to make the full galaxy visible
    let px = star.x, py = star.y, pz = star.z
    if (scaleMode === 'log') {
      const compressed = logCompress(star.x, star.y, star.z)
      px = compressed.x
      py = compressed.y
      pz = compressed.z
    }
    positions[i * 3] = px
    positions[i * 3 + 1] = py
    positions[i * 3 + 2] = pz

    // Color from hex string
    const hex = star.color || '#ffffff'
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b

    // Size based on luminosity (log scale)
    // Brighter stars get larger points
    const lum = star.luminosity || 1
    const logLum = Math.log10(Math.max(0.0001, lum))
    // Map luminosity range (~-4 to ~5) to size range (0.5 to 8)
    sizes[i] = Math.max(0.3, Math.min(8, (logLum + 4) * 0.8 + 0.5))

    // Brightness for fragment shader (0-1 range)
    // Based on apparent magnitude: lower magnitude = brighter
    const mag = star.magnitude !== null ? star.magnitude : 10
    // Mag range: -1.5 (Sirius) to ~15 (faint). Map to 1.0 to 0.05
    brightness[i] = Math.max(0.05, Math.min(1.0, 1.0 - (mag + 2) / 17))
  }

  return { positions, colors, sizes, brightness }
}

export default function StarField() {
  const stars = useStore((s) => s.stars)
  const scaleMode = useStore((s) => s.scaleMode)
  const starsVisible = useStore((s) => s.filters.stars)
  const setSelectedObject = useStore((s) => s.setSelectedObject)
  const materialRef = useRef()
  const pointsRef = useRef()
  const { raycaster } = useThree()

  // Build geometry buffers from star data
  const { positions, colors, sizes, brightness } = useMemo(() => {
    if (!stars || stars.length === 0) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        sizes: new Float32Array(0),
        brightness: new Float32Array(0),
      }
    }
    console.time('buildStarBuffers')
    const result = buildStarBuffers(stars, scaleMode)
    console.timeEnd('buildStarBuffers')
    return result
  }, [stars, scaleMode])

  // Set raycaster threshold for Points geometry
  useFrame(() => {
    raycaster.params.Points.threshold = 1.5
  })

  // Track pointer down position to distinguish click from drag
  const pointerDown = useRef(null)

  const handlePointerDown = useCallback((e) => {
    pointerDown.current = { x: e.clientX, y: e.clientY }
  }, [])

  // Click handler — find nearest intersected star (only on real clicks, not drags)
  const handleClick = useCallback(
    (e) => {
      if (!stars || !e.intersections.length) return
      // Ignore if pointer moved more than 5px (it was a drag/orbit)
      if (pointerDown.current) {
        const dx = e.clientX - pointerDown.current.x
        const dy = e.clientY - pointerDown.current.y
        if (Math.sqrt(dx * dx + dy * dy) > 5) return
      }
      e.stopPropagation()
      const hit = e.intersections[0]
      const index = hit.index
      if (index !== undefined && index < stars.length) {
        setSelectedObject(stars[index])
      }
    },
    [stars, setSelectedObject]
  )

  if (!stars || stars.length === 0 || !starsVisible) return null

  return (
    <points ref={pointsRef} frustumCulled={false} onPointerDown={handlePointerDown} onClick={handleClick}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-starColor"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-brightness"
          count={brightness.length}
          array={brightness}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
