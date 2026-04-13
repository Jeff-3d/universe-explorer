import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import { tourEngine } from '../tours/TourEngine'
import { TOURS } from '../tours/tours'

/**
 * Tour menu and playback controls.
 *
 * Shows available tours and provides play/pause/skip controls
 * during tour playback with narration text overlay.
 */
export default function TourPlayer() {
  const setCameraTarget = useStore((s) => s.setCameraTarget)
  const setSpeedLevel = useStore((s) => s.setSpeedLevel)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [narration, setNarration] = useState('')
  const [step, setStep] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [tourName, setTourName] = useState('')

  useEffect(() => {
    tourEngine.onNarration = (text) => setNarration(text)
    tourEngine.onStepChange = (idx, total) => {
      setStep(idx)
      setTotalSteps(total)
    }
    tourEngine.onComplete = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setNarration('')
    }
  }, [])

  const startTour = useCallback((tour) => {
    tourEngine.start(tour, setCameraTarget, setSpeedLevel)
    setIsPlaying(true)
    setIsPaused(false)
    setTourName(tour.name)
    setMenuOpen(false)
  }, [setCameraTarget, setSpeedLevel])

  const togglePause = useCallback(() => {
    if (isPaused) {
      tourEngine.resume()
      setIsPaused(false)
    } else {
      tourEngine.pause()
      setIsPaused(true)
    }
  }, [isPaused])

  const stopTour = useCallback(() => {
    tourEngine.stop()
    setIsPlaying(false)
    setIsPaused(false)
    setNarration('')
  }, [])

  return (
    <>
      {/* Tour button */}
      <div className="absolute bottom-4 left-4 pointer-events-auto z-20">
        {!isPlaying && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white/90 transition-colors"
          >
            Guided Tours
          </button>
        )}

        {/* Tour menu */}
        {menuOpen && !isPlaying && (
          <div className="mt-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-3 w-72">
            <h3 className="text-sm font-semibold text-white/80 mb-2">Available Tours</h3>
            <div className="space-y-2">
              {TOURS.map((tour) => (
                <button
                  key={tour.id}
                  onClick={() => startTour(tour)}
                  className="w-full text-left p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="text-sm text-white/80">{tour.name}</div>
                  <div className="text-xs text-white/40">{tour.description} · ~{tour.duration} min</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Playback controls */}
        {isPlaying && (
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-white/50">{tourName}</span>
            <span className="text-xs text-white/30">{step + 1}/{totalSteps}</span>
            <button
              onClick={() => tourEngine.previous()}
              className="text-white/40 hover:text-white/80 text-sm"
              title="Previous"
            >
              ◀
            </button>
            <button
              onClick={togglePause}
              className="text-white/60 hover:text-white/90 text-sm"
            >
              {isPaused ? '▶' : '⏸'}
            </button>
            <button
              onClick={() => tourEngine.next()}
              className="text-white/40 hover:text-white/80 text-sm"
              title="Next"
            >
              ▶
            </button>
            <button
              onClick={stopTour}
              className="text-white/40 hover:text-white/80 text-xs ml-1"
            >
              Stop
            </button>
          </div>
        )}
      </div>

      {/* Narration overlay */}
      {narration && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none z-30 w-full max-w-2xl px-4">
          <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-lg p-4 text-center">
            <p className="text-white/80 text-sm leading-relaxed">{narration}</p>
          </div>
        </div>
      )}
    </>
  )
}
