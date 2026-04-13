import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { useRef } from 'react'

function SpinningCube() {
  const meshRef = useRef()
  useFrame((_, delta) => {
    meshRef.current.rotation.x += delta * 0.5
    meshRef.current.rotation.y += delta * 0.7
  })
  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4fc3f7" wireframe />
    </mesh>
  )
}

export default function App() {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <SpinningCube />
        <Stars radius={100} depth={50} count={3000} factor={4} fade speed={1} />
        <OrbitControls enableDamping dampingFactor={0.05} />
      </Canvas>

      {/* HUD overlay */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <h1 className="text-2xl font-bold text-white/90 tracking-wide">
          Universe Explorer
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Phase 0 — Scaffold verified
        </p>
      </div>
    </div>
  )
}
