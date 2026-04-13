import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Renders nearby galaxies as billboard sprites with morphology-driven appearance.
 *
 * When within a threshold distance, galaxies render as textured quads with:
 * - Spiral arm structure for Sa-Sd types
 * - Elliptical glow for E0-E7 types
 * - Irregular diffuse glow for Irr types
 *
 * Uses procedural GLSL generation (no texture files needed).
 */

const billboardVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    // Billboard: always face the camera
    vec4 mvPos = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mvPos.xy += position.xy * vec2(1.0, 1.0);
    gl_Position = projectionMatrix * mvPos;
  }
`

const galaxyFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uMorphology; // 0 = elliptical, 0.5 = spiral, 1.0 = irregular
  uniform float uAxisRatio;  // minor/major axis ratio
  uniform float uAngle;      // position angle in radians
  uniform float uTime;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec2 center = vUv - 0.5;

    // Apply rotation
    float ca = cos(uAngle);
    float sa = sin(uAngle);
    vec2 rotated = vec2(
      center.x * ca - center.y * sa,
      center.x * sa + center.y * ca
    );

    // Apply axis ratio (stretch)
    rotated.y /= max(0.3, uAxisRatio);

    float dist = length(rotated) * 2.0;

    if (dist > 1.0) discard;

    float brightness = 0.0;

    if (uMorphology < 0.3) {
      // Elliptical: smooth Sersic-like profile
      brightness = exp(-3.0 * dist * dist);
      // Add slight core brightening
      brightness += 0.3 * exp(-20.0 * dist * dist);
    } else if (uMorphology < 0.7) {
      // Spiral: logarithmic spiral arms
      float angle = atan(rotated.y, rotated.x);
      float r = length(rotated) * 4.0;

      // Two spiral arms
      float spiral1 = sin(angle * 2.0 - r * 3.0 + uTime * 0.05);
      float spiral2 = sin(angle * 2.0 - r * 3.0 + 3.14159 + uTime * 0.05);
      float arms = max(spiral1, spiral2);
      arms = smoothstep(0.0, 0.8, arms);

      // Bulge (bright center)
      float bulge = exp(-8.0 * dist * dist);

      // Disk (overall glow)
      float disk = exp(-2.5 * dist * dist);

      // Combine: bulge is always visible, arms modulate the disk
      brightness = bulge * 0.7 + disk * (0.3 + 0.4 * arms);

      // Add some noise for dust lanes
      float dustNoise = noise(rotated * 10.0 + uTime * 0.01);
      brightness *= (0.85 + 0.15 * dustNoise);
    } else {
      // Irregular: lumpy, asymmetric
      float n = noise(rotated * 5.0 + uTime * 0.02);
      float n2 = noise(rotated * 12.0 - uTime * 0.01);
      brightness = exp(-2.0 * dist * dist) * (0.6 + 0.4 * n) * (0.8 + 0.2 * n2);
    }

    // Color: bulge is redder, arms are bluer (for spirals)
    vec3 color = uColor;
    if (uMorphology > 0.3 && uMorphology < 0.7) {
      // Red bulge, blue arms
      float r = length(rotated) * 2.0;
      vec3 bulgeColor = uColor * vec3(1.2, 0.9, 0.7);
      vec3 armColor = uColor * vec3(0.7, 0.9, 1.3);
      color = mix(bulgeColor, armColor, smoothstep(0.0, 0.5, r));
    }

    float alpha = brightness * 0.9;
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(color * brightness, alpha);
  }
`

function logCompress(x, y, z) {
  const dist = Math.sqrt(x * x + y * y + z * z)
  if (dist < 0.001) return new THREE.Vector3(0, 0, 0)
  const logDist = Math.log(1 + dist) * 15.0
  const scale = logDist / dist
  return new THREE.Vector3(x * scale, y * scale, z * scale)
}

