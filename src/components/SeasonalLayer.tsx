import { useMemo } from 'react'
import { frac01, type ParticleKind } from '../lib/seasonParticleHash'
import type { Season } from '../lib/season'
import './SeasonalLayer.css'

type Kind = ParticleKind

type P = {
  id: string
  kind: Kind
  autV?: 0 | 1 | 2
  left: string
  delay: string
  swayDelay: string
  fallDur: string
  swayDur: string
  w: number
  h: number
  rot: number
  path: 0 | 1 | 2 | 3
}

const BASE = 34
const SUB = 44

/** 낙하·흔들림 애니메이션 속도 배율 (>1이면 더 느림) */
const FALL_SLOW = 2.15

function makeItems(season: Season): P[] {
  const m =
    (season === 'winter'
      ? 1.35
      : season === 'summer'
        ? 0.95
        : 1) * FALL_SLOW
  const subM = (season === 'winter' ? 1.2 : 1) * FALL_SLOW

  const main: P[] = Array.from({ length: season === 'winter' ? 28 : BASE }, (_, i) => {
    const rL = frac01(season, 'main', i, 1)
    const rD = frac01(season, 'main', i, 2)
    const rSd = frac01(season, 'main', i, 3)
    const rF = frac01(season, 'main', i, 4)
    const rSw = frac01(season, 'main', i, 5)
    const rW = frac01(season, 'main', i, 6)
    const rH = frac01(season, 'main', i, 7)
    const rRot = frac01(season, 'main', i, 8)
    const delay = rD * 18
    return {
      id: `m-${season}-${i}`,
      kind: 'main' as const,
      autV: (i % 3) as 0 | 1 | 2,
      left: `${(rL * 96 + 1).toFixed(2)}%`,
      delay: `${delay.toFixed(2)}s`,
      swayDelay: `${(rSd * 11).toFixed(2)}s`,
      fallDur: `${(11 + rF * 18) * m}s`,
      swayDur: `${(2.4 + rSw * 4.2) * m}s`,
      w:
        season === 'winter'
          ? 5 + rW * 6.5
          : 11 + rW * 16.5,
      h:
        season === 'winter'
          ? 5 + rH * 5
          : 6.5 + rH * 9.5,
      rot: Math.floor(rRot * 52),
      path: ((i * 5 + 13 + Math.floor(rL * 4)) % 4) as 0 | 1 | 2 | 3,
    }
  })

  const sub: P[] = Array.from(
    { length: season === 'winter' ? 52 : SUB },
    (_, i) => {
      const rL = frac01(season, 'sub', i, 11)
      const rD = frac01(season, 'sub', i, 12)
      const rSd = frac01(season, 'sub', i, 13)
      const rF = frac01(season, 'sub', i, 14)
      const rSw = frac01(season, 'sub', i, 15)
      const rW = frac01(season, 'sub', i, 16)
      const rH = frac01(season, 'sub', i, 17)
      const rRot = frac01(season, 'sub', i, 18)
      const delay = rD * 16
      return {
        id: `s-${season}-${i}`,
        kind: 'sub' as const,
        autV: (i % 3) as 0 | 1 | 2,
        left: `${(rL * 97 + 0.5).toFixed(2)}%`,
        delay: `${delay.toFixed(2)}s`,
        swayDelay: `${(rSd * 9).toFixed(2)}s`,
        fallDur: `${(8 + rF * 14) * subM}s`,
        swayDur: `${(1.8 + rSw * 3.4) * m}s`,
        w:
          season === 'winter'
            ? 2.2 + rW * 1.5
            : 3.2 + rW * 3.5,
        h:
          season === 'winter'
            ? 2.2 + rH * 0.8
            : 2.4 + rH * 2,
        rot: Math.floor(rRot * 90),
        path: ((i * 7 + 1 + Math.floor(rL * 4)) % 4) as 0 | 1 | 2 | 3,
      }
    },
  )

  return [...main, ...sub]
}

type Props = { season: Season }

export function SeasonalLayer({ season }: Props) {
  const items = useMemo(() => makeItems(season), [season])

  return (
    <div
      className="seasonal-layer"
      data-season={season}
      aria-hidden
    >
      {items.map((p) => {
        const base = p.kind === 'main' ? 'seasonal__a' : 'seasonal__b'
        const aut =
          season === 'autumn' && p.autV !== undefined
            ? ` seasonal__tone--${p.autV}`
            : ''
        return (
          <span
            key={p.id}
            className={`${base}${aut} path--${p.path}`}
            style={{
              left: p.left,
              width: p.w,
              height: p.h,
              transform: `rotate(${p.rot}deg)`,
              animationDuration: `${p.fallDur}, ${p.swayDur}`,
              animationDelay: `${p.delay}, ${p.swayDelay}`,
            }}
          />
        )
      })}
    </div>
  )
}
