import { useStore } from '../store'

const SPEED_LABELS = [
  '1c', '10c', '100c', '1Kc', '10Kc', '100Kc', '1Mc', '10Mc', '100Mc', '1Gc',
]

const SPEED_PRESETS = [
  { label: '1c', level: 0 },
  { label: '1Kc', level: 3 },
  { label: '1Mc', level: 6 },
  { label: '1Gc', level: 9 },
]

/**
 * Speed control panel with logarithmic slider and preset buttons.
 * Positioned bottom-center of the screen.
 */
export default function SpeedControl() {
  const speedLevel = useStore((s) => s.speedLevel)
  const setSpeedLevel = useStore((s) => s.setSpeedLevel)

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-4 py-2.5 flex items-center gap-4">
        {/* Speed label */}
        <div className="text-center min-w-[60px]">
          <div className="text-lg font-mono text-white/90 font-semibold">
            {SPEED_LABELS[speedLevel]}
          </div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Speed</div>
        </div>

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={9}
          value={speedLevel}
          onChange={(e) => setSpeedLevel(parseInt(e.target.value))}
          className="w-40 accent-white/60"
        />

        {/* Presets */}
        <div className="flex gap-1">
          {SPEED_PRESETS.map(({ label, level }) => (
            <button
              key={level}
              onClick={() => setSpeedLevel(level)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                speedLevel === level
                  ? 'bg-white/20 text-white/90'
                  : 'bg-white/5 text-white/40 hover:text-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Controls hint */}
        <div className="text-[10px] text-white/30 leading-tight ml-2">
          <div>WASD move · Right-drag look</div>
          <div>Scroll speed · Space brake</div>
        </div>
      </div>
    </div>
  )
}
