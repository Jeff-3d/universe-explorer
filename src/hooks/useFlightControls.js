import { useRef, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

/**
 * Custom first-person flight controller.
 *
 * Controls:
 *  - WASD: move forward/left/backward/right
 *  - Q/E: roll left/right
 *  - Space: brake (decelerate to stop)
 *  - Shift: boost (2x speed)
 *  - Mouse drag (right-click or middle-click): look around
 *  - Scroll wheel: adjust speed level
 *
 * Speed is logarithmic: speedLevel 0 = 1c, 3 = 1000c, 6 = 1Mc, 9 = 1Gc.
 * Actual movement speed in scene units is scaled by the current scale mode.
 */

// Speed in LY/s at each level (1c ≈ 1 LY/year ≈ 3.17e-8 LY/s, but we scale for playability)
// We use "game units per second" where 1 unit ≈ 1 LY in log-compressed space
const SPEED_TABLE = [
  0.5,      // 0: ~1c — crawl through nearby stars
  2,        // 1: ~10c
  8,        // 2: ~100c
  30,       // 3: ~1Kc — cross star neighborhoods
  120,      // 4: ~10Kc
  500,      // 5: ~100Kc
  2000,     // 6: ~1Mc — cross the galaxy
  8000,     // 7: ~10Mc
  30000,    // 8: ~100Mc — cross galaxy clusters
  120000,   // 9: ~1Gc — cross the observable universe
]

export function useFlightControls(canvasRef) {
  const { camera, gl } = useThree()
  const speedLevel = useStore((s) => s.speedLevel)
  const setSpeedLevel = useStore((s) => s.setSpeedLevel)

  // Key state
  const keys = useRef({})
  const isPointerLocked = useRef(false)
  const isDragging = useRef(false)
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))

  // Initialize camera euler from current orientation
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      euler.current.setFromQuaternion(camera.quaternion, 'YXZ')
      initialized.current = true
    }
  }, [camera])

  // Keyboard handlers
  useEffect(() => {
    const onKeyDown = (e) => {
      // Don't capture if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      keys.current[e.code] = true

      // Speed adjustment with +/-
      if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        setSpeedLevel(speedLevel + 1)
      } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        setSpeedLevel(speedLevel - 1)
      }
    }
    const onKeyUp = (e) => {
      keys.current[e.code] = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [speedLevel, setSpeedLevel])

  // Mouse look + scroll
  useEffect(() => {
    const canvas = gl.domElement

    const onMouseDown = (e) => {
      // Right-click or middle-click to look
      if (e.button === 2 || e.button === 1) {
        isDragging.current = true
        e.preventDefault()
      }
    }
    const onMouseUp = (e) => {
      if (e.button === 2 || e.button === 1) {
        isDragging.current = false
      }
    }
    const onMouseMove = (e) => {
      if (!isDragging.current) return

      const sensitivity = 0.002
      euler.current.y -= e.movementX * sensitivity
      euler.current.x -= e.movementY * sensitivity

      // Clamp pitch to avoid flipping
      euler.current.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.current.x))
    }

    const onWheel = (e) => {
      // Don't capture if over UI elements
      if (e.target !== canvas) return
      e.preventDefault()

      if (e.deltaY < 0) {
        setSpeedLevel(useStore.getState().speedLevel + 1)
      } else {
        setSpeedLevel(useStore.getState().speedLevel - 1)
      }
    }

    const onContextMenu = (e) => e.preventDefault()

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContextMenu)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
    }
  }, [gl, setSpeedLevel])

  // Per-frame movement
  useFrame((_, delta) => {
    const k = keys.current
    const speed = SPEED_TABLE[speedLevel] || 0.5
    const boost = k['ShiftLeft'] || k['ShiftRight'] ? 2 : 1
    const brake = k['Space'] ? 0.1 : 1

    // Direction vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)

    const moveSpeed = speed * boost * brake * delta

    // WASD movement
    if (k['KeyW']) camera.position.addScaledVector(forward, moveSpeed)
    if (k['KeyS']) camera.position.addScaledVector(forward, -moveSpeed)
    if (k['KeyA']) camera.position.addScaledVector(right, -moveSpeed)
    if (k['KeyD']) camera.position.addScaledVector(right, moveSpeed)

    // Q/E for vertical
    if (k['KeyQ']) camera.position.addScaledVector(up, -moveSpeed)
    if (k['KeyE']) camera.position.addScaledVector(up, moveSpeed)

    // Apply euler rotation to camera
    camera.quaternion.setFromEuler(euler.current)

    // Roll with Z/C
    if (k['KeyZ']) {
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(forward.normalize(), delta * 1.5)
      camera.quaternion.premultiply(rollQuat)
      euler.current.setFromQuaternion(camera.quaternion, 'YXZ')
    }
    if (k['KeyC']) {
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(forward.normalize(), -delta * 1.5)
      camera.quaternion.premultiply(rollQuat)
      euler.current.setFromQuaternion(camera.quaternion, 'YXZ')
    }
  })
}
