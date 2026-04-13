import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { OBSERVABLE_RADIUS_SCENE, CMB_THRESHOLD } from '../utils/cosmology'

/**
 * Cosmic Microwave Background Wall.
 *
 * Renders a faint spherical shell at the boundary of the observable universe
 * (~46.5 billion light-years comoving distance). The CMB is the oldest light
 * in the universe, released ~380,000 years after the Big Bang.
 *
 * Uses procedural noise to approximate the CMB temperature anisotropies
 * (the tiny ~1/100,000 fluctuations that seeded all cosmic structure).
 */

const cmbVertexShader = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);

    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);

    gl_Position = projectionMatrix * mvPos;
  }
`

const cmbFragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  // Hash for noise
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

  // Multi-octave noise for CMB anisotropy pattern
  float cmbAnisotropy(vec3 dir) {
    float val = 0.0;
    float amp = 0.5;
    float freq = 3.0;
    for (int i = 0; i < 6; i++) {
      val += amp * noise3D(dir * freq);
      freq *= 2.1;
      amp *= 0.45;
    }
    return val;
  }

  void main() {
    // Use world position direction for the anisotropy pattern
    vec3 dir = normalize(vWorldPos);

    // CMB temperature anisotropy (procedural approximation)
    float aniso = cmbAnisotropy(dir);

    // CMB color: base temperature ~2.725K
    // Map anisotropy to color: cooler = blue, average = orange-red, warmer = yellow-white
    // Real CMB uses false color, we use a warm palette
    vec3 coolColor = vec3(0.1, 0.15, 0.6);   // blue (cold spots)
    vec3 avgColor = vec3(0.6, 0.3, 0.1);      // orange-red (average)
    vec3 warmColor = vec3(1.0, 0.9, 0.5);     // yellow-white (hot spots)

    vec3 color;
    if (aniso < 0.5) {
      color = mix(coolColor, avgColor, aniso * 2.0);
    } else {
      color = mix(avgColor, warmColor, (aniso - 0.5) * 2.0);
    }

    // Add large-scale dipole (the actual CMB has a dipole from our motion)
    float dipole = dot(dir, vec3(0.0, 0.0, 1.0)) * 0.05;
    color += dipole;

    // Fresnel-like edge brightening (edges of the sphere glow more)
    float fresnel = 1.0 - abs(dot(vNormal, vViewDir));
    fresnel = pow(fresnel, 1.5);
    float edgeGlow = 0.3 + 0.7 * fresnel;

    // Very subtle shimmer
    float shimmer = 1.0 + 0.02 * sin(uTime * 0.3 + aniso * 20.0);

    float alpha = uOpacity * edgeGlow * shimmer;

    gl_FragColor = vec4(color * 0.4, alpha);
  }
`

export default function CMBWall() {
  const scaleMode = useStore((s) => s.scaleMode)
  const { camera } = useThree()
  const meshRef = useRef()
  const materialRef = useRef()

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(OBSERVABLE_RADIUS_SCENE, 96, 64), [])

  const uniforms = useMemo(() => ({
    uOpacity: { value: 0.0 },
    uTime: { value: 0.0 },
  }), [])

  useFrame((state) => {
    if (!materialRef.current || !meshRef.current) return

    const camDist = camera.position.length()

    // Only show in log scale and when camera is far enough
    const threshold = scaleMode === 'log' ? CMB_THRESHOLD * 0.6 : 1e10
    const fadeRange = threshold * 0.4

    let opacity = 0
    if (camDist > threshold) {
      opacity = Math.min(0.5, (camDist - threshold) / fadeRange) * 0.8
    }

    uniforms.uOpacity.value = opacity
    uniforms.uTime.value = state.clock.elapsedTime
    meshRef.current.visible = opacity > 0.001
  })

  return (
    <mesh ref={meshRef} geometry={sphereGeo} visible={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={cmbVertexShader}
        fragmentShader={cmbFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
