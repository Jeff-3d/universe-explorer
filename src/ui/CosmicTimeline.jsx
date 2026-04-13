import { useStore } from '../store'

/**
 * Cosmic timeline display showing major epochs.
 *
 * Extends the time slider from ViewModeToggle with cosmological context:
 * labels for major epochs (Big Bang, Recombination, First Stars, etc.)
 * and a visual timeline bar.
 */

const EPOCHS = [
  { age: 13800000, label: 'Big Bang', color: 'bg-white/60' },
  { age: 13799620, label: 'Recombination (CMB)', color: 'bg-orange-400/50' },
  { age: 13500000, label: 'Dark Ages', color: 'bg-gray-600/50' },
  { age: 13200000, label: 'First Stars', color: 'bg-blue-400/50' },
  { age: 12800000, label: 'First Galaxies', color: 'bg-purple-400/50' },
  { age: 9200000, label: 'Sun Forms', color: 'bg-yellow-400/50' },
  { age: 4500000, label: 'Earth Forms', color: 'bg-green-400/50' },
  { age: 3500000, label: 'First Life', color: 'bg-emerald-400/50' },
  { age: 250, label: 'Dinosaurs', color: 'bg-lime-400/50' },
  { age: 0.3, label: 'Humans', color: 'bg-cyan-400/50' },
  { age: 0, label: 'Present', color: 'bg-white/80' },
]

export default function CosmicTimeline() {
  const timeOffset = useStore((s) => s.timeOffset)

  // Convert timeOffset (in K years) to "years ago"
  // timeOffset is negative for past, positive for future
  const yearsFromNow = -timeOffset * 1000

  // Find current epoch
  let currentEpoch = EPOCHS[EPOCHS.length - 1]
  for (const epoch of EPOCHS) {
    if (yearsFromNow >= epoch.age * 1000 - 500000) {
      currentEpoch = epoch
      break
    }
  }

  // Only show when time is significantly shifted
  if (Math.abs(timeOffset) < 10) return null

  const formatAge = (kYears) => {
    const years = Math.abs(kYears) * 1000
    if (years >= 1e9) return `${(years / 1e9).toFixed(1)}B`
    if (years >= 1e6) return `${(years / 1e6).toFixed(1)}M`
    if (years >= 1e3) return `${(years / 1e3).toFixed(0)}K`
    return `${years.toFixed(0)}`
  }

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none z-25">
      <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-2 text-center">
        <div className="text-xs text-white/40 mb-1">
          {timeOffset > 0 ? 'Future' : 'Past'}: {formatAge(timeOffset)} years {timeOffset > 0 ? 'from now' : 'ago'}
        </div>
        <div className={`text-sm font-light text-white/70`}>
          {currentEpoch.label}
        </div>
      </div>
    </div>
  )
}
