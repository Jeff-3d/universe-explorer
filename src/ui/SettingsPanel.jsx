import { useState } from 'react'
import { useStore } from '../store'

/**
 * Settings panel with quality presets and feature toggles.
 *
 * Provides:
 * - Quality presets (Low/Medium/High)
 * - Individual feature toggles
 * - Keybinding reference
 */

const KEYBINDINGS = [
  { key: 'W/A/S/D', action: 'Move forward/left/back/right' },
  { key: 'Q/E', action: 'Move up/down' },
  { key: 'Z/C', action: 'Roll left/right' },
  { key: 'Right-drag', action: 'Look around' },
  { key: 'O', action: 'Orbit view (drag to spin scene)' },
  { key: 'Scroll', action: 'Adjust speed' },
  { key: 'Space', action: 'Brake' },
  { key: 'Shift', action: '2× speed boost' },
  { key: '+/−', action: 'Speed level up/down' },
]

export default function SettingsPanel() {
  const [open, setOpen] = useState(false)

  const filters = useStore((s) => s.filters)
  const toggleFilter = useStore((s) => s.toggleFilter)
  const showMotionVectors = useStore((s) => s.showMotionVectors)
  const toggleMotionVectors = useStore((s) => s.toggleMotionVectors)
  const relativisticMode = useStore((s) => s.relativisticMode)
  const toggleRelativisticMode = useStore((s) => s.toggleRelativisticMode)
  const graphicsMode = useStore((s) => s.graphicsMode)
  const toggleGraphicsMode = useStore((s) => s.toggleGraphicsMode)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute top-4 right-4 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white/40 hover:text-white/70 pointer-events-auto z-10 transition-colors"
        style={{ top: 'auto', bottom: '60px', right: '16px' }}
      >
        Settings
      </button>
    )
  }

  return (
    <div
      className="absolute pointer-events-auto z-30 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-4 w-72"
      style={{ bottom: '60px', right: '16px' }}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-white/80">Settings</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-white/40 hover:text-white/80 text-xs"
        >
          Close
        </button>
      </div>

      {/* Performance */}
      <div className="space-y-2 mb-4">
        <h4 className="text-[10px] text-white/30 uppercase tracking-wider">Performance</h4>
        <Toggle
          label="Low Graphics Mode"
          checked={graphicsMode === 'low'}
          onChange={toggleGraphicsMode}
        />
        <p className="text-[10px] text-white/30 leading-snug">
          Disables bloom, cosmic web, CMB shell, warp tunnel, galaxy sprites,
          and dark-matter halos. Helps if the scene stutters when panning.
        </p>
      </div>

      {/* Feature toggles */}
      <div className="space-y-2 mb-4">
        <h4 className="text-[10px] text-white/30 uppercase tracking-wider">Features</h4>

        <Toggle label="Stars" checked={filters.stars} onChange={() => toggleFilter('stars')} />
        <Toggle label="Galaxies" checked={filters.galaxies} onChange={() => toggleFilter('galaxies')} />
        <Toggle label="Nebulae" checked={filters.nebulae} onChange={() => toggleFilter('nebulae')} />
        <Toggle label="Clusters" checked={filters.clusters} onChange={() => toggleFilter('clusters')} />
        <Toggle label="Exoplanets" checked={filters.exoplanets} onChange={() => toggleFilter('exoplanets')} />
        <Toggle label="Motion Vectors" checked={showMotionVectors} onChange={toggleMotionVectors} />
        <Toggle label="Relativistic Mode" checked={relativisticMode} onChange={toggleRelativisticMode} />
      </div>

      {/* Keybindings */}
      <div className="space-y-1">
        <h4 className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Controls</h4>
        {KEYBINDINGS.map(({ key, action }) => (
          <div key={key} className="flex justify-between text-[10px]">
            <span className="text-white/50 font-mono">{key}</span>
            <span className="text-white/30">{action}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className="flex items-center justify-between w-full text-xs"
    >
      <span className="text-white/60">{label}</span>
      <div className={`w-8 h-4 rounded-full transition-colors ${checked ? 'bg-blue-500/40' : 'bg-white/10'}`}>
        <div className={`w-3 h-3 rounded-full bg-white/80 transform transition-transform mt-0.5 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </button>
  )
}
