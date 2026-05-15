export const CATEGORIES = ['建築', '音楽', '映画', 'ドラマ'] as const
export const TAGS: string[] = []

export type Category = (typeof CATEGORIES)[number]
export type PinTag = string
export type Visibility = 'public' | 'private'
export type PinKind = 'official' | 'user'

export type Coordinates = {
  longitude: number
  latitude: number
}

export type PinComment = {
  id: string
  pinId: string
  body: string
  authorName: string
  createdAt: string
}

export type MapPin = Coordinates & {
  id: string
  ownerId?: string
  kind: PinKind
  visibility: Visibility
  name: string
  comment?: string
  categories: Category[]
  tags: PinTag[]
  folderId?: string
  imageName?: string
  imageUrl?: string
  imageMimeType?: string
  ownerName: string
  createdAt: string
  likes: number
  likedByMe: boolean
  comments: PinComment[]
}

export type UserProfile = {
  id: string
  username: string
  displayName: string
  bio?: string
  avatarUrl?: string
  coverImageUrl?: string
  websiteUrl?: string
  instagramUrl?: string
  xUrl?: string
  tiktokUrl?: string
}

export type SpotFolder = {
  id: string
  ownerId?: string
  name: string
  ownerName: string
  visibility: Visibility
  categories: Category[]
  tags: PinTag[]
  pinIds: string[]
  createdAt: string
}

export type AppState = {
  officialPins: MapPin[]
  myPins: MapPin[]
  publicPins: MapPin[]
  myFolders: SpotFolder[]
  publicFolders: SpotFolder[]
  savedFolderIds: string[]
  savedPinIds: string[]
  hiddenPinIds: string[]
  followingUserIds: string[]
  followerUserIds: string[]
}

export type FilterState = {
  categories: Category[]
  tags: PinTag[]
}
