import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Line of sight beam between two objects.
 *
 * When a camera target exists and an object is selected, renders a
 * faint beam/corridor between the camera position and the selected object,
 * showing the path and what might lie along it.
 */

function logCompress(x, y, z) {
  const dist = Math.sqrt(x * x + y * y + z * z)
  if (dist < 0.001) return new THREE.Vector3(0, 0, 0)
  const logDist = Math.log(1 + dist) * 15.0
  const scale = logDist / dist
  return new THREE.Vector3(x * scale, y * scale, z * scale)
}

export default function LineOfSightBeam() {
  const selectedObject = useStore((s) => s.selectedObject)
  const scaleMode = useStore((s) => s.scaleMode)
  const lineRef = useRef()

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(6)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  useFrame((state) => {
    if (!lineRef.current || !selectedObject) {
      if (lineRef.current) lineRef.current.visible = false
      return
    }

    const camPos = state.camera.position

    let targetPos
    if (scaleMode === 'log') {
      targetPos = logCompress(selectedObject.x, selectedObject.y, selectedObject.z)
    } else {
      targetPos = new THREE.Vector3(selectedObject.x, selectedObject.y, selectedObject.z)
    }

    const positions = geometry.attributes.position.array
    positions[0] = camPos.x
    positions[1] = camPos.y
    positions[2] = camPos.z
    positions[3] = targetPos.x
    positions[4] = targetPos.y
    positions[5] = targetPos.z
    geometry.attributes.position.needsUpdate = true

    lineRef.current.visible = true
  })

  return (
    <line ref={lineRef} geometry={geometry} visible={false} frustumCulled={false}>
      <lineBasicMaterial
        color="#ffaa44"
        transparent
        opacity={0.15}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </line>
  )
}
