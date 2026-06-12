const TILE_ZOOM = 2
const GRID = 1 << TILE_ZOOM
const TILE_SIZE = 512
const MAX_MERCATOR_LAT = 85.051129
const OUTPUT_WIDTH = 2048
const OUTPUT_HEIGHT = 1024

function loadTile(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('衛星タイルを読み込めませんでした'))
    image.src = url
  })
}

function paintFallbackOcean(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#0c2034')
  gradient.addColorStop(0.5, '#123150')
  gradient.addColorStop(1, '#0c2034')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(110, 160, 210, 0.18)'
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
}

/**
 * Builds an equirectangular earth texture for the Three.js sphere by
 * stitching Mapbox satellite tiles (web mercator) and reprojecting them
 * row by row. Falls back to a stylized ocean grid when tiles are
 * unavailable so the globe still renders without a token or network.
 */
export async function buildEarthTexture(token: string): Promise<HTMLCanvasElement> {
  const output = document.createElement('canvas')
  output.width = OUTPUT_WIDTH
  output.height = OUTPUT_HEIGHT
  const outputCtx = output.getContext('2d')
  if (!outputCtx) return output

  paintFallbackOcean(outputCtx, OUTPUT_WIDTH, OUTPUT_HEIGHT)
  if (!token) return output

  const mercator = document.createElement('canvas')
  mercator.width = TILE_SIZE * GRID
  mercator.height = TILE_SIZE * GRID
  const mercatorCtx = mercator.getContext('2d')
  if (!mercatorCtx) return output

  mercatorCtx.fillStyle = '#0c2034'
  mercatorCtx.fillRect(0, 0, mercator.width, mercator.height)

  const loads: Promise<void>[] = []
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      const url = `https://api.mapbox.com/v4/mapbox.satellite/${TILE_ZOOM}/${x}/${y}@2x.jpg90?access_token=${token}`
      loads.push(
        loadTile(url).then((image) => {
          mercatorCtx.drawImage(image, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }),
      )
    }
  }

  const results = await Promise.allSettled(loads)
  if (!results.some((result) => result.status === 'fulfilled')) return output

  for (let row = 0; row < OUTPUT_HEIGHT; row++) {
    const lat = 90 - ((row + 0.5) * 180) / OUTPUT_HEIGHT
    const clamped = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat))
    const latRad = (clamped * Math.PI) / 180
    const mercatorY = (1 - Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / Math.PI) / 2
    const sourceY = Math.min(mercator.height - 1, Math.max(0, mercatorY * mercator.height))
    outputCtx.drawImage(mercator, 0, sourceY, mercator.width, 1, 0, row, OUTPUT_WIDTH, 1)
  }

  return output
}
