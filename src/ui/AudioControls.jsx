import { useState, useCallback } from 'react'
import { useStore } from '../store'
import { resumeAudio, setMasterVolume, isAudioInitialized } from '../audio/SoundEngine'
import { startDrone, stopDrone } from '../audio/AmbientDrone'
import { startSpeedAudio, stopSpeedAudio } from '../audio/SpeedAudio'

/**
 * Audio control panel with mute toggle and volume slider.
 * Audio requires user gesture to start (Web Audio API policy).
 */
export default function AudioControls() {
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [volume, setVolume] = useState(30)

  const toggleAudio = useCallback(async () => {
    if (!audioEnabled) {
      await resumeAudio()
      setMasterVolume(volume / 100)
      startDrone()
      startSpeedAudio()
      setAudioEnabled(true)
    } else {
      stopDrone()
      stopSpeedAudio()
      setMasterVolume(0)
      setAudioEnabled(false)
    }
  }, [audioEnabled, volume])

  const handleVolumeChange = useCallback((e) => {
    const v = parseInt(e.target.value)
    setVolume(v)
    if (audioEnabled) {
      setMasterVolume(v / 100)
    }
  }, [audioEnabled])

  return (
    <div className="absolute bottom-4 right-4 pointer-events-auto z-20">
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
        <button
          onClick={toggleAudio}
          className={`px-2 py-1 rounded text-xs transition-colors ${
            audioEnabled
              ? 'bg-purple-500/30 border border-purple-400/50 text-purple-200'
              : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'
          }`}
          title={audioEnabled ? 'Mute audio' : 'Enable audio (click to start)'}
        >
          {audioEnabled ? '♪ On' : '♪ Off'}
        </button>

        {audioEnabled && (
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={handleVolumeChange}
            className="w-16 accent-purple-400/60"
            title={`Volume: ${volume}%`}
          />
        )}
      </div>
    </div>
  )
}
