import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  ContactShadows,
  Float,
  OrbitControls,
  useTexture,
} from '@react-three/drei'
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as THREE from 'three'
import { buildCherryQrVoxels } from '../lib/qrCherryVoxels'
import type { CloudQrPalette } from '../lib/qrMatrix'
import {
  canopyMaterialForSeason,
  grassPatchColor,
  trunkBarkColor,
} from '../lib/seasonVoxelTints'
import type { Season } from '../lib/season'
import './QrStage3D.css'

const L = THREE.MathUtils.lerp

function colorFromCss(s: string): THREE.Color {
  const c = new THREE.Color()
  try {
    c.setStyle(s)
  } catch {
    c.set('#888888')
  }
  return c
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** dataUrl 바뀔 때마다 적용 — drei's useTexture onLoad는 새 텍스처에 재호출되지 않음 */
function configureQrTexture(t: THREE.Texture) {
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestFilter
  t.generateMipmaps = false
  t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
}

type QrBlockProps = {
  dataUrl: string
  palette: CloudQrPalette
  season: Season
}

function QrBlock({ dataUrl, palette, season }: QrBlockProps) {
  const tilt = useRef<THREE.Group>(null)
  const tex = useTexture(dataUrl)
  useLayoutEffect(() => {
    configureQrTexture(tex)
  }, [tex])

  const materials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({
      color: colorFromCss(trunkBarkColor(season)),
      roughness: 0.4,
      metalness: 0.12,
    })
    const topBottom = new THREE.MeshStandardMaterial({
      color: colorFromCss(palette.accent),
      roughness: 0.35,
      metalness: 0.12,
    })
    const back = new THREE.MeshStandardMaterial({
      color: colorFromCss(palette.light),
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
  }, [tex, palette.light, palette.accent, season])

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

type InstancedLayerProps = {
  matrices: THREE.Matrix4[]
  material: THREE.MeshStandardMaterial
  instanceColors?: THREE.Color[]
}

function InstancedLayer({
  matrices,
  material,
  instanceColors,
}: InstancedLayerProps) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geom = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const cap = Math.max(1, matrices.length)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const n = matrices.length
    mesh.count = n
    for (let i = 0; i < n; i++) {
      mesh.setMatrixAt(i, matrices[i])
    }
    mesh.instanceMatrix.needsUpdate = true
    if (instanceColors && instanceColors.length >= n) {
      for (let i = 0; i < n; i++) {
        mesh.setColorAt(i, instanceColors[i])
      }
      mesh.instanceColor!.needsUpdate = true
    }
  }, [matrices, instanceColors])

  if (matrices.length === 0) return null

  return (
    <instancedMesh
      ref={ref}
      args={[geom, material, cap]}
      frustumCulled={false}
    />
  )
}

type CherryVoxelViewProps = {
  dataUrl: string
  palette: CloudQrPalette
  season: Season
  flatTarget: number
  built: NonNullable<ReturnType<typeof buildCherryQrVoxels>>
}

