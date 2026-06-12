import type { Timestamp } from 'firebase/firestore'

export type DropTimestamp = Timestamp | Date | string | number | null | undefined

export type Coordinates = {
  lat: number
  lng: number
}

export type DropFolder = {
  id: string
  name: string
  createdAt?: DropTimestamp
  dropCount: number
  latestImageUrl?: string | null
}

export type DropDoc = {
  id: string
  imageUrl: string
  lat: number
  lng: number
  placeName: string
  address: string
  folderId: string
  caption: string
  takenAt: DropTimestamp
  createdAt: DropTimestamp
  isPublic: boolean
}

export type NewDropInput = {
  imageFile: File
  coordinates: Coordinates
  placeName: string
  address: string
  folderId: string
  caption?: string
  takenAt?: Date | null
  isPublic?: boolean
}

export type ReverseGeocodeResult = {
  placeName: string
  address: string
}

export type PhotoMetadata = {
  coordinates: Coordinates | null
  takenAt: Date | null
}

export type MemoryCandidate = {
  id: string
  file: File
  previewUrl: string
  coordinates: Coordinates | null
  placeName: string
  address: string
  takenAt: Date | null
  skipped?: boolean
}

export type DropStats = {
  countries: number
  cities: number
  drops: number
}
