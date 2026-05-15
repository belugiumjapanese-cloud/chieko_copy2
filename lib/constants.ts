import type { AppState, FilterState, MapPin, SpotFolder } from './types'
import { CATEGORIES } from './types'

export const DEFAULT_FILTER: FilterState = {
  categories: [...CATEGORIES],
  tags: [],
}

export const SEED_OFFICIAL_PINS: MapPin[] = []
export const SEED_PUBLIC_PINS: MapPin[] = []
export const SEED_PUBLIC_FOLDERS: SpotFolder[] = []

export const INITIAL_STATE: AppState = {
  officialPins: [],
  myPins: [],
  publicPins: [],
  myFolders: [],
  publicFolders: [],
  savedFolderIds: [],
  savedPinIds: [],
  hiddenPinIds: [],
  followingUserIds: [],
  followerUserIds: [],
}
