export type UserMapTheme = {
  oceanColor: string
  landColor: string
  backgroundColor: string
  atmosphereColor: string
  pinColor: string
  roadColor: string
  buildingColor: string
  labelColor: string
}

export type MapPin = {
  id: string
  title: string
  description: string
  lat: number
  lng: number
  folderId: string
  imageUrl: string
  imageAlt: string
  tags: string[]
  createdAt: string
}

export type MapFolder = {
  id: string
  name: string
  description: string
  centerLat: number
  centerLng: number
  zoom: number
  pinIds: string[]
  coverImageUrl: string
  coverImageAlt: string
}

export type SelectedMapTarget =
  | {
      type: 'pin'
      pinId: MapPin['id']
    }
  | {
      type: 'folder'
      folderId: MapFolder['id']
    }
  | null
