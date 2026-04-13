import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { isAudioInitialized } from '../audio/SoundEngine'
import { playStarNote } from '../audio/StellarSynth'
import { updateDroneDensity } from '../audio/AmbientDrone'
import { updateSpeedAudio } from '../audio/SpeedAudio'

/**
 * Hook that connects audio subsystems to scene state.
 *
 * - Plays star notes when objects are selected
 * - Updates speed audio on speed changes
 * - Updates drone density based on nearby object count
 */
export function useAudio() {
  const selectedObject = useStore((s) => s.selectedObject)
  const speedLevel = useStore((s) => s.speedLevel)
  const stars = useStore((s) => s.stars)
  const prevSelected = useRef(null)
  const prevSpeed = useRef(0)

  // Play note on star selection
  useEffect(() => {
    if (!isAudioInitialized()) return
    if (!selectedObject) return
    if (selectedObject === prevSelected.current) return
    prevSelected.current = selectedObject

    // Play sonification note for the selected object
    if (selectedObject.temperature || selectedObject._type === undefined) {
      // It's a star (stars don't have _type)
      playStarNote(selectedObject)
    } else if (selectedObject._type === 'galaxy') {
      // Galaxies get a deep chord
      playStarNote({ temperature: 4000, luminosity: 100 }, 3.0)
    } else if (selectedObject._type === 'nebula') {
      // Nebulae get ethereal tones
      playStarNote({ temperature: 8000, luminosity: 10 }, 4.0)
    } else if (selectedObject._type === 'exoplanet') {
      // Exoplanets get a short ping
      playStarNote({ temperature: selectedObject.equilibrium_temp || 300, luminosity: 0.1 }, 1.0)
    }
  }, [selectedObject])

  // Update speed audio
  useEffect(() => {
    if (!isAudioInitialized()) return
    if (speedLevel !== prevSpeed.current) {
      prevSpeed.current = speedLevel
      updateSpeedAudio(speedLevel)
    }
  }, [speedLevel])
}
