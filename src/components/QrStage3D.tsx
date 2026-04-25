import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Float, OrbitControls, useTexture } from '@react-three/drei'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CloudQrPalette } from '../lib/qrMatrix'
import './QrStage3D.css'

const L = THREE.MathUtils.lerp

type QrBlockProps = {
  dataUrl: string
  palette: CloudQrPalette
}

function QrBlock({ dataUrl, palette }: QrBlockProps) {
  const tilt = useRef<THREE.Group>(null)
  const tex = useTexture(dataUrl, (t) => {
    t.magFilter = THREE.NearestFilter
    t.minFilter = THREE.NearestFilter
    t.colorSpace = THREE.SRGBColorSpace
  })

  const materials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.dark),
      roughness: 0.4,
      metalness: 0.12,
    })
    const topBottom = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.accent),
      roughness: 0.35,
      metalness: 0.12,
    })
    const back = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.light),
      roughness: 0.5,
    })
    const front = new THREE.MeshPhysicalMaterial({
      map: tex,
      roughness: 0.2,
      metalness: 0.04,
      clearcoat: 0.1,
      clearcoatRoughness: 0.4,
    })
    return [side, side, topBottom, topBottom, front, back]
  }, [tex, palette.dark, palette.light, palette.accent])

  const { pointer, clock } = useThree()

  useFrame(() => {
    const g = tilt.current
    if (!g) return
    const t = clock.elapsedTime
    const targetY = pointer.x * 0.4 + Math.sin(t * 0.2) * 0.035
    const targetX = -pointer.y * 0.28 + Math.cos(t * 0.16) * 0.022
    g.rotation.y = L(g.rotation.y, targetY, 0.1)
    g.rotation.x = L(g.rotation.x, targetX, 0.1)
  })

  return (
    <group ref={tilt}>
      <mesh material={materials}>
        <boxGeometry args={[2, 2, 0.2]} />
      </mesh>
    </group>
  )
}

type QrSceneProps = QrBlockProps

function QrScene({ dataUrl, palette }: QrSceneProps) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[2.2, 3.5, 2.8]}
        intensity={0.9}
        color="#fff4f0"
      />
      <pointLight position={[-1.2, 0.4, 1.4]} intensity={0.25} color="#e8b8c8" />
      <Suspense fallback={null}>
        <Float
          floatIntensity={0.4}
          rotationIntensity={0.12}
          speed={1.2}
        >
          <QrBlock dataUrl={dataUrl} palette={palette} />
        </Float>
        <ContactShadows
          position={[0, -1.02, 0]}
          opacity={0.45}
          scale={8}
          blur={2.4}
          far={2}
        />
      </Suspense>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.28}
        minDistance={2.2}
        maxDistance={5.5}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI * 0.5}
      />
    </>
  )
}

type Props = {
  dataUrl: string
  palette: CloudQrPalette
}

export function QrStage3D({ dataUrl, palette }: Props) {
  return (
    <div
      className="qr-stage-3d"
      role="img"
      aria-label="3D QR 미리보기"
    >
      <Canvas
        className="qr-stage-3d__canvas"
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0.2, 3.5], fov: 40, near: 0.1, far: 100 }}
        shadows={false}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
          gl.outputColorSpace = THREE.SRGBColorSpace
        }}
      >
        <QrScene dataUrl={dataUrl} palette={palette} />
      </Canvas>
    </div>
  )
}
