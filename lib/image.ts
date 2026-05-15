type DisplayImage = {
  imageName: string
  imageUrl: string
  imageMimeType: string
}

type Heic2AnyConverter = (options: {
  blob: Blob
  toType: string
  quality?: number
}) => Promise<Blob | Blob[]>

const MAX_IMAGE_SIZE = 1280

function isHeicImage(file: File) {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return type.includes('heic') || type.includes('heif') || name.endsWith('.heic') || name.endsWith('.heif')
}

function toJpegName(name: string) {
  return name.replace(/\.(heic|heif)$/i, '.jpg')
}

function normalizeHeicBlob(file: File) {
  if (!isHeicImage(file)) return file

  try {
    return new File([file], file.name.replace(/\.(heic|heif)$/i, (extension) => extension.toLowerCase()), {
      type: file.type && file.type !== 'application/octet-stream' ? file.type : 'image/heic',
      lastModified: file.lastModified,
    })
  } catch {
    return file
  }
}

async function loadHeic2Any() {
  const module = await import('heic2any')
  const converter = module.default as unknown

  if (typeof converter === 'function') {
    return converter as Heic2AnyConverter
  }

  if (typeof module === 'function') {
    return module as unknown as Heic2AnyConverter
  }

  throw new Error('HEIC converter is not available.')
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function fileToImageBitmap(blob: Blob) {
  return createImageBitmap(blob, {
    imageOrientation: 'from-image',
  })
}

async function createCompressedJpegDataUrl(blob: Blob) {
  try {
    const bitmap = await fileToImageBitmap(blob)
    const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas context is not available.')

    context.drawImage(bitmap, 0, 0, width, height)

    if ('close' in bitmap && typeof bitmap.close === 'function') {
      bitmap.close()
    }

    return canvas.toDataURL('image/jpeg', 0.86)
  } catch (error) {
    console.warn('画像の縮小に失敗したため、元データを使用します。', error)
    return readAsDataUrl(blob)
  }
}

export async function getDisplayImage(file: File): Promise<DisplayImage> {
  const sourceFile = normalizeHeicBlob(file)
  let previewBlob: Blob = sourceFile
  let imageName = file.name
  let imageMimeType = file.type || 'application/octet-stream'

  if (isHeicImage(sourceFile)) {
    try {
      const heic2any = await loadHeic2Any()
      const converted = await heic2any({
        blob: sourceFile,
        toType: 'image/jpeg',
        quality: 0.86,
      })
      const convertedBlob = Array.isArray(converted) ? converted[0] : converted
      previewBlob =
        convertedBlob.type === 'image/jpeg'
          ? convertedBlob
          : new Blob([convertedBlob], { type: 'image/jpeg' })
      imageName = toJpegName(file.name)
      imageMimeType = 'image/jpeg'
    } catch (error) {
      console.error(error)
      throw new Error('HEIC/HEIF画像をJPEGに変換できませんでした。')
    }
  }

  const imageUrl = await createCompressedJpegDataUrl(previewBlob)

  return {
    imageName,
    imageUrl,
    imageMimeType: imageUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : imageMimeType,
  }
}
