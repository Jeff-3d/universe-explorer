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
import InstrumentFilter from './ui/InstrumentFilter'
import RealSkyOverlay from './ui/RealSkyOverlay'
import CosmicTimeline from './ui/CosmicTimeline'
import SnapshotJournal from './ui/SnapshotJournal'
import SettingsPanel from './ui/SettingsPanel'
import SizeComparison from './ui/SizeComparison'
import OrbitToggle from './ui/OrbitToggle'

export default function App() {
  const starsLoading = useStore((s) => s.starsLoading)
  const starsError = useStore((s) => s.starsError)
  const starLoadProgress = useStore((s) => s.starLoadProgress)
  const starCount = useStore((s) => s.starCount)
  const galaxyCount = useStore((s) => s.galaxyCount)
  const nebulaCount = useStore((s) => s.nebulaCount)
  const clusterCount = useStore((s) => s.clusterCount)
  const exoplanetCount = useStore((s) => s.exoplanetCount)

  const totalObjects = starCount + galaxyCount + nebulaCount + clusterCount + exoplanetCount

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 200], fov: 60, near: 0.01, far: 1e11 }}
        gl={{
          antialias: true,
          logarithmicDepthBuffer: true,
          toneMapping: 0, // NoToneMapping — we handle this in shaders
        }}
      >
        <Universe />
      </Canvas>

      {/* Non-blocking load indicator — bottom center, canvas stays interactive */}
      {starsLoading && !starsError && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="px-4 py-2 rounded-full bg-black/70 border border-white/10 backdrop-blur text-xs text-white/70 flex items-center gap-3">
            <span>Loading star catalog</span>
            <div className="w-32 h-1 bg-white/10 rounded overflow-hidden">
              <div
                className="h-full bg-white/60 transition-[width] duration-150"
                style={{ width: `${Math.round((starLoadProgress || 0) * 100)}%` }}
              />
            </div>
            <span className="tabular-nums w-9 text-right">{Math.round((starLoadProgress || 0) * 100)}%</span>
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

        {/* Instrument filter */}
        {!starsLoading && !starsError && (
          <div className="mt-2">
            <InstrumentFilter />
          </div>
        )}

        {/* Tonight's sky */}
        {!starsLoading && !starsError && (
          <div className="mt-2">
            <RealSkyOverlay />
          </div>
        )}

        {/* Radiation indicator */}
        {!starsLoading && !starsError && (
          <div className="mt-2">
            <RadiationIndicator />
          </div>
        )}
      </div>

      {/* Snapshot journal — top right area */}
      {!starsLoading && !starsError && <SnapshotJournal />}

      {/* Info panel — top right */}
      <InfoPanel />

      {/* Speed control — bottom center */}
      {!starsLoading && !starsError && <SpeedControl />}

      {/* Distance narration — center screen */}
      {!starsLoading && !starsError && <DistanceNarration />}

      {/* Cosmic timeline — top center when time is shifted */}
      {!starsLoading && !starsError && <CosmicTimeline />}

      {/* Tour player — bottom left */}
      {!starsLoading && !starsError && <TourPlayer />}

      {/* Audio controls — bottom right */}
      {!starsLoading && !starsError && <AudioControls />}

      {/* Orbit-view toggle — drag to rotate the whole scene */}
      {!starsLoading && !starsError && <OrbitToggle />}

      {/* Settings panel */}
      {!starsLoading && !starsError && <SettingsPanel />}
    </div>
  )
}
