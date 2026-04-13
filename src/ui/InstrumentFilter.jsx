import { useStore } from '../store'

/**
 * Instrument simulation filter.
 *
 * Simulates what's visible through different instruments by filtering
 * objects based on limiting magnitude and adjusting the visual style.
 *
 * Instruments:
 *  - Naked Eye: ~6 mag (4,548 stars visible)
 *  - Binoculars: ~10 mag
 *  - Backyard Telescope: ~14 mag
 *  - Hubble: ~31 mag (everything in catalog)
 *  - JWST: ~34 mag (infrared mode)
 */

const INSTRUMENTS = [
  { id: 'all', label: 'All', magLimit: 99, description: 'Show all catalog objects' },
  { id: 'naked-eye', label: 'Eye', magLimit: 6.5, description: 'Naked eye (~4,500 stars)' },
  { id: 'binoculars', label: '7×50', magLimit: 10, description: 'Binoculars (~50,000 stars)' },
  { id: 'telescope', label: '8"', magLimit: 14, description: '8-inch telescope' },
  { id: 'hubble', label: 'HST', magLimit: 31, description: 'Hubble Space Telescope' },
  { id: 'jwst', label: 'JWST', magLimit: 34, description: 'James Webb (infrared)' },
]

export default function InstrumentFilter() {
  const instrument = useStore((s) => s.instrument)
  const setInstrument = useStore((s) => s.setInstrument)

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-2">
      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Instrument</div>
      <div className="flex gap-1 flex-wrap">
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.id}
            onClick={() => setInstrument(inst.id)}
            className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
              instrument === inst.id
                ? 'bg-white/20 text-white/90'
                : 'bg-white/5 text-white/40 hover:text-white/70'
            }`}
            title={inst.description}
          >
            {inst.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Export for use in StarField to filter visible stars
export { INSTRUMENTS }
