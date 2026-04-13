/**
 * Ambient space drone generator.
 *
 * Creates a low-frequency generative drone that:
 * - Deepens in pitch in void regions (low density)
 * - Swells near galaxy clusters (high density)
 * - Provides constant atmospheric immersion
 */

import { getAudioContext, getMasterGain } from './SoundEngine'

let droneOsc1 = null
let droneOsc2 = null
let droneGain = null
let lfo = null
let lfoGain = null
let isRunning = false

const BASE_FREQ = 40 // Hz — deep sub-bass

/**
 * Start the ambient drone.
 */
export function startDrone() {
  if (isRunning) return

  const ctx = getAudioContext()
  if (ctx.state !== 'running') return

  // Main drone oscillator
  droneOsc1 = ctx.createOscillator()
  droneOsc1.type = 'sine'
  droneOsc1.frequency.value = BASE_FREQ

  // Second oscillator — slightly detuned for thickness
  droneOsc2 = ctx.createOscillator()
  droneOsc2.type = 'sine'
  droneOsc2.frequency.value = BASE_FREQ * 1.5 // perfect fifth

  // Gain node
  droneGain = ctx.createGain()
  droneGain.gain.value = 0.06

  // LFO for subtle volume modulation
  lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.1 // Very slow modulation
  lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.02

  lfo.connect(lfoGain)
  lfoGain.connect(droneGain.gain)

  droneOsc1.connect(droneGain)
  droneOsc2.connect(droneGain)
  droneGain.connect(getMasterGain())

  droneOsc1.start()
  droneOsc2.start()
  lfo.start()

  isRunning = true
}

/**
 * Stop the ambient drone.
 */
export function stopDrone() {
  if (!isRunning) return

  const ctx = getAudioContext()
  const now = ctx.currentTime

  if (droneGain) {
    droneGain.gain.setTargetAtTime(0, now, 0.3)
  }

  setTimeout(() => {
    try { droneOsc1?.stop() } catch (e) {}
    try { droneOsc2?.stop() } catch (e) {}
    try { lfo?.stop() } catch (e) {}
    isRunning = false
  }, 1000)
}

/**
 * Update drone based on local density.
 * @param {number} density - Local object density (0 = void, 1 = dense cluster)
 */
export function updateDroneDensity(density) {
  if (!isRunning || !droneOsc1 || !droneGain) return

  const ctx = getAudioContext()
  const now = ctx.currentTime

  // In voids: lower pitch, quieter
  // In clusters: higher pitch, louder
  const freq = BASE_FREQ * (0.5 + density * 1.5)
  const vol = 0.02 + density * 0.08

  droneOsc1.frequency.setTargetAtTime(freq, now, 0.5)
  droneOsc2.frequency.setTargetAtTime(freq * 1.5, now, 0.5)
  droneGain.gain.setTargetAtTime(vol, now, 0.3)
}

export function isDroneRunning() {
  return isRunning
}
