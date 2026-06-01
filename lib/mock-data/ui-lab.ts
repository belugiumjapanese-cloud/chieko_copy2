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

export const labCurrentUserId = 'u_mame'

export const labUsers: LabUser[] = [
  {
    id: 'u_mame',
    username: 'mametaro',
    displayName: 'Mametaro',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=420&q=80',
    bio: 'Memory map in progress. Architecture, tiny city details, food after walking.',
    followers: 128,
    following: 42,
  },
  {
    id: 'u_chieko',
    username: 'chieko_nh',
    displayName: 'Chieko',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=420&q=80',
    bio: 'Facade hunter. Windows, corners, street textures.',
    followers: 820,
    following: 331,
  },
  {
    id: 'u_arc',
    username: 'arc_walks',
    displayName: 'Arc Walks',
    avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=420&q=80',
    bio: 'Public walks and research folders.',
    followers: 2400,
    following: 190,
  },
  {
    id: 'u_food',
    username: 'midnight_katsu',
    displayName: 'Midnight Katsu',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=420&q=80',
    bio: 'Late night food stops.',
    followers: 512,
    following: 88,
  },
]

export const labPins: LabPin[] = [
  {
    id: 'p_brutalist_window',
    ownerId: 'u_chieko',
    communityId: 'c_architecture',
    title: 'Quiet concrete windows',
    note: 'Small windows on a heavy facade. The rhythm feels accidental, but it holds the whole street.',
    imageUrl: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80',
    tags: ['facade', 'concrete', 'window'],
    latitude: 50.845,
    longitude: 4.351,
    x: 44,
    y: 42,
    color: '#f5f5f5',
    likes: 38,
    comments: 6,
    saves: 14,
    createdAt: '2026-05-28T12:20:00.000Z',
  },
  {
    id: 'p_stair_blue',
    ownerId: 'u_mame',
    communityId: 'c_city_details',
    title: 'Blue stair landing',
    note: 'The landing color makes the stair feel like a small public room.',
    imageUrl: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=900&q=80',
    tags: ['stair', 'blue', 'memory'],
    latitude: 50.852,
    longitude: 4.371,
    x: 63,
    y: 60,
    color: '#60a5fa',
    likes: 12,
    comments: 2,
    saves: 1,
    createdAt: '2026-05-29T09:12:00.000Z',
  },
  {
    id: 'p_katsu_bowl',
    ownerId: 'u_food',
    title: 'Katsu after the rain',
    note: 'Simple, warm, perfect after a long walk.',
    imageUrl: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=900&q=80',
    tags: ['food', 'night', 'save'],
    latitude: 50.847,
    longitude: 4.362,
    x: 54,
    y: 72,
    color: '#facc15',
    likes: 64,
    comments: 11,
    saves: 27,
    createdAt: '2026-05-30T21:08:00.000Z',
  },
  {
    id: 'p_market_light',
    ownerId: 'u_arc',
    communityId: 'c_architecture',
    title: 'Market roof glow',
    note: 'A crowded roof, light pooling over everything. Good precedent for public interior scale.',
    imageUrl: 'https://images.unsplash.com/photo-1515238152791-8216bfdf89a7?auto=format&fit=crop&w=900&q=80',
    tags: ['market', 'roof', 'public'],
    latitude: 50.86,
    longitude: 4.34,
    x: 32,
    y: 35,
    color: '#a78bfa',
    likes: 91,
    comments: 18,
    saves: 40,
    createdAt: '2026-05-25T16:41:00.000Z',
  },
  {
    id: 'p_forest_path',
    ownerId: 'u_mame',
    communityId: 'c_private_trip',
    title: 'Overexposed forest path',
    note: 'Not technically good, but the memory is exact.',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80',
    tags: ['trip', 'forest', 'friend'],
    latitude: 35.681,
    longitude: 139.767,
    x: 78,
    y: 31,
    color: '#34d399',
    likes: 4,
    comments: 1,
    saves: 0,
    createdAt: '2026-05-22T08:30:00.000Z',
  },
  {
    id: 'p_corner_shop',
    ownerId: 'u_chieko',
    communityId: 'c_city_details',
    title: 'Corner shop sign',
    note: 'The sign is doing more for the street than the storefront.',
    imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80',
    tags: ['sign', 'corner', 'street'],
    latitude: 50.849,
    longitude: 4.376,
    x: 70,
    y: 48,
    color: '#fb7185',
    likes: 22,
    comments: 3,
    saves: 12,
    createdAt: '2026-05-27T18:00:00.000Z',
  },
]