function CherryVoxelView({
  dataUrl,
  palette,
  season,
  flatTarget,
  built,
}: CherryVoxelViewProps) {
  const tex = useTexture(dataUrl)
  useLayoutEffect(() => {
    configureQrTexture(tex)
  }, [tex])

  const { keyRgb, rimRgb } = useMemo(() => {
    const Lc = colorFromCss(palette.light)
    const Ac = colorFromCss(palette.accent)
    const key = Lc.clone().lerp(new THREE.Color(1, 1, 1), 0.38)
    const rim = Ac.clone().lerp(Lc, 0.22)
    return { keyRgb: key, rimRgb: rim }
  }, [palette.light, palette.accent])

  const mats = useMemo(() => {
    const ground = new THREE.MeshStandardMaterial({
      color: colorFromCss(palette.light),
      roughness: 0.52,
      metalness: 0.05,
      transparent: true,
      opacity: 1,
    })
    const trunk = new THREE.MeshStandardMaterial({
      color: colorFromCss(trunkBarkColor(season)),
      roughness: 0.48,
      metalness: 0.07,
      transparent: true,
      opacity: 1,
    })
    const grass = new THREE.MeshStandardMaterial({
      color: colorFromCss(grassPatchColor(season)),
      roughness: 0.6,
      metalness: 0.03,
      transparent: true,
      opacity: 1,
    })
    const canopySurf = canopyMaterialForSeason(season)
    const blossom = new THREE.MeshStandardMaterial({
      color: new THREE.Color(1, 1, 1),
      roughness: canopySurf.roughness,
      metalness: canopySurf.metalness,
      emissive:
        season === 'winter'
          ? new THREE.Color(0xd8e8f8)
          : season === 'spring'
            ? new THREE.Color(0xffb8c8)
            : new THREE.Color(0x000000),
      emissiveIntensity:
        season === 'winter' ? 0.07 : season === 'spring' ? 0.05 : 0,
      transparent: true,
      opacity: 1,
    })
    return { ground, trunk, grass, blossom }
  }, [palette, season])

  const planeMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      toneMapped: false,
      depthTest: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  }, [tex])

  useEffect(() => {
    return () => {
      mats.ground.dispose()
      mats.trunk.dispose()
      mats.grass.dispose()
      mats.blossom.dispose()
      planeMat.map = null
      planeMat.dispose()
    }
  }, [mats, planeMat])

  const flatTargetRef = useRef(flatTarget)
  useLayoutEffect(() => {
    flatTargetRef.current = flatTarget
  }, [flatTarget])

  const rawProgressRef = useRef(0)
  /**
   * 데모(reactiive cherry QR)와 같이 등각 → 탑다운을 **연속 보간**.
   * 구면 좌표로 iso / flat 방향을 잡고 easeInOutCubic(p)로 이어 카메라를 움직임.
   */
  const sphIso = useMemo(() => {
    return new THREE.Spherical().setFromVector3(
      new THREE.Vector3(2.75, 2.05, 2.75),
    )
  }, [])
  /**
   * 탑다운: Y축 근처에서만 살짝 비틀기(X≈Z이면 대각선 시점이라 QR이 45° 돌아간 것처럼 보임).
   * Z만 작게 주어 월드 X가 화면 가로에 가깝게 정렬.
   */
  const sphFlat = useMemo(() => {
    return new THREE.Spherical().setFromVector3(
      new THREE.Vector3(0, 15.6, 0.06),
    )
  }, [])
  const shadowWrapRef = useRef<THREE.Group>(null)
  const voxelGroupRef = useRef<THREE.Group>(null)

  useFrame((state, dt) => {
    const tgt = flatTargetRef.current
    const rp = rawProgressRef.current
    rawProgressRef.current += (tgt - rp) * Math.min(1, 3.25 * dt)
    const p = easeInOutCubic(
      THREE.MathUtils.clamp(rawProgressRef.current, 0, 1),
    )

    const cam = state.camera as THREE.PerspectiveCamera
    let th0 = sphIso.theta
    let th1 = sphFlat.theta
    if (Math.abs(th1 - th0) > Math.PI) {
      if (th1 > th0) th0 += Math.PI * 2
      else th1 += Math.PI * 2
    }
    const sph = new THREE.Spherical(
      THREE.MathUtils.lerp(sphIso.radius, sphFlat.radius, p),
      THREE.MathUtils.lerp(sphIso.phi, sphFlat.phi, p),
      THREE.MathUtils.lerp(th0, th1, p),
    )
    cam.position.setFromSpherical(sph)
    cam.up.set(0, 1, 0)
    cam.lookAt(0, 0, 0)
    /** 평면 끝구간: 축 정렬 고정(대각 시점·보간 잔차로 정사각형이 비스듬해 보이는 것 방지) */
    if (p > 0.985) {
      cam.position.set(0, sphFlat.radius, 0.06)
      cam.up.set(0, 1, 0)
      cam.lookAt(0, 0, 0)
    }
    /** 평면에서 FOV가 너무 좁으면 조용 구역만 확대되어 패턴이 안 보임 — ~26° 근처 유지 */
    const fov = THREE.MathUtils.lerp(36, 26, p)
    if (Math.abs(cam.fov - fov) > 0.02) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }

    const ctrls = state.controls as { enabled?: boolean } | null
    if (ctrls && typeof ctrls.enabled === 'boolean') {
      ctrls.enabled = p < 0.78
    }

    const v = 1 - p
    mats.ground.opacity = v
    mats.trunk.opacity = v
    mats.grass.opacity = v
    mats.blossom.opacity = v
    planeMat.opacity = p
    planeMat.depthWrite = p > 0.82
    planeMat.transparent = p < 0.998
    if (shadowWrapRef.current) {
      shadowWrapRef.current.visible = p < 0.92
    }
    /**
     * 평면 모드에서 보겔 opacity=0이어도 depthWrite로 QR 평면을 가릴 수 있음
     * (겨울 눈 블록이 많을 때 특히 두드러짐) → 탑다운일 땐 메시 자체를 끔.
     */
    if (voxelGroupRef.current) {
      voxelGroupRef.current.visible = p < 0.96
    }
  })

  const yShadow = -built.cellSize * 1.1

  /** PNG는 모듈 n + 좌우 4모듈 마진 — 월드에서 모듈 폭 2에 맞춤 */
  const planeExtent = useMemo(() => {
    const nMod = Math.max(17, Math.round(2 / built.cellSize))
    return (2 * (nMod + 8)) / nMod
  }, [built.cellSize])

  return (
    <>
      <ambientLight intensity={0.5} color={colorFromCss(palette.light)} />
      <directionalLight
        position={[2.4, 3.6, 2.6]}
        intensity={0.88}
        color={keyRgb}
      />
      <pointLight position={[-1.1, 0.5, 1.35]} intensity={0.34} color={rimRgb} />

      <group ref={voxelGroupRef}>
        <InstancedLayer matrices={built.ground} material={mats.ground} />
        <InstancedLayer matrices={built.trunk} material={mats.trunk} />
        <InstancedLayer matrices={built.grass} material={mats.grass} />
        <InstancedLayer
          matrices={built.blossom}
          material={mats.blossom}
          instanceColors={built.blossomColors}
        />
      </group>

      <mesh
        material={planeMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.002, 0]}
        renderOrder={10}
      >
        <planeGeometry args={[planeExtent, planeExtent]} />
      </mesh>

      <group ref={shadowWrapRef}>
        <ContactShadows
          position={[0, yShadow, 0]}
          opacity={0.38}
          scale={9}
          blur={2.2}
          far={2.5}
        />
      </group>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.26}
        minDistance={2.4}
        maxDistance={5.8}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI * 0.5}
      />
    </>
  )
}

