import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Constellation line patterns connecting stars.
 *
 * Draws traditional constellation stick-figure lines using stars
 * in the catalog that share constellation membership. Lines are
 * visible from near-Earth viewpoints and visibly distort as you
 * travel to other stars — showing that constellations are a
 * perspective illusion.
 *
 * Uses stars' constellation field to group and connect nearby stars
 * within each constellation by brightness.
 */

function logCompress(x, y, z) {
  const dist = Math.sqrt(x * x + y * y + z * z)
  if (dist < 0.001) return new THREE.Vector3(0, 0, 0)
  const logDist = Math.log(1 + dist) * 15.0
  const scale = logDist / dist
  return new THREE.Vector3(x * scale, y * scale, z * scale)
}

// Build constellation lines by connecting the brightest stars in each group
function buildConstellationLines(stars, scaleMode) {
  // Group stars by constellation
  const groups = {}
  for (const star of stars) {
    if (!star.constellation) continue
    const con = star.constellation
    if (!groups[con]) groups[con] = []
    groups[con].push(star)
  }

  const lines = []

  for (const [name, members] of Object.entries(groups)) {
    if (members.length < 2) continue

    // Sort by brightness (lower magnitude = brighter)
    members.sort((a, b) => (a.magnitude || 15) - (b.magnitude || 15))

    // Take the brightest stars (up to 15 per constellation)
    const bright = members.slice(0, 15)

    // Connect stars using a simple nearest-neighbor approach
    // Start from the brightest, connect to nearest unvisited
    const used = new Set()
    let current = bright[0]
    used.add(0)

    for (let step = 1; step < bright.length; step++) {
      let nearestIdx = -1
      let nearestDist = Infinity

      for (let j = 0; j < bright.length; j++) {
        if (used.has(j)) continue
        const s = bright[j]
        const dx = current.x - s.x
        const dy = current.y - s.y
        const dz = current.z - s.z
        const d = dx * dx + dy * dy + dz * dz
        if (d < nearestDist) {
          nearestDist = d
          nearestIdx = j
        }
      }

      if (nearestIdx < 0) break
      used.add(nearestIdx)

      // Get positions
      let p1, p2
      if (scaleMode === 'log') {
        p1 = logCompress(current.x, current.y, current.z)
        p2 = logCompress(bright[nearestIdx].x, bright[nearestIdx].y, bright[nearestIdx].z)
      } else {
        p1 = new THREE.Vector3(current.x, current.y, current.z)
        p2 = new THREE.Vector3(bright[nearestIdx].x, bright[nearestIdx].y, bright[nearestIdx].z)
      }

      lines.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z)
      current = bright[nearestIdx]
    }
  }

  return new Float32Array(lines)
}

export default function ConstellationLines() {
  const stars = useStore((s) => s.stars)
  const scaleMode = useStore((s) => s.scaleMode)
  const starsVisible = useStore((s) => s.filters.stars)
  const { camera } = useThree()
  const linesRef = useRef()

  const linePositions = useMemo(() => {
    if (!stars || stars.length === 0) return new Float32Array(0)
    return buildConstellationLines(stars, scaleMode)
  }, [stars, scaleMode])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    return geo
  }, [linePositions])

  useFrame(() => {
    if (!linesRef.current) return

    const camDist = camera.position.length()
    // Fade constellation lines with distance from origin
    // Only really visible when near Earth
    const maxDist = scaleMode === 'log' ? 80 : 500
    const opacity = Math.max(0, 1 - camDist / maxDist) * 0.3

    linesRef.current.material.opacity = opacity
    linesRef.current.visible = opacity > 0.01 && starsVisible
  })

  if (!stars || linePositions.length === 0 || !starsVisible) return null

  return (
    <lineSegments ref={linesRef} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  )
}
