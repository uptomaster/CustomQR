import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { SettledDebrisLayer } from './components/SettledDebrisLayer'
import { SeasonalLayer } from './components/SeasonalLayer'
import { getQrResult, QR_ECC, type QrEncodeResult } from './lib/qrMatrix'
import {
  loadSeason,
  saveSeason,
  SEASONS,
  type Season,
} from './lib/season'
import './App.css'

/** 바닥 더미 최대 높이(뷰포트 비율), 이 안에서 쌓이면 Drop! */
const PILE_VIEWPORT_RATIO = 0.4
const PILE_TRIGGER_FRAC = 0.9

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
  const [pileFill, setPileFill] = useState(0)
  const [dropModalOpen, setDropModalOpen] = useState(false)
  const pileModalLatchRef = useRef(false)
  const dropActionRef = useRef<HTMLButtonElement>(null)

  const pileLimitPx = useMemo(
    () =>
      typeof window !== 'undefined'
        ? Math.min(window.innerHeight * PILE_VIEWPORT_RATIO, 520)
        : 400,
    [],
  )

  const qr = useMemo(
    (): QrEncodeResult | null => getQrResult(text, QR_ECC, season),
    [text, season],
  )

  useLayoutEffect(() => {
    document.documentElement.dataset.season = season
  }, [season])

  useEffect(() => {
    saveSeason(season)
  }, [season])

  useEffect(() => {
    setPileFill(0)
    pileModalLatchRef.current = false
    setDropModalOpen(false)
  }, [season])

  useEffect(() => {
    if (dropModalOpen) return
    if (typeof window === 'undefined') return

    const id = window.setInterval(() => {
      setPileFill((f) => {
        if (pileModalLatchRef.current) return f
        const n = Math.min(1, f + 0.0038 + Math.random() * 0.0022)
        if (n >= PILE_TRIGGER_FRAC) {
          if (!pileModalLatchRef.current) {
            pileModalLatchRef.current = true
            queueMicrotask(() => setDropModalOpen(true))
          }
          return PILE_TRIGGER_FRAC
        }
        return n
      })
    }, 420)

    return () => clearInterval(id)
  }, [dropModalOpen, season])

  const clearPileFromModal = useCallback(() => {
    setPileFill(0)
    setDropModalOpen(false)
    pileModalLatchRef.current = false
  }, [])

  useEffect(() => {
    if (dropModalOpen) {
      dropActionRef.current?.focus()
    }
  }, [dropModalOpen])

  useEffect(() => {
    if (!dropModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearPileFromModal()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dropModalOpen, clearPileFromModal])

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
      <SettledDebrisLayer
        season={season}
        fill={pileFill}
        limitPx={pileLimitPx}
      />
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

      {dropModalOpen ? (
        <div className="drop-modal-root" role="presentation">
          <div
            className="drop-modal-backdrop"
            aria-hidden
            onClick={clearPileFromModal}
          />
          <div
            className="drop-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drop-modal-title"
            aria-describedby="drop-modal-desc"
          >
            <h2 id="drop-modal-title" className="drop-modal__title">
              Drop!
            </h2>
            <p id="drop-modal-desc" className="drop-modal__desc">
              쌓인 게 QR 쪽까지 차올랐어요. 비우고 다시 쌓을까요?
            </p>
            <button
              ref={dropActionRef}
              type="button"
              className="drop-modal__action"
              onClick={clearPileFromModal}
            >
              Drop!
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