export const labFolders: LabFolder[] = [
  {
    id: 'f_my_world',
    ownerId: 'u_mame',
    name: 'My World',
    description: 'Only my own drops. The private working map.',
    pinIds: ['p_stair_blue', 'p_forest_path'],
    visibility: 'private',
    likes: 0,
    saves: 0,
  },
  {
    id: 'f_to_visit',
    ownerId: 'u_mame',
    name: 'To Visit',
    description: 'Saved public drops that I want to visit later.',
    pinIds: ['p_brutalist_window', 'p_katsu_bowl', 'p_market_light'],
    visibility: 'private',
    likes: 0,
    saves: 0,
  },
  {
    id: 'f_little_wonders',
    ownerId: 'u_chieko',
    name: 'little wonders',
    description: 'Small urban moments that should not disappear in the feed.',
    pinIds: ['p_brutalist_window', 'p_corner_shop', 'p_stair_blue'],
    visibility: 'public',
    likes: 41,
    saves: 12,
  },
  {
    id: 'f_architecture',
    ownerId: 'u_arc',
    name: 'Architecture',
    description: 'A starter folder for public buildings, facades, and walkable references.',
    pinIds: ['p_market_light', 'p_brutalist_window'],
    visibility: 'public',
    isOfficial: true,
    likes: 88,
    saves: 36,
  },
]

export const labCommunities: LabCommunity[] = [
  {
    id: 'c_architecture',
    ownerId: 'u_arc',
    name: 'Architecture Club',
    description: 'Approval-based public map for buildings, materials, and city research.',
    privacy: 'public',
    joinPolicy: 'approval',
    thumbnailUrl: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=900&q=80',
    memberCount: 1240,
    pinIds: ['p_brutalist_window', 'p_market_light'],
    messages: [
      { id: 'm1', userId: 'u_arc', body: 'Market roof references are now grouped for review.', createdAt: '2026-05-31T10:00:00.000Z' },
      { id: 'm2', userId: 'u_chieko', body: 'Added a concrete-window example. Needs material tags.', createdAt: '2026-05-31T12:00:00.000Z' },
    ],
  },
  {
    id: 'c_city_details',
    ownerId: 'u_chieko',
    name: 'City Details',
    description: 'Open public map for signs, stairs, handles, manholes, and small discoveries.',
    privacy: 'public',
    joinPolicy: 'open',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80',
    memberCount: 803,
    pinIds: ['p_corner_shop', 'p_stair_blue'],
    messages: [
      { id: 'm3', userId: 'u_chieko', body: 'Let us keep titles short and tags specific.', createdAt: '2026-05-30T11:00:00.000Z' },
    ],
  },
  {
    id: 'c_private_trip',
    ownerId: 'u_mame',
    name: 'June Trip Notes',
    description: 'Private map for friends. Invite only.',
    privacy: 'private',
    joinPolicy: 'invite',
    thumbnailUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    memberCount: 5,
    pinIds: ['p_forest_path'],
    messages: [
      { id: 'm4', userId: 'u_mame', body: 'Use this to collect places before the route is fixed.', createdAt: '2026-05-29T10:00:00.000Z' },
    ],
  },
]

export const labRecommendItems: LabRecommendItem[] = [
  {
    id: 'r_event_walk',
    type: 'event',
    title: 'Weekend city walk: materials and small facades',
    description: 'An editorial event slot for the Recommend tab.',
    imageUrl: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?auto=format&fit=crop&w=1200&q=80',
    publishedAt: '2026-06-01T08:00:00.000Z',
  },
  {
    id: 'r_folder_architecture',
    type: 'folder',
    title: 'Official folder: Architecture',
    description: 'Pinned by operations. Public examples and references.',
    imageUrl: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1200&q=80',
    targetId: 'f_architecture',
    publishedAt: '2026-05-31T08:00:00.000Z',
  },
  {
    id: 'r_community_city_details',
    type: 'community',
    title: 'Community pickup: City Details',
    description: 'A clear example of a collaborative public map.',
    imageUrl: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80',
    targetId: 'c_city_details',
    publishedAt: '2026-05-30T08:00:00.000Z',
  },
]

export const labAdminStats = [
  { label: 'Mock users', value: labUsers.length.toString(), delta: '+3 this week' },
  { label: 'Mock pins', value: labPins.length.toString(), delta: '6 seeded drops' },
  { label: 'Public folders', value: labFolders.filter((folder) => folder.visibility === 'public').length.toString(), delta: 'ready for Find' },
  { label: 'Communities', value: labCommunities.length.toString(), delta: 'open / approval / private' },
]

export function userById(id: string) {
  return labUsers.find((user) => user.id === id) ?? labUsers[0]
}

export function pinsForFolder(folder: LabFolder) {
  return folder.pinIds.map((pinId) => labPins.find((pin) => pin.id === pinId)).filter((pin): pin is LabPin => Boolean(pin))
}

export function pinsForCommunity(community: LabCommunity) {
  return community.pinIds.map((pinId) => labPins.find((pin) => pin.id === pinId)).filter((pin): pin is LabPin => Boolean(pin))
}

export function folderThumbnail(folder: LabFolder) {
  return folder.thumbnailUrl ?? pinsForFolder(folder)[0]?.imageUrl ?? labPins[0].imageUrl
}
