import type { Season } from '../lib/season'
import { frac01, type ParticleKind } from '../lib/seasonParticleHash'
import './SeasonalLayer.css'
import './SettledDebrisLayer.css'

export type SettledPiece = {
  id: string
  kind: ParticleKind
  left: string
  bottom: number
  jitterX: number
  w: number
  h: number
  rot: number
  path: 0 | 1 | 2 | 3
  autV?: 0 | 1 | 2
  z: number
}

const BIN_COUNT = 34

export function createEmptyBins(): number[] {
  return Array(BIN_COUNT).fill(0)
}

/** 한 조각 생성 + 이 빈에서 위로 얼마나 쌓였는지(px) */
export function createSettledPiece(
  season: Season,
  seq: number,
  binIndex: number,
  binBottom: number,
): { piece: SettledPiece; lift: number } {
  const kind: ParticleKind =
    frac01(season, 'main', seq, 99) > 0.4 ? 'main' : 'sub'

  const rW = frac01(season, kind, seq, 6)
  const rH = frac01(season, kind, seq, 7)
  const rRot = frac01(season, kind, seq, 8)

  const w =
    season === 'winter'
      ? kind === 'main'
        ? 5 + rW * 6.5
        : 2.2 + rW * 1.5
      : kind === 'main'
        ? 10 + rW * 15
        : 3 + rW * 3.2

  const h =
    season === 'winter'
      ? kind === 'main'
        ? 5 + rH * 5
        : 2.2 + rH * 0.8
      : kind === 'main'
        ? 6 + rH * 9
        : 2.2 + rH * 2

  const slotW = 100 / BIN_COUNT
  const left = `${binIndex * slotW + frac01(season, kind, seq, 77) * slotW * 0.82 + slotW * 0.06}%`

  const rot = Math.floor(rRot * (kind === 'main' ? 52 : 90))
  const path = ((seq * 3 + binIndex + Math.floor(frac01(season, kind, seq, 1) * 4)) %
    4) as 0 | 1 | 2 | 3

  const autV =
    season === 'autumn'
      ? (Math.floor(frac01(season, kind, seq, 55) * 3) as 0 | 1 | 2)
      : undefined

  const compress = 0.3 + frac01(season, kind, seq, 66) * 0.2
  const lift = h * compress
  const jitterX = (frac01(season, kind, seq, 44) - 0.5) * 10

  const piece: SettledPiece = {
    id: `settled-${season}-${seq}`,
    kind,
    left,
    bottom: binBottom,
    jitterX,
    w,
    h,
    rot,
    path,
    autV,
    z: seq,
  }

  return { piece, lift }
}

type Props = {
  season: Season
  pieces: SettledPiece[]
}

export function SettledDebrisLayer({ season, pieces }: Props) {
  if (pieces.length === 0) return null

  return (
    <div
      className="seasonal-layer settled-debris"
      data-season={season}
      aria-hidden
    >
      {pieces.map((p) => {
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
              bottom: p.bottom,
              width: p.w,
              height: p.h,
              zIndex: p.z,
              transform: `rotate(${p.rot}deg) translateX(${p.jitterX}px)`,
            }}
          />
        )
      })}
    </div>
  )
}
