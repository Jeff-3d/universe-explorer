import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { habitableZone } from '../utils/physics'

/**
 * Renders habitable zone annuli around nearby stars.
 *
 * When the camera is close enough to a star, displays a translucent
 * green ring between the inner and outer habitable zone boundaries.
 * The habitable zone is where liquid water could exist on a planet's
 * surface (the "Goldilocks zone").
 */

const hzVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const hzFragmentShader = /* glsl */ `
  uniform float uInnerRadius;
  uniform float uOuterRadius;
  uniform float uOpacity;

  varying vec2 vUv;

  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center) * 2.0;

    // Map UV distance to physical radius
    float radius = dist;

    // Only show between inner and outer radii (normalized to 0-1)
    float inner = uInnerRadius;
    float outer = uOuterRadius;

    if (radius < inner || radius > outer) discard;

    // Smooth edges
    float edgeSoft = 0.02;
    float alpha = smoothstep(inner, inner + edgeSoft, radius)
                * (1.0 - smoothstep(outer - edgeSoft, outer, radius));

    // Green-tinted habitable zone
    vec3 color = vec3(0.1, 0.8, 0.3);

    // Slightly brighter at the "sweet spot" (middle of zone)
    float mid = (inner + outer) * 0.5;
    float sweetSpot = 1.0 - abs(radius - mid) / ((outer - inner) * 0.5);
    color += vec3(0.1, 0.2, 0.05) * sweetSpot;

    gl_FragColor = vec4(color, alpha * uOpacity * 0.3);
  }
`

function logCompress(x, y, z) {
  const dist = Math.sqrt(x * x + y * y + z * z)
  if (dist < 0.001) return new THREE.Vector3(0, 0, 0)
  const logDist = Math.log(1 + dist) * 15.0
  const scale = logDist / dist
  return new THREE.Vector3(x * scale, y * scale, z * scale)
}

const MAX_HZ = 5 // Max habitable zones to render simultaneously
const SHOW_DISTANCE = 30 // scene units

export default function HabitableZone() {
  const stars = useStore((s) => s.stars)
  const scaleMode = useStore((s) => s.scaleMode)
  const starsVisible = useStore((s) => s.filters.stars)
  const { camera } = useThree()
  const groupRef = useRef()
  const nearestRef = useRef([])

  const planeGeo = useMemo(() => new THREE.PlaneGeometry(1, 1, 1, 1), [])

  const uniformSets = useMemo(() => {
    return Array.from({ length: MAX_HZ }, () => ({
      uInnerRadius: { value: 0.3 },
      uOuterRadius: { value: 0.7 },
      uOpacity: { value: 0 },
    }))
  }, [])

  useFrame(() => {
    if (!stars || !starsVisible || !groupRef.current) return

    const camPos = camera.position

    // Find nearest stars with luminosity data (every 0.5s)
    if (Math.floor(performance.now() / 500) !== nearestRef.current._lastCheck) {
      nearestRef.current._lastCheck = Math.floor(performance.now() / 500)

      const candidates = []
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i]
        if (!star.luminosity) continue

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
          candidates.push({ star, sx, sy, sz, dist: Math.sqrt(distSq) })
        }
      }

      candidates.sort((a, b) => a.dist - b.dist)
      nearestRef.current = candidates.slice(0, MAX_HZ)
    }

    // Update HZ meshes
    const children = groupRef.current.children
    for (let i = 0; i < MAX_HZ; i++) {
      const mesh = children[i]
      if (!mesh) continue

      const entry = nearestRef.current[i]
      if (!entry || entry.dist > SHOW_DISTANCE) {
        mesh.visible = false
        continue
      }

      const hz = habitableZone(entry.star.luminosity)

      // Convert AU to scene units
      // 1 AU ≈ 1.58e-5 LY, in log-compressed space this is tiny
      // We scale up significantly for visibility
      const auToScene = scaleMode === 'log' ? 0.05 : 0.00001
      const innerScene = hz.inner * auToScene
      const outerScene = hz.outer * auToScene
      const totalSize = outerScene * 2.5

      mesh.visible = true
      mesh.position.set(entry.sx, entry.sy, entry.sz)
      mesh.scale.setScalar(totalSize)

      // Face the camera
      mesh.lookAt(camPos)

      // Fade based on distance
      const fade = 1 - (entry.dist / SHOW_DISTANCE)

      const unis = uniformSets[i]
      unis.uInnerRadius.value = innerScene / totalSize
      unis.uOuterRadius.value = outerScene / totalSize
      unis.uOpacity.value = fade
    }
  })

  if (!starsVisible) return null

  return (
    <group ref={groupRef}>
      {uniformSets.map((uniforms, i) => (
        <mesh key={i} geometry={planeGeo} visible={false}>
          <shaderMaterial
            vertexShader={hzVertexShader}
            fragmentShader={hzFragmentShader}
            uniforms={uniforms}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}
