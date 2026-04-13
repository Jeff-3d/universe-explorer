/**
 * Speed-reactive audio effects.
 *
 * - Engine hum that rises in pitch with speed
 * - Whooshing at high speeds (>1000c)
 * - Deep rumble at extreme speeds (>1Mc)
 */

import { getAudioContext, getMasterGain } from './SoundEngine'

let engineOsc = null
let engineGain = null
let noiseSource = null
let noiseGain = null
let noiseFilter = null
let isRunning = false

/**
 * Start speed audio system.
 */
export function startSpeedAudio() {
  if (isRunning) return

  const ctx = getAudioContext()
  if (ctx.state !== 'running') return

  // Engine hum oscillator
  engineOsc = ctx.createOscillator()
  engineOsc.type = 'sawtooth'
  engineOsc.frequency.value = 30

  engineGain = ctx.createGain()
  engineGain.gain.value = 0

  // Low-pass filter to smooth the sawtooth
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 100

  engineOsc.connect(filter)
  filter.connect(engineGain)
  engineGain.connect(getMasterGain())
  engineOsc.start()

  // Noise generator for whooshing
  const bufferSize = ctx.sampleRate * 2
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuffer
  noiseSource.loop = true

  noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.value = 500
  noiseFilter.Q.value = 0.5

  noiseGain = ctx.createGain()
  noiseGain.gain.value = 0

  noiseSource.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(getMasterGain())
  noiseSource.start()

  isRunning = true
}

/**
 * Stop speed audio.
 */
export function stopSpeedAudio() {
  if (!isRunning) return

  const ctx = getAudioContext()
  const now = ctx.currentTime

  if (engineGain) engineGain.gain.setTargetAtTime(0, now, 0.1)
  if (noiseGain) noiseGain.gain.setTargetAtTime(0, now, 0.1)

  setTimeout(() => {
    try { engineOsc?.stop() } catch (e) {}
    try { noiseSource?.stop() } catch (e) {}
    isRunning = false
  }, 500)
}

/**
 * Update speed audio based on current speed level.
 * @param {number} speedLevel - 0-9 speed level
 */
export function updateSpeedAudio(speedLevel) {
  if (!isRunning) return

  const ctx = getAudioContext()
  const now = ctx.currentTime

  // Engine hum: pitch rises with speed
  const engineFreq = 30 + speedLevel * 15
  const engineVol = speedLevel > 0 ? 0.01 + speedLevel * 0.005 : 0

  if (engineOsc) {
    engineOsc.frequency.setTargetAtTime(engineFreq, now, 0.1)
  }
  if (engineGain) {
    engineGain.gain.setTargetAtTime(engineVol, now, 0.1)
  }

  // Whooshing noise: kicks in at speed 3+ (1Kc)
  const noiseVol = speedLevel >= 3 ? (speedLevel - 2) * 0.008 : 0
  const noiseFreqCenter = 300 + speedLevel * 100

  if (noiseGain) {
    noiseGain.gain.setTargetAtTime(Math.min(0.06, noiseVol), now, 0.2)
  }
  if (noiseFilter) {
    noiseFilter.frequency.setTargetAtTime(noiseFreqCenter, now, 0.2)
  }
}

export function isSpeedAudioRunning() {
  return isRunning
}
