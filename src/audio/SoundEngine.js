/**
 * Master sound engine using Web Audio API.
 *
 * Manages the AudioContext, master gain, and coordinates
 * all audio subsystems (stellar synth, ambient drone, speed audio).
 */

let audioContext = null
let masterGain = null
let initialized = false

export function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    masterGain = audioContext.createGain()
    masterGain.gain.value = 0.3
    masterGain.connect(audioContext.destination)
  }
  return audioContext
}

export function getMasterGain() {
  getAudioContext()
  return masterGain
}

export function setMasterVolume(vol) {
  const gain = getMasterGain()
  gain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), getAudioContext().currentTime, 0.05)
}

/**
 * Resume audio context (must be called from user gesture).
 */
export async function resumeAudio() {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
  initialized = true
  return ctx
}

export function isAudioInitialized() {
  return initialized && audioContext && audioContext.state === 'running'
}
