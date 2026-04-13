import { useStore } from '../store'

/**
 * Toggle between observed and estimated-present positions,
 * with a time projection slider and motion vector toggle.
 */
export default function ViewModeToggle() {
  const viewMode = useStore((s) => s.viewMode)
  const setViewMode = useStore((s) => s.setViewMode)
  const timeOffset = useStore((s) => s.timeOffset)
  const setTimeOffset = useStore((s) => s.setTimeOffset)
  const showMotionVectors = useStore((s) => s.showMotionVectors)
  const toggleMotionVectors = useStore((s) => s.toggleMotionVectors)

  const formatTime = (kYears) => {
    if (kYears === 0) return 'Now'
    const abs = Math.abs(kYears)
    const sign = kYears > 0 ? '+' : '-'
    if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(0)}M yr`
    if (abs >= 1) return `${sign}${abs.toFixed(0)}K yr`
    return `${sign}${(abs * 1000).toFixed(0)} yr`
  }

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-2 space-y-1.5">
      {/* View mode toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => setViewMode('observed')}
          className={`px-2 py-0.5 rounded text-xs transition-colors ${
            viewMode === 'observed'
              ? 'bg-white/20 text-white/90'
              : 'bg-white/5 text-white/40 hover:text-white/70'
          }`}
          title="Show objects at their observed positions (where we see them)"
        >
          Observed
        </button>
        <button
          onClick={() => setViewMode('estimated_present')}
          className={`px-2 py-0.5 rounded text-xs transition-colors ${
            viewMode === 'estimated_present'
              ? 'bg-amber-500/30 text-amber-200'
              : 'bg-white/5 text-white/40 hover:text-white/70'
          }`}
          title="Show objects at their estimated present positions (corrected for light travel time)"
        >
          Present
        </button>
      </div>

      {/* Time slider */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/30 w-6">Time</span>
        <input
          type="range"
          min={-1000}
          max={1000}
          step={1}
          value={timeOffset}
          onChange={(e) => setTimeOffset(parseInt(e.target.value))}
          className="w-24 accent-white/40"
          title="Project positions forward/backward in time"
        />
        <span className="text-[10px] text-white/50 w-16 text-right font-mono">
          {formatTime(timeOffset)}
        </span>
        {timeOffset !== 0 && (
          <button
            onClick={() => setTimeOffset(0)}
            className="text-[10px] text-white/30 hover:text-white/60"
          >
            Reset
          </button>
        )}
      </div>

      {/* Motion vectors toggle */}
      <button
        onClick={toggleMotionVectors}
        className={`w-full px-2 py-0.5 rounded text-xs text-left transition-colors ${
          showMotionVectors
            ? 'bg-cyan-500/20 text-cyan-200'
            : 'bg-white/5 text-white/40 hover:text-white/70'
        }`}
      >
        {showMotionVectors ? '→ Motion Vectors On' : '→ Motion Vectors'}
      </button>
    </div>
  )
}
