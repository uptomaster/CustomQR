import { useMemo, type CSSProperties } from 'react'
import type { Season } from '../lib/season'
import { frac01, type ParticleKind } from '../lib/seasonParticleHash'
import './SettledDebrisLayer.css'

const CHIP_N = 18

const CHIP_COLORS: Record<Season, string[]> = {
  spring: ['#ffb8d0', '#ff7aa0', '#ffe8f0', '#ff5c8a'],
  summer: ['#5cb86e', '#3d8a52', '#a8e0b0', '#1d5c32'],
  autumn: ['#ea580c', '#f4a84a', '#c2410c', '#9a3412'],
  winter: ['#ffffff', '#e2ecfa', '#c8daf0', '#f6faff'],
}

type Props = {
  season: Season
  /** 0~1, 바닥 더미 높이 */
  fill: number
  /** 픽셀 상한 (뷰포트 기준) */
  limitPx: number
}

export function SettledDebrisLayer({ season, fill, limitPx }: Props) {
  const peakPx = fill * limitPx
  const chips = useMemo(() => {
    const colors = CHIP_COLORS[season]
    return Array.from({ length: CHIP_N }, (_, i) => {
      const k: ParticleKind = frac01(season, 'main', i, 0) > 0.48 ? 'main' : 'sub'
      const leftPct = 3 + frac01(season, k, i, 1) * 94
      const stack = frac01(season, k, i, 2)
      const bottomPx = stack * Math.max(0, peakPx * 0.92)
      const w = 5 + frac01(season, k, i, 3) * (k === 'main' ? 12 : 7)
      const h = 4 + frac01(season, k, i, 4) * (k === 'main' ? 10 : 6)
      const rot = Math.floor((frac01(season, k, i, 5) - 0.5) * 70)
      const color = colors[Math.floor(frac01(season, k, i, 6) * colors.length) % colors.length]
      const z = 10 + i
      return { i, leftPct, bottomPx, w, h, rot, color, z }
    })
  }, [season, fill])

  if (fill < 0.004) return null

  return (
    <div
      className="settled-pile"
      data-season={season}
      style={
        {
          '--pile-peak': `${peakPx}px`,
        } as CSSProperties
      }
      aria-hidden
    >
      <div className="settled-pile__mound" />
      {chips.map((c) => (
        <span
          key={`${season}-${c.i}`}
          className="settled-pile__chip"
          style={{
            left: `${c.leftPct}%`,
            bottom: c.bottomPx,
            width: c.w,
            height: c.h,
            zIndex: c.z,
            transform: `rotate(${c.rot}deg)`,
            background: c.color,
          }}
        />
      ))}
    </div>
  )
}
