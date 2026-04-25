import { lazy, Suspense, useMemo, useState } from 'react'
import { getQrResult, type QrEncodeResult } from './lib/qrMatrix'
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
  const qr = useMemo((): QrEncodeResult | null => getQrResult(text), [text])

  return (
    <div className="shell" data-has-qr={Boolean(qr)}>
      <div className="shell__glow" aria-hidden />
      <div className="shell__inner">
        <div className="composer">
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
    </div>
  )
}

export default App
