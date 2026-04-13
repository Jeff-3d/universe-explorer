/**
 * Stellar sonification synthesizer.
 *
 * Maps star properties to sound:
 * - Temperature → pitch (hot O-type = high, cool M-type = low)
 * - Luminosity → volume
 * - Distance → reverb/attenuation
 *
 * Uses oscillators with smooth envelopes for musical quality.
 */

import { getAudioContext, getMasterGain } from './SoundEngine'

// Temperature to frequency mapping
// O-type (>30000K) → ~880 Hz (A5)
// B-type (~15000K) → ~660 Hz (E5)
// A-type (~8000K) → ~523 Hz (C5)
// F-type (~6500K) → ~440 Hz (A4)
// G-type (~5500K) → ~330 Hz (E4) — Sun-like
// K-type (~4000K) → ~262 Hz (C4)
// M-type (~3000K) → ~165 Hz (E3)
function temperatureToFrequency(temp) {
  if (!temp || temp <= 0) temp = 5500
  // Logarithmic mapping: higher temp = higher pitch
  // Range: 2000K → 130 Hz, 40000K → 1200 Hz
  const logTemp = Math.log10(temp)
  // logTemp ranges from ~3.3 (2000K) to ~4.6 (40000K)
  const freq = 130 * Math.pow(2, (logTemp - 3.3) * 2.5)
  return Math.max(80, Math.min(1500, freq))
}

// Luminosity to gain (quieter for dim stars)
function luminosityToGain(lum) {
  if (!lum || lum <= 0) lum = 1
  return Math.min(0.4, 0.05 + Math.log10(lum + 1) * 0.08)
}

// Spectral type determines timbre (waveform)
function temperatureToWaveform(temp) {
  if (!temp) return 'sine'
  if (temp > 20000) return 'sawtooth' // Hot: bright, harsh
  if (temp > 8000) return 'triangle'  // Medium-hot: clear
  if (temp > 4500) return 'sine'      // Sun-like: pure
  return 'sine'                        // Cool: mellow
}

let activeNotes = []
const MAX_ACTIVE_NOTES = 6

/**
 * Play a star's sonification note.
 * @param {Object} star - Star data with temperature, luminosity
 * @param {number} duration - Duration in seconds
 */
export function playStarNote(star, duration = 2.0) {
  const ctx = getAudioContext()
  if (ctx.state !== 'running') return

  const now = ctx.currentTime
  const freq = temperatureToFrequency(star.temperature)
  const gain = luminosityToGain(star.luminosity)
  const waveform = temperatureToWaveform(star.temperature)

  // Limit concurrent notes
  while (activeNotes.length >= MAX_ACTIVE_NOTES) {
    const oldest = activeNotes.shift()
    try { oldest.osc.stop(now + 0.05) } catch (e) {}
  }

  // Create oscillator
  const osc = ctx.createOscillator()
  osc.type = waveform
  osc.frequency.value = freq

  // Add slight detune for richness
  osc.detune.value = (Math.random() - 0.5) * 10

  // Gain envelope (ADSR-like)
  const gainNode = ctx.createGain()
  gainNode.gain.value = 0
  gainNode.gain.setTargetAtTime(gain, now, 0.05)           // Attack
  gainNode.gain.setTargetAtTime(gain * 0.7, now + 0.1, 0.2) // Decay to sustain
  gainNode.gain.setTargetAtTime(0, now + duration - 0.3, 0.2) // Release

  // Optional: add a second harmonic for richness
  const osc2 = ctx.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.value = freq * 2 // octave up
  const gain2 = ctx.createGain()
  gain2.gain.value = gain * 0.15 // much quieter

  osc.connect(gainNode)
  osc2.connect(gain2)
  gainNode.connect(getMasterGain())
  gain2.connect(getMasterGain())

  osc.start(now)
  osc2.start(now)
  osc.stop(now + duration)
  osc2.stop(now + duration)

  const noteEntry = { osc, osc2 }
  activeNotes.push(noteEntry)

  osc.onended = () => {
    const idx = activeNotes.indexOf(noteEntry)
    if (idx >= 0) activeNotes.splice(idx, 1)
    gainNode.disconnect()
    gain2.disconnect()
  }
}

/**
 * Play an ambient chord from multiple nearby stars.
 * @param {Array} stars - Array of nearby star objects
 */
export function playAmbientChord(stars) {
  if (!stars || stars.length === 0) return
  // Pick up to 3 stars for the chord
  const selection = stars.slice(0, 3)
  selection.forEach((star, i) => {
    setTimeout(() => playStarNote(star, 3.0 + i * 0.5), i * 200)
  })
}
