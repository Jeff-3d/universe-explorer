import { useMemo, useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { INSTRUMENTS } from '../ui/InstrumentFilter'
import { useClickRaycast } from '../hooks/useClickRaycast'
import { cosmologicalScaleFactor } from '../utils/cosmology'

/**
 * Generic Points-based field renderer for any object type.
 * Renders objects as colored point sprites with glow shaders.
 *
 * Props:
 *  - objects: array of objects with x, y, z, color fields
 *  - visible: whether to render
 *  - scaleMode: 'log' | 'linear'
 *  - onSelect: callback when an object is clicked
 *  - baseSize: base point size multiplier (default 3)
 *  - glowIntensity: how bright the glow is (default 0.8)
 */

const vertexShader = /* glsl */ `
  attribute float size;
  attribute vec3 objColor;

  uniform float uOpacity;

  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vColor = objColor;
    vOpacity = uOpacity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    float pointSize = size * (300.0 / -mvPosition.z);
    pointSize = clamp(pointSize, 1.0, 80.0);

    gl_PointSize = pointSize;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center) * 2.0;

    if (dist > 1.0) discard;

    // Softer glow than stars — more diffuse appearance
    float core = exp(-dist * dist * 4.0);
    float halo = exp(-dist * dist * 1.5);
    float glow = core * 0.5 + halo * 0.5;

    vec3 color = vColor * glow;
    float alpha = glow * 0.9 * vOpacity;
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`

function logCompress(x, y, z) {
  const dist = Math.sqrt(x * x + y * y + z * z)
  if (dist < 0.001) return { x: 0, y: 0, z: 0 }
  const logDist = Math.log(1 + dist) * 15.0
  const scale = logDist / dist
  return { x: x * scale, y: y * scale, z: z * scale }
}

function buildBuffers(objects, scaleMode, baseSize, cosmoScale) {
  const count = objects.length
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const obj = objects[i]

    let baseX = obj.x * cosmoScale
    let baseY = obj.y * cosmoScale
    let baseZ = obj.z * cosmoScale

    let px = baseX, py = baseY, pz = baseZ
    if (scaleMode === 'log') {
      const c = logCompress(baseX, baseY, baseZ)
      px = c.x; py = c.y; pz = c.z
    }
    positions[i * 3] = px
    positions[i * 3 + 1] = py
    positions[i * 3 + 2] = pz

    const hex = obj.color || '#ffffff'
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b

    sizes[i] = baseSize
  }

  return { positions, colors, sizes }
}

export default function ObjectField({ objects, visible, scaleMode, onSelect, baseSize = 3, fadeDistance = 0, applyCosmicExpansion = false }) {
  const materialRef = useRef()
  const pointsRef = useRef()
  const { camera } = useThree()
  const instrument = useStore((s) => s.instrument)
  const timeOffset = useStore((s) => s.timeOffset)

  // timeOffset is in K years; convert to years before feeding the scale factor
  const cosmoScale = applyCosmicExpansion ? cosmologicalScaleFactor(timeOffset * 1000) : 1

  // Filter objects by instrument magnitude limit
  const filtered = useMemo(() => {
    if (!objects || objects.length === 0) return []
    const instDef = INSTRUMENTS.find(i => i.id === instrument)
    const magLimit = instDef ? instDef.magLimit : 99
    if (magLimit >= 99) return objects
    return objects.filter(o =>
      o.magnitude !== null && o.magnitude !== undefined && o.magnitude <= magLimit
    )
  }, [objects, instrument])

  const { positions, colors, sizes } = useMemo(() => {
    if (filtered.length === 0) {
      return {
        positions: new Float32Array(0),
        colors: new Float32Array(0),
        sizes: new Float32Array(0),
      }
    }
    return buildBuffers(filtered, scaleMode, baseSize, cosmoScale)
  }, [filtered, scaleMode, baseSize, cosmoScale])

  useFrame(() => {
    // Fade objects based on camera distance (e.g., exoplanets only visible when close)
    if (fadeDistance > 0 && materialRef.current) {
      const camDist = camera.position.length()
      const opacity = Math.max(0, 1 - camDist / fadeDistance)
      materialRef.current.uniforms.uOpacity.value = opacity
      if (pointsRef.current) pointsRef.current.visible = opacity > 0.01
    }
  })

  // Manual click-raycast — avoids per-mousemove raycasts through R3F's pointer system.
  const onHit = useCallback((hit) => {
    if (!onSelect) return
    const index = hit.index
    if (index !== undefined && index < filtered.length) {
      onSelect(filtered[index])
    }
  }, [filtered, onSelect])
  useClickRaycast(pointsRef, onHit, { threshold: 2.0 })

  if (filtered.length === 0 || !visible) return null

  const objCount = positions.length / 3

  return (
    <points
      ref={pointsRef}
      frustumCulled={false}
    >
      <bufferGeometry key={`${objCount}-${scaleMode}-${cosmoScale.toFixed(4)}`}>
        <bufferAttribute
          attach="attributes-position"
          count={objCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-objColor"
          count={objCount}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={objCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uOpacity: { value: 1.0 } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
