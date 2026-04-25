export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export const SEASONS: { id: Season; label: string; a11y: string }[] = [
  { id: 'spring', label: 'Spring', a11y: 'Spring background' },
  { id: 'summer', label: 'Summer', a11y: 'Summer background' },
  { id: 'autumn', label: 'Autumn', a11y: 'Autumn background' },
  { id: 'winter', label: 'Winter', a11y: 'Winter background' },
]

const KEY = 'customqr-season'

export function loadSeason(): Season {
  if (typeof window === 'undefined') return 'spring'
  const v = localStorage.getItem(KEY) as Season | null
  if (v === 'spring' || v === 'summer' || v === 'autumn' || v === 'winter') {
    return v
  }
  return 'spring'
}

export function saveSeason(s: Season) {
  try {
    localStorage.setItem(KEY, s)
  } catch {
    /* ignore */
  }
}
