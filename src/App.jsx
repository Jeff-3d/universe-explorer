import { Canvas } from '@react-three/fiber'
import Universe from './Universe'
import { useStore } from './store'
import InfoPanel from './ui/InfoPanel'
import FilterBar from './ui/FilterBar'
import SearchBar from './ui/SearchBar'
import ScaleToggle from './ui/ScaleToggle'
import SpeedControl from './ui/SpeedControl'
import ViewModeToggle from './ui/ViewModeToggle'
import AudioControls from './ui/AudioControls'
import RadiationIndicator from './ui/RadiationIndicator'
import DistanceNarration from './ui/DistanceNarration'
import TourPlayer from './ui/TourPlayer'
import SizeComparison from './ui/SizeComparison'

export default function App() {
  const starsLoading = useStore((s) => s.starsLoading)
  const starsError = useStore((s) => s.starsError)
  const starCount = useStore((s) => s.starCount)
  const galaxyCount = useStore((s) => s.galaxyCount)
  const nebulaCount = useStore((s) => s.nebulaCount)
  const clusterCount = useStore((s) => s.clusterCount)
  const exoplanetCount = useStore((s) => s.exoplanetCount)

  const totalObjects = starCount + galaxyCount + nebulaCount + clusterCount + exoplanetCount

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 200], fov: 60, near: 0.01, far: 500000 }}
        gl={{
          antialias: true,
          logarithmicDepthBuffer: true,
          toneMapping: 0, // NoToneMapping — we handle this in shaders
        }}
      >
        <Universe />
      </Canvas>

      {/* Loading overlay */}
      {starsLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center">
            <div className="text-xl font-light text-white/80 mb-2">Loading Universe...</div>
            <div className="text-sm text-white/40">Fetching star catalog from Supabase</div>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {starsError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center">
            <div className="text-xl font-light text-red-400 mb-2">Failed to load stars</div>
            <div className="text-sm text-white/40">{starsError}</div>
          </div>
        </div>
      )}

      {/* HUD overlay — top left */}
      <div className="absolute top-4 left-4 pointer-events-auto z-20">
        <h1 className="text-2xl font-bold text-white/90 tracking-wide">
          Universe Explorer
        </h1>
        {!starsLoading && !starsError && (
          <p className="text-sm text-white/50 mt-1 mb-3">
            {totalObjects.toLocaleString()} objects loaded
          </p>
        )}

        {/* Search */}
        {!starsLoading && !starsError && (
          <div className="mb-3">
            <SearchBar />
          </div>
        )}

        {/* Filters */}
        {!starsLoading && !starsError && (
          <div className="mb-3">
            <FilterBar />
          </div>
        )}

        {/* Scale toggle */}
        {!starsLoading && !starsError && <ScaleToggle />}

        {/* View mode + time projection */}
        {!starsLoading && !starsError && (
          <div className="mt-2">
            <ViewModeToggle />
          </div>
        )}

        {/* Radiation indicator */}
        {!starsLoading && !starsError && (
          <div className="mt-2">
            <RadiationIndicator />
          </div>
        )}
      </div>

      {/* Info panel — top right */}
      <InfoPanel />

      {/* Speed control — bottom center */}
      {!starsLoading && !starsError && <SpeedControl />}

      {/* Distance narration — center screen */}
      {!starsLoading && !starsError && <DistanceNarration />}

      {/* Tour player — bottom left */}
      {!starsLoading && !starsError && <TourPlayer />}

      {/* Audio controls — bottom right */}
      {!starsLoading && !starsError && <AudioControls />}
    </div>
  )
}
