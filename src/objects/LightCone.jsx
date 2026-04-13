import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Light cone visualization for selected objects.
 *
 * Renders a translucent sphere around the selected object showing
 * "how far light has traveled since this object formed." For stars,
 * the radius equals the star's age × speed of light.
 *
 * Only shows for selected objects with known age/distance data.
 */

function logCompressR(distLY) {
  return Math.log(1 + distLY) * 15.0
}

function logCompress(x, y, z) {
  const dist = Math.sqrt(x * x + y * y + z * z)
  if (dist < 0.001) return new THREE.Vector3(0, 0, 0)
  const logDist = Math.log(1 + dist) * 15.0
  const scale = logDist / dist
  return new THREE.Vector3(x * scale, y * scale, z * scale)
}

const coneVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`

const coneFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float mu = dot(vNormal, vViewDir);
    float edge = pow(1.0 - abs(mu), 3.0);

    // Subtle animation
    float shimmer = 0.95 + 0.05 * sin(uTime * 0.8);

    float alpha = edge * uOpacity * shimmer * 0.3;
    gl_FragColor = vec4(uColor, alpha);
  }
`

export default function LightCone() {
  const selectedObject = useStore((s) => s.selectedObject)
  const scaleMode = useStore((s) => s.scaleMode)
  const meshRef = useRef()
  const materialRef = useRef()

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 32, 24), [])
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(0.8, 0.7, 0.3) },
    uOpacity: { value: 0.5 },
    uTime: { value: 0 },
  }), [])

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return

    if (!selectedObject) {
      meshRef.current.visible = false
      return
    }

    // Estimate object age (or use distance as proxy for light travel time)
    // For stars: use main sequence lifetime estimate from luminosity
    // Default: use distance as the "minimum light travel time we know about"
    const dist = selectedObject.distance_ly || 0
    if (dist <= 0) {
      meshRef.current.visible = false
      return
    }

    // Light cone radius = how far light from this object could have reached
    // For a star at distance D with estimated age A:
    // light cone radius ≈ A (in LY) since light travels 1 LY/year
    // We use a conservative estimate: max(distance, estimated_age * 0.1)
    let lightConeRadiusLY = dist // minimum: light has at least traveled this far

    // If it's a star, estimate age from luminosity (rough MS lifetime)
    if (selectedObject.luminosity && selectedObject.mass) {
      // Main sequence lifetime: t ≈ (M/L) × 10^10 years (solar units)
      const msLifetime = (selectedObject.mass / selectedObject.luminosity) * 1e10
      // Star is probably partway through its lifetime
      const estimatedAge = msLifetime * 0.5
      lightConeRadiusLY = Math.max(dist, estimatedAge)
    }

    // Cap at observable universe for display
    lightConeRadiusLY = Math.min(lightConeRadiusLY, 1e10)

    const sceneRadius = scaleMode === 'log'
      ? logCompressR(lightConeRadiusLY)
      : lightConeRadiusLY

    // Position at the selected object
    let pos
    if (scaleMode === 'log') {
      pos = logCompress(selectedObject.x, selectedObject.y, selectedObject.z)
    } else {
      pos = new THREE.Vector3(selectedObject.x, selectedObject.y, selectedObject.z)
    }

    meshRef.current.visible = true
    meshRef.current.position.copy(pos)
    meshRef.current.scale.setScalar(sceneRadius)

    // Color based on object type
    const type = selectedObject._type
    if (type === 'galaxy') {
      uniforms.uColor.value.set(0.6, 0.4, 0.8) // purple
    } else if (type === 'nebula') {
      uniforms.uColor.value.set(0.8, 0.3, 0.4) // pink
    } else {
      uniforms.uColor.value.set(0.8, 0.7, 0.3) // gold for stars
    }

    uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh ref={meshRef} geometry={sphereGeo} visible={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={coneVertexShader}
        fragmentShader={coneFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
