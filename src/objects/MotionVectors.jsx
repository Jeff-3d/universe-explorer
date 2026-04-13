import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Renders motion vector arrows for nearby stars.
 *
 * Shows the direction and relative speed of stellar proper motion
 * as thin lines extending from each star. Only renders for stars
 * near the camera to avoid overwhelming the view.
 */

const MAX_VECTORS = 500
const SHOW_DISTANCE = 100 // scene units — only show vectors for nearby stars

function logCompress(x, y, z) {
  const dist = Math.sqrt(x * x + y * y + z * z)
  if (dist < 0.001) return new THREE.Vector3(0, 0, 0)
  const logDist = Math.log(1 + dist) * 15.0
  const scale = logDist / dist
  return new THREE.Vector3(x * scale, y * scale, z * scale)
}

export default function MotionVectors() {
  const stars = useStore((s) => s.stars)
  const scaleMode = useStore((s) => s.scaleMode)
  const showMotionVectors = useStore((s) => s.showMotionVectors)
  const starsVisible = useStore((s) => s.filters.stars)
  const { camera } = useThree()

  const linesRef = useRef()
  const nearestRef = useRef([])

  // Pre-allocate line geometry
  const geometry = useMemo(() => {
    const positions = new Float32Array(MAX_VECTORS * 6) // 2 vertices per line
    const colors = new Float32Array(MAX_VECTORS * 6)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setDrawRange(0, 0)
    return geo
  }, [])

  useFrame(() => {
    if (!linesRef.current || !stars || !showMotionVectors || !starsVisible) {
      if (linesRef.current) linesRef.current.visible = false
      return
    }

    linesRef.current.visible = true
    const camPos = camera.position

    // Find stars with velocity data near the camera (every 30 frames)
    const frameCheck = Math.floor(performance.now() / 500) // every 0.5s
    if (frameCheck !== nearestRef.current._lastCheck) {
      nearestRef.current._lastCheck = frameCheck

      const candidates = []
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i]
        if (!star.vx && !star.vy && !star.vz) continue

        let sx, sy, sz
        if (scaleMode === 'log') {
          const c = logCompress(star.x, star.y, star.z)
          sx = c.x; sy = c.y; sz = c.z
        } else {
          sx = star.x; sy = star.y; sz = star.z
        }

        const dx = camPos.x - sx
        const dy = camPos.y - sy
        const dz = camPos.z - sz
        const distSq = dx * dx + dy * dy + dz * dz

        if (distSq < SHOW_DISTANCE * SHOW_DISTANCE) {
          candidates.push({ star, sx, sy, sz, distSq })
        }
      }

      candidates.sort((a, b) => a.distSq - b.distSq)
      nearestRef.current = candidates.slice(0, MAX_VECTORS)
    }

    // Update line positions
    const positions = geometry.attributes.position.array
    const colors = geometry.attributes.color.array
    const entries = nearestRef.current
    let drawCount = 0

    for (let i = 0; i < entries.length && i < MAX_VECTORS; i++) {
      const { star, sx, sy, sz } = entries[i]
      const idx = i * 6

      // Start point: star position
      positions[idx] = sx
      positions[idx + 1] = sy
      positions[idx + 2] = sz

      // End point: velocity direction, scaled for visibility
      // Convert km/s to a visible arrow length
      const vel = Math.sqrt(
        (star.vx || 0) ** 2 + (star.vy || 0) ** 2 + (star.vz || 0) ** 2
      )
      const arrowScale = Math.min(5, Math.log10(vel + 1) * 2)

      // Velocity direction in Cartesian
      const vx = (star.vx || 0)
      const vy = (star.vy || 0)
      const vz = (star.vz || 0)

      if (vel > 0.1) {
        positions[idx + 3] = sx + (vx / vel) * arrowScale
        positions[idx + 4] = sy + (vy / vel) * arrowScale
        positions[idx + 5] = sz + (vz / vel) * arrowScale
      } else {
        positions[idx + 3] = sx
        positions[idx + 4] = sy
        positions[idx + 5] = sz
      }

      // Color: speed mapped from cyan (slow) to yellow (fast)
      const speedNorm = Math.min(1, vel / 200) // 200 km/s = max
      const r = speedNorm
      const g = 0.8
      const b = 1 - speedNorm * 0.7

      colors[idx] = r; colors[idx + 1] = g; colors[idx + 2] = b
      colors[idx + 3] = r * 0.3; colors[idx + 4] = g * 0.3; colors[idx + 5] = b * 0.3

      drawCount++
    }

    geometry.setDrawRange(0, drawCount * 2)
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
  })

  if (!showMotionVectors || !starsVisible) return null

  return (
    <lineSegments ref={linesRef} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  )
}
