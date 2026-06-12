function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

export function createPlaceholderBadge(size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const inset = size * 0.08
  const side = size - inset * 2
  const radius = size * 0.2

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
  ctx.shadowBlur = size * 0.06
  ctx.shadowOffsetY = size * 0.03
  ctx.fillStyle = '#fffc00'
  roundedRectPath(ctx, inset, inset, side, side, radius)
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = size * 0.05
  roundedRectPath(ctx, inset, inset, side, side, radius)
  ctx.stroke()

  ctx.font = `${Math.round(size * 0.4)}px "Apple Color Emoji", "Noto Color Emoji", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('📍', size / 2, size / 2 + size * 0.02)

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
  const radius = size * 0.2

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
  ctx.shadowBlur = size * 0.06
  ctx.shadowOffsetY = size * 0.03
  ctx.fillStyle = '#ffffff'
  roundedRectPath(ctx, inset, inset, side, side, radius)
  ctx.fill()
  ctx.restore()

  const border = size * 0.045
  ctx.save()
  roundedRectPath(ctx, inset + border, inset + border, side - border * 2, side - border * 2, radius - border)
  ctx.clip()
  // cover-fit crop centered on the photo
  const scale = (side - border * 2) / Math.min(image.width, image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  ctx.drawImage(image, inset + border + (side - border * 2 - drawWidth) / 2, inset + border + (side - border * 2 - drawHeight) / 2, drawWidth, drawHeight)
  ctx.restore()

  return canvas
}

/**
 * Drop写真を地球儀スプライト用の角丸バッジに描画する。
 * 読み込みに失敗したときは黄色いプレースホルダーを返す。
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
