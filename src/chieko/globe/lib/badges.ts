function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function drawDropGlyph(ctx: CanvasRenderingContext2D, center: number, size: number) {
  const top = center - size * 0.42
  const bottom = center + size * 0.44
  const left = center - size * 0.34
  const right = center + size * 0.34

  ctx.beginPath()
  ctx.moveTo(center, top)
  ctx.bezierCurveTo(right, center - size * 0.1, right, bottom - size * 0.08, center, bottom)
  ctx.bezierCurveTo(left, bottom - size * 0.08, left, center - size * 0.1, center, top)
  ctx.closePath()
  ctx.fillStyle = '#2f453e'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(center, center + size * 0.12, size * 0.16, 0, Math.PI * 2)
  ctx.fillStyle = '#f7faf7'
  ctx.fill()
}

export function createPlaceholderBadge(size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const inset = size * 0.08
  const side = size - inset * 2
  const radius = size * 0.16

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)'
  ctx.shadowBlur = size * 0.07
  ctx.shadowOffsetY = size * 0.03
  ctx.fillStyle = '#d7e2da'
  roundedRectPath(ctx, inset, inset, side, side, radius)
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = '#f7faf7'
  ctx.lineWidth = size * 0.045
  roundedRectPath(ctx, inset, inset, side, side, radius)
  ctx.stroke()

  drawDropGlyph(ctx, size / 2, size * 0.68)

  return canvas
}

function drawPhotoBadge(image: HTMLImageElement, size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const inset = size * 0.08
  const side = size - inset * 2
  const radius = size * 0.16

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)'
  ctx.shadowBlur = size * 0.07
  ctx.shadowOffsetY = size * 0.03
  ctx.fillStyle = '#f7faf7'
  roundedRectPath(ctx, inset, inset, side, side, radius)
  ctx.fill()
  ctx.restore()

  const border = size * 0.045
  ctx.save()
  roundedRectPath(ctx, inset + border, inset + border, side - border * 2, side - border * 2, radius - border)
  ctx.clip()
  const scale = (side - border * 2) / Math.min(image.width, image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  ctx.drawImage(
    image,
    inset + border + (side - border * 2 - drawWidth) / 2,
    inset + border + (side - border * 2 - drawHeight) / 2,
    drawWidth,
    drawHeight,
  )
  ctx.restore()

  return canvas
}

/**
 * Drop写真を地球儀スプライト用の角丸バッジに描画する。
 * 読み込みに失敗したときは雫マークのプレースホルダーを返す。
 */
export function createPhotoBadge(imageUrl: string, options: { size?: number } = {}): Promise<HTMLCanvasElement> {
  const size = options.size ?? 128
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve(createPlaceholderBadge(size))
      return
    }
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(drawPhotoBadge(image, size))
    image.onerror = () => resolve(createPlaceholderBadge(size))
    image.src = imageUrl
  })
}
