import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Dark matter halo visualization for galaxies.
 *
 * Renders faint purple-blue translucent spheres around nearby galaxies
 * representing their estimated dark matter halos. Halo radius is
 * approximately 10× the visible galaxy radius (NFW profile estimate).
 */

function logCompress(x, y, z) {
  const dist = Math.sqrt(x * x + y * y + z * z)
  if (dist < 0.001) return new THREE.Vector3(0, 0, 0)
  const logDist = Math.log(1 + dist) * 15.0
  const scale = logDist / dist
  return new THREE.Vector3(x * scale, y * scale, z * scale)
}

const haloVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`

const haloFragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vViewDir;

  float hash(vec3 p) {
    p = fract(p * vec3(443.8, 441.4, 437.2));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  void main() {
    float mu = dot(vNormal, vViewDir);

    // NFW-profile-inspired density: peaks at center, falls off as 1/r^2
    float edge = pow(1.0 - abs(mu), 2.0);

    // Subtle noise for non-uniform appearance
    vec3 noisePos = vNormal * 5.0 + uTime * 0.02;
    float noise = hash(floor(noisePos * 10.0)) * 0.3;

    // Dark matter color: deep purple-blue
    vec3 color = vec3(0.2, 0.15, 0.5);

    float alpha = (edge + noise * edge) * uOpacity * 0.15;

    gl_FragColor = vec4(color, alpha);
  }
`

const MAX_HALOS = 8
const SHOW_DISTANCE = 150 // scene units

export default function DarkMatterHalo() {
  const galaxies = useStore((s) => s.galaxies)
  const scaleMode = useStore((s) => s.scaleMode)
  const galaxiesVisible = useStore((s) => s.filters.galaxies)
  const { camera } = useThree()
  const groupRef = useRef()
  const nearestRef = useRef([])

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 24, 16), [])

  const uniformSets = useMemo(() => {
    return Array.from({ length: MAX_HALOS }, () => ({
      uOpacity: { value: 0 },
      uTime: { value: 0 },
    }))
  }, [])

  useFrame((state) => {
    if (!galaxies || !galaxiesVisible || !groupRef.current) return

    const camPos = camera.position

    // Find nearest galaxies (every 0.5s)
    const checkKey = Math.floor(performance.now() / 500)
    if (checkKey !== nearestRef.current._lastCheck) {
      nearestRef.current._lastCheck = checkKey
      const candidates = []

      for (let i = 0; i < galaxies.length; i++) {
        const g = galaxies[i]
        let pos
        if (scaleMode === 'log') {
          pos = logCompress(g.x, g.y, g.z)
        } else {
          pos = new THREE.Vector3(g.x, g.y, g.z)
        }

        const dist = camPos.distanceTo(pos)
        if (dist < SHOW_DISTANCE) {
          candidates.push({ galaxy: g, pos, dist })
        }
      }

      candidates.sort((a, b) => a.dist - b.dist)
      nearestRef.current = candidates.slice(0, MAX_HALOS)
    }

    const children = groupRef.current.children
    for (let i = 0; i < MAX_HALOS; i++) {
      const mesh = children[i]
      if (!mesh) continue

      const entry = nearestRef.current[i]
      if (!entry || entry.dist > SHOW_DISTANCE) {
        mesh.visible = false
        continue
      }

      mesh.visible = true
      mesh.position.copy(entry.pos)

      // Halo radius ≈ 10× visible galaxy size
      const majorAxis = entry.galaxy.major_axis || 2
      const haloSize = Math.max(2, majorAxis * 0.1 * 10) // 10× visual size
      mesh.scale.setScalar(haloSize)

      // Fade with distance
      const fade = 1 - (entry.dist / SHOW_DISTANCE)
      uniformSets[i].uOpacity.value = fade
      uniformSets[i].uTime.value = state.clock.elapsedTime
    }
  })

  if (!galaxiesVisible) return null

  return (
    <group ref={groupRef}>
      {uniformSets.map((uniforms, i) => (
        <mesh key={i} geometry={sphereGeo} visible={false}>
          <shaderMaterial
            vertexShader={haloVertexShader}
            fragmentShader={haloFragmentShader}
            uniforms={uniforms}
            transparent
            side={THREE.BackSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}
