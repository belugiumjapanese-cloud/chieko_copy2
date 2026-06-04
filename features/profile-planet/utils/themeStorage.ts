import type { UserMapTheme } from '../types/map'

export const PROFILE_PLANET_THEME_STORAGE_KEY = 'profile-planet-theme'

const themeKeys: Array<keyof UserMapTheme> = [
  'oceanColor',
  'landColor',
  'backgroundColor',
  'atmosphereColor',
  'pinColor',
  'roadColor',
  'buildingColor',
  'labelColor',
]

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

function cloneTheme(theme: UserMapTheme): UserMapTheme {
  return { ...theme }
}

function isStoredTheme(value: unknown): value is UserMapTheme {
  if (!value || typeof value !== 'object') return false

  return themeKeys.every((key) => {
    const color = (value as Partial<UserMapTheme>)[key]

    return typeof color === 'string' && hexColorPattern.test(color.trim())
  })
}

export function loadProfilePlanetTheme(defaultTheme: UserMapTheme): UserMapTheme {
  if (typeof window === 'undefined') return cloneTheme(defaultTheme)

  try {
    const storedTheme = window.localStorage.getItem(PROFILE_PLANET_THEME_STORAGE_KEY)
    if (!storedTheme) return cloneTheme(defaultTheme)

    const parsedTheme = JSON.parse(storedTheme)
    if (!isStoredTheme(parsedTheme)) return cloneTheme(defaultTheme)

    return cloneTheme(parsedTheme)
  } catch {
    return cloneTheme(defaultTheme)
  }
}

export function saveProfilePlanetTheme(theme: UserMapTheme) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(PROFILE_PLANET_THEME_STORAGE_KEY, JSON.stringify(theme))
  } catch {
    // localStorage can be unavailable in private or restricted browser modes.
  }
}
