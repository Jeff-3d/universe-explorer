import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store'

/**
 * Distance narration: contextual facts that appear as you travel.
 *
 * As the camera moves away from the origin (Earth/Sol), milestone
 * facts fade in and out to give emotional context to cosmic distances.
 */

const MILESTONES = [
  { distLY: 0.000004, text: "You've passed the Moon's orbit" },
  { distLY: 0.00002, text: "You've passed Mars at closest approach" },
  { distLY: 0.0006, text: "You've crossed the orbit of Pluto" },
  { distLY: 0.002, text: "You've traveled farther than Voyager 1 — the most distant human-made object" },
  { distLY: 4.24, text: "You've reached Proxima Centauri — the nearest star to Earth" },
  { distLY: 8.6, text: "Sirius, the brightest star in our sky, is at this distance" },
  { distLY: 100, text: "A radio signal from Earth would take 100 years to reach here" },
  { distLY: 430, text: "You've reached Betelgeuse — the red supergiant in Orion's shoulder" },
  { distLY: 1000, text: "The light you see from Earth left during the Middle Ages" },
  { distLY: 1344, text: "You've reached the Orion Nebula — a stellar nursery" },
  { distLY: 26000, text: "You've reached the center of the Milky Way — 26,000 light-years from home" },
  { distLY: 100000, text: "You've crossed the full diameter of the Milky Way" },
  { distLY: 160000, text: "You've reached the Large Magellanic Cloud — our galaxy's companion" },
  { distLY: 2537000, text: "You've reached the Andromeda Galaxy — the nearest large galaxy" },
  { distLY: 50000000, text: "You've entered the Virgo Supercluster — a cosmic neighborhood of thousands of galaxies" },
  { distLY: 500000000, text: "You've crossed 500 million light-years — the cosmic web becomes visible" },
  { distLY: 5000000000, text: "Light from here has been traveling since before Earth existed" },
  { distLY: 13800000000, text: "The light from here has been traveling since the Big Bang — 13.8 billion years" },
]

// Convert LY distance to log-compressed scene units
function lyToScene(ly) {
  return Math.log(1 + ly) * 15.0
}

export default function DistanceNarration() {
  const [activeMessage, setActiveMessage] = useState(null)
  const [visible, setVisible] = useState(false)
  const lastMilestone = useRef(-1)
  const dismissTimer = useRef(null)

  // We need camera position from R3F, but this is a 2D overlay.
  // Use a polling approach via store or direct DOM.
  // Actually, let's track distance via a custom event or store extension.
  // For now, compute from the Three.js canvas.

  useEffect(() => {
    const checkDistance = () => {
      const canvas = document.querySelector('canvas')
      if (!canvas || !canvas.__r3f) return

      const camera = canvas.__r3f.store.getState().camera
      if (!camera) return

      const distScene = camera.position.length()

      // Find the most recently crossed milestone
      let currentMilestone = -1
      for (let i = MILESTONES.length - 1; i >= 0; i--) {
        const sceneThreshold = lyToScene(MILESTONES[i].distLY)
        if (distScene >= sceneThreshold) {
          currentMilestone = i
          break
        }
      }

      if (currentMilestone !== lastMilestone.current && currentMilestone >= 0) {
        lastMilestone.current = currentMilestone
        setActiveMessage(MILESTONES[currentMilestone].text)
        setVisible(true)

        // Auto-dismiss after 6 seconds
        if (dismissTimer.current) clearTimeout(dismissTimer.current)
        dismissTimer.current = setTimeout(() => {
          setVisible(false)
        }, 6000)
      }
    }

    const interval = setInterval(checkDistance, 500)
    return () => {
      clearInterval(interval)
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
  }, [])

  if (!activeMessage || !visible) return null

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
      <div className="text-center animate-fade-in">
        <p className="text-white/70 text-lg font-light max-w-lg leading-relaxed tracking-wide">
          {activeMessage}
        </p>
      </div>
    </div>
  )
}
