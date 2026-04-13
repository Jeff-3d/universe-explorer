import { useMemo, useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { INSTRUMENTS } from '../ui/InstrumentFilter'

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

  varying vec3 vColor;

  void main() {
    vColor = objColor;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    float pointSize = size * (300.0 / -mvPosition.z);
    pointSize = clamp(pointSize, 1.0, 80.0);

    gl_PointSize = pointSize;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center) * 2.0;

    if (dist > 1.0) discard;

    // Softer glow than stars — more diffuse appearance
    float core = exp(-dist * dist * 4.0);
    float halo = exp(-dist * dist * 1.5);
    float glow = core * 0.5 + halo * 0.5;

    vec3 color = vColor * glow;
    float alpha = glow * 0.9;
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

function buildBuffers(objects, scaleMode, baseSize) {
  const count = objects.length
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const obj = objects[i]

    let px = obj.x, py = obj.y, pz = obj.z
    if (scaleMode === 'log') {
      const c = logCompress(obj.x, obj.y, obj.z)
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

export default function ObjectField({ objects, visible, scaleMode, onSelect, baseSize = 3 }) {
  const materialRef = useRef()
  const pointsRef = useRef()
  const { raycaster } = useThree()
  const pointerDown = useRef(null)
  const instrument = useStore((s) => s.instrument)

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
    return buildBuffers(filtered, scaleMode, baseSize)
  }, [filtered, scaleMode, baseSize])

  useFrame(() => {
    raycaster.params.Points.threshold = 2.0
  })

  const handlePointerDown = useCallback((e) => {
    pointerDown.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleClick = useCallback(
    (e) => {
      if (!filtered.length || !e.intersections.length || !onSelect) return
      if (pointerDown.current) {
        const dx = e.clientX - pointerDown.current.x
        const dy = e.clientY - pointerDown.current.y
        if (Math.sqrt(dx * dx + dy * dy) > 5) return
      }
      e.stopPropagation()
      const hit = e.intersections[0]
      const index = hit.index
      if (index !== undefined && index < filtered.length) {
        onSelect(filtered[index])
      }
    },
    [filtered, onSelect]
  )

  if (filtered.length === 0 || !visible) return null

  return (
    <points
      ref={pointsRef}
      frustumCulled={false}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-objColor"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
