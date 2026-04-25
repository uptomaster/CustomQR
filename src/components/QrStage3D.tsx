import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls, useTexture } from '@react-three/drei'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CloudQrPalette } from '../lib/qrMatrix'
import './QrStage3D.css'

type QrBlockProps = {
  dataUrl: string
  palette: CloudQrPalette
}

/** 얇은 박스: 앞면만 QR 텍스처, 나머지는 팔레트(벚꽃·나무 톤) */
function QrBlock({ dataUrl, palette }: QrBlockProps) {
  const group = useRef<THREE.Group>(null)
  const tex = useTexture(dataUrl, (t) => {
    t.magFilter = THREE.NearestFilter
    t.minFilter = THREE.NearestFilter
    t.colorSpace = THREE.SRGBColorSpace
  })

  const materials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.dark),
      roughness: 0.45,
      metalness: 0.1,
    })
    const topBottom = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.accent),
      roughness: 0.4,
      metalness: 0.1,
    })
    const back = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.light),
      roughness: 0.5,
    })
    const front = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.22,
      metalness: 0.04,
    })
    // three.js Box: px, nx, py, ny, pz(카메라 쪽 +Z), nz
    return [side, side, topBottom, topBottom, front, back]
  }, [tex, palette.dark, palette.light, palette.accent])

  useFrame((st) => {
    const g = group.current
    if (!g) return
    const t = st.clock.elapsedTime
    g.rotation.y = Math.sin(t * 0.35) * 0.1
    g.rotation.x = Math.cos(t * 0.28) * 0.05
  })

  return (
    <group ref={group} position={[0, 0, 0]}>
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
      <ambientLight intensity={0.58} />
      <directionalLight
        position={[2.5, 4, 3]}
        intensity={0.95}
        color="#fff5f0"
      />
      <pointLight
        position={[-2.2, 1.2, 1.5]}
        intensity={0.45}
        color="#ffc8d8"
      />
      <Suspense fallback={null}>
        <QrBlock dataUrl={dataUrl} palette={palette} />
        <ContactShadows
          position={[0, -1.02, 0]}
          opacity={0.5}
          scale={9}
          blur={2.4}
          far={2.2}
        />
      </Suspense>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={2.4}
        maxDistance={5.8}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI * 0.5}
      />
    </>
  )
}

type Props = {
  dataUrl: string
  palette: CloudQrPalette
}

/** WebGL 3D 미리보기(앞면 = 도트 QR). 다운로드 PNG는 2D 평면이며 스캔용. */
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
