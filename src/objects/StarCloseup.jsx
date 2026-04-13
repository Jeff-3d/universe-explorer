import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Renders the nearest star as a detailed sphere when the camera is close enough.
 *
 * Features:
 * - Blackbody-colored surface from star temperature
 * - Limb darkening (edges darker than center, like real stars)
 * - Procedural granulation noise (convection cells)
 * - Glow corona around the star
 */

const surfaceVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    vUv = uv;
    gl_Position = projectionMatrix * mvPos;
  }
`

const surfaceFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uTemperature;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;

  // Simple hash for noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // 2D noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Fractal brownian motion for granulation
  float fbm(vec2 p) {
    float val = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      val += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return val;
  }

  void main() {
    // Limb darkening: cos(angle between normal and view)
    float mu = max(0.0, dot(vNormal, vViewDir));

    // Quadratic limb darkening (realistic for main-sequence stars)
    // I(mu) = 1 - u1*(1-mu) - u2*(1-mu)^2
    float u1 = 0.6;
    float u2 = 0.2;
    float limb = 1.0 - u1 * (1.0 - mu) - u2 * (1.0 - mu) * (1.0 - mu);

    // Granulation noise (convection cells on the surface)
    vec2 noiseCoord = vUv * 20.0 + uTime * 0.02;
    float granulation = fbm(noiseCoord);
    granulation = 0.9 + 0.1 * granulation; // subtle variation

    // Surface color
    vec3 surfaceColor = uColor * limb * granulation;

    // Slight brightening at the very center
    float centerBoost = smoothstep(0.0, 1.0, mu) * 0.15;
    surfaceColor += uColor * centerBoost;

    // Hot stars get a subtle blue-white core boost
    if (uTemperature > 10000.0) {
      float hotBoost = smoothstep(10000.0, 30000.0, uTemperature) * 0.3;
      surfaceColor += vec3(0.6, 0.7, 1.0) * hotBoost * mu * mu;
    }

    gl_FragColor = vec4(surfaceColor, 1.0);
  }
`

// Corona glow shader (rendered as a slightly larger transparent sphere)
const coronaVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`

const coronaFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float mu = dot(vNormal, vViewDir);

    // Fresnel-like glow: bright at edges, transparent at center
    float glow = pow(1.0 - max(0.0, mu), 3.0);
    glow *= uIntensity;

    vec3 coronaColor = uColor * 1.5;
    gl_FragColor = vec4(coronaColor, glow * 0.6);
  }
`

function logCompress(x, y, z) {
  const dist = Math.sqrt(x * x + y * y + z * z)
  if (dist < 0.001) return new THREE.Vector3(0, 0, 0)
  const logDist = Math.log(1 + dist) * 15.0
  const scale = logDist / dist
  return new THREE.Vector3(x * scale, y * scale, z * scale)
}

function hexToVec3(hex) {
  if (!hex) return new THREE.Color(1, 1, 1)
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return new THREE.Color(r, g, b)
}

export default function StarCloseup() {
  const stars = useStore((s) => s.stars)
  const scaleMode = useStore((s) => s.scaleMode)
  const starsVisible = useStore((s) => s.filters.stars)
  const { camera } = useThree()

  const surfaceRef = useRef()
  const coronaRef = useRef()
  const groupRef = useRef()
  const nearestStar = useRef(null)
  const visible = useRef(false)

  // Sphere geometry (shared)
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 48, 48), [])

  useFrame((state) => {
    if (!stars || !starsVisible || !groupRef.current) return

    const camPos = camera.position

    // Find nearest star (check every 10th frame for performance)
    if (state.clock.elapsedTime % 0.3 < 0.017) {
      let minDist = Infinity
      let closest = null

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i]
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
        const d = dx * dx + dy * dy + dz * dz
        if (d < minDist) {
          minDist = d
          closest = { star, x: sx, y: sy, z: sz, dist: Math.sqrt(d) }
        }
      }

      nearestStar.current = closest
    }

    const nearest = nearestStar.current
    if (!nearest) {
      visible.current = false
      groupRef.current.visible = false
      return
    }

    // Show sphere when camera is close enough
    // Star radius in scene units: use log of actual radius, scaled
    const starRadius = nearest.star.radius
      ? Math.max(0.05, Math.log10(nearest.star.radius + 1) * 0.3)
      : 0.1

    const showThreshold = starRadius * 50 // Show when within 50x the visual radius
    const showDist = nearest.dist

    if (showDist > showThreshold || showDist < starRadius * 0.5) {
      visible.current = false
      groupRef.current.visible = false
      return
    }

    visible.current = true
    groupRef.current.visible = true
    groupRef.current.position.set(nearest.x, nearest.y, nearest.z)

    // Scale sphere
    groupRef.current.scale.setScalar(starRadius)

    // Update surface shader uniforms
    if (surfaceRef.current) {
      surfaceRef.current.uniforms.uColor.value = hexToVec3(nearest.star.color)
      surfaceRef.current.uniforms.uTime.value = state.clock.elapsedTime
      surfaceRef.current.uniforms.uTemperature.value = nearest.star.temperature || 5500
    }

    // Update corona
    if (coronaRef.current) {
      coronaRef.current.uniforms.uColor.value = hexToVec3(nearest.star.color)
      const lum = nearest.star.luminosity || 1
      coronaRef.current.uniforms.uIntensity.value = Math.min(2, 0.5 + Math.log10(lum + 1) * 0.3)
    }
  })

  const surfaceUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(1, 0.9, 0.8) },
    uTime: { value: 0 },
    uTemperature: { value: 5500 },
  }), [])

  const coronaUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(1, 0.9, 0.8) },
    uIntensity: { value: 1.0 },
  }), [])

  return (
    <group ref={groupRef} visible={false}>
      {/* Star surface sphere */}
      <mesh geometry={sphereGeo}>
        <shaderMaterial
          ref={surfaceRef}
          vertexShader={surfaceVertexShader}
          fragmentShader={surfaceFragmentShader}
          uniforms={surfaceUniforms}
        />
      </mesh>

      {/* Corona glow (slightly larger transparent sphere) */}
      <mesh geometry={sphereGeo} scale={[1.4, 1.4, 1.4]}>
        <shaderMaterial
          ref={coronaRef}
          vertexShader={coronaVertexShader}
          fragmentShader={coronaFragmentShader}
          uniforms={coronaUniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
