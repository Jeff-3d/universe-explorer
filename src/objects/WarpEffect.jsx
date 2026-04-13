import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Warp speed visual effect.
 *
 * Renders star-streak lines radiating from the direction of travel
 * when moving at high speeds. At extreme speeds (>1Mc), adds a
 * tunnel-like vortex effect.
 *
 * Speed levels and effects:
 *  - 0-2 (1c-100c): No effect
 *  - 3-4 (1Kc-10Kc): Subtle streaks begin
 *  - 5-6 (100Kc-1Mc): Full streaks, slight blue shift ahead
 *  - 7-9 (10Mc-1Gc): Warp tunnel, intense streaks, strong color shift
 */

const NUM_STREAKS = 300
const STREAK_RADIUS = 200

export default function WarpEffect() {
  const speedLevel = useStore((s) => s.speedLevel)
  const { camera } = useThree()
  const linesRef = useRef()
  const positionsRef = useRef(null)
  const velocitiesRef = useRef(null)

  // Initialize streak particles in a cylinder around the camera
  const { geometry, basePositions } = useMemo(() => {
    const positions = new Float32Array(NUM_STREAKS * 6) // 2 vertices per line
    const colors = new Float32Array(NUM_STREAKS * 6)    // RGB per vertex
    const vels = new Float32Array(NUM_STREAKS * 3)

    for (let i = 0; i < NUM_STREAKS; i++) {
      // Random position in a cylinder around origin
      const angle = Math.random() * Math.PI * 2
      const radius = 2 + Math.random() * STREAK_RADIUS
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const z = (Math.random() - 0.5) * STREAK_RADIUS * 2

      // Start and end of line (initially same point)
      const idx = i * 6
      positions[idx] = x
      positions[idx + 1] = y
      positions[idx + 2] = z
      positions[idx + 3] = x
      positions[idx + 4] = y
      positions[idx + 5] = z

      // Velocity (toward camera / past camera)
      vels[i * 3] = 0
      vels[i * 3 + 1] = 0
      vels[i * 3 + 2] = -(0.5 + Math.random() * 1.5) // toward camera (negative z)

      // Color: white-blue streaks
      const brightness = 0.5 + Math.random() * 0.5
      const blueShift = 0.3 + Math.random() * 0.4
      colors[idx] = brightness * (1 - blueShift * 0.3)
      colors[idx + 1] = brightness * (1 - blueShift * 0.1)
      colors[idx + 2] = brightness
      colors[idx + 3] = brightness * 0.3 // tail is dimmer
      colors[idx + 4] = brightness * 0.3
      colors[idx + 5] = brightness * 0.5
    }

    velocitiesRef.current = vels
    positionsRef.current = new Float32Array(positions)

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return { geometry: geo, basePositions: new Float32Array(positions) }
  }, [])

  useFrame((state, delta) => {
    if (!linesRef.current) return

    // Only show at speed level 3+
    const effectIntensity = Math.max(0, (speedLevel - 2) / 7) // 0 at level 2, 1 at level 9
    linesRef.current.visible = effectIntensity > 0

    if (effectIntensity <= 0) return

    // Position the effect group at the camera
    linesRef.current.position.copy(camera.position)
    linesRef.current.quaternion.copy(camera.quaternion)

    // Animate streaks
    const positions = geometry.attributes.position.array
    const vels = velocitiesRef.current
    const streakLength = 2 + effectIntensity * 40 // longer streaks at higher speeds
    const speed = 20 + effectIntensity * 200

    for (let i = 0; i < NUM_STREAKS; i++) {
      const idx = i * 6

      // Move the front vertex along its velocity
      positions[idx + 3] += vels[i * 3] * speed * delta
      positions[idx + 4] += vels[i * 3 + 1] * speed * delta
      positions[idx + 5] += vels[i * 3 + 2] * speed * delta

      // Trail vertex follows at streak length behind
      const dx = positions[idx + 3] - positions[idx]
      const dy = positions[idx + 4] - positions[idx + 1]
      const dz = positions[idx + 5] - positions[idx + 2]
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (len > streakLength) {
        const scale = streakLength / len
        positions[idx] = positions[idx + 3] - dx * scale
        positions[idx + 1] = positions[idx + 4] - dy * scale
        positions[idx + 2] = positions[idx + 5] - dz * scale
      }

      // Reset streaks that have passed behind the camera
      if (positions[idx + 5] < -STREAK_RADIUS) {
        const angle = Math.random() * Math.PI * 2
        const radius = 2 + Math.random() * STREAK_RADIUS
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        const z = STREAK_RADIUS

        positions[idx] = x
        positions[idx + 1] = y
        positions[idx + 2] = z
        positions[idx + 3] = x
        positions[idx + 4] = y
        positions[idx + 5] = z
      }
    }

    geometry.attributes.position.needsUpdate = true

    // Opacity based on intensity
    linesRef.current.material.opacity = effectIntensity * 0.7
  })

  return (
    <lineSegments ref={linesRef} geometry={geometry} visible={false} frustumCulled={false}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  )
}
