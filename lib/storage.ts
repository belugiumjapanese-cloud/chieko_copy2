import { INITIAL_STATE } from './constants'
import type { AppState, MapPin } from './types'

const STATE_KEY = 'spot-folder-map:state:v2'
const USER_KEY = 'spot-folder-map:user-id:v1'

function createUuidFallback() {
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (character) =>
    (Number(character) ^ (Math.random() * 16) >> (Number(character) / 4)).toString(16),
  )
}

function isUuid(value: string | null) {
  return Boolean(
    value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
  )
}

type StoredPin = Partial<MapPin> & {
  lat?: unknown
  lng?: unknown
}

function toFiniteCoordinate(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizePin(pin: unknown): MapPin | null {
  if (!pin || typeof pin !== 'object') return null

  const storedPin = pin as StoredPin
  const longitude = toFiniteCoordinate(storedPin.longitude ?? storedPin.lng)
  const latitude = toFiniteCoordinate(storedPin.latitude ?? storedPin.lat)

  if (
    longitude === null ||
    latitude === null ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null
  }

  return {
    ...storedPin,
    longitude,
    latitude,
  } as MapPin
}

function normalizePins(values: unknown) {
  return Array.isArray(values) ? values.map(normalizePin).filter((pin): pin is MapPin => Boolean(pin)) : []
}

export function createId(_prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return createUuidFallback()
}

export function loadAppState(): AppState {
  if (typeof window === 'undefined') {
    return INITIAL_STATE
  }

  try {
    const raw = window.localStorage.getItem(STATE_KEY)
    if (!raw) return INITIAL_STATE
    const parsed = JSON.parse(raw) as Partial<AppState>

    return {
      officialPins: normalizePins(parsed.officialPins),
      myPins: normalizePins(parsed.myPins),
      publicPins: normalizePins(parsed.publicPins),
      myFolders: parsed.myFolders ?? [],
      publicFolders: parsed.publicFolders ?? [],
      savedFolderIds: parsed.savedFolderIds ?? [],
      savedPinIds: parsed.savedPinIds ?? [],
      hiddenPinIds: parsed.hiddenPinIds ?? [],
      followingUserIds: parsed.followingUserIds ?? [],
      followerUserIds: parsed.followerUserIds ?? [],
    }
  } catch (error) {
    console.error(error)
    return INITIAL_STATE
  }
}

export function saveAppState(state: AppState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STATE_KEY, JSON.stringify(state))
}

export function getLocalUserId() {
  if (typeof window === 'undefined') return 'server'

  const existing = window.localStorage.getItem(USER_KEY)
  if (isUuid(existing)) return existing!

  const next = createId('user')
  window.localStorage.setItem(USER_KEY, next)
  return next
}
