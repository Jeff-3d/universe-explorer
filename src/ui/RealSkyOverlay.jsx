import { useState, useEffect, useCallback } from 'react'

/**
 * Real-time sky overlay.
 *
 * Requests user GPS location and current time to compute which
 * objects are currently above their horizon. Shows cardinal
 * directions and highlights tonight's best viewing targets.
 */

// Compute Local Sidereal Time
function localSiderealTime(lng, date) {
  const J2000 = new Date('2000-01-01T12:00:00Z')
  const daysSinceJ2000 = (date - J2000) / 86400000
  const gmst = 280.46061837 + 360.98564736629 * daysSinceJ2000
  const lst = ((gmst + lng) % 360 + 360) % 360
  return lst // degrees
}

// Check if an object (RA/Dec) is above the horizon
function isAboveHorizon(ra, dec, lat, lst) {
  // Hour angle
  const ha = ((lst - ra) + 360) % 360
  const haRad = ha * Math.PI / 180
  const decRad = dec * Math.PI / 180
  const latRad = lat * Math.PI / 180

  // Altitude
  const sinAlt = Math.sin(decRad) * Math.sin(latRad) +
                 Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad)
  const alt = Math.asin(sinAlt) * 180 / Math.PI

  return { alt, above: alt > 0 }
}

export default function RealSkyOverlay() {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [skyInfo, setSkyInfo] = useState(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setError(null)
      },
      (err) => setError(err.message),
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }, [])

  // Compute sky info when location is available
  useEffect(() => {
    if (!location) return

    const now = new Date()
    const lst = localSiderealTime(location.lng, now)
    const hour = now.getHours()

    // Determine if it's nighttime (rough approximation)
    const isNight = hour < 5 || hour > 20
    const isDusk = hour >= 18 && hour <= 20
    const isDawn = hour >= 5 && hour <= 7

    // Some notable bright objects to check
    const notableObjects = [
      { name: 'Sirius', ra: 101.29, dec: -16.72, mag: -1.46 },
      { name: 'Canopus', ra: 95.99, dec: -52.70, mag: -0.74 },
      { name: 'Arcturus', ra: 213.92, dec: 19.18, mag: -0.05 },
      { name: 'Vega', ra: 279.23, dec: 38.78, mag: 0.03 },
      { name: 'Capella', ra: 79.17, dec: 45.99, mag: 0.08 },
      { name: 'Rigel', ra: 78.63, dec: -8.20, mag: 0.13 },
      { name: 'Betelgeuse', ra: 88.79, dec: 7.41, mag: 0.42 },
      { name: 'Polaris', ra: 37.95, dec: 89.26, mag: 1.98 },
    ]

    const visible = notableObjects
      .map(obj => {
        const result = isAboveHorizon(obj.ra, obj.dec, location.lat, lst)
        return { ...obj, ...result }
      })
      .filter(obj => obj.above)
      .sort((a, b) => b.alt - a.alt)

    setSkyInfo({
      lst: lst.toFixed(1),
      isNight,
      isDusk,
      isDawn,
      visibleCount: visible.length,
      brightestVisible: visible.slice(0, 5),
      bestViewing: isNight ? 'Now' : isDusk ? 'Soon (after sunset)' : isDawn ? 'Ending (sunrise approaching)' : `After ${20 - hour} hours`,
    })
  }, [location])

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-2">
      <button
        onClick={() => {
          setExpanded(!expanded)
          if (!location) requestLocation()
        }}
        className="text-[11px] text-white/50 hover:text-white/80 transition-colors w-full text-left"
      >
        {expanded ? '▾' : '▸'} Tonight's Sky
      </button>

      {expanded && (
        <div className="mt-2 space-y-1">
          {error && (
            <p className="text-[10px] text-red-400/60">{error}</p>
          )}

          {!location && !error && (
            <button
              onClick={requestLocation}
              className="text-[10px] text-blue-400/60 hover:text-blue-300/80"
            >
              Share location to see your sky
            </button>
          )}

          {skyInfo && (
            <>
              <div className="text-[10px] text-white/30">
                LST: {skyInfo.lst}° · Viewing: {skyInfo.bestViewing}
              </div>

              {skyInfo.brightestVisible.length > 0 && (
                <div className="space-y-0.5">
                  <div className="text-[10px] text-white/40">Above your horizon now:</div>
                  {skyInfo.brightestVisible.map((obj) => (
                    <div key={obj.name} className="text-[10px] text-white/60 flex justify-between">
                      <span>{obj.name}</span>
                      <span className="text-white/30">{obj.alt.toFixed(0)}° alt</span>
                    </div>
                  ))}
                </div>
              )}

              {skyInfo.brightestVisible.length === 0 && (
                <div className="text-[10px] text-white/30">
                  No bright stars above your horizon right now
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
