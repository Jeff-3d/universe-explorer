import { useStore } from '../store'

/**
 * Toggle between linear and logarithmic distance scales.
 * Log mode compresses distant objects so the full galaxy is visible.
 * Linear mode shows true distances (nearby stars only visible).
 */
export default function ScaleToggle() {
  const scaleMode = useStore((s) => s.scaleMode)
  const setScaleMode = useStore((s) => s.setScaleMode)

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/40">Scale:</span>
      <div className="flex rounded border border-white/15 overflow-hidden">
        <button
          onClick={() => setScaleMode('log')}
          className={`px-2.5 py-1 text-xs transition-colors ${
            scaleMode === 'log'
              ? 'bg-white/15 text-white/90'
              : 'bg-transparent text-white/40 hover:text-white/60'
          }`}
        >
          Log
        </button>
        <button
          onClick={() => setScaleMode('linear')}
          className={`px-2.5 py-1 text-xs transition-colors border-l border-white/15 ${
            scaleMode === 'linear'
              ? 'bg-white/15 text-white/90'
              : 'bg-transparent text-white/40 hover:text-white/60'
          }`}
        >
          Linear
        </button>
      </div>
    </div>
  )
}
