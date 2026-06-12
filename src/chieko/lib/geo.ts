import type { Coordinates, DropDoc, DropStats, ReverseGeocodeResult } from './types'

const DEFAULT_RADIUS_METERS = 50

export function distanceInMeters(a: Coordinates, b: Coordinates) {
  const earthRadius = 6371000
  const toRadians = (value: number) => (value * Math.PI) / 180
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function hasNearbyDrop(coordinates: Coordinates, drops: DropDoc[], radiusMeters = DEFAULT_RADIUS_METERS) {
  return drops.some((drop) => distanceInMeters(coordinates, { lat: drop.lat, lng: drop.lng }) <= radiusMeters)
}

export async function reverseGeocode(
  coordinates: Coordinates,
  token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '',
): Promise<ReverseGeocodeResult> {
  if (!token) {
    return {
      placeName: '場所未設定',
      address: `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`,
    }
  }

  const params = new URLSearchParams({
    access_token: token,
    language: 'ja,en',
    types: 'poi,address,place,locality,neighborhood',
    limit: '1',
  })
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?${params.toString()}`,
  )

  if (!response.ok) {
    throw new Error('Mapbox reverse geocoding failed')
  }

  const data = (await response.json()) as {
    features?: Array<{
      text?: string
      place_name?: string
      properties?: Record<string, string>
    }>
  }
  const feature = data.features?.[0]

  return {
    placeName: feature?.text ?? '場所未設定',
    address: feature?.place_name ?? `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`,
  }
}

function splitAddress(address: string) {
  return address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function calculateStats(drops: DropDoc[]): DropStats {
  const countries = new Set<string>()
  const cities = new Set<string>()

  drops.forEach((drop) => {
    const parts = splitAddress(drop.address || drop.placeName)
    const country = parts.at(-1)
    const city = parts.length > 1 ? parts.at(-2) : drop.placeName

    if (country) countries.add(country)
    if (city) cities.add(city)
  })

  return {
    countries: countries.size,
    cities: cities.size,
    drops: drops.length,
  }
}

export function formatDropDate(value: DropDoc['takenAt']) {
  if (!value) return '日付なし'
  const date = value instanceof Date ? value : typeof value === 'object' && 'toDate' in value ? value.toDate() : new Date(value)
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}