function morphologyToFloat(morph) {
  if (!morph) return 0.5
  morph = morph.toUpperCase()
  if (morph.startsWith('E')) return 0.0       // Elliptical
  if (morph.startsWith('S0')) return 0.2      // Lenticular
  if (morph.startsWith('SB')) return 0.6      // Barred spiral
  if (morph.startsWith('S')) return 0.5       // Spiral
  if (morph.startsWith('I')) return 1.0       // Irregular
  return 0.5
}

function hexToColor(hex) {
  if (!hex) return new THREE.Color(0.77, 0.65, 1.0)
  return new THREE.Color(hex)
}

/**
 * Shows up to N nearest galaxies as detailed billboard sprites.
 * Only renders galaxies within a certain camera distance.
 */
const MAX_SPRITES = 20
const SHOW_DISTANCE = 80 // scene units

export default function GalaxySprite() {
  const galaxies = useStore((s) => s.galaxies)
  const scaleMode = useStore((s) => s.scaleMode)
  const galaxiesVisible = useStore((s) => s.filters.galaxies)
  const { camera } = useThree()

  const spritesRef = useRef([])
  const groupRef = useRef()

  // Pre-compute galaxy positions in visual space
  const galaxyPositions = useMemo(() => {
    if (!galaxies) return []
    return galaxies.map(g => {
      if (scaleMode === 'log') {
        const c = logCompress(g.x, g.y, g.z)
        return { galaxy: g, pos: new THREE.Vector3(c.x, c.y, c.z) }
      }
      return { galaxy: g, pos: new THREE.Vector3(g.x, g.y, g.z) }
    })
  }, [galaxies, scaleMode])

  // Quad geometry for billboards
  const quadGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), [])

  // Create uniforms for each sprite slot
  const uniformSets = useMemo(() => {
    return Array.from({ length: MAX_SPRITES }, () => ({
      uColor: { value: new THREE.Color(0.77, 0.65, 1.0) },
      uMorphology: { value: 0.5 },
      uAxisRatio: { value: 0.7 },
      uAngle: { value: 0 },
      uTime: { value: 0 },
    }))
  }, [])

  useFrame((state) => {
    if (!galaxiesVisible || !galaxyPositions.length || !groupRef.current) return

    const camPos = camera.position
    const time = state.clock.elapsedTime

    // Find nearest galaxies (every 15th frame)
    if (Math.floor(time * 60) % 15 === 0 || !spritesRef.current.length) {
      const withDist = galaxyPositions.map(gp => ({
        ...gp,
        dist: camPos.distanceTo(gp.pos),
      }))
      withDist.sort((a, b) => a.dist - b.dist)
      spritesRef.current = withDist.slice(0, MAX_SPRITES)
    }

    // Update sprite meshes
    const children = groupRef.current.children
    for (let i = 0; i < MAX_SPRITES; i++) {
      const mesh = children[i]
      if (!mesh) continue

      const entry = spritesRef.current[i]
      if (!entry || entry.dist > SHOW_DISTANCE) {
        mesh.visible = false
        continue
      }

      mesh.visible = true
      mesh.position.copy(entry.pos)

      // Size based on major axis (angular size) and distance
      const majorAxis = entry.galaxy.major_axis || 2
      const visualSize = Math.max(0.5, Math.min(10, majorAxis * 0.1))
      mesh.scale.setScalar(visualSize)

      // Update uniforms
      const unis = uniformSets[i]
      unis.uColor.value = hexToColor(entry.galaxy.color)
      unis.uMorphology.value = morphologyToFloat(entry.galaxy.morphology)
      unis.uAxisRatio.value = entry.galaxy.minor_axis && entry.galaxy.major_axis
        ? entry.galaxy.minor_axis / entry.galaxy.major_axis
        : 0.7
      unis.uAngle.value = entry.galaxy.position_angle
        ? (entry.galaxy.position_angle * Math.PI) / 180
        : 0
      unis.uTime.value = time
    }
  })

  if (!galaxiesVisible) return null

  return (
    <group ref={groupRef}>
      {uniformSets.map((uniforms, i) => (
        <mesh key={i} geometry={quadGeo} visible={false}>
          <shaderMaterial
            vertexShader={billboardVertexShader}
            fragmentShader={galaxyFragmentShader}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
