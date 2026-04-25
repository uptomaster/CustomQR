import * as THREE from 'three'
import type { CloudQrPalette } from './qrMatrix'
import { leafColorForCell } from './seasonVoxelTints'
import type { Season } from './season'

export type CherryVoxelBuild = {
  cellSize: number
  ground: THREE.Matrix4[]
  trunk: THREE.Matrix4[]
  grass: THREE.Matrix4[]
  blossom: THREE.Matrix4[]
  blossomColors: THREE.Color[]
}

const _mx = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _sc = new THREE.Vector3()

function cellHash(r: number, c: number): number {
  return Math.imul(r, 73856093) ^ Math.imul(c, 19349663)
}

function composeMat(
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
): THREE.Matrix4 {
  _pos.set(x, y, z)
  _sc.set(sx, sy, sz)
  _mx.compose(_pos, _quat, _sc)
  return _mx.clone()
}

type TreeSeasonConfig = {
  trunkRFrac: number
  canopyRFrac: number
  maxLayers: number
  trunkRiseBase: number
  trunkRiseScale: number
  trunkMaxFrac: number
  /** t: 1=중심, 0=캐노피 가장자리 — 반환값은 maxLayers에 곱할 0~1 근사 비율 */
  layerFrac: (t: number) => number
  domeSteps: (t: number) => number
  organicExtra: (rnd: number) => number
  grassScaleXZ: number
  grassScaleY: number
  groundThick: number
  groundY: number
  /** 캐노피 최소 층수 — 0이면 가장자리에서 잎/가지 블록 생략 가능(낙엽수 겨울) */
  minCanopyLayers: number
}

function treeConfigForSeason(season: Season, n: number): TreeSeasonConfig {
  const base = Math.min(18, Math.max(8, Math.round(n * 0.4)))

  switch (season) {
    case 'spring':
      /** 벚꽃 돔 — 둥근 벚꽃 수관, 좁은 중앙 기둥 */
      return {
        trunkRFrac: 0.056,
        canopyRFrac: 0.47,
        maxLayers: base,
        trunkRiseBase: 2.2,
        trunkRiseScale: 0.26,
        trunkMaxFrac: 0.42,
        layerFrac: (t) => 0.25 + 0.75 * t * t,
        domeSteps: (t) => Math.floor(t * 3),
        organicExtra: (rnd) =>
          (rnd % 6 === 0 ? 1 : 0) + (rnd % 11 === 0 ? 1 : 0),
        grassScaleXZ: 0.92,
        grassScaleY: 0.86,
        groundThick: 0.32,
        groundY: -0.18,
        minCanopyLayers: 2,
      }
    case 'summer':
      /** 우산형 활엽수 — 넓고 낮게 퍼진 수관 */
      return {
        trunkRFrac: 0.06,
        canopyRFrac: 0.55,
        maxLayers: Math.round(base * 1.1),
        trunkRiseBase: 1.95,
        trunkRiseScale: 0.2,
        trunkMaxFrac: 0.48,
        layerFrac: (t) => 0.33 + 0.67 * Math.pow(t, 0.78),
        domeSteps: (t) => Math.floor(t * 2),
        organicExtra: (rnd) =>
          (rnd % 7 === 0 ? 1 : 0) + (rnd % 14 === 0 ? 1 : 0),
        grassScaleXZ: 0.95,
        grassScaleY: 0.9,
        groundThick: 0.3,
        groundY: -0.18,
        minCanopyLayers: 2,
      }
    case 'autumn':
      /** 낮고 울퉁불퉁한 단풍 수관 */
      return {
        trunkRFrac: 0.054,
        canopyRFrac: 0.435,
        maxLayers: Math.round(base * 0.9),
        trunkRiseBase: 2.35,
        trunkRiseScale: 0.29,
        trunkMaxFrac: 0.43,
        layerFrac: (t) => 0.14 + 0.66 * Math.pow(t, 1.28),
        domeSteps: (t) => Math.floor(t * 4 + (t > 0.35 ? 1 : 0)),
        organicExtra: (rnd) =>
          (rnd % 5 === 0 ? 1 : 0) + (rnd % 8 === 0 ? 1 : 0),
        grassScaleXZ: 0.9,
        grassScaleY: 0.82,
        groundThick: 0.31,
        groundY: -0.18,
        minCanopyLayers: 2,
      }
    case 'winter':
      /** 낙엽수 + 잎 대신 가지 위 눈 쌓임(중심일수록 두껍게) */
      return {
        trunkRFrac: 0.078,
        canopyRFrac: 0.42,
        maxLayers: Math.max(3, Math.round(base * 0.36)),
        trunkRiseBase: 3.05,
        trunkRiseScale: 0.27,
        trunkMaxFrac: 0.58,
        layerFrac: (t) => 0.14 + 0.58 * Math.pow(t, 1.85),
        domeSteps: () => 0,
        organicExtra: () => 0,
        grassScaleXZ: 0.88,
        grassScaleY: 0.68,
        groundThick: 0.36,
        groundY: -0.16,
        minCanopyLayers: 1,
      }
  }
}

