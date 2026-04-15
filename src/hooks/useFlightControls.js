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
  const isFlyingTo = useStore((s) => s.isFlyingTo)
  const orbitTarget = useStore((s) => s.orbitTarget)
  const setOrbitTarget = useStore((s) => s.setOrbitTarget)
  const wasFlyingTo = useRef(false)

  // Key state
  const keys = useRef({})
  const isPointerLocked = useRef(false)
  const isDragging = useRef(false)
  const leftDragging = useRef(false)
  const leftDragDist = useRef(0)
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

      // 'O' toggles orbit-around-origin mode — drag to rotate the scene
      if (e.code === 'KeyO') {
        const cur = useStore.getState().orbitTarget
        if (cur && cur.x === 0 && cur.y === 0 && cur.z === 0) {
          useStore.getState().setOrbitTarget(null)
        } else {
          useStore.getState().setOrbitTarget({ x: 0, y: 0, z: 0 })
        }
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
      if (e.button === 2 || e.button === 1) {
        // Right/middle-click: immediate drag look
        isDragging.current = true
        e.preventDefault()
      } else if (e.button === 0) {
        // Left-click: track for drag detection
        leftDragging.current = true
        leftDragDist.current = 0
      }
    }
    const onMouseUp = (e) => {
      if (e.button === 2 || e.button === 1) {
        isDragging.current = false
      } else if (e.button === 0) {
        leftDragging.current = false
      }
    }
    const onMouseMove = (e) => {
      const isDrag = leftDragging.current || isDragging.current

      // Left-click drag: start rotating after 5px of movement
      if (leftDragging.current) {
        leftDragDist.current += Math.abs(e.movementX) + Math.abs(e.movementY)
        if (leftDragDist.current <= 5) return
        e.preventDefault()
      } else if (!isDragging.current) {
        return
      }

      const sensitivity = 0.002
      const orb = useStore.getState().orbitTarget

      if (orb) {
        // Orbit mode: rotate camera around the target point
        const pivot = new THREE.Vector3(orb.x, orb.y, orb.z)
        const offset = camera.position.clone().sub(pivot)
        const radius = offset.length()

        // Spherical rotation around pivot
        const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -e.movementX * sensitivity)
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
        const qX = new THREE.Quaternion().setFromAxisAngle(right, -e.movementY * sensitivity)

        offset.applyQuaternion(qY).applyQuaternion(qX)

        // Prevent flipping past poles
        const up = offset.clone().normalize()
        if (Math.abs(up.y) > 0.99) {
          offset.applyQuaternion(qX.invert())
        }

        camera.position.copy(pivot).add(offset)
        camera.lookAt(pivot)
        euler.current.setFromQuaternion(camera.quaternion, 'YXZ')
      } else {
        // Free-look mode: rotate camera in place
        euler.current.y -= e.movementX * sensitivity
        euler.current.x -= e.movementY * sensitivity
        euler.current.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.current.x))
      }
    }

    const onWheel = (e) => {
      // Don't capture if over UI elements
      if (e.target !== canvas) return
      e.preventDefault()

      const orb = useStore.getState().orbitTarget

      if (orb) {
        // Orbit mode: dolly toward/away from target
        const pivot = new THREE.Vector3(orb.x, orb.y, orb.z)
        const offset = camera.position.clone().sub(pivot)
        const dist = offset.length()
        const factor = e.deltaY < 0 ? 0.85 : 1.18 // zoom in/out
        const newDist = Math.max(0.5, dist * factor)
        offset.normalize().multiplyScalar(newDist)
        camera.position.copy(pivot).add(offset)
      } else {
        // Free flight: move forward/backward
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
        const currentSpeed = SPEED_TABLE[useStore.getState().speedLevel] || 0.5
        const zoomStep = currentSpeed * 0.5
        if (e.deltaY < 0) {
          camera.position.addScaledVector(forward, zoomStep)
        } else {
          camera.position.addScaledVector(forward, -zoomStep)
        }
      }
    }

    const onContextMenu = (e) => e.preventDefault()
    const onDragStart = (e) => e.preventDefault()
    const onSelectStart = (e) => { if (leftDragging.current) e.preventDefault() }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContextMenu)
    canvas.addEventListener('dragstart', onDragStart)
    document.addEventListener('selectstart', onSelectStart)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContextMenu)
      canvas.removeEventListener('dragstart', onDragStart)
      document.removeEventListener('selectstart', onSelectStart)
    }
  }, [gl, setSpeedLevel])

  // Per-frame movement
  useFrame((_, delta) => {
    // When fly-to animation just finished, sync euler from the final camera orientation
    if (wasFlyingTo.current && !isFlyingTo) {
      euler.current.setFromQuaternion(camera.quaternion, 'YXZ')
    }
    wasFlyingTo.current = isFlyingTo

    // Skip all flight control input during fly-to animation
    if (isFlyingTo) return

    const k = keys.current
    const speed = SPEED_TABLE[speedLevel] || 0.5
    const boost = k['ShiftLeft'] || k['ShiftRight'] ? 2 : 1
    const brake = k['Space'] ? 0.1 : 1

    // Direction vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)

    const moveSpeed = speed * boost * brake * delta

    // WASD movement — exit orbit mode on any movement key
    const moving = k['KeyW'] || k['KeyS'] || k['KeyA'] || k['KeyD'] || k['KeyQ'] || k['KeyE']
    if (moving && orbitTarget) {
      setOrbitTarget(null)
    }

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
