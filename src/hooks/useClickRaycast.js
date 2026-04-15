import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Manual click-raycast against a single object (e.g. a Points mesh with 109K
 * vertices). Bypasses R3F's pointer-events system, which would otherwise
 * raycast the entire scene on every mousemove — catastrophic for large Points
 * geometries and the root cause of frame-drop "black flashes" during drags.
 *
 * Fires onHit(intersection) when the user clicks (mousedown + mouseup within
 * 5px of each other) on the object. Does nothing during drags.
 */
export function useClickRaycast(targetRef, onHit, { threshold = 1.5, dragPixels = 5 } = {}) {
  const { gl, camera, raycaster } = useThree()
  const downPos = useRef(null)

  useEffect(() => {
    const canvas = gl.domElement

    const onDown = (e) => {
      if (e.button !== 0) return
      downPos.current = { x: e.clientX, y: e.clientY }
    }

    const onUp = (e) => {
      if (e.button !== 0) return
      const start = downPos.current
      downPos.current = null
      if (!start) return

      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (Math.sqrt(dx * dx + dy * dy) > dragPixels) return

      const target = targetRef.current
      if (!target) return

      const rect = canvas.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )

      // Scale threshold with camera distance from origin: in linear scale mode
      // the scene spans millions of light-years, so a fixed world-space threshold
      // becomes pixel-perfect clicking. Scaling by camera distance gives roughly
      // constant screen-pixel tolerance.
      const camDist = camera.position.length()
      raycaster.params.Points.threshold = Math.max(threshold, camDist * 0.015)
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObject(target, false)
      if (hits.length > 0) onHit(hits[0])
    }

    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mouseup', onUp)
    return () => {
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('mouseup', onUp)
    }
  }, [gl, camera, raycaster, targetRef, onHit, threshold, dragPixels])
}