/**
 * QR 모듈 그리드 → 계절별 실루엣의 3D 트리 인스턴스 행렬.
 */
export function buildCherryQrVoxels(
  matrix: boolean[][],
  palette: CloudQrPalette,
  season: Season,
): CherryVoxelBuild | null {
  const n = matrix.length
  if (n < 17 || !matrix[0] || matrix[0].length !== n) return null

  const cfg = treeConfigForSeason(season, n)

  const ground: THREE.Matrix4[] = []
  const trunk: THREE.Matrix4[] = []
  const grass: THREE.Matrix4[] = []
  const blossom: THREE.Matrix4[] = []
  const blossomColors: THREE.Color[] = []

  const half = (n - 1) / 2
  const s = 2 / n
  const trunkR = n * cfg.trunkRFrac
  const canopyR = n * cfg.canopyRFrac
  const maxLayers = cfg.maxLayers

  let paletteSeed = 0
  for (let i = 0; i < palette.dark.length; i++) {
    paletteSeed = Math.imul(paletteSeed, 31) + palette.dark.charCodeAt(i)
  }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cx = c - half
      const cz = half - r
      const x = cx * s
      const z = cz * s
      const dist = Math.hypot(cx, cz)
      const dark = matrix[r][c]

      if (!dark) {
        ground.push(
          composeMat(
            x,
            cfg.groundY * s,
            z,
            s * 0.98,
            s * cfg.groundThick,
            s * 0.98,
          ),
        )
        continue
      }

      if (dist <= trunkR) {
        const rise = Math.max(
          2,
          Math.round(
            (1 - dist / trunkR) * (n * cfg.trunkRiseScale) + cfg.trunkRiseBase,
          ),
        )
        const hCapped = Math.min(rise, Math.round(n * cfg.trunkMaxFrac))
        for (let i = 0; i < hCapped; i++) {
          const y = s * 0.5 + i * s
          trunk.push(composeMat(x, y, z, s * 0.96, s * 0.96, s * 0.96))
        }
        continue
      }

      if (dist < canopyR) {
        const t = 1 - dist / canopyR
        let layersHere = Math.max(
          cfg.minCanopyLayers,
          Math.round(maxLayers * cfg.layerFrac(t)),
        )
        const domeOffset = cfg.domeSteps(t) * s
        /** 계절(팔레트)과 무관하게 동일 격자 — organicExtra는 셀 좌표만 사용 */
        const rnd = cellHash(r, c) >>> 0
        layersHere += cfg.organicExtra(rnd)
        const h0 = s * 0.5
        for (let layer = 0; layer < layersHere; layer++) {
          const y = h0 + layer * s + domeOffset
          blossom.push(
            composeMat(
              x,
              y,
              z,
              s * 0.93,
              s * 0.93,
              s * 0.93,
            ),
          )
          blossomColors.push(
            leafColorForCell(season, palette, r, c, layer, paletteSeed),
          )
        }
        continue
      }

      grass.push(
        composeMat(
          x,
          s * 0.5,
          z,
          s * cfg.grassScaleXZ,
          s * cfg.grassScaleY,
          s * cfg.grassScaleXZ,
        ),
      )
    }
  }

  return { cellSize: s, ground, trunk, grass, blossom, blossomColors }
}
