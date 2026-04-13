import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Fly-to animation hook.
 *
 * When cameraTarget is set in the store, smoothly animates the camera
 * from its current position to a viewpoint near the target object.
 * Disables OrbitControls during animation and updates its target
 * on completion so the camera orbits around the destination.
 */

// Log-compress a position to match StarField's visual coordinates
function logCompress(x, y, z) {
  const dist = Math.sqrt(x * x + y * y + z * z)
  if (dist < 0.001) return new THREE.Vector3(0, 0, 0)
  const logDist = Math.log(1 + dist) * 15.0
  const scale = logDist / dist
  return new THREE.Vector3(x * scale, y * scale, z * scale)
}

export function useCamera() {
  const { camera } = useThree()
  const cameraTarget = useStore((s) => s.cameraTarget)
  const setCameraTarget = useStore((s) => s.setCameraTarget)
  const orbitControls = useStore((s) => s.orbitControlsRef)
  const scaleMode = useStore((s) => s.scaleMode)

  const animating = useRef(false)
  const startPos = useRef(new THREE.Vector3())
  const endPos = useRef(new THREE.Vector3())
  const lookAtPos = useRef(new THREE.Vector3())
  const progress = useRef(0)
  const prevTarget = useRef(null)

  useFrame((_, delta) => {
    if (!cameraTarget) {
      animating.current = false
      prevTarget.current = null
      return
    }

    // New target — set up animation
    if (cameraTarget !== prevTarget.current) {
      prevTarget.current = cameraTarget

      // Disable OrbitControls during fly-to
      if (orbitControls) orbitControls.enabled = false

      // Compute target position in visual space
      let targetVec
      if (scaleMode === 'log') {
        targetVec = logCompress(cameraTarget.x, cameraTarget.y, cameraTarget.z)
      } else {
        targetVec = new THREE.Vector3(cameraTarget.x, cameraTarget.y, cameraTarget.z)
      }

      lookAtPos.current.copy(targetVec)

      // Position camera slightly offset from the target
      const dir = new THREE.Vector3()
        .subVectors(camera.position, targetVec)
        .normalize()
      if (dir.length() < 0.001) dir.set(0, 0, 1)

      // Place camera at a comfortable viewing distance from the target
      // Use a larger offset so the star is clearly identifiable
      const viewDist = Math.max(5, targetVec.length() * 0.05)
      endPos.current.copy(targetVec).add(dir.multiplyScalar(viewDist))

      startPos.current.copy(camera.position)
      progress.current = 0
      animating.current = true
    }

    if (!animating.current) return

    // Advance animation (ease-out cubic, ~2 seconds)
    progress.current += delta * 0.7
    const t = Math.min(1, progress.current)
    const ease = 1 - Math.pow(1 - t, 3)

    camera.position.lerpVectors(startPos.current, endPos.current, ease)
    camera.lookAt(lookAtPos.current)

    if (t >= 1) {
      animating.current = false

      // Update OrbitControls target to the star's position and re-enable
      if (orbitControls) {
        orbitControls.target.copy(lookAtPos.current)
        orbitControls.enabled = true
        orbitControls.update()
      }

      setCameraTarget(null)
    }
  })
}
