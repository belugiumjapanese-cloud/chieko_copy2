import type { Coordinates, PhotoMetadata } from './types'

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

function numberFromExif(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export async function readPhotoMetadata(file: File): Promise<PhotoMetadata> {
  const exifr = await import('exifr')
  const [gps, parsed] = await Promise.all([
    exifr.gps(file).catch(() => null),
    exifr
      .parse(file, {
        pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSLatitude', 'GPSLongitude'],
      })
      .catch(() => null),
  ])

  const gpsResult = gps as { latitude?: number; longitude?: number } | null
  const parsedResult = parsed as Record<string, unknown> | null
  const lat = numberFromExif(gpsResult?.latitude) ?? numberFromExif(parsedResult?.GPSLatitude)
  const lng = numberFromExif(gpsResult?.longitude) ?? numberFromExif(parsedResult?.GPSLongitude)

  const coordinates: Coordinates | null = lat !== null && lng !== null ? { lat, lng } : null
  const takenAt =
    toDate(parsedResult?.DateTimeOriginal) ?? toDate(parsedResult?.CreateDate) ?? toDate(parsedResult?.ModifyDate)

  return {
    coordinates,
    takenAt,
  }
}

export async function compressImageForUpload(file: File) {
  const imageCompression = (await import('browser-image-compression')).default

  return imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.82,
  })
}

export function createMemoryId(file: File) {
  return `${file.name}-${file.lastModified}-${file.size}`
}
