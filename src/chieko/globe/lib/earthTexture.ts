import type { DropMapTheme } from './mapThemes'

const TILE_ZOOM = 3
const GRID = 1 << TILE_ZOOM
const TILE_SIZE = 512
const MAX_MERCATOR_LAT = 85.051129
const OUTPUT_WIDTH = 2048
const OUTPUT_HEIGHT = 1024
const TILE_LOAD_TIMEOUT_MS = 2200

type EarthTexturePalette = DropMapTheme['globe']

type StyleParts = {
  owner: string
  styleId: string
}

const DEFAULT_PALETTE: EarthTexturePalette = {
  oceanTop: '#0c2034',
  oceanMid: '#123150',
  oceanBottom: '#071018',
  grid: 'rgba(110, 160, 210, 0.18)',
  tint: '#d7e2da',
  tintAlpha: 0.08,
}

function parseMapboxStyleUrl(styleUrl?: string): StyleParts | null {
  if (!styleUrl) return null

  const mapboxMatch = styleUrl.match(/^mapbox:\/\/styles\/([^/]+)\/([^/?#]+)/)
  if (mapboxMatch) return { owner: mapboxMatch[1], styleId: mapboxMatch[2] }

  try {
    const url = new URL(styleUrl)
    const match = url.pathname.match(/\/styles\/v1\/([^/]+)\/([^/?#]+)/)
    if (match) return { owner: match[1], styleId: match[2] }
  } catch {
    return null
  }

  return null
}

function styleTileUrl(style: StyleParts, token: string, x: number, y: number) {
  return `https://api.mapbox.com/styles/v1/${style.owner}/${style.styleId}/tiles/512/${TILE_ZOOM}/${x}/${y}@2x?access_token=${encodeURIComponent(token)}`
}

function loadTile(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const cleanup = () => {
      window.clearTimeout(timer)
      image.onload = null
      image.onerror = null
    }
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('Mapboxタイルの読み込みがタイムアウトしました'))
    }, TILE_LOAD_TIMEOUT_MS)

    image.crossOrigin = 'anonymous'
    image.onload = () => {
      cleanup()
      resolve(image)
    }
    image.onerror = () => {
      cleanup()
      reject(new Error('Mapboxタイルを読み込めませんでした'))
    }
    image.src = url
  })
}

function xy(lng: number, lat: number, width: number, height: number) {
  return [((lng + 180) / 360) * width, ((90 - lat) / 180) * height] as const
}

function drawLand(ctx: CanvasRenderingContext2D, width: number, height: number, points: [number, number][]) {
  ctx.beginPath()
  points.forEach(([lng, lat], index) => {
    const [x, y] = xy(lng, lat, width, height)
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function drawFallbackContinents(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: EarthTexturePalette,
  alpha = 0.78,
) {
  ctx.save()
  ctx.fillStyle = palette.tint
  ctx.strokeStyle = palette.oceanBottom
  ctx.lineWidth = 3
  ctx.globalAlpha = alpha

  drawLand(ctx, width, height, [
    [-168, 72], [-130, 70], [-102, 58], [-80, 48], [-60, 34], [-82, 16], [-100, 8], [-116, 22], [-130, 44], [-160, 54],
  ])
  drawLand(ctx, width, height, [
    [-82, 12], [-54, 7], [-36, -12], [-48, -38], [-68, -55], [-78, -32], [-72, -10],
  ])
  drawLand(ctx, width, height, [
    [-18, 36], [18, 34], [36, 12], [30, -30], [18, -35], [2, -20], [-12, 8],
  ])
  drawLand(ctx, width, height, [
    [-12, 58], [34, 70], [92, 64], [148, 54], [156, 28], [116, 10], [78, 6], [44, 24], [14, 42],
  ])
  drawLand(ctx, width, height, [
    [70, 22], [90, 26], [100, 8], [82, 6],
  ])
  drawLand(ctx, width, height, [
    [112, -12], [154, -18], [150, -42], [118, -38], [104, -26],
  ])
  drawLand(ctx, width, height, [
    [-50, 76], [-20, 72], [-34, 62], [-58, 64],
  ])

  ctx.globalAlpha = alpha * 0.54
  ctx.fillStyle = palette.tint
  drawLand(ctx, width, height, [[-180, -63], [-90, -70], [0, -66], [90, -70], [180, -63], [180, -88], [-180, -88]])
  ctx.restore()
}

function paintFallbackOcean(ctx: CanvasRenderingContext2D, width: number, height: number, palette: EarthTexturePalette) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, palette.oceanTop)
  gradient.addColorStop(0.5, palette.oceanMid)
  gradient.addColorStop(1, palette.oceanBottom)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = palette.grid
  ctx.lineWidth = 1
  for (let i = 1; i < 12; i++) {
    const y = (height / 12) * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  for (let i = 1; i < 24; i++) {
    const x = (width / 24) * i
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  drawFallbackContinents(ctx, width, height, palette, 0.86)
}

function tintTexture(ctx: CanvasRenderingContext2D, width: number, height: number, palette: EarthTexturePalette) {
  if (!palette.tintAlpha) return

  ctx.save()
  ctx.globalCompositeOperation = 'soft-light'
  ctx.globalAlpha = Math.min(0.18, palette.tintAlpha)
  ctx.fillStyle = palette.oceanMid
  ctx.fillRect(0, 0, width, height)
  ctx.restore()

  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = Math.min(0.08, palette.tintAlpha * 0.35)
  ctx.fillStyle = palette.tint
  ctx.fillRect(0, 0, width, height)
  ctx.restore()
}

function sharpenTexture(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    const red = data[i]
    const green = data[i + 1]
    const blue = data[i + 2]
    const average = (red + green + blue) / 3
    const contrast = 1.06
    data[i] = Math.max(0, Math.min(255, 128 + (red - 128) * contrast + (red - average) * 0.08))
    data[i + 1] = Math.max(0, Math.min(255, 128 + (green - 128) * contrast + (green - average) * 0.08))
    data[i + 2] = Math.max(0, Math.min(255, 128 + (blue - 128) * contrast + (blue - average) * 0.08))
  }
  ctx.putImageData(image, 0, 0)
}

/**
 * Builds an equirectangular earth texture for the Three.js sphere by
 * stitching Mapbox style tiles and reprojecting them row by row. It uses
 * the same Mapbox Studio style as the flat map so the globe and map share
 * the selected color language.
 */
export async function buildEarthTexture(
  token: string,
  options: { styleUrl?: string; palette?: EarthTexturePalette } = {},
): Promise<HTMLCanvasElement> {
  const palette = options.palette ?? DEFAULT_PALETTE
  const output = document.createElement('canvas')
  output.width = OUTPUT_WIDTH
  output.height = OUTPUT_HEIGHT
  const outputCtx = output.getContext('2d')
  if (!outputCtx) return output

  paintFallbackOcean(outputCtx, OUTPUT_WIDTH, OUTPUT_HEIGHT, palette)
  if (!token) return output

  const style = parseMapboxStyleUrl(options.styleUrl)
  if (!style) return output

  const mercator = document.createElement('canvas')
  mercator.width = TILE_SIZE * GRID
  mercator.height = TILE_SIZE * GRID
  const mercatorCtx = mercator.getContext('2d')
  if (!mercatorCtx) return output

  mercatorCtx.fillStyle = palette.oceanMid
  mercatorCtx.fillRect(0, 0, mercator.width, mercator.height)

  const loads: Promise<void>[] = []
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      const url = styleTileUrl(style, token, x, y)
      loads.push(
        loadTile(url).then((image) => {
          mercatorCtx.drawImage(image, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }),
      )
    }
  }

  const results = await Promise.allSettled(loads)
  if (!results.some((result) => result.status === 'fulfilled')) return output

  outputCtx.imageSmoothingEnabled = true
  outputCtx.imageSmoothingQuality = 'high'
  for (let row = 0; row < OUTPUT_HEIGHT; row++) {
    const lat = 90 - ((row + 0.5) * 180) / OUTPUT_HEIGHT
    const clamped = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat))
    const latRad = (clamped * Math.PI) / 180
    const mercatorY = (1 - Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / Math.PI) / 2
    const sourceY = Math.min(mercator.height - 1, Math.max(0, mercatorY * mercator.height))
    outputCtx.drawImage(mercator, 0, sourceY, mercator.width, 1, 0, row, OUTPUT_WIDTH, 1)
  }

  sharpenTexture(outputCtx, OUTPUT_WIDTH, OUTPUT_HEIGHT)
  tintTexture(outputCtx, OUTPUT_WIDTH, OUTPUT_HEIGHT, palette)
  drawFallbackContinents(outputCtx, OUTPUT_WIDTH, OUTPUT_HEIGHT, palette, 0.46)

  return output
}
