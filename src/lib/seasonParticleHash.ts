import type { Season } from './season'

export type ParticleKind = 'main' | 'sub'

/** 시즌·종류·인덱스·salt마다 다른 [0,1) */
export function frac01(
  season: Season,
  kind: ParticleKind,
  i: number,
  salt: number,
): number {
  let h = 2166136261
  for (let k = 0; k < season.length; k++) {
    h ^= season.charCodeAt(k)
    h = Math.imul(h, 16777619)
  }
  h ^=
    (kind === 'main' ? 0x2423_4423 : 0x1111_1111) ^
    Math.imul(i, 73_856_093) ^
    Math.imul(salt, 19_349_663)
  h >>>= 0
  h ^= h >>> 16
  h = Math.imul(h, 2246822519)
  h ^= h >>> 13
  h = Math.imul(h, 3266489917)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}
