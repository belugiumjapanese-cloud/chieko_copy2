import type { LabCommunity, LabFolder, LabPin, LabUser } from '../ui-lab-types'

export const chiekoUser: LabUser = {
  id: 'u_chieko',
  username: 'chieko_nh',
  displayName: 'Chieko',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=420&q=80',
  bio: 'Facade hunter. Windows, corners, street textures.',
  followers: 820,
  following: 331,
}

export const chiekoPins: LabPin[] = [
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

export const chiekoFolders: LabFolder[] = [
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
]

export const chiekoCommunities: LabCommunity[] = [
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
]