type SeasonalVoxelSceneProps = {
  dataUrl: string
  palette: CloudQrPalette
  season: Season
  matrix: boolean[][]
  flatTarget: number
}

function SeasonalVoxelScene({
  dataUrl,
  palette,
  season,
  matrix,
  flatTarget,
}: SeasonalVoxelSceneProps) {
  const built = useMemo(
    () => buildCherryQrVoxels(matrix, palette, season),
    [matrix, palette, season],
  )

  if (!built) {
    return (
      <>
        <ambientLight intensity={0.52} color={colorFromCss(palette.light)} />
        <directionalLight position={[2.2, 3.5, 2.8]} intensity={0.92} />
        <Suspense fallback={null}>
          <Float floatIntensity={0.4} rotationIntensity={0.12} speed={1.2}>
            <QrBlock dataUrl={dataUrl} palette={palette} season={season} />
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

  return (
    <Suspense fallback={null}>
      <CherryVoxelView
        dataUrl={dataUrl}
        palette={palette}
        season={season}
        flatTarget={flatTarget}
        built={built}
      />
    </Suspense>
  )
}

type QrSceneProps = QrBlockProps

function QrScene({ dataUrl, palette, season }: QrSceneProps) {
  const { keyRgb, rimRgb } = useMemo(() => {
    const Lc = colorFromCss(palette.light)
    const Ac = colorFromCss(palette.accent)
    const key = Lc.clone().lerp(new THREE.Color(1, 1, 1), 0.38)
    const rim = Ac.clone().lerp(Lc, 0.22)
    return { keyRgb: key, rimRgb: rim }
  }, [palette.light, palette.accent])

  return (
    <>
      <ambientLight intensity={0.52} color={colorFromCss(palette.light)} />
      <directionalLight
        position={[2.2, 3.5, 2.8]}
        intensity={0.92}
        color={keyRgb}
      />
      <pointLight position={[-1.2, 0.4, 1.4]} intensity={0.38} color={rimRgb} />
      <Suspense fallback={null}>
        <Float
          floatIntensity={0.4}
          rotationIntensity={0.12}
          speed={1.2}
        >
          <QrBlock dataUrl={dataUrl} palette={palette} season={season} />
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
  season: Season
  matrix: boolean[][]
}

export function QrStage3D({ dataUrl, palette, season, matrix }: Props) {
  const [flatTarget, setFlatTarget] = useState(0)

  const canvasDpr = useMemo((): [number, number] => {
    if (typeof window === 'undefined') return [1, 2]
    return [1, Math.min(2.5, window.devicePixelRatio || 2)]
  }, [])

  useEffect(() => {
    setFlatTarget(0)
  }, [dataUrl])

  const useVoxelTree =
    matrix.length >= 17 && matrix[0]?.length === matrix.length

  return (
    <div
      className="qr-stage-3d"
      role="img"
      aria-label="3D QR 미리보기"
    >
      {useVoxelTree ? (
        <button
          type="button"
          className="qr-stage-3d__viewmode"
          onClick={() => setFlatTarget((v) => (v < 0.5 ? 1 : 0))}
          aria-pressed={flatTarget > 0.5}
        >
          {flatTarget < 0.5 ? 'QR 평면' : '3D 뷰'}
        </button>
      ) : null}
      <Canvas
        className="qr-stage-3d__canvas"
        dpr={canvasDpr}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [2.75, 2.05, 2.75], fov: 36, near: 0.1, far: 100 }}
        shadows={false}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
          gl.outputColorSpace = THREE.SRGBColorSpace
        }}
      >
        {useVoxelTree ? (
          <SeasonalVoxelScene
            dataUrl={dataUrl}
            palette={palette}
            season={season}
            matrix={matrix}
            flatTarget={flatTarget}
          />
        ) : (
          <QrScene dataUrl={dataUrl} palette={palette} season={season} />
        )}
      </Canvas>
    </div>
  )
}
