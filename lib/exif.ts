import exifr from 'exifr'
import type { Coordinates } from './types'

type ExifGpsTags = {
  latitude?: unknown
  longitude?: unknown
  GPSLatitude?: unknown
  GPSLongitude?: unknown
  GPSLatitudeRef?: unknown
  GPSLongitudeRef?: unknown
  GPSPosition?: unknown
  gps?: ExifGpsTags
  location?: ExifGpsTags
}

function isLikelyHeic(file: File) {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return name.endsWith('.heic') || name.endsWith('.heif') || type.includes('heic') || type.includes('heif')
}

function normalizeExifFile(file: File) {
  if (!isLikelyHeic(file)) return file

  const lowerName = file.name.replace(/\.(heic|heif)$/i, (extension) => extension.toLowerCase())
  const type = file.type && file.type !== 'application/octet-stream' ? file.type : 'image/heic'

  try {
    return new File([file], lowerName, {
      type,
      lastModified: file.lastModified,
    })
  } catch {
    return file
  }
}

function getExifParseOptions(file: File) {
  return {
    gps: true,
    exif: true,
    ifd0: {},
    tiff: true,
    xmp: true,
    mergeOutput: true,
    reviveValues: true,
    translateKeys: true,
    translateValues: true,
    chunked: false,
    firstChunkSize: Math.max(file.size, 1024 * 1024),
    chunkLimit: Math.max(10, Math.ceil(file.size / (1024 * 1024))),
  }
}

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  }
  return null
}

function dmsToDecimal(value: unknown, ref: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (!Array.isArray(value) || value.length < 2) return null

  const degrees = Number(typeof value[0] === 'object' && value[0] !== null && 'valueOf' in value[0] ? value[0].valueOf() : value[0])
  const minutes = Number(typeof value[1] === 'object' && value[1] !== null && 'valueOf' in value[1] ? value[1].valueOf() : value[1])
  const seconds = Number(typeof value[2] === 'object' && value[2] !== null && 'valueOf' in value[2] ? value[2].valueOf() : value[2] ?? 0)

  if (!Number.isFinite(degrees) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return null
  }

  const sign = String(ref).toUpperCase() === 'S' || String(ref).toUpperCase() === 'W' ? -1 : 1
  return sign * (degrees + minutes / 60 + seconds / 3600)
}

function coordinatePairToGps(value: unknown): Coordinates | null {
  if (Array.isArray(value) && value.length >= 2) {
    const latitude = toFiniteNumber(value[0])
    const longitude = toFiniteNumber(value[1])
    return latitude !== null && longitude !== null ? { latitude, longitude } : null
  }

  if (typeof value === 'string') {
    const numbers = value.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
    const [latitude, longitude] = numbers

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude }
    }
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const latitude = toFiniteNumber(record.latitude ?? record.lat)
    const longitude = toFiniteNumber(record.longitude ?? record.lng ?? record.lon)

    if (latitude !== null && longitude !== null) {
      return { latitude, longitude }
    }
  }

  return null
}

function normalizeGps(tags: ExifGpsTags | null | undefined): Coordinates | null {
  if (!tags) return null

  if (tags.gps) {
    const nestedGps = normalizeGps(tags.gps)
    if (nestedGps) return nestedGps
  }

  if (tags.location) {
    const nestedLocation = normalizeGps(tags.location)
    if (nestedLocation) return nestedLocation
  }

  const gpsPosition = coordinatePairToGps(tags.GPSPosition)
  if (gpsPosition) return gpsPosition

  const directLatitude = toFiniteNumber(tags.latitude)
  const directLongitude = toFiniteNumber(tags.longitude)

  if (directLatitude !== null && directLongitude !== null) {
    return {
      latitude: directLatitude,
      longitude: directLongitude,
    }
  }

  const latitude = dmsToDecimal(tags.GPSLatitude, tags.GPSLatitudeRef)
  const longitude = dmsToDecimal(tags.GPSLongitude, tags.GPSLongitudeRef)

  if (latitude !== null && longitude !== null) {
    return { latitude, longitude }
  }

  return null
}

export async function getGpsFromImage(file: File): Promise<Coordinates | null> {
  const sourceFile = normalizeExifFile(file)
  const parseOptions = getExifParseOptions(sourceFile)

  try {
    const gps = await exifr.gps(sourceFile)
    const normalizedGps = normalizeGps(gps)

    if (normalizedGps) {
      return normalizedGps
    }
  } catch (error) {
    console.warn('GPS情報を直接読み取れませんでした。別方式を試します。', error)
  }

  try {
    const parsed = await exifr.parse(sourceFile, parseOptions)
    const normalizedParsedGps = normalizeGps(parsed)

    if (normalizedParsedGps) {
      return normalizedParsedGps
    }
  } catch (error) {
    console.warn('EXIF情報からGPSを読み取れませんでした。', error)
  }

  try {
    const parsed = await exifr.parse(await sourceFile.arrayBuffer(), parseOptions)
    const normalizedParsedGps = normalizeGps(parsed)

    if (normalizedParsedGps) {
      return normalizedParsedGps
    }
  } catch (error) {
    console.warn('画像全体の読み込みからGPSを読み取れませんでした。', error)
  }

  return null
}
