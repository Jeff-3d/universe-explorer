import { useRef, useEffect, useState } from 'react'
import { useStore } from '../store'

/**
 * HUD indicator showing estimated local gravitational field strength
 * and radiation environment based on proximity to massive objects.
 */
export default function RadiationIndicator() {
  const selectedObject = useStore((s) => s.selectedObject)
  const [intensity, setIntensity] = useState('nominal')

  useEffect(() => {
    if (!selectedObject) {
      setIntensity('nominal')
      return
    }

    // Estimate radiation environment from selected object
    const type = selectedObject._type
    const dist = selectedObject.distance_ly || 1000

    if (type === 'galaxy' && selectedObject.object_type === 'AGN') {
      setIntensity('extreme')
    } else if (selectedObject.temperature && selectedObject.temperature > 25000) {
      setIntensity('high') // Hot O/B stars
    } else if (selectedObject.luminosity && selectedObject.luminosity > 10000) {
      setIntensity('high') // Very luminous
    } else if (dist < 10) {
      setIntensity('moderate')
    } else {
      setIntensity('nominal')
    }
  }, [selectedObject])

  const colors = {
    nominal: 'text-green-400/50',
    moderate: 'text-yellow-400/60',
    high: 'text-orange-400/70',
    extreme: 'text-red-400/80',
  }

  const labels = {
    nominal: 'Nominal',
    moderate: 'Moderate',
    high: 'High',
    extreme: 'Extreme',
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-white/30">RAD</span>
      <span className={`text-[10px] font-mono ${colors[intensity]}`}>
        {labels[intensity]}
      </span>
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          intensity === 'nominal' ? 'bg-green-500/40'
          : intensity === 'moderate' ? 'bg-yellow-500/50'
          : intensity === 'high' ? 'bg-orange-500/60'
          : 'bg-red-500/80 animate-pulse'
        }`}
      />
    </div>
  )
}
