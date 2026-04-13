import { Canvas } from '@react-three/fiber'
import Universe from './Universe'
import { useStore } from './store'

export default function App() {
  const starsLoading = useStore((s) => s.starsLoading)
  const starsError = useStore((s) => s.starsError)
  const starCount = useStore((s) => s.starCount)

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

      {/* HUD overlay */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <h1 className="text-2xl font-bold text-white/90 tracking-wide">
          Universe Explorer
        </h1>
        {!starsLoading && !starsError && (
          <p className="text-sm text-white/50 mt-1">
            {starCount.toLocaleString()} stars loaded
          </p>
        )}
      </div>
    </div>
  )
}
