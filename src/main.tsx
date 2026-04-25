import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CHERRY_SKY } from './lib/cherryBlossomTheme'
import './index.css'
import App from './App.tsx'

const rootEl = document.documentElement
rootEl.style.setProperty('--cherry-zenith', CHERRY_SKY.zenith)
rootEl.style.setProperty('--cherry-horizon', CHERRY_SKY.horizon)
rootEl.style.setProperty('--cherry-bloom', CHERRY_SKY.bloom)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
