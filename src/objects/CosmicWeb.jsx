import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { OBSERVABLE_RADIUS_SCENE, COSMIC_WEB_THRESHOLD } from '../utils/cosmology'

/**
 * Cosmic Web visualization.
 *
 * Renders large-scale filamentary structure of the universe as a
 * procedural volumetric effect. Becomes visible when the camera is
 * far enough from the origin to see the large-scale structure.
 *
 * Uses a full-screen quad with raymarching through a procedural
 * 3D noise field that mimics the cosmic web's filament/void topology.
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uCameraPos;
  uniform mat4 uInvProjView;
  uniform float uSceneRadius;

  varying vec2 vUv;

  // Hash functions for procedural noise
  float hash(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(
        mix(hash(i), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x),
        f.y
      ),
      mix(
        mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x),
        f.y
      ),
      f.z
    );
  }

  // Fractal noise for filamentary structure
  float filamentNoise(vec3 p) {
    float val = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 4; i++) {
      val += amp * noise3D(p * freq);
      freq *= 2.0;
      amp *= 0.5;
    }
    return val;
  }

  // Cosmic web density: filaments are ridges in the noise field
  float cosmicDensity(vec3 p) {
    // Scale position to get right filament spacing
    vec3 scaled = p * 0.03;

    // Two noise fields at different scales create filament intersections
    float n1 = filamentNoise(scaled);
    float n2 = filamentNoise(scaled * 1.7 + vec3(100.0));

    // Filaments are where both noise fields are high (intersections = nodes)
    float filament = n1 * n2;

    // Sharpen: only keep high-density regions (filaments + nodes)
    filament = smoothstep(0.15, 0.35, filament);

    // Add subtle time animation (cosmic web doesn't really move, but gives life)
    float drift = noise3D(scaled * 0.5 + uTime * 0.001) * 0.1;
    filament += drift * filament;

    // Fade near edges of observable universe
    float dist = length(p) / uSceneRadius;
    float edgeFade = 1.0 - smoothstep(0.7, 1.0, dist);

    return filament * edgeFade;
  }

  void main() {
    // Reconstruct ray from screen UV
    vec2 ndc = vUv * 2.0 - 1.0;
    vec4 nearPoint = uInvProjView * vec4(ndc, -1.0, 1.0);
    vec4 farPoint = uInvProjView * vec4(ndc, 1.0, 1.0);
    nearPoint /= nearPoint.w;
    farPoint /= farPoint.w;

    vec3 rayOrigin = nearPoint.xyz;
    vec3 rayDir = normalize(farPoint.xyz - nearPoint.xyz);

    // March through the volume
    float totalDensity = 0.0;
    vec3 totalColor = vec3(0.0);

    // Step size relative to scene scale
    float stepSize = uSceneRadius * 0.02;
    float maxDist = uSceneRadius * 2.0;

    // Start marching from a minimum distance (skip nearby space)
    float t = stepSize * 2.0;

    for (int i = 0; i < 64; i++) {
      vec3 pos = rayOrigin + rayDir * t;

      float density = cosmicDensity(pos);

      if (density > 0.01) {
        // Color: blue-purple filaments, brighter at nodes
        vec3 filamentColor = mix(
          vec3(0.2, 0.3, 0.8),  // blue filaments
          vec3(0.8, 0.6, 1.0),  // purple/white nodes
          density
        );

        // Accumulate
        float alpha = density * 0.08;
        totalColor += filamentColor * alpha * (1.0 - totalDensity);
        totalDensity += alpha * (1.0 - totalDensity);
      }

      if (totalDensity > 0.95) break;

      t += stepSize;
      if (t > maxDist) break;
    }

    gl_FragColor = vec4(totalColor, totalDensity * uOpacity);
  }
`

export default function CosmicWeb() {
  const galaxiesVisible = useStore((s) => s.filters.galaxies)
  const scaleMode = useStore((s) => s.scaleMode)
  const { camera } = useThree()
  const meshRef = useRef()
  const materialRef = useRef()

  const uniforms = useMemo(() => ({
    uOpacity: { value: 0.0 },
    uTime: { value: 0.0 },
    uCameraPos: { value: new THREE.Vector3() },
    uInvProjView: { value: new THREE.Matrix4() },
    uSceneRadius: { value: OBSERVABLE_RADIUS_SCENE },
  }), [])

  // Full-screen quad geometry (clip space)
  const quadGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const verts = new Float32Array([-1,-1,0, 1,-1,0, 1,1,0, -1,-1,0, 1,1,0, -1,1,0])
    const uvs = new Float32Array([0,0, 1,0, 1,1, 0,0, 1,1, 0,1])
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    return geo
  }, [])

  useFrame((state) => {
    if (!materialRef.current) return

    const camDist = camera.position.length()

    // Only show in log scale mode and when camera is far enough
    const threshold = scaleMode === 'log' ? COSMIC_WEB_THRESHOLD * 0.5 : 1e10
    const fadeRange = threshold * 0.3

    let opacity = 0
    if (camDist > threshold) {
      opacity = Math.min(1, (camDist - threshold) / fadeRange) * 0.6
    }

    uniforms.uOpacity.value = opacity
    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uCameraPos.value.copy(camera.position)

    // Compute inverse projection-view matrix for ray reconstruction
    const invProjView = new THREE.Matrix4()
    invProjView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    invProjView.invert()
    uniforms.uInvProjView.value.copy(invProjView)

    // Hide/show
    if (meshRef.current) {
      meshRef.current.visible = opacity > 0.001 && galaxiesVisible
    }
  })

  return (
    <mesh ref={meshRef} geometry={quadGeo} frustumCulled={false} renderOrder={-1} visible={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
