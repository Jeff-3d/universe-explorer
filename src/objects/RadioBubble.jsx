import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Humanity's radio bubble and Voyager markers.
 *
 * Renders:
 * 1. A faint expanding sphere centered on Earth (~110 LY radius)
 *    representing the extent of human radio transmissions since ~1906.
 * 2. Tiny markers for Voyager 1 and Voyager 2 positions.
 *
 * Toggle via store filter. Visible in log-compressed space.
 */

// Earth is at the origin (Sol-centric coordinate system)
const EARTH_POS = new THREE.Vector3(0, 0, 0)

// Radio bubble radius: ~120 years of radio transmission at speed of light
const RADIO_RADIUS_LY = 120

// Voyager positions (approximate, in LY from Sun)
// Voyager 1: ~0.0024 LY from Sun, direction toward Ophiuchus
// Voyager 2: ~0.0020 LY from Sun, direction toward Sagittarius
const VOYAGER_1_LY = 0.0024
const VOYAGER_2_LY = 0.0020

function logCompressR(distLY) {
  return Math.log(1 + distLY) * 15.0
}

const bubbleVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`

const bubbleFragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float mu = dot(vNormal, vViewDir);

    // Edge glow (Fresnel-like)
    float edge = pow(1.0 - abs(mu), 2.5);

    // Subtle pulsing
    float pulse = 0.9 + 0.1 * sin(uTime * 0.5);

    // Faint blue-green color
    vec3 color = vec3(0.2, 0.6, 0.9);

    float alpha = edge * uOpacity * pulse * 0.4;

    gl_FragColor = vec4(color, alpha);
  }
`

export default function RadioBubble() {
  const scaleMode = useStore((s) => s.scaleMode)
  const { camera } = useThree()
  const bubbleRef = useRef()
  const materialRef = useRef()
  const v1Ref = useRef()
  const v2Ref = useRef()

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 48, 32), [])

  const uniforms = useMemo(() => ({
    uOpacity: { value: 0 },
    uTime: { value: 0 },
  }), [])

  // Compute scene-space radius
  const sceneRadius = scaleMode === 'log' ? logCompressR(RADIO_RADIUS_LY) : RADIO_RADIUS_LY
  const v1SceneR = scaleMode === 'log' ? logCompressR(VOYAGER_1_LY) : VOYAGER_1_LY
  const v2SceneR = scaleMode === 'log' ? logCompressR(VOYAGER_2_LY) : VOYAGER_2_LY

  useFrame((state) => {
    if (!bubbleRef.current || !materialRef.current) return

    const camDist = camera.position.length()

    // Fade in when camera can see the bubble scale
    // In log space, radio bubble is small (~72 scene units)
    let opacity = 0
    if (camDist < sceneRadius * 3) {
      opacity = Math.min(0.8, 1 - camDist / (sceneRadius * 3))
    }

    uniforms.uOpacity.value = opacity
    uniforms.uTime.value = state.clock.elapsedTime
    bubbleRef.current.visible = opacity > 0.01
    bubbleRef.current.scale.setScalar(sceneRadius)

    // Voyager markers
    if (v1Ref.current) {
      v1Ref.current.visible = camDist < v1SceneR * 200
      // Voyager 1 direction: RA 17h 10m, Dec +12°
      v1Ref.current.position.set(
        v1SceneR * Math.cos(0.21) * Math.cos(4.48),
        v1SceneR * Math.sin(0.21),
        v1SceneR * Math.sin(0.21) * Math.sin(4.48)
      )
    }
    if (v2Ref.current) {
      v2Ref.current.visible = camDist < v2SceneR * 200
      // Voyager 2 direction: RA 19h 55m, Dec -53°
      v2Ref.current.position.set(
        v2SceneR * Math.cos(-0.93) * Math.cos(5.22),
        v2SceneR * Math.sin(-0.93),
        v2SceneR * Math.cos(-0.93) * Math.sin(5.22)
      )
    }
  })

  return (
    <group>
      {/* Radio bubble sphere */}
      <mesh ref={bubbleRef} geometry={sphereGeo} visible={false}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={bubbleVertexShader}
          fragmentShader={bubbleFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Voyager 1 marker */}
      <mesh ref={v1Ref} visible={false}>
        <sphereGeometry args={[0.003, 8, 8]} />
        <meshBasicMaterial color="#ffaa00" />
      </mesh>

      {/* Voyager 2 marker */}
      <mesh ref={v2Ref} visible={false}>
        <sphereGeometry args={[0.003, 8, 8]} />
        <meshBasicMaterial color="#00aaff" />
      </mesh>
    </group>
  )
}
