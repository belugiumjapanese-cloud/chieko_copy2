export type LabUser = {
  id: string
  username: string
  displayName: string
  avatarUrl: string
  bio: string
  followers: number
  following: number
}

export type LabPin = {
  id: string
  ownerId: string
  communityId?: string
  title: string
  note: string
  imageUrl: string
  tags: string[]
  latitude: number
  longitude: number
  x: number
  y: number
  color: string
  likes: number
  comments: number
  saves: number
  createdAt: string
}

export type LabFolder = {
  id: string
  ownerId: string
  name: string
  description: string
  pinIds: string[]
  visibility: 'public' | 'private'
  isOfficial?: boolean
  likes: number
  saves: number
  thumbnailUrl?: string
}

export type LabCommunity = {
  id: string
  ownerId: string
  name: string
  description: string
  privacy: 'public' | 'private'
  joinPolicy: 'open' | 'approval' | 'invite'
  thumbnailUrl: string
  memberCount: number
  pinIds: string[]
  messages: Array<{
    id: string
    userId: string
    body: string
    createdAt: string
  }>
}

export type LabRecommendItem = {
  id: string
  type: 'event' | 'folder' | 'community' | 'editorial'
  title: string
  description: string
  imageUrl: string
  targetId?: string
  publishedAt: string
}
