import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Warp tunnel effect for extreme speeds (>10Mc).
 *
 * Renders a cylindrical tunnel of light around the camera's forward
 * direction, creating the classic "warp speed" visual. Uses a
 * screen-space quad with a radial shader effect.
 */

const tunnelVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const tunnelFragmentShader = /* glsl */ `
  uniform float uIntensity;
  uniform float uTime;
  uniform float uSpeedNorm; // 0-1 normalized speed

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center);
    float angle = atan(center.y, center.x);

    // Radial streaks
    float streaks = 0.0;
    float numStreaks = 60.0;
    float streakAngle = angle * numStreaks;
    float streak = abs(sin(streakAngle));
    streak = pow(streak, 8.0 + (1.0 - uSpeedNorm) * 20.0);

    // Animate radially outward
    float radialFlow = fract(dist * 3.0 - uTime * 2.0 * uSpeedNorm);
    radialFlow = pow(radialFlow, 2.0);

    streaks = streak * radialFlow;

    // Only visible at edges (tunnel shape)
    float tunnelMask = smoothstep(0.1, 0.5, dist);

    // Chromatic: blue center shifting to white at edges
    vec3 color = mix(
      vec3(0.4, 0.6, 1.0),   // blue-white center
      vec3(0.8, 0.85, 1.0),  // white edges
      dist * 2.0
    );

    // Add some sparkle noise
    float sparkle = hash(vec2(angle * 100.0, floor(uTime * 30.0)));
    sparkle = step(0.97, sparkle) * 0.5;

    float alpha = (streaks * tunnelMask + sparkle * tunnelMask) * uIntensity;

    // Vignette glow at high speeds
    float vignette = smoothstep(0.3, 0.7, dist) * uIntensity * 0.15;
    color += vec3(0.2, 0.3, 0.8) * vignette;
    alpha += vignette;

    gl_FragColor = vec4(color, alpha * 0.6);
  }
`

export default function WarpTunnel() {
  const speedLevel = useStore((s) => s.speedLevel)
  const meshRef = useRef()
  const materialRef = useRef()

  const uniforms = useMemo(() => ({
    uIntensity: { value: 0.0 },
    uTime: { value: 0.0 },
    uSpeedNorm: { value: 0.0 },
  }), [])

  const quadGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const verts = new Float32Array([-1,-1,0, 1,-1,0, 1,1,0, -1,-1,0, 1,1,0, -1,1,0])
    const uvs = new Float32Array([0,0, 1,0, 1,1, 0,0, 1,1, 0,1])
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    return geo
  }, [])

  useFrame((state) => {
    if (!materialRef.current || !meshRef.current) return

    // Tunnel appears at speed level 5+, full intensity at 9
    const intensity = Math.max(0, (speedLevel - 4) / 5)
    const speedNorm = Math.max(0, (speedLevel - 2) / 7)

    uniforms.uIntensity.value = intensity
    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uSpeedNorm.value = speedNorm

    meshRef.current.visible = intensity > 0.001
  })

  return (
    <mesh ref={meshRef} geometry={quadGeo} frustumCulled={false} renderOrder={999} visible={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={tunnelVertexShader}
        fragmentShader={tunnelFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
