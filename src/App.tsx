import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
import { SeasonalLayer } from './components/SeasonalLayer'
import {
  getQrMatrix,
  getQrResult,
  QR_ECC,
  type QrEncodeResult,
} from './lib/qrMatrix'
import {
  loadSeason,
  saveSeason,
  SEASONS,
  type Season,
} from './lib/season'
import './App.css'

const QrStage3D = lazy(async () => {
  const m = await import('./components/QrStage3D')
  return { default: m.QrStage3D }
})

export const PORTFOLIO_URL = 'https://uptomaster.github.io/Portfolio/'

const PRESETS: { a11y: string; value: string; key: 'a' | 'b' | 'c' }[] = [
  { a11y: '기본', value: PORTFOLIO_URL, key: 'a' },
  { a11y: '같은 경로 슬래시 생략', value: 'https://uptomaster.github.io/Portfolio', key: 'b' },
  { a11y: 'github.com', value: 'https://github.com', key: 'c' },
]

function DownloadIcon() {
  return (
    <svg
      className="ico-dl"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5M8 9l4 4 4-4m-4-5v8" />
    </svg>
  )
}

function App() {
  const [text, setText] = useState(PORTFOLIO_URL)
  const [season, setSeason] = useState<Season>(() => loadSeason())

  /** URL만으로 결정 — 계절 바꿔도 동일 격자(3D/평면 공통) */
  const qrMatrix = useMemo(() => getQrMatrix(text, QR_ECC), [text])
  const qr = useMemo((): QrEncodeResult | null => {
    const row = getQrResult(text, QR_ECC, season)
    if (!row) return null
    const n = row.moduleCount
    const stable =
      qrMatrix.length === n && qrMatrix[0]?.length === n ? qrMatrix : row.matrix
    return { ...row, matrix: stable }
  }, [text, season, qrMatrix])

  useLayoutEffect(() => {
    document.documentElement.dataset.season = season
  }, [season])

  useEffect(() => {
    saveSeason(season)
  }, [season])

  const themeStyle =
    qr != null
      ? ({
          ['--u-accent' as string]: qr.palette.accent,
          ['--u-light' as string]: qr.palette.light,
          ['--u-dark' as string]: qr.palette.dark,
        } as CSSProperties)
      : undefined

  return (
    <div
      className="shell"
      data-has-qr={Boolean(qr)}
      data-season={season}
      style={themeStyle}
    >
      <SeasonalLayer season={season} />
      <div className="shell__glow" aria-hidden />
      <div className="shell__blob shell__blob--1" aria-hidden />
      <div className="shell__blob shell__blob--2" aria-hidden />
      <div className="shell__inner">
        <div className="composer">
          <div
            className="season-row"
            role="group"
            aria-label="Background season"
          >
            {SEASONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`season-chip${season === s.id ? ' season-chip--on' : ''}`}
                onClick={() => setSeason(s.id)}
                aria-pressed={season === s.id}
                aria-label={s.a11y}
                title={s.a11y}
              >
                {s.label}
              </button>
            ))}
          </div>
          <input
            className="url-in"
            type="url"
            value={text}
            onChange={(e) => setText(e.target.value)}
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="https://"
            aria-label="URL"
          />
          <div className="presets" role="group" aria-label="빠른 URL">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`pr pr--${p.key}`}
                onClick={() => setText(p.value)}
                aria-label={p.a11y}
                title={p.a11y}
              />
            ))}
          </div>
        </div>

        {qr ? (
          <div className="view">
            <div className="view__rim">
              <div className="view__halo" aria-hidden />
              <div className="view__core">
                <Suspense
                  fallback={<div className="view__sk" aria-hidden />}
                >
                  <QrStage3D
                    key={qr.dataUrl}
                    dataUrl={qr.dataUrl}
                    palette={qr.palette}
                    season={season}
                    matrix={qr.matrix}
                  />
                </Suspense>
                <a
                  className="dl"
                  href={qr.dataUrl}
                  download="qr.png"
                  aria-label="PNG 다운로드"
                  title="PNG"
                >
                  <DownloadIcon />
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="void" aria-hidden>
            <div className="void__grid" />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
