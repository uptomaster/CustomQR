import * as THREE from 'three'
import type { CloudQrPalette } from './qrMatrix'
import type { Season } from './season'

/** 3D 줄기 — 화사한 계절 껍질 톤 (검정 계열 제거) */
export function trunkBarkColor(season: Season): string {
  switch (season) {
    case 'spring':
      return '#b8957a'
    case 'summer':
      return '#c9a86c'
    case 'autumn':
      return '#d4a574'
    case 'winter':
      return '#9db4cc'
  }
}

/** 3D 바깥(잔디·바닥 덮개) — 밝고 채도 있는 색 */
export function grassPatchColor(season: Season): string {
  switch (season) {
    case 'spring':
      return '#34d399'
    case 'summer':
      return '#4ade80'
    case 'autumn':
      return '#fbbf24'
    case 'winter':
      return '#dbe7f0'
  }
}

/** 캐노피 블록별 잎·꽃·눈 색(URL 액센트는 살짝만 섞어 같은 URL끼리 미세한 차이) */
export function leafColorForCell(
  season: Season,
  palette: CloudQrPalette,
  r: number,
  c: number,
  layer: number,
  paletteSeed: number,
): THREE.Color {
  const hexList = LEAF_BASE[season]
  const h = (Math.imul(r, 73856093) ^ Math.imul(c, 19349663) ^ paletteSeed) >>> 0
  const idx = (h + layer * 17) % hexList.length
  const base = new THREE.Color()
  try {
    base.setStyle(hexList[idx])
  } catch {
    base.set('#86efac')
  }
  const accent = new THREE.Color()
  try {
    accent.setStyle(palette.accent)
  } catch {
    accent.set('#f472b6')
  }
  if (season === 'spring') {
    const sakura = new THREE.Color('#fb7185')
    accent.lerp(sakura, 0.62)
  }
  let accentMix: number
  switch (season) {
    case 'spring':
      accentMix = 0.32
      break
    case 'winter':
      accentMix = 0.06
      break
    default:
      accentMix = 0.48
  }
  return base.clone().lerp(accent, accentMix)
}

const LEAF_BASE: Record<Season, string[]> = {
  spring: [
    '#ffe4e9',
    '#ffd0dc',
    '#ffb3c6',
    '#ff9eb5',
    '#ff8fab',
    '#f472b6',
  ],
  summer: [
    '#4ade80',
    '#2dd4bf',
    '#a3e635',
    '#86efac',
    '#bef264',
    '#34d399',
  ],
  autumn: [
    '#fb923c',
    '#f97316',
    '#fbbf24',
    '#facc15',
    '#fdba74',
    '#ea580c',
  ],
  winter: [
    '#ffffff',
    '#f8fafc',
    '#f1f5f9',
    '#e8f4fc',
    '#e0f2fe',
    '#dbeafe',
  ],
}

/** 레거시 호환 */
export function voxelTintsForSeason(season: Season): {
  trunkMix: string
  grassMix: string
} {
  return { trunkMix: trunkBarkColor(season), grassMix: grassPatchColor(season) }
}

export function canopyMaterialForSeason(season: Season): {
  roughness: number
  metalness: number
} {
  switch (season) {
    case 'spring':
      return { roughness: 0.36, metalness: 0.06 }
    case 'summer':
      return { roughness: 0.24, metalness: 0.12 }
    case 'autumn':
      return { roughness: 0.38, metalness: 0.07 }
    case 'winter':
      /** 눈 표면 — 약간 단단·반사 */
      return { roughness: 0.34, metalness: 0.1 }
  }
}
