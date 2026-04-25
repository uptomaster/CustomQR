import qrcode from 'qrcode-generator'

/** EC H — 약간 뭉개져도 읽힘 */
export const QR_ECC: 'L' | 'M' | 'Q' | 'H' = 'H'

/**
 * **한 모듈(1칸)의 캔버스 픽셀 수** — 낮을수록 도트가 촘촘해지고(간격=0, 붙은 사각), 화면은 CSS로 키워 픽셀아트 느낌.
 * 2~3이 정밀, 4도 무방. (너무 크면 “큼직한” QR처럼 보임)
 */
export const Q_EXPORT_CELL = 3

export type CloudQrPalette = {
  /** 모듈 1(진) */
  dark: string
  /** 모듈 0(배경) */
  light: string
  /** UI 스와치 */
  accent: string
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function cloudPaletteForData(data: string): CloudQrPalette {
  const h = hashString(data.trim() || ' ')
  return {
    dark: '#1a1214',
    light: '#fff7f8',
    accent: `hsl(${338 + (h % 18)}, 72%, ${62 + (h % 10)}%)`,
  }
}

type QrModuleView = {
  getModuleCount(): number
  isDark(row: number, col: number): boolean
}

/**
 * 겹침 없이 사각 **도트**만 쌓음(간격=0) — 정교·촘촘한 느낌.
 * 캐릭터 **전체**를 셀에 넣는 방식이 아님. 색·도트 느낌만 캐릭터에 맞춤.
 */
function encodePngDataUrl(
  qr: QrModuleView,
  cellSize: number,
  margin: number,
  colors: Pick<CloudQrPalette, 'dark' | 'light'>,
): string {
  const n = qr.getModuleCount()
  const px = n * cellSize + margin * 2
  const canvas = document.createElement('canvas')
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D를 사용할 수 없습니다.')
  }
  ctx.imageSmoothingEnabled = false

  ctx.fillStyle = colors.light
  ctx.fillRect(0, 0, px, px)
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const left = margin + col * cellSize
      const top = margin + row * cellSize
      ctx.fillStyle = qr.isDark(row, col) ? colors.dark : colors.light
      ctx.fillRect(left, top, cellSize, cellSize)
    }
  }
  return canvas.toDataURL('image/png')
}

function createAndMakeQr(
  data: string,
  errorLevel: 'L' | 'M' | 'Q' | 'H',
) {
  if (!data.trim()) {
    return null
  }
  const qr = qrcode(0, errorLevel)
  qr.addData(data)
  qr.make()
  return qr
}

function matrixFrom(qr: {
  getModuleCount(): number
  isDark(r: number, c: number): boolean
}): boolean[][] {
  const n = qr.getModuleCount()
  const matrix: boolean[][] = []
  for (let r = 0; r < n; r++) {
    const row: boolean[] = []
    for (let c = 0; c < n; c++) {
      row.push(qr.isDark(r, c))
    }
    matrix.push(row)
  }
  return matrix
}

export type QrEncodeResult = {
  matrix: boolean[][]
  dataUrl: string
  moduleCount: number
  palette: CloudQrPalette
  /** `Q_EXPORT_CELL` (한 모듈 = 몇 캔버스 px) */
  cellPx: number
}

export function getQrResult(
  data: string,
  errorLevel: 'L' | 'M' | 'Q' | 'H' = QR_ECC,
): QrEncodeResult | null {
  const qr0 = createAndMakeQr(data, errorLevel)
  if (!qr0) {
    return null
  }
  const palette = cloudPaletteForData(data)
  const matrix = matrixFrom(qr0)
  const n = matrix.length
  const cellSize = Q_EXPORT_CELL
  const margin = cellSize * 4
  const dataUrl =
    typeof document !== 'undefined'
      ? encodePngDataUrl(qr0, cellSize, margin, palette)
      : (qr0 as { createDataURL: (a?: number, b?: number) => string }).createDataURL(
          cellSize,
          margin,
        )
  return {
    matrix,
    dataUrl,
    moduleCount: n,
    palette,
    cellPx: Q_EXPORT_CELL,
  }
}

export function getQrMatrix(
  data: string,
  errorLevel: 'L' | 'M' | 'Q' | 'H' = QR_ECC,
): boolean[][] {
  const q = createAndMakeQr(data, errorLevel)
  return q ? matrixFrom(q) : []
}

export function diffMatrices(
  prev: boolean[][] | null,
  next: boolean[][],
): Set<string> {
  const s = new Set<string>()
  if (!prev || prev.length !== next.length) {
    return s
  }
  const n = next.length
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (prev[r][c] !== next[r][c]) {
        s.add(`${r},${c}`)
      }
    }
  }
  return s
}
