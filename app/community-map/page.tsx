'use client'

import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import exifr from 'exifr'
import {
  AlertTriangle,
  ArrowLeft,
  BookmarkPlus,
  Compass,
  EyeOff,
  FolderPlus,
  Heart,
  Home,
  LocateFixed,
  Lock,
  Map as MapIcon,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  ShieldCheck,
  Users,
  UserRound,
  X,
} from 'lucide-react'
import { ChangeEvent, FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getGpsFromImage } from '../../lib/exif'
import { getDisplayImage } from '../../lib/image'
import { createId } from '../../lib/storage'
import { supabase } from '../../lib/supabase'
import type { Coordinates } from '../../lib/types'
import styles from './community-map.module.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
mapboxgl.accessToken = MAPBOX_TOKEN

const PRODUCTION_SITE_URL = 'https://map-omega-nine.vercel.app'
const CONFIGURED_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
const DEFAULT_CENTER: [number, number] = [139.7671, 35.6812]
const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#7c3aed', '#0891b2', '#db2777']
const EMPTY_IMAGE =
  'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23dfe8e2%22/%3E%3Cpath%20d%3D%22M64%20224l82-96%2059%2068%2045-48%2086%2076z%22%20fill%3D%22%23126b58%22%20opacity%3D%22.35%22/%3E%3Ccircle%20cx%3D%22288%22%20cy%3D%2282%22%20r%3D%2230%22%20fill%3D%22%23126b58%22%20opacity%3D%22.3%22/%3E%3C/svg%3E'

const AUTH_PLACEHOLDER_USER: DemoUser = {
  id: 'auth',
  username: 'signin',
  displayName: 'Sign in / Sign up',
  avatarUrl: EMPTY_IMAGE,
  bio: '',
  followingIds: [],
  followerIds: [],
  pinCount: 0,
  publicFolderCount: 0,
}

function getAuthRedirectUrl() {
  const siteUrl = CONFIGURED_SITE_URL && !CONFIGURED_SITE_URL.includes('localhost')
    ? CONFIGURED_SITE_URL
    : PRODUCTION_SITE_URL
  return `${siteUrl}/community-map`
}

type ActiveTab = 'home' | 'find' | 'myworld' | 'tovisit' | 'mypage'
type HomeMode = 'timeline' | 'map'
type LibraryMode = 'map' | 'folder'
type Privacy = 'public' | 'limited'
type ProfileListMode = 'profile' | 'following' | 'followers'

type DemoUser = {
  id: string
  email?: string
  username: string
  displayName: string
  avatarUrl: string
  bio: string
  followingIds: string[]
  followerIds: string[]
  pinCount: number
  publicFolderCount: number
}

type Community = {
  id: string
  slug: string
  name: string
  description: string
  privacy: Privacy
  ownerId: string
  memberIds: string[]
  memberCount?: number
  postsCount?: number
  joinedByMe?: boolean
  inviteCode?: string
  createdAt: string
}

type PinComment = {
  id: string
  userId: string
  text: string
  createdAt: string
}

type Pin = Coordinates & {
  id: string
  ownerId: string
  communityId?: string | null
  postedCommunityIds?: string[]
  title: string
  description: string
  imageUrl: string
  tags: string[]
  visibility: 'public' | 'private'
  takenAt?: string
  createdAt: string
  likes: number
  saves: number
  likedByMe: boolean
  comments: PinComment[]
  reports: number
  color: string
}

type Folder = {
  id: string
  ownerId: string
  kind: 'my_world' | 'to_visit'
  name: string
  color: string
  description?: string
  thumbnailUrl?: string
  isPaid?: boolean
  paidFromIndex?: number | null
  priceYen?: number | null
  pinIds: string[]
  visibility: 'private' | 'public'
  createdAt: string
}

type PostDraft = {
  communityId?: string | null
  imageUrl: string
  imageName: string
  coordinates: Coordinates | null
  locationSource: 'gps' | 'manual' | 'manual-pending'
  takenAt?: string
}

type PostComposer = {
  title: string
  description: string
  tags: string
  takenAt: string
  folderIds: string[]
}

type CommunityActivity = {
  id: string
  communityId: string
  userId: string
  pinId?: string
  action: 'added' | 'edited' | 'comment'
  text: string
  title: string
  createdAt: string
}

type NotificationItem = {
  id: string
  type: 'like' | 'save' | 'invite'
  actorId: string
  pinId?: string
  communityId?: string
  createdAt: string
}

const arraysMatch = (a: string[], b: string[]) => a.length === b.length && a.every((value, index) => value === b[index])

type ProfileRow = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  pin_count?: number | null
  public_folder_count?: number | null
}

type FollowRow = {
  follower_id: string
  following_id: string
}

type AppPostCardRow = {
  id: string
  user_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  title: string | null
  description: string | null
  latitude: number
  longitude: number
  image_url: string | null
  visibility: 'public' | 'private' | 'followers'
  tags: string[] | null
  taken_at: string | null
  likes_count: number | null
  comments_count: number | null
  saves_count: number | null
  reports_count: number | null
  created_at: string
  folder_ids: string[] | null
  community_ids: string[] | null
}

type AppFolderCardRow = {
  id: string
  user_id: string
  folder_kind?: 'my_world' | 'to_visit' | null
  name: string
  description?: string | null
  color: string | null
  visibility: 'public' | 'private' | 'followers'
  is_paid?: boolean | null
  paid_from_index?: number | null
  folder_price_yen?: number | null
  preview_image_url?: string | null
  thumbnail_url?: string | null
  created_at: string
  post_ids: string[] | null
}

type AppCommunityCardRow = {
  id: string
  slug: string
  name: string
  description: string | null
  owner_id: string
  visibility: 'public' | 'invite_only' | 'private'
  invite_code: string | null
  member_count: number | null
  posts_count: number | null
  joined_by_me: boolean | null
  created_at: string
}

type CommunityMemberRow = {
  community_id: string
  user_id: string
}

type CommentRow = {
  id: string
  post_id: string
  user_id: string
  body: string
  created_at: string
}

type LikeRow = {
  post_id: string
  user_id: string
  created_at?: string | null
}

type SavedPostRow = {
  post_id: string
  user_id?: string | null
  created_at?: string | null
}

type CommunityInviteRow = {
  id: string
  community_id: string
  invited_by: string
  invited_user_id: string
  created_at: string
}

type AppCommunityActivityRow = {
  id: string
  community_id: string
  user_id: string
  post_id: string | null
  activity_type: 'post' | 'message'
  title: string | null
  body: string | null
  created_at: string
}

function toLngLat(value: Coordinates | null | undefined): [number, number] | null {
  if (!value || !Number.isFinite(value.longitude) || !Number.isFinite(value.latitude)) return null
  return [value.longitude, value.latitude]
}

function formatShortDate(value?: string) {
  if (!value) return '日時なし'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '日時なし'
  return new Intl.DateTimeFormat('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
}

function communityLabel(community?: Community) {
  return community ? community.name : 'Unknown community'
}

function personalCommunityLabel(community?: Community) {
  return community ? `m/${community.slug}` : 'm/unknown'
}

type MapMarkerItem =
  | { type: 'pin'; pin: Pin; lngLat: [number, number] }
  | { type: 'cluster'; id: string; pins: Pin[]; lngLat: [number, number] }

function markerElement(pin: Pin, seen = false, showTitle = false) {
  const element = document.createElement('button')
  element.className = styles.marker
  element.type = 'button'
  element.style.setProperty('--pin-color', seen ? '#9ca3af' : pin.color || '#facc15')
  const imageFrame = document.createElement('span')
  const image = document.createElement('img')
  image.src = pin.imageUrl
  image.alt = ''
  imageFrame.append(image)
  element.append(imageFrame)
  if (showTitle) {
    const title = document.createElement('b')
    title.textContent = pin.title
    element.append(title)
  }
  element.setAttribute('aria-label', pin.title)
  return element
}

function currentLocationElement() {
  const element = document.createElement('div')
  element.className = styles.currentLocationMarker
  return element
}

function clusterElement(count: number) {
  const element = document.createElement('button')
  element.className = styles.clusterMarker
  element.type = 'button'
  const label = document.createElement('span')
  label.textContent = String(count)
  element.append(label)
  element.setAttribute('aria-label', `${count} pins`)
  return element
}

function getMapMarkerItems(pins: Pin[], map: mapboxgl.Map, compact: boolean): MapMarkerItem[] {
  const zoom = map.getZoom()
  const clusterUntilZoom = compact ? 7 : 12
  if (zoom >= clusterUntilZoom) {
    return pins.flatMap((pin) => {
      const lngLat = toLngLat(pin)
      return lngLat ? [{ type: 'pin' as const, pin, lngLat }] : []
    })
  }

  const clusterRadius = compact ? 64 : 92
  const clusters: Array<{ pins: Pin[]; lngLat: [number, number]; point: { x: number; y: number } }> = []

  pins.forEach((pin) => {
    const lngLat = toLngLat(pin)
    if (!lngLat) return

    const point = map.project(lngLat)
    const target = clusters.find((cluster) => Math.hypot(point.x - cluster.point.x, point.y - cluster.point.y) < clusterRadius)
    if (!target) {
      clusters.push({ pins: [pin], lngLat, point })
      return
    }

    target.pins.push(pin)
    const size = target.pins.length
    target.lngLat = [
      (target.lngLat[0] * (size - 1) + lngLat[0]) / size,
      (target.lngLat[1] * (size - 1) + lngLat[1]) / size,
    ]
    target.point = map.project(target.lngLat)
  })

  return clusters.map((cluster, index) =>
    cluster.pins.length > 1
      ? { type: 'cluster' as const, id: `cluster-${index}-${cluster.pins.map((pin) => pin.id).join('-')}`, pins: cluster.pins, lngLat: cluster.lngLat }
      : { type: 'pin' as const, pin: cluster.pins[0], lngLat: cluster.lngLat },
  )
}

function createSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'community'}-${Math.random().toString(36).slice(2, 7)}`.slice(0, 48)
}

function pinCommunityIds(pin: Pin) {
  return Array.from(new Set([...(pin.postedCommunityIds ?? []), pin.communityId].filter(Boolean) as string[]))
}

function filterPinsByFolders(pins: Pin[], folders: Folder[], selectedFolderIds: string[]) {
  if (!folders.length) return pins
  if (!selectedFolderIds.length) return []

  const selectedIds = new Set(selectedFolderIds)
  const visiblePinIds = new Set(
    folders
      .filter((folder) => selectedIds.has(folder.id))
      .flatMap((folder) => folder.pinIds),
  )

  return pins.filter((pin) => visiblePinIds.has(pin.id))
}

function tagStatsFromPins(pins: Pin[]) {
  const counts = new Map<string, number>()
  pins.forEach((pin) => {
    pin.tags.forEach((rawTag) => {
      const tag = rawTag.replace(/^#/, '').trim()
      if (!tag) return
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    })
  })

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ja'))
}

function activeHashtagQuery(value: string) {
  const match = value.match(/(^|\s)#([^\s#]*)$/)
  return match ? match[2] : null
}

function replaceActiveHashtag(value: string, tag: string) {
  if (/(^|\s)#([^\s#]*)$/.test(value)) {
    return value.replace(/(^|\s)#([^\s#]*)$/, `$1#${tag} `)
  }

  return `${value.trim()} #${tag} `.trimStart()
}

function cleanTag(tag: string) {
  return tag.replace(/^#/, '').trim()
}

function sameStringArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function uniquePinsById(pins: Pin[]) {
  const seen = new Set<string>()
  return pins.filter((pin) => {
    if (seen.has(pin.id)) return false
    seen.add(pin.id)
    return true
  })
}

function uniquePinsByMemory(pins: Pin[]) {
  const seen = new Set<string>()
  return pins.filter((pin) => {
    const key = [
      pin.ownerId,
      pin.imageUrl,
      pin.title.trim().toLowerCase(),
      pin.description.trim().toLowerCase(),
      pin.latitude.toFixed(6),
      pin.longitude.toFixed(6),
      pin.takenAt ?? '',
    ].join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function profileFallbackName(id: string) {
  return `user_${id.slice(0, 8)}`
}

function mapVisibility(value: string | null | undefined): Pin['visibility'] {
  return value === 'private' ? 'private' : 'public'
}

function mapCommunityPrivacy(value: string | null | undefined): Privacy {
  return value === 'public' ? 'public' : 'limited'
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

function buildUsers(profileRows: ProfileRow[], followRows: FollowRow[]) {
  return profileRows.map((profile) => ({
    id: profile.id,
    username: profile.username || profileFallbackName(profile.id),
    displayName: profile.display_name || profile.username || profileFallbackName(profile.id),
    avatarUrl: profile.avatar_url || EMPTY_IMAGE,
    bio: profile.bio || '',
    followingIds: followRows.filter((follow) => follow.follower_id === profile.id).map((follow) => follow.following_id),
    followerIds: followRows.filter((follow) => follow.following_id === profile.id).map((follow) => follow.follower_id),
    pinCount: profile.pin_count ?? 0,
    publicFolderCount: profile.public_folder_count ?? 0,
  }))
}

function buildFolders(folderRows: AppFolderCardRow[]): Folder[] {
  return folderRows.map((folder) => ({
    id: folder.id,
    ownerId: folder.user_id,
    kind: folder.folder_kind === 'to_visit' ? 'to_visit' : 'my_world',
    name: folder.name,
    description: folder.description ?? '',
    color: folder.color || COLORS[0],
    thumbnailUrl: folder.thumbnail_url || folder.preview_image_url || undefined,
    isPaid: Boolean(folder.is_paid),
    paidFromIndex: folder.paid_from_index ?? null,
    priceYen: folder.folder_price_yen ?? null,
    pinIds: Array.from(new Set(folder.post_ids ?? [])),
    visibility: folder.visibility === 'public' ? 'public' : 'private',
    createdAt: folder.created_at,
  }))
}

function buildNotifications(
  likeRows: LikeRow[],
  saveRows: SavedPostRow[],
  inviteRows: CommunityInviteRow[],
  pins: Pin[],
  communities: Community[],
  activeUserId: string,
): NotificationItem[] {
  if (!activeUserId) return []

  const myPinIds = new Set(pins.filter((pin) => pin.ownerId === activeUserId).map((pin) => pin.id))
  const communityIds = new Set(communities.map((community) => community.id))
  const items: NotificationItem[] = []

  likeRows.forEach((row) => {
    if (!myPinIds.has(row.post_id) || row.user_id === activeUserId) return
    items.push({
      id: `like-${row.post_id}-${row.user_id}`,
      type: 'like',
      actorId: row.user_id,
      pinId: row.post_id,
      createdAt: row.created_at ?? new Date().toISOString(),
    })
  })

  saveRows.forEach((row) => {
    if (!row.user_id || !myPinIds.has(row.post_id) || row.user_id === activeUserId) return
    items.push({
      id: `save-${row.post_id}-${row.user_id}`,
      type: 'save',
      actorId: row.user_id,
      pinId: row.post_id,
      createdAt: row.created_at ?? new Date().toISOString(),
    })
  })

  inviteRows.forEach((row) => {
    if (row.invited_user_id !== activeUserId || !communityIds.has(row.community_id)) return
    items.push({
      id: `invite-${row.id}`,
      type: 'invite',
      actorId: row.invited_by,
      communityId: row.community_id,
      createdAt: row.created_at,
    })
  })

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 30)
}

function buildCommunities(communityRows: AppCommunityCardRow[], memberRows: CommunityMemberRow[], activeUserId: string) {
  return communityRows.map((community) => {
    const memberIds = memberRows
      .filter((member) => member.community_id === community.id)
      .map((member) => member.user_id)

    if (community.joined_by_me && activeUserId && !memberIds.includes(activeUserId)) {
      memberIds.push(activeUserId)
    }

    return {
      id: community.id,
      slug: community.slug,
      name: community.name,
      description: community.description || '',
      privacy: mapCommunityPrivacy(community.visibility),
      ownerId: community.owner_id,
      memberIds,
      memberCount: community.member_count ?? memberIds.length,
      postsCount: community.posts_count ?? 0,
      joinedByMe: Boolean(community.joined_by_me),
      inviteCode: community.invite_code ?? undefined,
      createdAt: community.created_at,
    }
  })
}

function buildPins(
  postRows: AppPostCardRow[],
  commentRows: CommentRow[],
  likeRows: LikeRow[],
  activeUserId: string,
  folders: Folder[],
) {
  const commentsByPost = new Map<string, PinComment[]>()
  commentRows.forEach((comment) => {
    const comments = commentsByPost.get(comment.post_id) ?? []
    comments.push({
      id: comment.id,
      userId: comment.user_id,
      text: comment.body,
      createdAt: comment.created_at,
    })
    commentsByPost.set(comment.post_id, comments)
  })

  const likedPostIds = new Set(
    activeUserId ? likeRows.filter((like) => like.user_id === activeUserId).map((like) => like.post_id) : [],
  )

  const folderColorByPost = new Map<string, string>()
  folders.forEach((folder) => {
    folder.pinIds.forEach((postId) => {
      if (!folderColorByPost.has(postId)) folderColorByPost.set(postId, folder.color)
    })
  })

  return postRows
    .filter((post) => Number.isFinite(post.latitude) && Number.isFinite(post.longitude))
    .map((post) => ({
      id: post.id,
      ownerId: post.user_id,
      communityId: post.community_ids?.[0] ?? null,
      postedCommunityIds: post.community_ids ?? [],
      title: post.title || 'Untitled',
      description: post.description || '',
      imageUrl: post.image_url || EMPTY_IMAGE,
      tags: (post.tags ?? []).map(cleanTag).filter(Boolean),
      visibility: mapVisibility(post.visibility),
      latitude: Number(post.latitude),
      longitude: Number(post.longitude),
      takenAt: post.taken_at ?? undefined,
      createdAt: post.created_at,
      likes: post.likes_count ?? 0,
      saves: post.saves_count ?? 0,
      likedByMe: likedPostIds.has(post.id),
      comments: commentsByPost.get(post.id) ?? [],
      reports: post.reports_count ?? 0,
      color: folderColorByPost.get(post.id) ?? '#facc15',
    }))
}

function buildActivities(rows: AppCommunityActivityRow[]): CommunityActivity[] {
  return rows.map((activity) => ({
    id: activity.id,
    communityId: activity.community_id,
    userId: activity.user_id,
    pinId: activity.post_id ?? undefined,
    action: activity.activity_type === 'message' ? 'comment' : 'added',
    text: activity.body || activity.title || '',
    title: activity.title || '',
    createdAt: activity.created_at,
  }))
}

async function getTakenAtFromImage(file: File) {
  try {
    const parsed = await exifr.parse(file, {
      exif: true,
      ifd0: {},
      xmp: true,
      mergeOutput: true,
      reviveValues: true,
      translateKeys: true,
    })
    const value = parsed?.DateTimeOriginal ?? parsed?.CreateDate ?? parsed?.ModifyDate ?? parsed?.DateCreated
    if (!value) return ''
    const date = value instanceof Date ? value : new Date(String(value))
    if (Number.isNaN(date.getTime())) return ''
    const offset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - offset).toISOString().slice(0, 16)
  } catch (error) {
    console.warn('撮影日時を読み取れませんでした。', error)
    return ''
  }
}

function PinMap({
  pins,
  selectedPinId,
  focusPinId,
  seenPinIds = [],
  currentLocation,
  startAtCurrentLocation = false,
  onPinClick,
  onMapClick,
  onMapSurfaceClick,
  onVisiblePinsChange,
  flyToCoordinates,
  compact = false,
}: {
  pins: Pin[]
  selectedPinId?: string | null
  focusPinId?: string | null
  seenPinIds?: string[]
  currentLocation?: Coordinates | null
  startAtCurrentLocation?: boolean
  onPinClick: (pinId: string) => void
  onMapClick?: (coordinates: Coordinates) => void
  onMapSurfaceClick?: () => void
  onVisiblePinsChange?: (pinIds: string[]) => void
  flyToCoordinates?: Coordinates | null
  compact?: boolean
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRefs = useRef<mapboxgl.Marker[]>([])
  const locationMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const fittedPinsKeyRef = useRef('')
  const centeredOnLocationRef = useRef(false)
  const initialMapViewRef = useRef<{
    center: [number, number]
    zoom: number
  } | null>(null)
  const pinsRef = useRef(pins)
  const [mapVersion, setMapVersion] = useState(0)
  const onPinClickRef = useRef(onPinClick)
  const onMapClickRef = useRef(onMapClick)
  const onMapSurfaceClickRef = useRef(onMapSurfaceClick)
  const onVisiblePinsChangeRef = useRef(onVisiblePinsChange)
  const currentLocationLngLat = toLngLat(currentLocation)
  if (startAtCurrentLocation && currentLocationLngLat && !initialMapViewRef.current && !mapRef.current) {
    initialMapViewRef.current = { center: currentLocationLngLat, zoom: compact ? 11 : 14 }
  }
  const canInitializeMap = !startAtCurrentLocation || Boolean(initialMapViewRef.current)

  const updateVisiblePins = useCallback(() => {
    const map = mapRef.current
    const nextPins = pinsRef.current
    if (!map) {
      onVisiblePinsChangeRef.current?.(nextPins.map((pin) => pin.id))
      return
    }

    const bounds = map.getBounds()
    if (!bounds) {
      onVisiblePinsChangeRef.current?.(nextPins.map((pin) => pin.id))
      return
    }

    onVisiblePinsChangeRef.current?.(
      nextPins
        .filter((pin) => {
          const lngLat = toLngLat(pin)
          return lngLat ? bounds.contains(lngLat) : false
        })
        .map((pin) => pin.id),
    )
  }, [])

  useEffect(() => {
    onPinClickRef.current = onPinClick
  }, [onPinClick])

  useEffect(() => {
    onMapClickRef.current = onMapClick
  }, [onMapClick])

  useEffect(() => {
    onMapSurfaceClickRef.current = onMapSurfaceClick
  }, [onMapSurfaceClick])

  useEffect(() => {
    onVisiblePinsChangeRef.current = onVisiblePinsChange
  }, [onVisiblePinsChange])

  useEffect(() => {
    pinsRef.current = pins
    updateVisiblePins()
  }, [pins, updateVisiblePins])

  useEffect(() => {
    if (!MAPBOX_TOKEN || !canInitializeMap || !containerRef.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: initialMapViewRef.current?.center ?? DEFAULT_CENTER,
      zoom: initialMapViewRef.current?.zoom ?? (compact ? 2 : 11),
    })

    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left')
    const refreshMapState = () => {
      updateVisiblePins()
      setMapVersion((value) => value + 1)
    }

    map.on('load', refreshMapState)
    map.on('moveend', refreshMapState)
    map.on('zoomend', refreshMapState)
    map.on('click', (event) => {
      if (onMapClickRef.current) {
        onMapClickRef.current({ longitude: event.lngLat.lng, latitude: event.lngLat.lat })
        return
      }
      onMapSurfaceClickRef.current?.()
    })

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map.resize()
        refreshMapState()
      })
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver?.disconnect()
      map.off('load', refreshMapState)
      map.off('moveend', refreshMapState)
      map.off('zoomend', refreshMapState)
      markerRefs.current.forEach((marker) => marker.remove())
      markerRefs.current = []
      locationMarkerRef.current?.remove()
      locationMarkerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [canInitializeMap, compact, updateVisiblePins])

  useEffect(() => {
    const map = mapRef.current
    const lngLat = toLngLat(currentLocation)
    if (!map || !lngLat) return

    if (!locationMarkerRef.current) {
      locationMarkerRef.current = new mapboxgl.Marker({ element: currentLocationElement(), anchor: 'center' })
    }

    locationMarkerRef.current.setLngLat(lngLat).addTo(map)

    if (startAtCurrentLocation && !centeredOnLocationRef.current) {
      map.flyTo({ center: lngLat, zoom: compact ? 11 : 14, essential: true })
      centeredOnLocationRef.current = true
    }
  }, [compact, currentLocation, startAtCurrentLocation])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markerRefs.current.forEach((marker) => marker.remove())
    markerRefs.current = []

    const pinsKey = pins.map((pin) => pin.id).join('|')
    const shouldPreferCurrentLocation = startAtCurrentLocation && Boolean(currentLocation)
    const shouldFitPins = !shouldPreferCurrentLocation && fittedPinsKeyRef.current !== pinsKey
    const bounds = new mapboxgl.LngLatBounds()
    let count = 0
    pins.forEach((pin) => {
      const lngLat = toLngLat(pin)
      if (!lngLat) return
      bounds.extend(lngLat)
      count += 1
    })

    getMapMarkerItems(pins, map, compact).forEach((item) => {
      if (item.type === 'cluster') {
        const element = clusterElement(item.pins.length)
        element.addEventListener('click', (event) => {
          event.stopPropagation()
          const clusterBounds = new mapboxgl.LngLatBounds()
          item.pins.forEach((pin) => {
            const lngLat = toLngLat(pin)
            if (lngLat) clusterBounds.extend(lngLat)
          })
          map.fitBounds(clusterBounds, { padding: 92, maxZoom: 14, duration: 520 })
        })
        markerRefs.current.push(new mapboxgl.Marker({ element, anchor: 'center' }).setLngLat(item.lngLat).addTo(map))
        return
      }

      const { pin, lngLat } = item
      const element = markerElement(pin, seenPinIds.includes(pin.id), map.getZoom() >= 14)
      if (selectedPinId === pin.id || focusPinId === pin.id) element.classList.add(styles.markerActive)
      element.addEventListener('click', (event) => {
        event.stopPropagation()
        onPinClickRef.current(pin.id)
      })
      markerRefs.current.push(new mapboxgl.Marker({ element, anchor: 'bottom' }).setLngLat(lngLat).addTo(map))
    })

    if (shouldFitPins && count === 1) {
      map.flyTo({ center: bounds.getCenter(), zoom: compact ? 11 : 14, essential: true })
      fittedPinsKeyRef.current = pinsKey
    } else if (shouldFitPins && count > 1) {
      map.fitBounds(bounds, { padding: compact ? 44 : 82, maxZoom: compact ? 10 : 14, duration: 500 })
      fittedPinsKeyRef.current = pinsKey
    }

    updateVisiblePins()
  }, [compact, currentLocation, focusPinId, mapVersion, pins, seenPinIds, selectedPinId, startAtCurrentLocation, updateVisiblePins])

  useEffect(() => {
    if (!focusPinId) return
    const pin = pins.find((item) => item.id === focusPinId)
    const lngLat = toLngLat(pin)
    if (!lngLat) return
    mapRef.current?.jumpTo({ center: lngLat })
  }, [compact, focusPinId, pins])

  useEffect(() => {
    if (!flyToCoordinates) return
    const lngLat = toLngLat(flyToCoordinates)
    if (!lngLat) return
    mapRef.current?.flyTo({ center: lngLat, zoom: 14, essential: true })
  }, [flyToCoordinates])

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`${styles.mapFallback} ${compact ? styles.mapCompact : ''}`}>
        <MapIcon size={28} />
        <strong>Mapbox token が必要です</strong>
      </div>
    )
  }

  if (!canInitializeMap) {
    return (
      <div className={`${styles.mapCanvas} ${styles.mapLoading} ${compact ? styles.mapCompact : ''}`}>
        <LocateFixed size={26} />
        <strong>現在地を取得中...</strong>
      </div>
    )
  }

  return <div ref={containerRef} className={`${styles.mapCanvas} ${compact ? styles.mapCompact : ''}`} />
}

export default function CommunityMapPrototype() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('myworld')
  const [homeMode, setHomeMode] = useState<HomeMode>('timeline')
  const [findChaosOpen, setFindChaosOpen] = useState(false)
  const [findCommunityOpen, setFindCommunityOpen] = useState(false)
  const [selectedFindFolderId, setSelectedFindFolderId] = useState<string | null>(null)
  const [myWorldMode, setMyWorldMode] = useState<LibraryMode>('map')
  const [toVisitMode, setToVisitMode] = useState<LibraryMode>('map')
  const [users, setUsers] = useState<DemoUser[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeUserId, setActiveUserId] = useState('')
  const [ownedAccountIds, setOwnedAccountIds] = useState<string[]>([])
  const [remoteLoading, setRemoteLoading] = useState(true)
  const [remoteError, setRemoteError] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [authUsername, setAuthUsername] = useState('')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([])
  const [profileEditorOpen, setProfileEditorOpen] = useState(false)
  const [accountCreatorOpen, setAccountCreatorOpen] = useState(false)
  const [profileDraft, setProfileDraft] = useState({ displayName: '', username: '', bio: '', avatarUrl: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [myWorldPanelsHidden, setMyWorldPanelsHidden] = useState(false)
  const [toVisitPanelsHidden, setToVisitPanelsHidden] = useState(false)
  const [myWorldFolderId, setMyWorldFolderId] = useState<string | null>(null)
  const [toVisitFolderId, setToVisitFolderId] = useState<string | null>(null)
  const [folderEditId, setFolderEditId] = useState<string | null>(null)
  const [folderSearch, setFolderSearch] = useState('')
  const [communities, setCommunities] = useState<Community[]>([])
  const [pins, setPins] = useState<Pin[]>([])
  const [activities, setActivities] = useState<CommunityActivity[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [savedPinIds, setSavedPinIds] = useState<string[]>([])
  const [seenPinIds, setSeenPinIds] = useState<string[]>([])
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null)
  const [communityQuery, setCommunityQuery] = useState('')
  const [createCommunityOpen, setCreateCommunityOpen] = useState(false)
  const [newCommunityName, setNewCommunityName] = useState('')
  const [newCommunityPrivacy, setNewCommunityPrivacy] = useState<Privacy>('public')
  const [inviteCommunityId, setInviteCommunityId] = useState<string | null>(null)
  const [inviteQuery, setInviteQuery] = useState('')
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)
  const [folderEditorPinId, setFolderEditorPinId] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState(COLORS[0])
  const [myWorldVisibleFolderIds, setMyWorldVisibleFolderIds] = useState<string[]>([])
  const [toVisitVisibleFolderIds, setToVisitVisibleFolderIds] = useState<string[]>([])
  const [profileUserId, setProfileUserId] = useState('')
  const [profileListMode, setProfileListMode] = useState<ProfileListMode>('profile')
  const [postDraft, setPostDraft] = useState<PostDraft | null>(null)
  const [postComposer, setPostComposer] = useState<PostComposer>({ title: '', description: '', tags: '', takenAt: '', folderIds: [] })
  const [postMessage, setPostMessage] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [postSaving, setPostSaving] = useState(false)
  const [composerFolderPanelOpen, setComposerFolderPanelOpen] = useState(false)
  const [communitySubmitOpen, setCommunitySubmitOpen] = useState(false)
  const [communitySubmitPinId, setCommunitySubmitPinId] = useState<string | null>(null)
  const [communitySubmitComposer, setCommunitySubmitComposer] = useState({ title: '', description: '', tags: '' })
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [communityChatText, setCommunityChatText] = useState('')
  const [manualPlacement, setManualPlacement] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [toast, setToast] = useState('')
  const [composerFolderName, setComposerFolderName] = useState('')
  const [composerFolderColor, setComposerFolderColor] = useState(COLORS[1])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const postSubmitLockRef = useRef(false)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    const updateLocation = (position: GeolocationPosition) => {
      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
    }

    navigator.geolocation.getCurrentPosition(updateLocation, () => undefined, {
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 10000,
    })

    const watchId = navigator.geolocation.watchPosition(updateLocation, () => undefined, {
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 15000,
    })

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const currentUser = users.find((user) => user.id === activeUserId) ?? (
    activeUserId
      ? { ...AUTH_PLACEHOLDER_USER, id: activeUserId, username: profileFallbackName(activeUserId), displayName: profileFallbackName(activeUserId) }
      : AUTH_PLACEHOLDER_USER
  )
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users])
  const communitiesById = useMemo(() => new Map(communities.map((community) => [community.id, community])), [communities])
  const pinsById = useMemo(() => new Map(pins.map((pin) => [pin.id, pin])), [pins])
  const selectedPin = selectedPinId ? pinsById.get(selectedPinId) ?? null : null
  const selectedCommunity = selectedCommunityId ? communitiesById.get(selectedCommunityId) ?? null : null
  const selectedProfile = (profileUserId ? usersById.get(profileUserId) : null) ?? currentUser
  const isMyProfile = Boolean(activeUserId) && selectedProfile.id === activeUserId
  const isFollowingSelectedProfile = Boolean(activeUserId) && currentUser.followingIds.includes(selectedProfile.id)
  const unreadNotificationCount = notifications.filter((notification) => !readNotificationIds.includes(notification.id)).length
  const readNotificationStorageKey = activeUserId ? `spot-map-read-notifications-${activeUserId}` : ''
  const folderEditorPin = folderEditorPinId ? pinsById.get(folderEditorPinId) ?? null : null
  const folderEditTarget = folderEditId ? folders.find((folder) => folder.id === folderEditId) ?? null : null
  const myPostedPins = useMemo(
    () => uniquePinsByMemory(pins.filter((pin) => pin.ownerId === activeUserId)),
    [activeUserId, pins],
  )
  const savedPins = useMemo(
    () => uniquePinsByMemory(savedPinIds.map((id) => pinsById.get(id)).filter((pin): pin is Pin => Boolean(pin))),
    [pinsById, savedPinIds],
  )
  const toVisitPins = useMemo(
    () => savedPins.filter((pin) => pin.ownerId !== activeUserId),
    [activeUserId, savedPins],
  )
  const myFolders = useMemo(
    () => folders.filter((folder) => folder.ownerId === activeUserId && folder.kind === 'my_world'),
    [activeUserId, folders],
  )
  const toVisitFolders = useMemo(
    () => folders.filter((folder) => folder.ownerId === activeUserId && folder.kind === 'to_visit'),
    [activeUserId, folders],
  )
  const folderEditorFolders = folderEditorPin
    ? (folderEditorPin.ownerId === activeUserId ? myFolders : toVisitFolders)
    : myFolders
  const publicFolderPinIds = useMemo(() => {
    return new Set(
      folders
        .filter((folder) => folder.visibility === 'public' && folder.kind === 'my_world')
        .flatMap((folder) => folder.pinIds),
    )
  }, [folders])
  const publicPins = useMemo(
    () => uniquePinsByMemory(pins.filter((pin) => pin.visibility === 'public' && publicFolderPinIds.has(pin.id))),
    [pins, publicFolderPinIds],
  )
  const myWorldMapPins = useMemo(
    () => filterPinsByFolders(myPostedPins, myFolders, myWorldVisibleFolderIds),
    [myFolders, myPostedPins, myWorldVisibleFolderIds],
  )
  const toVisitMapPins = useMemo(
    () => filterPinsByFolders(toVisitPins, toVisitFolders, toVisitVisibleFolderIds),
    [toVisitFolders, toVisitPins, toVisitVisibleFolderIds],
  )
  const profilePins = pins
    .filter((pin) => pin.ownerId === selectedProfile.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const profileUniquePins = uniquePinsByMemory(profilePins)
  const profileFolders = folders.filter((folder) => folder.ownerId === selectedProfile.id && folder.kind === 'my_world' && folder.visibility === 'public')
  const profilePublicFolderPinIds = new Set(profileFolders.flatMap((folder) => folder.pinIds))
  const profilePublicPins = profileUniquePins.filter((pin) => pin.visibility === 'public' && profilePublicFolderPinIds.has(pin.id))
  const profileRecentPins = profilePublicPins.slice(0, 10)
  const profilePinCount = profileUniquePins.length
  const profilePublicFolderCount = Math.max(selectedProfile.publicFolderCount, profileFolders.length)
  const joinedCommunities = communities.filter((community) => community.memberIds.includes(activeUserId))
  const recommendedCommunities = communities.filter((community) =>
    !community.memberIds.includes(activeUserId) &&
    (currentUser.followingIds.some((userId) => community.memberIds.includes(userId)) || community.privacy === 'public'),
  )
  const profileCommunities = communities.filter((community) => community.memberIds.includes(selectedProfile.id))
  const homeFeedPins = uniquePinsByMemory(uniquePinsById(
    [...pins]
      .filter((pin) =>
        pin.visibility === 'public' &&
        (
          pin.ownerId === activeUserId ||
          currentUser.followingIds.includes(pin.ownerId) ||
          pinCommunityIds(pin).some((id) => joinedCommunities.some((community) => community.id === id))
        ),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  ))
  const filteredCommunities = communities.filter((community) => {
    const query = communityQuery.trim().toLowerCase()
    if (!query) return true
    return `${community.slug} ${community.name} ${community.description}`.toLowerCase().includes(query)
  })

  const publicFindFolders = useMemo(() => {
    return folders
      .filter((folder) => folder.visibility === 'public' && folder.kind === 'my_world')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [folders])
  const selectedFindFolder = selectedFindFolderId ? publicFindFolders.find((folder) => folder.id === selectedFindFolderId) ?? null : null
  const inviteCommunity = inviteCommunityId ? communitiesById.get(inviteCommunityId) ?? null : null
  const inviteQueryText = inviteQuery.replace(/^@/, '').trim().toLowerCase()
  const inviteUserSuggestions = users
    .filter((user) =>
      user.id !== activeUserId &&
      !inviteCommunity?.memberIds.includes(user.id) &&
      (!inviteQueryText || `${user.username} ${user.displayName}`.toLowerCase().includes(inviteQueryText))
    )
    .slice(0, 8)

  useEffect(() => {
    if (!readNotificationStorageKey || typeof window === 'undefined') {
      setReadNotificationIds([])
      return
    }

    try {
      const stored = window.localStorage.getItem(readNotificationStorageKey)
      const parsed = stored ? JSON.parse(stored) : []
      setReadNotificationIds(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [])
    } catch {
      setReadNotificationIds([])
    }
  }, [readNotificationStorageKey])

  useEffect(() => {
    if (!readNotificationStorageKey || typeof window === 'undefined') return
    window.localStorage.setItem(readNotificationStorageKey, JSON.stringify(readNotificationIds.slice(-200)))
  }, [readNotificationIds, readNotificationStorageKey])

  const tagStats = useMemo(() => tagStatsFromPins(pins), [pins])
  const activeTagQuery = activeHashtagQuery(postComposer.tags)
  const tagSuggestions = useMemo(() => {
    if (activeTagQuery === null) return []
    const query = activeTagQuery.toLowerCase()
    return tagStats
      .filter(({ tag }) => tag.toLowerCase().startsWith(query))
      .slice(0, 6)
  }, [activeTagQuery, tagStats])

  const loadRemoteData = useCallback(async (userId: string) => {
    if (!supabase) {
      setRemoteLoading(false)
      setRemoteError('Supabaseの環境変数が未設定です。')
      setUsers([])
      setPins([])
      setFolders([])
      setCommunities([])
      setActivities([])
      setNotifications([])
      setSavedPinIds([])
      return
    }

    setRemoteLoading(true)
    setRemoteError('')

    try {
      const [
        profilesResult,
        followsResult,
        postsResult,
        foldersResult,
        communitiesResult,
        membersResult,
        commentsResult,
        likesResult,
        savedPostsResult,
        saveActivityResult,
        activitiesResult,
      ] = await Promise.all([
        supabase.from('profiles').select('id,username,display_name,avatar_url,bio,pin_count,public_folder_count'),
        supabase.from('follows').select('follower_id,following_id'),
        supabase.from('app_post_cards').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('app_folder_cards').select('*').order('created_at', { ascending: false }).limit(300),
        supabase.from('app_community_cards').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('community_members').select('community_id,user_id'),
        supabase.from('post_comments').select('id,post_id,user_id,body,created_at').order('created_at', { ascending: true }).limit(1000),
        supabase.from('post_likes').select('post_id,user_id,created_at').limit(2000),
        userId
          ? supabase.from('saved_posts').select('post_id').eq('user_id', userId)
          : Promise.resolve({ data: [] as SavedPostRow[], error: null }),
        supabase.from('saved_posts').select('post_id,user_id,created_at').limit(2000),
        supabase.from('app_community_activity').select('*').order('created_at', { ascending: false }).limit(500),
      ])

      const results = [
        profilesResult,
        followsResult,
        postsResult,
        foldersResult,
        communitiesResult,
        membersResult,
        commentsResult,
        likesResult,
        savedPostsResult,
        saveActivityResult,
        activitiesResult,
      ]

      const failed = results.find((result) => result.error)
      if (failed?.error) throw failed.error

      const profileRows = (profilesResult.data ?? []) as ProfileRow[]
      const followRows = (followsResult.data ?? []) as FollowRow[]
      const folderRows = (foldersResult.data ?? []) as AppFolderCardRow[]
      const postRows = (postsResult.data ?? []) as AppPostCardRow[]
      const memberRows = (membersResult.data ?? []) as CommunityMemberRow[]

      let remoteUsers = buildUsers(profileRows, followRows)
      if (userId && !remoteUsers.some((user) => user.id === userId)) {
        remoteUsers = [
          {
            id: userId,
            username: profileFallbackName(userId),
            displayName: profileFallbackName(userId),
            avatarUrl: EMPTY_IMAGE,
            bio: '',
            followingIds: [],
            followerIds: [],
            pinCount: 0,
            publicFolderCount: 0,
          },
          ...remoteUsers,
        ]
      }

      const remoteFolders = buildFolders(folderRows)
      const remotePins = buildPins(
        postRows,
        (commentsResult.data ?? []) as CommentRow[],
        (likesResult.data ?? []) as LikeRow[],
        userId,
        remoteFolders,
      )
      const remoteCommunities = buildCommunities(
        (communitiesResult.data ?? []) as AppCommunityCardRow[],
        memberRows,
        userId,
      )
      let saveNotificationRows = (saveActivityResult.data ?? []) as SavedPostRow[]
      let inviteNotificationRows: CommunityInviteRow[] = []
      if (userId) {
        const saveNotificationResult = await supabase.rpc('app_save_notifications')
        if (!saveNotificationResult.error && Array.isArray(saveNotificationResult.data)) {
          saveNotificationRows = saveNotificationResult.data as SavedPostRow[]
        }
        const inviteNotificationResult = await supabase.rpc('app_invite_notifications')
        if (!inviteNotificationResult.error && Array.isArray(inviteNotificationResult.data)) {
          inviteNotificationRows = inviteNotificationResult.data as CommunityInviteRow[]
        }
      }

      setUsers(remoteUsers)
      setFolders(remoteFolders)
      setPins(remotePins)
      setCommunities(remoteCommunities)
      setActivities(buildActivities((activitiesResult.data ?? []) as AppCommunityActivityRow[]))
      setNotifications(buildNotifications(
        (likesResult.data ?? []) as LikeRow[],
        saveNotificationRows,
        inviteNotificationRows,
        remotePins,
        remoteCommunities,
        userId,
      ))
      setSavedPinIds(((savedPostsResult.data ?? []) as SavedPostRow[]).map((row) => row.post_id))
      setOwnedAccountIds(userId ? [userId] : [])
      setProfileUserId((current) => (current && remoteUsers.some((user) => user.id === current) ? current : userId))
    } catch (error) {
      console.error(error)
      setRemoteError(getErrorMessage(error, 'Supabaseからデータを取得できませんでした。'))
      setUsers([])
      setPins([])
      setFolders([])
      setCommunities([])
      setActivities([])
      setNotifications([])
      setSavedPinIds([])
    } finally {
      setRemoteLoading(false)
    }
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) {
      setRemoteLoading(false)
      setRemoteError('Supabaseの環境変数が未設定です。')
      return
    }

    let mounted = true

    const boot = async () => {
      const { data } = await client.auth.getSession()
      if (!mounted) return
      const userId = data.session?.user.id ?? ''
      setIsAuthenticated(Boolean(userId))
      setActiveUserId(userId)
      setOwnedAccountIds(userId ? [userId] : [])
      setProfileUserId(userId)
      await loadRemoteData(userId)
    }

    boot()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? ''
      setIsAuthenticated(Boolean(userId))
      setActiveUserId(userId)
      setOwnedAccountIds(userId ? [userId] : [])
      setProfileUserId(userId)
      loadRemoteData(userId)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadRemoteData])

  useEffect(() => {
    const myWorldFolderIds = folders
      .filter((folder) => folder.ownerId === activeUserId && folder.kind === 'my_world')
      .map((folder) => folder.id)
    const toVisitFolderIds = folders
      .filter((folder) => folder.ownerId === activeUserId && folder.kind === 'to_visit')
      .map((folder) => folder.id)
    const syncByIds = (folderIds: string[]) => (current: string[]) => {
      const next = current.length ? current.filter((id) => folderIds.includes(id)) : folderIds
      return arraysMatch(current, next) ? current : next
    }

    setMyWorldVisibleFolderIds(syncByIds(myWorldFolderIds))
    setToVisitVisibleFolderIds(syncByIds(toVisitFolderIds))
  }, [activeUserId, folders])

  const ownedAccounts = ownedAccountIds.map((id) => usersById.get(id)).filter((user): user is DemoUser => Boolean(user))

  useEffect(() => {
    if (!isMyProfile) return
    setProfileDraft({
      displayName: selectedProfile.displayName,
      username: selectedProfile.username,
      bio: selectedProfile.bio,
      avatarUrl: selectedProfile.avatarUrl,
    })
  }, [isMyProfile, selectedProfile.avatarUrl, selectedProfile.bio, selectedProfile.displayName, selectedProfile.username])

  const resetAuthForm = useCallback(() => {
    setAuthEmail('')
    setAuthPassword('')
    setAuthPasswordConfirm('')
    setAuthDisplayName('')
    setAuthUsername('')
  }, [])

  const requireSignedIn = useCallback(() => {
    if (!supabase) {
      setToast('Supabaseが未設定です。')
      return false
    }
    if (!activeUserId) {
      setActiveTab('mypage')
      setToast('Profileからログインしてください。')
      return false
    }
    return true
  }, [activeUserId])

  const switchAccount = useCallback((userId: string) => {
    setActiveUserId(userId)
    setProfileUserId(userId)
    setProfileListMode('profile')
    setIsAuthenticated(true)
    setSelectedPinId(null)
  }, [])

  const createLocalAccount = useCallback((event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const email = authEmail.trim().toLowerCase()
    const displayName = authDisplayName.trim() || email.split('@')[0] || 'new user'
    const username = authUsername.trim().replace(/^@/, '')
    const client = supabase
    if (!client) {
      setToast('Supabaseが未設定です。')
      return
    }
    if (!email || !authPassword.trim()) {
      setToast('メールアドレスとパスワードを入れてください。')
      return
    }
    if (authPassword !== authPasswordConfirm) {
      setToast('確認用パスワードが一致していません。')
      return
    }

    client.auth
      .signUp({
        email,
        password: authPassword,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          data: {
            display_name: displayName,
            username,
          },
        },
      })
      .then(async ({ data, error }) => {
        if (error) {
          setToast(error.message)
          return
        }
        resetAuthForm()
        setAccountCreatorOpen(false)
        if (data.session?.user.id) {
          const profileUpdate: Record<string, string> = { display_name: displayName }
          if (username) profileUpdate.username = username
          await client.from('profiles').update(profileUpdate).eq('id', data.session.user.id)
          await loadRemoteData(data.session.user.id)
          setToast('アカウントを作成しました。')
          return
        }
        setToast('確認メールを送りました。メール内のURLから登録を完了してください。')
      })
  }, [authDisplayName, authEmail, authPassword, authPasswordConfirm, authUsername, loadRemoteData, resetAuthForm])

  const signInLocalAccount = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = authEmail.trim().toLowerCase()
    const client = supabase
    if (!client) {
      setToast('Supabaseが未設定です。')
      return
    }
    if (!email || !authPassword.trim()) {
      setToast('メールアドレスとパスワードを入れてください。')
      return
    }

    client.auth.signInWithPassword({ email, password: authPassword }).then(async ({ data, error }) => {
      if (error) {
        setToast(error.message)
        return
      }
      resetAuthForm()
      await loadRemoteData(data.user.id)
      setToast('ログインしました。')
    })
  }, [authEmail, authPassword, loadRemoteData, resetAuthForm])

  const handleProfileAvatar = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const image = await getDisplayImage(file)
      setProfileDraft((current) => ({ ...current, avatarUrl: image.imageUrl }))
    } catch (error) {
      console.error(error)
      setToast('プロフィール画像を読み込めませんでした。')
    }
  }, [])

  const saveProfile = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const client = supabase
    if (!client || !requireSignedIn()) return

    const username = profileDraft.username.trim().replace(/^@/, '')
    if (username && !/^[a-zA-Z0-9_.]{3,32}$/.test(username)) {
      setToast('usernameは英数字、_、. の3〜32文字にしてください。')
      return
    }

    setProfileSaving(true)
    const { error } = await client
      .from('profiles')
      .update({
        username: username || null,
        display_name: profileDraft.displayName.trim(),
        bio: profileDraft.bio.trim(),
        avatar_url: profileDraft.avatarUrl,
      })
      .eq('id', activeUserId)

    setProfileSaving(false)
    if (error) {
      setToast(error.message)
      return
    }

    await loadRemoteData(activeUserId)
    setProfileEditorOpen(false)
    setToast('プロフィールを更新しました。')
  }, [activeUserId, loadRemoteData, profileDraft, requireSignedIn])

  const openCommunity = useCallback(async (communityId: string) => {
    const client = supabase
    const community = communitiesById.get(communityId)
    if (client && activeUserId && community && !community.memberIds.includes(activeUserId)) {
      const { error } = await client
        .from('community_members')
        .insert({ community_id: communityId, user_id: activeUserId, role: 'member' })

      if (error && !error.message.toLowerCase().includes('duplicate')) {
        setToast(error.message)
      } else {
        await loadRemoteData(activeUserId)
      }
    }
    setSelectedCommunityId(communityId)
    setSelectedPinId(null)
    setTimelineOpen(false)
    setActiveTab('find')
  }, [activeUserId, communitiesById, loadRemoteData])

  const openProfile = useCallback((userId: string) => {
    setProfileUserId(userId)
    setProfileListMode('profile')
    setSelectedPinId(null)
    setActiveTab('mypage')
  }, [])

  const createCommunity = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = newCommunityName.trim()
    if (!name) return
    const client = supabase
    if (!client || !requireSignedIn()) return

    const slug = createSlug(name)
    const isLimitedCommunity = newCommunityPrivacy === 'limited'
    const inviteCode = isLimitedCommunity ? `${slug}-${Math.random().toString(36).slice(2, 7)}` : null
    const { data, error } = await client
      .from('communities')
      .insert({
        slug,
        name,
        description: '新しく作られたコミュニティ。',
        owner_id: activeUserId,
        visibility: isLimitedCommunity ? 'invite_only' : 'public',
        invite_code: inviteCode,
      })
      .select('id')
      .single()

    if (error || !data) {
      setToast(error?.message ?? 'コミュニティを作成できませんでした。')
      return
    }

    await client
      .from('community_members')
      .insert({ community_id: data.id, user_id: activeUserId, role: 'owner' })
    setNewCommunityName('')
    setNewCommunityPrivacy('public')
    setCreateCommunityOpen(false)
    await loadRemoteData(activeUserId)
    setSelectedCommunityId(data.id)
    if (isLimitedCommunity) setInviteCommunityId(data.id)
    setActiveTab('find')
  }, [activeUserId, loadRemoteData, newCommunityName, newCommunityPrivacy, requireSignedIn])

  const shareCommunityLink = useCallback(async (community: Community) => {
    const inviteUrl = `${getAuthRedirectUrl()}?invite=${community.inviteCode ?? community.id}`
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: community.name, text: `${community.name} に招待されています。`, url: inviteUrl })
        return
      } catch {
        // Fall back to clipboard below.
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(inviteUrl)
      setToast('招待リンクをコピーしました。')
    }
  }, [])

  const sendCommunityInvite = useCallback(async (communityId: string, targetUserId: string) => {
    const client = supabase
    if (!client || !requireSignedIn()) return
    const { error } = await client.rpc('app_send_community_invite', {
      target_community_id: communityId,
      target_user_id: targetUserId,
    })

    if (error) {
      setToast('招待を送れませんでした。Supabaseでinvite用SQLをrunしてください。')
      return
    }

    setInviteQuery('')
    setToast('招待を送りました。')
    await loadRemoteData(activeUserId)
  }, [activeUserId, loadRemoteData, requireSignedIn])

  const acceptCommunityInvite = useCallback(async (communityId: string) => {
    const client = supabase
    if (!client || !requireSignedIn()) return
    await client.rpc('app_accept_community_invite', { target_community_id: communityId })
    await loadRemoteData(activeUserId)
  }, [activeUserId, loadRemoteData, requireSignedIn])

  const openPostPicker = useCallback((communityId: string) => {
    setSelectedCommunityId(communityId)
    const firstPin = myPostedPins[0]
    setCommunitySubmitPinId(firstPin?.id ?? null)
    setCommunitySubmitComposer({
      title: firstPin?.title ?? '',
      description: firstPin?.description ?? '',
      tags: firstPin?.tags.map((tag) => `#${tag}`).join(' ') ?? '',
    })
    setCommunitySubmitOpen(true)
  }, [myPostedPins])

  const openLibraryPicker = useCallback(() => {
    if (!requireSignedIn()) return
    setSelectedCommunityId(null)
    setPostDraft(null)
    setPostMessage('')
    setComposerOpen(false)
    setManualPlacement(false)
    fileInputRef.current?.click()
  }, [requireSignedIn])

  const applyTagSuggestion = useCallback((tag: string) => {
    setPostComposer((current) => ({ ...current, tags: replaceActiveHashtag(current.tags, tag) }))
  }, [])

  const handlePostImage = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setPostMessage('画像を読み込んでいます。')
    const image = await getDisplayImage(file)
    const [gps, takenAt] = await Promise.all([getGpsFromImage(file), getTakenAtFromImage(file)])
    const draft: PostDraft = {
      communityId: selectedCommunityId,
      imageUrl: image.imageUrl,
      imageName: image.imageName,
      coordinates: gps,
      locationSource: gps ? 'gps' : 'manual-pending',
      takenAt,
    }

    setPostDraft(draft)
    setPostComposer({
      title: image.imageName.replace(/\.[^.]+$/, ''),
      description: '',
      tags: '',
      takenAt,
      folderIds: myFolders[0] ? [myFolders[0].id] : [],
    })
    setComposerFolderPanelOpen(false)

    if (gps) {
      setManualPlacement(false)
      setComposerOpen(true)
      setPostMessage(`位置情報を取得しました。緯度 ${gps.latitude.toFixed(5)} / 経度 ${gps.longitude.toFixed(5)}`)
    } else {
      setComposerOpen(false)
      setManualPlacement(true)
      if (!selectedCommunityId) setActiveTab('myworld')
      setPostMessage('位置情報がありません。map上で投稿位置を選択してください。')
    }
  }, [myFolders, selectedCommunityId])

  const confirmManualLocation = useCallback((coordinates: Coordinates) => {
    if (!postDraft) return
    setPostDraft({ ...postDraft, coordinates, locationSource: 'manual' })
    setManualPlacement(false)
    setComposerOpen(true)
    setPostMessage(`map上で位置を確定しました。緯度 ${coordinates.latitude.toFixed(5)} / 経度 ${coordinates.longitude.toFixed(5)}`)
  }, [postDraft])

  const submitCommunityPost = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!postDraft?.coordinates) return
    const client = supabase
    if (!client || !requireSignedIn()) return
    if (postSubmitLockRef.current) return
    postSubmitLockRef.current = true
    setPostSaving(true)

    try {
      const title = postComposer.title.trim() || postDraft.imageName.replace(/\.[^.]+$/, '') || 'Untitled pin'
      const tags = postComposer.tags
        .split(/\s+/)
        .map((tag) => cleanTag(tag))
        .filter(Boolean)

      const { data: newPost, error: postError } = await client
        .from('posts')
        .insert({
          user_id: activeUserId,
          title,
          description: postComposer.description.trim(),
          latitude: postDraft.coordinates.latitude,
          longitude: postDraft.coordinates.longitude,
          image_url: postDraft.imageUrl,
          visibility: postDraft.communityId ? 'public' : 'private',
          tags,
          taken_at: postComposer.takenAt ? new Date(postComposer.takenAt).toISOString() : null,
          source_type: 'original',
        })
        .select('id')
        .single()

      if (postError || !newPost) {
        setToast(postError?.message ?? '投稿を保存できませんでした。')
        return
      }

      const folderRows = Array.from(new Set(postComposer.folderIds)).map((folderId) => ({
        folder_id: folderId,
        post_id: newPost.id,
        user_id: activeUserId,
      }))
      if (folderRows.length) {
        const { error } = await client.from('folder_posts').insert(folderRows)
        if (error) setToast(error.message)
      }

      if (postDraft.communityId) {
        const { error } = await client
          .from('community_posts')
          .upsert({
            community_id: postDraft.communityId,
            post_id: newPost.id,
            user_id: activeUserId,
            title_override: title,
            description_override: postComposer.description.trim(),
            tags_override: tags,
          }, { onConflict: 'community_id,post_id' })

        if (error) {
          setToast(error.message)
        }
      }

      await loadRemoteData(activeUserId)
      setComposerOpen(false)
      setComposerFolderPanelOpen(false)
      setPostDraft(null)
      setSelectedPinId(newPost.id)
      setPostMessage(postDraft.communityId ? '投稿しました。' : 'My Worldに保存しました。')
    } finally {
      postSubmitLockRef.current = false
      setPostSaving(false)
    }
  }, [activeUserId, loadRemoteData, postComposer, postDraft, requireSignedIn])

  const toggleLike = useCallback(async (pinId: string) => {
    const client = supabase
    if (!client || !requireSignedIn()) return
    const pin = pinsById.get(pinId)
    if (!pin) return

    setPins((current) =>
      current.map((pin) =>
        pin.id === pinId
          ? { ...pin, likedByMe: !pin.likedByMe, likes: pin.likedByMe ? Math.max(0, pin.likes - 1) : pin.likes + 1 }
          : pin,
      ),
    )
    const result = pin.likedByMe
      ? await client.from('post_likes').delete().eq('post_id', pinId).eq('user_id', activeUserId)
      : await client.from('post_likes').insert({ post_id: pinId, user_id: activeUserId })

    if (result.error) setToast(result.error.message)
    await loadRemoteData(activeUserId)
  }, [activeUserId, loadRemoteData, pinsById, requireSignedIn])

  const addComment = useCallback(async (pinId: string) => {
    const text = commentText.trim()
    if (!text) return
    const client = supabase
    if (!client || !requireSignedIn()) return

    setPins((current) =>
      current.map((pin) =>
        pin.id === pinId
          ? {
              ...pin,
              comments: [...pin.comments, { id: createId('comment'), userId: activeUserId, text, createdAt: new Date().toISOString() }],
            }
          : pin,
      ),
    )
    setCommentText('')
    const { error } = await client.from('post_comments').insert({
      post_id: pinId,
      user_id: activeUserId,
      body: text,
    })
    if (error) setToast(error.message)
    await loadRemoteData(activeUserId)
  }, [activeUserId, commentText, loadRemoteData, requireSignedIn])

  const reportPin = useCallback(async (pinId: string) => {
    const client = supabase
    if (!client || !requireSignedIn()) return

    setPins((current) => current.map((pin) => (pin.id === pinId ? { ...pin, reports: pin.reports + 1 } : pin)))
    const { error } = await client.from('post_reports').insert({
      post_id: pinId,
      user_id: activeUserId,
      reason: '',
    })
    if (error && !error.message.toLowerCase().includes('duplicate')) {
      setToast(error.message)
      await loadRemoteData(activeUserId)
      return
    }
    setToast('通報を受け付けました。')
    await loadRemoteData(activeUserId)
  }, [activeUserId, loadRemoteData, requireSignedIn])

  const submitExistingPinToCommunity = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedCommunityId || !communitySubmitPinId) return
    const client = supabase
    if (!client || !requireSignedIn()) return
    const sourcePin = pinsById.get(communitySubmitPinId)
    if (!sourcePin) return
    const title = communitySubmitComposer.title.trim() || sourcePin.title
    const description = communitySubmitComposer.description.trim() || sourcePin.description
    const tags = communitySubmitComposer.tags.split(/\s+/).map((tag) => cleanTag(tag)).filter(Boolean)

    const { error: postError } = await client
      .from('posts')
      .update({
        title,
        description,
        tags: tags.length ? tags : sourcePin.tags,
        visibility: 'public',
      })
      .eq('id', sourcePin.id)
      .eq('user_id', activeUserId)

    if (postError) {
      setToast(postError.message)
      return
    }

    const { error: communityPostError } = await client
      .from('community_posts')
      .upsert({
        community_id: selectedCommunityId,
        post_id: sourcePin.id,
        user_id: activeUserId,
        title_override: title,
        description_override: description,
        tags_override: tags.length ? tags : sourcePin.tags,
      }, { onConflict: 'community_id,post_id' })

    if (communityPostError) {
      setToast(communityPostError.message)
      return
    }

    await loadRemoteData(activeUserId)
    setCommunitySubmitOpen(false)
    setSelectedPinId(sourcePin.id)
  }, [activeUserId, communitySubmitComposer, communitySubmitPinId, loadRemoteData, pinsById, requireSignedIn, selectedCommunityId])

  const addCommunityChat = useCallback(async () => {
    if (!selectedCommunityId || !communityChatText.trim()) return
    const client = supabase
    if (!client || !requireSignedIn()) return
    const body = communityChatText.trim()
    setCommunityChatText('')
    const { error } = await client.from('community_messages').insert({
      community_id: selectedCommunityId,
      user_id: activeUserId,
      body,
    })
    if (error) {
      setToast(error.message)
      return
    }
    await loadRemoteData(activeUserId)
  }, [activeUserId, communityChatText, loadRemoteData, requireSignedIn, selectedCommunityId])

  const toggleFollowProfile = useCallback(async (targetUserId: string) => {
    const client = supabase
    if (!client || !requireSignedIn() || targetUserId === activeUserId) return
    const alreadyFollowing = currentUser.followingIds.includes(targetUserId)

    setUsers((current) =>
      current.map((user) => {
        if (user.id === activeUserId) {
          return {
            ...user,
            followingIds: alreadyFollowing
              ? user.followingIds.filter((id) => id !== targetUserId)
              : Array.from(new Set([...user.followingIds, targetUserId])),
          }
        }
        if (user.id === targetUserId) {
          return {
            ...user,
            followerIds: alreadyFollowing
              ? user.followerIds.filter((id) => id !== activeUserId)
              : Array.from(new Set([...user.followerIds, activeUserId])),
          }
        }
        return user
      }),
    )

    const result = alreadyFollowing
      ? await client.from('follows').delete().eq('follower_id', activeUserId).eq('following_id', targetUserId)
      : await client.from('follows').insert({ follower_id: activeUserId, following_id: targetUserId })

    if (result.error) {
      await loadRemoteData(activeUserId)
    }
  }, [activeUserId, currentUser.followingIds, loadRemoteData, requireSignedIn])

  const switchTab = useCallback((nextTab: ActiveTab) => {
    setActiveTab(nextTab)
    setSelectedPinId(null)
    setFolderEditorPinId(null)
    setCommunitySubmitOpen(false)
    setComposerOpen(false)
    setFolderEditId(null)
    setProfileMenuOpen(false)
    setNotificationsOpen(false)
    setProfileEditorOpen(false)
    setComposerFolderPanelOpen(false)
    setInviteCommunityId(null)
    if (nextTab === 'home') {
      setHomeMode('timeline')
      setTimelineOpen(false)
    }
    if (nextTab === 'find') {
      setSelectedCommunityId(null)
      setFindChaosOpen(false)
      setFindCommunityOpen(false)
      setSelectedFindFolderId(null)
      setTimelineOpen(false)
      setCommunityQuery('')
      setCreateCommunityOpen(false)
    } else {
      setFindChaosOpen(false)
      setFindCommunityOpen(false)
      setSelectedFindFolderId(null)
      setSelectedCommunityId(null)
      setTimelineOpen(false)
    }
    if (nextTab === 'myworld') {
      setMyWorldMode('map')
      setMyWorldFolderId(null)
    }
    if (nextTab === 'tovisit') {
      setToVisitMode('map')
      setToVisitFolderId(null)
    }
    if (nextTab === 'mypage') {
      setProfileUserId(activeUserId)
      setProfileListMode('profile')
    }
  }, [activeUserId])

  const openPinFromMap = useCallback((pinId: string) => {
    setSelectedPinId(pinId)
    setSeenPinIds((current) => (current.includes(pinId) ? current : [...current, pinId]))
  }, [])

  const saveExternalPin = useCallback(async (pin: Pin) => {
    const client = supabase
    if (!client || !requireSignedIn()) return
    const alreadySaved = savedPinIds.includes(pin.id)
    setSavedPinIds((current) => (current.includes(pin.id) ? current : [...current, pin.id]))
    if (!alreadySaved) {
      setPins((current) => current.map((item) => (item.id === pin.id ? { ...item, saves: item.saves + 1 } : item)))
    }
    setFolderEditorPinId(pin.id)
    const { error } = await client
      .from('saved_posts')
      .upsert({ post_id: pin.id, user_id: activeUserId }, { onConflict: 'post_id,user_id' })
    if (error) {
      setToast(error.message)
      await loadRemoteData(activeUserId)
      return
    }
    setToast(alreadySaved ? '保存済みです。フォルダーを選べます。' : 'To Visitに保存しました。フォルダーを選んでください。')
    await loadRemoteData(activeUserId)
  }, [activeUserId, loadRemoteData, requireSignedIn, savedPinIds])

  const deletePin = useCallback(async (pinId: string) => {
    const client = supabase
    if (!client || !requireSignedIn()) return
    const pin = pinsById.get(pinId)
    if (!pin) return
    if (!window.confirm('このpinを削除しますか？')) return

    setSelectedPinId((current) => (current === pinId ? null : current))
    setFolders((current) => current.map((folder) => ({ ...folder, pinIds: folder.pinIds.filter((id) => id !== pinId) })))

    if (pin.ownerId === activeUserId) {
      setPins((current) => current.filter((item) => item.id !== pinId))
      const { error } = await client.from('posts').delete().eq('id', pinId).eq('user_id', activeUserId)
      if (error) setToast(error.message)
    } else {
      setSavedPinIds((current) => current.filter((id) => id !== pinId))
      await client.from('folder_posts').delete().eq('post_id', pinId).eq('user_id', activeUserId)
      const { error } = await client.from('saved_posts').delete().eq('post_id', pinId).eq('user_id', activeUserId)
      if (error) setToast(error.message)
    }

    await loadRemoteData(activeUserId)
  }, [activeUserId, loadRemoteData, pinsById, requireSignedIn])

  const deleteFolder = useCallback(async (folderId: string) => {
    const client = supabase
    if (!client || !requireSignedIn()) return
    if (!window.confirm('このfolderを削除しますか？')) return

    setFolderEditId(null)
    setMyWorldFolderId((current) => (current === folderId ? null : current))
    setToVisitFolderId((current) => (current === folderId ? null : current))
    setFolders((current) => current.filter((folder) => folder.id !== folderId))

    const { error } = await client.from('folders').delete().eq('id', folderId).eq('user_id', activeUserId)
    if (error) setToast(error.message)
    await loadRemoteData(activeUserId)
  }, [activeUserId, loadRemoteData, requireSignedIn])

  const togglePinFolder = useCallback(async (pinId: string, folderId: string, checked: boolean) => {
    const client = supabase
    if (!client || !requireSignedIn()) return

    setFolders((current) =>
      current.map((folder) => {
        if (folder.id !== folderId) return folder
        return {
          ...folder,
          pinIds: checked ? Array.from(new Set([...folder.pinIds, pinId])) : folder.pinIds.filter((id) => id !== pinId),
        }
      }),
    )
    const result = checked
      ? await client.rpc('app_add_post_to_folder', { target_folder_id: folderId, target_post_id: pinId })
      : await client.rpc('app_remove_post_from_folder', { target_folder_id: folderId, target_post_id: pinId })
    if (result.error) setToast(result.error.message)
    await loadRemoteData(activeUserId)
  }, [activeUserId, loadRemoteData, requireSignedIn])

  const toggleVisibleFolder = useCallback((
    folderId: string,
    checked: boolean,
    setter: (updater: (current: string[]) => string[]) => void,
  ) => {
    setter((current) =>
      checked
        ? Array.from(new Set([...current, folderId]))
        : current.filter((id) => id !== folderId),
    )
  }, [])

  const addFolderForPin = useCallback((pinId: string, name: string, color: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) return false
    const client = supabase
    if (!client || !requireSignedIn()) return false
    const folderKind: Folder['kind'] = pinsById.get(pinId)?.ownerId === activeUserId ? 'my_world' : 'to_visit'
    const tempId = createId('folder')
    setFolders((current) => [
      {
        id: tempId,
        ownerId: activeUserId,
        kind: folderKind,
        name: trimmedName,
        color,
        pinIds: [pinId],
        visibility: 'private',
        createdAt: new Date().toISOString(),
      },
      ...current,
    ])
    ;(async () => {
      const { data, error } = await client
        .from('folders')
        .insert({
          user_id: activeUserId,
          folder_kind: folderKind,
          name: trimmedName,
          color,
          visibility: 'private',
        })
        .select('id')
        .single()

      if (error || !data) {
        setToast(error?.message ?? 'フォルダーを作成できませんでした。')
        await loadRemoteData(activeUserId)
        return
      }

      const { error: linkError } = await client.from('folder_posts').insert({
        folder_id: data.id,
        post_id: pinId,
        user_id: activeUserId,
      })

      if (linkError) setToast(linkError.message)
      await loadRemoteData(activeUserId)
    })()
    return true
  }, [activeUserId, loadRemoteData, pinsById, requireSignedIn])

  const createFolderForPin = useCallback((pinId: string) => {
    const name = newFolderName.trim()
    if (!name) return
    if (!addFolderForPin(pinId, name, newFolderColor)) return
    setNewFolderName('')
    setNewFolderColor(COLORS[(COLORS.indexOf(newFolderColor) + 1) % COLORS.length])
  }, [addFolderForPin, newFolderColor, newFolderName])

  const createFolderForComposer = useCallback(async () => {
    const name = composerFolderName.trim()
    if (!name) return
    const client = supabase
    if (!client || !requireSignedIn()) return

    const { data, error } = await client
      .from('folders')
      .insert({
        user_id: activeUserId,
        folder_kind: 'my_world',
        name,
        color: composerFolderColor,
        visibility: 'private',
      })
      .select('id,user_id,name,color,visibility,created_at')
      .single()

    if (error || !data) {
      setToast(error?.message ?? 'フォルダーを作成できませんでした。')
      return
    }

    setFolders((current) => [
      {
        id: data.id,
        ownerId: data.user_id,
        kind: 'my_world',
        name: data.name,
        color: data.color ?? composerFolderColor,
        pinIds: [],
        visibility: mapVisibility(data.visibility),
        createdAt: data.created_at,
      },
      ...current,
    ])
    setPostComposer((current) => ({ ...current, folderIds: Array.from(new Set([...current.folderIds, data.id])) }))
    setComposerFolderName('')
    setComposerFolderColor(COLORS[(COLORS.indexOf(composerFolderColor) + 1) % COLORS.length])
  }, [activeUserId, composerFolderColor, composerFolderName, requireSignedIn])

  const createEmptyFolder = useCallback(async (name: string, color: string, kind: Folder['kind'] = 'my_world') => {
    const trimmedName = name.trim()
    if (!trimmedName) return false
    const client = supabase
    if (!client || !requireSignedIn()) return false

    const { error } = await client
      .from('folders')
      .insert({
        user_id: activeUserId,
        folder_kind: kind,
        name: trimmedName,
        color,
        visibility: 'private',
      })

    if (error) {
      setToast(error.message)
      return false
    }

    await loadRemoteData(activeUserId)
    return true
  }, [activeUserId, loadRemoteData, requireSignedIn])

  const updateFolder = useCallback(async (folderId: string, values: Partial<Folder>) => {
    const client = supabase
    if (!client || !requireSignedIn()) return
    const targetFolder = folders.find((folder) => folder.id === folderId)
    const nextVisibility = values.visibility ?? targetFolder?.visibility ?? 'private'
    const nextIsPaid = nextVisibility === 'public' ? values.isPaid ?? Boolean(targetFolder?.isPaid) : false

    const { error } = await client
      .from('folders')
      .update({
        name: values.name ?? targetFolder?.name,
        description: values.description ?? targetFolder?.description ?? '',
        color: values.color ?? targetFolder?.color ?? COLORS[0],
        thumbnail_url: values.thumbnailUrl !== undefined ? values.thumbnailUrl || null : targetFolder?.thumbnailUrl ?? null,
        visibility: nextVisibility,
        is_paid: nextIsPaid,
        paid_from_index: nextIsPaid ? values.paidFromIndex !== undefined ? values.paidFromIndex : targetFolder?.paidFromIndex ?? null : null,
      })
      .eq('id', folderId)
      .eq('user_id', activeUserId)

    if (error) {
      setToast(error.message)
      return
    }

    if (values.priceYen !== undefined) {
      await client
        .from('folders')
        .update({ folder_price_yen: nextIsPaid ? values.priceYen ?? null : null })
        .eq('id', folderId)
        .eq('user_id', activeUserId)
    }

    if (nextVisibility === 'public' && targetFolder?.pinIds.length) {
      await client
        .from('posts')
        .update({ visibility: 'public' })
        .in('id', targetFolder.pinIds)
        .eq('user_id', activeUserId)
    } else if (nextVisibility === 'private' && targetFolder?.pinIds.length) {
      const otherPublicFolderPinIds = new Set(
        folders
          .filter((folder) => folder.id !== folderId && folder.visibility === 'public')
          .flatMap((folder) => folder.pinIds),
      )
      const pinsToHide = targetFolder.pinIds.filter((pinId) => !otherPublicFolderPinIds.has(pinId))
      if (pinsToHide.length) {
        await client
          .from('posts')
          .update({ visibility: 'private' })
          .in('id', pinsToHide)
          .eq('user_id', activeUserId)
      }
    }

    await loadRemoteData(activeUserId)
    setFolderEditId(null)
    setToast('フォルダーを更新しました。')
  }, [activeUserId, folders, loadRemoteData, requireSignedIn])

  const renderPinCard = (pin: Pin, options?: { showAuthor?: boolean }) => {
    const owner = usersById.get(pin.ownerId)
    const community = communitiesById.get(pinCommunityIds(pin)[0] ?? '')
    return (
      <button key={pin.id} className={styles.pinCard} type="button" onClick={() => setSelectedPinId(pin.id)}>
        <img src={pin.imageUrl} alt="" />
        <span>
          <strong>{pin.title}</strong>
          <small>{options?.showAuthor ? `@${owner?.username ?? 'user'} / ${communityLabel(community)}` : communityLabel(community)}</small>
        </span>
      </button>
    )
  }

  const renderFolderCard = (folder: Folder) => {
    const preview = folder.pinIds.map((id) => pinsById.get(id)).find(Boolean)
    return (
      <button
        key={folder.id}
        className={styles.folderCard}
        type="button"
        onClick={() => {
          if (preview) setSelectedPinId(preview.id)
        }}
      >
        {preview ? <img src={preview.imageUrl} alt="" /> : <span style={{ backgroundColor: folder.color }} />}
        <strong>{folder.name}</strong>
        <small>{folder.pinIds.length} pins</small>
      </button>
    )
  }

  const getMapPinMeta = useCallback((pin: Pin) => {
    const owner = usersById.get(pin.ownerId)
    return `@${owner?.username ?? 'user'} / ${communityLabel(communitiesById.get(pinCommunityIds(pin)[0] ?? ''))}`
  }, [communitiesById, usersById])

  const authScreen = (
    <section className={styles.authPanel}>
      <div>
        <span>Account</span>
        <h1>Sign in to keep your world</h1>
        <p>My World、To Visit、フォルダー、いいね、コメントを自分のアカウントに保存します。</p>
      </div>
      <div className={styles.segmented}>
        <button className={authMode === 'signin' ? styles.active : ''} type="button" onClick={() => setAuthMode('signin')}>Sign in</button>
        <button className={authMode === 'signup' ? styles.active : ''} type="button" onClick={() => setAuthMode('signup')}>Sign up</button>
      </div>
      {authMode === 'signin' ? (
        <form className={styles.authForm} onSubmit={signInLocalAccount}>
          <label>
            Email
            <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
          </label>
          <button className={styles.primaryButton} type="submit">Sign in</button>
          <div className={styles.accountGrid}>
            {ownedAccounts.map((account) => (
              <button key={account.id} type="button" onClick={() => switchAccount(account.id)}>
                <img src={account.avatarUrl} alt="" />
                <span>
                  <strong>@{account.username}</strong>
                  <small>{account.displayName}</small>
                </span>
              </button>
            ))}
          </div>
        </form>
      ) : (
        <form className={styles.authForm} onSubmit={createLocalAccount}>
          <label>
            Email
            <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
          </label>
          <label>
            Password again
            <input type="password" value={authPasswordConfirm} onChange={(event) => setAuthPasswordConfirm(event.target.value)} />
          </label>
          <label>
            Display name
            <input value={authDisplayName} onChange={(event) => setAuthDisplayName(event.target.value)} />
          </label>
          <label>
            Username
            <div className={styles.usernameInput}>
              <span>@</span>
              <input value={authUsername} onChange={(event) => setAuthUsername(event.target.value.replace(/^@/, ''))} />
            </div>
          </label>
          <button className={styles.primaryButton} type="submit">Create account and switch</button>
        </form>
      )}
    </section>
  )

  const showInitialLoader = remoteLoading && !remoteError && !pins.length && !folders.length && !communities.length

  if (showInitialLoader) {
    return (
      <main className={styles.shell}>
        <section className={styles.appBootScreen}>
          <div className={styles.bootMapGlow}>
            <span />
            <span />
            <span />
          </div>
          <div className={styles.bootSpinner} />
          <h1>Loading your world</h1>
          <p>Supabaseからmemoriesを読み込んでいます。</p>
        </section>
      </main>
    )
  }

  if (!activeUserId) {
    return (
      <main className={styles.shell}>
        <section className={styles.page}>
          {authScreen}
        </section>
      </main>
    )
  }

  return (
    <main className={`${styles.shell} ${activeTab === 'home' ? styles.homeShell : ''}`}>
      <input ref={fileInputRef} className={styles.hiddenInput} type="file" accept="image/*,.heic,.heif,.HEIC,.HEIF" onChange={handlePostImage} />
      {activeTab === 'home' && (
        <section className={styles.homePage}>
          <header className={styles.homeTopbar}>
            <div>
              <strong>Home</strong>
              <span>{homeMode === 'timeline' ? 'Follow + Community' : 'Timeline pins on map'}</span>
            </div>
            <div className={styles.homeSwitch}>
              <button className={homeMode === 'timeline' ? styles.active : ''} type="button" onClick={() => setHomeMode('timeline')}>Timeline</button>
              <button className={homeMode === 'map' ? styles.active : ''} type="button" onClick={() => setHomeMode('map')}>Map</button>
            </div>
          </header>
          {homeMode === 'map' ? (
            <section className={styles.homeMapPanel}>
              <PinMap
                pins={homeFeedPins}
                selectedPinId={selectedPinId}
                seenPinIds={seenPinIds}
                onPinClick={openPinFromMap}
                onMapSurfaceClick={() => setSelectedPinId(null)}
              />
              <div className={styles.homeMapOverlay}>
                <strong>Timeline Map</strong>
                <span>{homeFeedPins.length} pins</span>
              </div>
            </section>
          ) : (
            <section className={styles.homeFeedPanel}>
              <div className={styles.feedList}>
                {homeFeedPins.map((pin) => {
                  const owner = usersById.get(pin.ownerId)
                  const community = communitiesById.get(pinCommunityIds(pin)[0] ?? '')
                  return (
                    <article key={`feed-${pin.id}`} className={styles.feedCard}>
                      <button type="button" onClick={() => setSelectedPinId(pin.id)}>
                        <img src={pin.imageUrl} alt="" />
                      </button>
                      <div>
                        <button className={styles.authorLink} type="button" onClick={() => owner && openProfile(owner.id)}>
                          @{owner?.username ?? 'user'}
                        </button>
                        <span>{community ? `in ${communityLabel(community)}` : 'posted'}</span>
                        <h2>{pin.title}</h2>
                        <p>{pin.description || '説明文なし'}</p>
                        <div className={styles.feedActions}>
                          <button type="button" onClick={() => toggleLike(pin.id)}><Heart size={16} /> {pin.likes}</button>
                          <button type="button" onClick={() => saveExternalPin(pin)}><BookmarkPlus size={16} /> To Visit</button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )}
        </section>
      )}

      {activeTab === 'find' && (
        selectedCommunity ? (
          <CommunityMapView
            community={selectedCommunity}
            pins={pins.filter((pin) => pinCommunityIds(pin).includes(selectedCommunity.id))}
            selectedPinId={selectedPinId}
            manualPlacement={manualPlacement}
            postMessage={postMessage}
            activities={activities.filter((activity) => activity.communityId === selectedCommunity.id)}
            usersById={usersById}
            pinsById={pinsById}
            timelineOpen={timelineOpen}
            chatText={communityChatText}
            onBack={() => setSelectedCommunityId(null)}
            onPinClick={openPinFromMap}
            onListFocus={() => setSelectedPinId(null)}
            getPinMeta={getMapPinMeta}
            onToggleTimeline={() => setTimelineOpen((value) => !value)}
            onOpenProfile={openProfile}
            onChatText={setCommunityChatText}
            onSendChat={addCommunityChat}
            onMapClick={manualPlacement ? confirmManualLocation : undefined}
            onMapSurfaceClick={() => setSelectedPinId(null)}
            onPost={() => openPostPicker(selectedCommunity.id)}
          />
        ) : findChaosOpen ? (
          <SplitMapView
            pins={publicPins}
            selectedPinId={selectedPinId}
            seenPinIds={seenPinIds}
            onPinClick={openPinFromMap}
            onListFocus={openPinFromMap}
            onMapSurfaceClick={() => setSelectedPinId(null)}
            getPinMeta={getMapPinMeta}
            overlay={(
              <div className={styles.communityMapHeader}>
                <button type="button" onClick={() => setFindChaosOpen(false)}><ArrowLeft size={18} /></button>
                <div>
                  <strong>Chaos</strong>
                  <span>{publicPins.length} public pins</span>
                </div>
              </div>
            )}
          />
        ) : findCommunityOpen ? (
          <section className={styles.page}>
            <header className={styles.pageHeaderRow}>
              <div>
                <span>Find</span>
                <h1>Join Community</h1>
              </div>
              <button className={styles.ghostButton} type="button" onClick={() => setFindCommunityOpen(false)}>
                <ArrowLeft size={17} />
                戻る
              </button>
            </header>
            <div className={styles.sectionHeadingRow}>
              <div>
                <h2>Community</h2>
                <p>貯めた自分のピンを、ここからコミュニティに共有できます。</p>
              </div>
              <button className={styles.primaryButton} type="button" onClick={() => setCreateCommunityOpen(true)}>作成</button>
            </div>
            <div className={styles.searchBox}>
              <Search size={18} />
              <input value={communityQuery} onChange={(event) => setCommunityQuery(event.target.value)} placeholder="建築、映画、友達の旅 などで検索" />
              <button type="button">検索</button>
            </div>
            {createCommunityOpen && (
              <form className={styles.createPanel} onSubmit={createCommunity}>
                <button className={styles.closeButton} type="button" onClick={() => setCreateCommunityOpen(false)}><X size={17} /></button>
                <h2>コミュニティを作成</h2>
                <label>
                  名前
                  <input value={newCommunityName} onChange={(event) => setNewCommunityName(event.target.value)} placeholder="architecture club" />
                </label>
                <div className={styles.segmented}>
                  <button className={newCommunityPrivacy === 'public' ? styles.active : ''} type="button" onClick={() => setNewCommunityPrivacy('public')}>公開</button>
                  <button className={newCommunityPrivacy === 'limited' ? styles.active : ''} type="button" onClick={() => setNewCommunityPrivacy('limited')}>限定公開</button>
                </div>
                {newCommunityPrivacy === 'limited' && <p className={styles.muted}>作成後、招待リンクで友達だけ参加できる設定になります。</p>}
                <button className={styles.primaryButton} type="submit">作成してmapへ</button>
              </form>
            )}
            <CommunityListSection
              title="関係ありそうなコミュニティ"
              communities={filteredCommunities.filter((community) => recommendedCommunities.some((item) => item.id === community.id))}
              currentUserId={activeUserId}
              onOpen={openCommunity}
              onShare={(communityId) => {
                setInviteCommunityId(communityId)
                setInviteQuery('')
              }}
            />
            <CommunityListSection
              title="所属しているコミュニティ"
              communities={filteredCommunities.filter((community) => community.memberIds.includes(activeUserId))}
              currentUserId={activeUserId}
              onOpen={openCommunity}
              onShare={(communityId) => {
                setInviteCommunityId(communityId)
                setInviteQuery('')
              }}
            />
          </section>
        ) : selectedFindFolder ? (
          <FindFolderDetail
            folder={selectedFindFolder}
            pinsById={pinsById}
            onBack={() => setSelectedFindFolderId(null)}
            onOpenPin={setSelectedPinId}
          />
        ) : (
          <section className={styles.page}>
            <header className={styles.pageHeader}>
              <span>Find</span>
              <h1>行きたい場所と、参加したいコミュニティを探す</h1>
            </header>
            <section className={styles.chaosEntry}>
              <div>
                <strong>Chaos Map</strong>
                <span>公開されている全てのピンを地図で見る</span>
              </div>
              <button className={styles.primaryButton} type="button" onClick={() => { setSelectedFindFolderId(null); setFindChaosOpen(true) }}>
                Open
              </button>
            </section>
            <section className={styles.chaosEntry}>
              <div>
                <strong>Join Community</strong>
                <span>コミュニティを探して、自分のpinを共有する</span>
              </div>
              <button className={styles.primaryButton} type="button" onClick={() => { setSelectedFindFolderId(null); setFindCommunityOpen(true) }}>
                Open
              </button>
            </section>
            <div className={styles.searchBox}>
              <Search size={18} />
              <input placeholder="キーワードで検索" />
              <button type="button">検索</button>
            </div>
            <div className={styles.findMain}>
              <FolderShelf title="最近公開されたフォルダー" folders={publicFindFolders} pinsById={pinsById} onOpenFolder={setSelectedFindFolderId} />
              <FolderShelf title="ランダムなフォルダー" folders={[...publicFindFolders].reverse()} pinsById={pinsById} onOpenFolder={setSelectedFindFolderId} />
              <FolderShelf title="好きそうなフォルダー" folders={publicFindFolders.filter((folder) => folder.ownerId !== activeUserId)} pinsById={pinsById} onOpenFolder={setSelectedFindFolderId} />
            </div>
          </section>
        )
      )}

      {activeTab === 'myworld' && (
        myWorldMode === 'map' ? (
          <SplitMapView
            pins={myWorldMapPins}
            selectedPinId={selectedPinId}
            onPinClick={openPinFromMap}
            onListFocus={openPinFromMap}
            onMapSurfaceClick={() => setSelectedPinId(null)}
            currentLocation={userLocation}
            startAtCurrentLocation
            panelsHidden={myWorldPanelsHidden}
            onPanelsHiddenChange={setMyWorldPanelsHidden}
            getPinMeta={(pin) => {
              const communitiesText = pinCommunityIds(pin).map((id) => communityLabel(communitiesById.get(id))).join(' / ')
              return communitiesText || 'private memory'
            }}
            onDeletePin={deletePin}
            onMapClick={manualPlacement ? confirmManualLocation : undefined}
            overlay={(
              <>
                <div className={styles.mapOverlay}>
                  <strong>My World</strong>
                  <span>{myWorldMapPins.length} / {myPostedPins.length} memories</span>
                </div>
                <div className={styles.libraryMapControls}>
                  <LibraryModeSwitch value={myWorldMode} onChange={setMyWorldMode} />
                </div>
                <div className={styles.mapSortControl}>
                  <MapFolderFilter
                    title="My Folder"
                    folders={myFolders}
                    selectedFolderIds={myWorldVisibleFolderIds}
                    onToggle={(folderId, checked) => toggleVisibleFolder(folderId, checked, setMyWorldVisibleFolderIds)}
                  />
                </div>
                {manualPlacement && (
                  <div className={styles.placementBanner}>
                    map上で投稿位置をクリックしてください。
                  </div>
                )}
                {postMessage && <div className={styles.postMessage}>{postMessage}</div>}
              </>
            )}
            floatingAction={(
              <button className={styles.communityPostButton} type="button" onClick={openLibraryPicker}>
                <Plus size={24} />
                Add Memory
              </button>
            )}
          />
        ) : (
          <FolderLibraryView
            title="My World"
            mode={myWorldMode}
            onModeChange={setMyWorldMode}
            pins={myPostedPins}
            folders={myFolders}
            selectedFolderId={myWorldFolderId}
            onSelectFolder={setMyWorldFolderId}
            folderSearch={folderSearch}
            onFolderSearch={setFolderSearch}
            onOpenPin={openPinFromMap}
            onToggleFolder={togglePinFolder}
            onCreateFolder={addFolderForPin}
            onCreateEmptyFolder={createEmptyFolder}
            onEditFolder={setFolderEditId}
            onDeleteFolder={deleteFolder}
            onDeletePin={deletePin}
            getMeta={(pin) => {
              const communitiesText = pinCommunityIds(pin).map((id) => communityLabel(communitiesById.get(id))).join(' / ')
              return communitiesText || 'private memory'
            }}
          />
        )
      )}

      {activeTab === 'tovisit' && (
        toVisitMode === 'map' ? (
          <SplitMapView
            pins={toVisitMapPins}
            selectedPinId={selectedPinId}
            seenPinIds={seenPinIds}
            onPinClick={openPinFromMap}
            onListFocus={openPinFromMap}
            onMapSurfaceClick={() => setSelectedPinId(null)}
            currentLocation={userLocation}
            startAtCurrentLocation
            panelsHidden={toVisitPanelsHidden}
            onPanelsHiddenChange={setToVisitPanelsHidden}
            getPinMeta={getMapPinMeta}
            onDeletePin={deletePin}
            overlay={(
              <>
                <div className={styles.mapOverlay}>
                  <strong>To Visit</strong>
                  <span>{toVisitMapPins.length} / {toVisitPins.length} saved places</span>
                </div>
                <div className={styles.libraryMapControls}>
                  <LibraryModeSwitch value={toVisitMode} onChange={setToVisitMode} />
                </div>
                <div className={styles.mapSortControl}>
                  <MapFolderFilter
                    title="My Folder"
                    folders={toVisitFolders}
                    selectedFolderIds={toVisitVisibleFolderIds}
                    onToggle={(folderId, checked) => toggleVisibleFolder(folderId, checked, setToVisitVisibleFolderIds)}
                  />
                </div>
              </>
            )}
          />
        ) : (
          <FolderLibraryView
            title="To Visit"
            mode={toVisitMode}
            onModeChange={setToVisitMode}
            pins={toVisitPins}
            folders={toVisitFolders}
            selectedFolderId={toVisitFolderId}
            onSelectFolder={setToVisitFolderId}
            folderSearch={folderSearch}
            onFolderSearch={setFolderSearch}
            onOpenPin={openPinFromMap}
            onToggleFolder={togglePinFolder}
            onCreateFolder={addFolderForPin}
            onCreateEmptyFolder={(name, color) => createEmptyFolder(name, color, 'to_visit')}
            onEditFolder={setFolderEditId}
            onDeleteFolder={deleteFolder}
            onDeletePin={deletePin}
            getMeta={getMapPinMeta}
          />
        )
      )}

      {activeTab === 'mypage' && (
        <section className={styles.page}>
          {!activeUserId ? (
            <section className={styles.authPanel}>
              <div>
                <span>Profile</span>
                <h1>Sign in to keep your world</h1>
                <p>My World、To Visit、フォルダー、いいね、コメントを自分のアカウントに保存します。</p>
              </div>
              <div className={styles.segmented}>
                <button className={authMode === 'signin' ? styles.active : ''} type="button" onClick={() => setAuthMode('signin')}>Sign in</button>
                <button className={authMode === 'signup' ? styles.active : ''} type="button" onClick={() => setAuthMode('signup')}>Sign up</button>
              </div>
              {authMode === 'signin' ? (
                <form className={styles.authForm} onSubmit={signInLocalAccount}>
                  <label>
                    Email
                    <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} />
                  </label>
                  <label>
                    Password
                    <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
                  </label>
                  <button className={styles.primaryButton} type="submit">Sign in</button>
                  <div className={styles.accountGrid}>
                    {ownedAccounts.map((account) => (
                      <button key={account.id} type="button" onClick={() => switchAccount(account.id)}>
                        <img src={account.avatarUrl} alt="" />
                        <span>
                          <strong>@{account.username}</strong>
                          <small>{account.displayName}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </form>
              ) : (
                <form className={styles.authForm} onSubmit={createLocalAccount}>
                  <label>
                    Email
                    <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} />
                  </label>
                  <label>
                    Password
                    <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
                  </label>
                  <label>
                    Password again
                    <input type="password" value={authPasswordConfirm} onChange={(event) => setAuthPasswordConfirm(event.target.value)} />
                  </label>
                  <label>
                    Display name
                    <input value={authDisplayName} onChange={(event) => setAuthDisplayName(event.target.value)} />
                  </label>
                  <label>
                    Username
                    <div className={styles.usernameInput}>
                      <span>@</span>
                      <input value={authUsername} onChange={(event) => setAuthUsername(event.target.value.replace(/^@/, ''))} />
                    </div>
                  </label>
                  <button className={styles.primaryButton} type="submit">Create account and switch</button>
                </form>
              )}
            </section>
          ) : (
            <>
          {profileUserId !== activeUserId && (
            <button className={styles.backButton} type="button" onClick={() => openProfile(activeUserId)}>
              <ArrowLeft size={17} />
              自分のページへ
            </button>
          )}
          {isMyProfile && (
            <div className={styles.profileTopActions}>
              <div className={styles.profileMenuWrap}>
                <button
                  className={styles.iconButton}
                  type="button"
                  onClick={() => {
                    setNotificationsOpen((value) => {
                      if (!value) {
                        setReadNotificationIds((current) => Array.from(new Set([...current, ...notifications.map((notification) => notification.id)])))
                      }
                      return !value
                    })
                    setProfileMenuOpen(false)
                  }}
                  aria-label="notifications"
                >
                  <Heart size={22} />
                  {unreadNotificationCount > 0 && <span className={styles.notificationBadge}>{unreadNotificationCount}</span>}
                </button>
                {notificationsOpen && (
                  <div className={styles.notificationPanel}>
                    <strong>Notifications</strong>
                    {notifications.map((notification) => {
                      const actor = usersById.get(notification.actorId)
                      const pin = notification.pinId ? pinsById.get(notification.pinId) : null
                      const community = notification.communityId ? communitiesById.get(notification.communityId) : null
                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={async () => {
                            setReadNotificationIds((current) => Array.from(new Set([...current, notification.id])))
                            if (notification.type === 'invite' && notification.communityId) {
                              await acceptCommunityInvite(notification.communityId)
                              openCommunity(notification.communityId)
                            } else if (notification.pinId) {
                              setActiveTab('myworld')
                              setMyWorldMode('map')
                              setMyWorldFolderId(null)
                              setMyWorldVisibleFolderIds(myFolders.map((folder) => folder.id))
                              setSelectedPinId(notification.pinId)
                            }
                            setNotificationsOpen(false)
                          }}
                        >
                          <img src={actor?.avatarUrl || pin?.imageUrl || EMPTY_IMAGE} alt="" />
                          <span>
                            <b>@{actor?.username ?? 'user'}</b>
                            <small>
                              {notification.type === 'like' && 'あなたのpinにいいねしました。'}
                              {notification.type === 'save' && 'あなたのpinを保存しました。'}
                              {notification.type === 'invite' && 'コミュニティに招待されました。'}
                            </small>
                            <em>{notification.type === 'invite' ? communityLabel(community ?? undefined) : pin?.title ?? 'memory'}</em>
                          </span>
                        </button>
                      )
                    })}
                    {!notifications.length && <p>まだ通知はありません。</p>}
                  </div>
                )}
              </div>
              <div className={styles.profileMenuWrap}>
                <button
                  className={styles.iconButton}
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen((value) => !value)
                    setNotificationsOpen(false)
                  }}
                  aria-label="profile menu"
                >
                  <Menu size={22} />
                </button>
                {profileMenuOpen && (
                  <div className={styles.profileMenu}>
                    <button type="button" onClick={() => { setAccountCreatorOpen(true); setProfileMenuOpen(false) }}>Account create</button>
                    <button type="button" onClick={() => supabase?.auth.signOut()}>Sign out</button>
                  </div>
                )}
              </div>
            </div>
          )}
          <header className={styles.profileHeader}>
            <img src={selectedProfile.avatarUrl} alt="" />
            <div>
              <span>@{selectedProfile.username}</span>
              <h1>{selectedProfile.displayName}</h1>
              <p>{selectedProfile.bio}</p>
            </div>
            {!isMyProfile && (
              <button
                className={`${styles.followButton} ${isFollowingSelectedProfile ? styles.following : ''}`}
                type="button"
                onClick={() => toggleFollowProfile(selectedProfile.id)}
              >
                {isFollowingSelectedProfile ? 'Following' : 'Follow'}
              </button>
            )}
          </header>
          {isMyProfile && (
            <button className={styles.editProfileButton} type="button" onClick={() => setProfileEditorOpen((value) => !value)}>
              Edit Profile
            </button>
          )}
          {isMyProfile && profileEditorOpen && (
            <form className={styles.profileEditorPanel} onSubmit={saveProfile}>
              <label className={styles.avatarEdit}>
                <img src={profileDraft.avatarUrl || EMPTY_IMAGE} alt="" />
                <input type="file" accept="image/*,.heic,.heif,.HEIC,.HEIF" onChange={handleProfileAvatar} />
                <span>画像を変更</span>
              </label>
              <label>
                Name
                <input value={profileDraft.displayName} onChange={(event) => setProfileDraft((current) => ({ ...current, displayName: event.target.value }))} />
              </label>
              <label>
                Username
                <div className={styles.usernameInput}>
                  <span>@</span>
                  <input value={profileDraft.username} onChange={(event) => setProfileDraft((current) => ({ ...current, username: event.target.value.replace(/^@/, '') }))} />
                </div>
              </label>
              <label>
                Bio
                <textarea value={profileDraft.bio} onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))} />
              </label>
              <button className={styles.primaryButton} type="submit" disabled={profileSaving}>{profileSaving ? 'Saving...' : 'Save Profile'}</button>
            </form>
          )}
          <div className={styles.profileStats}>
            <button type="button" onClick={() => setProfileListMode('following')}><strong>{selectedProfile.followingIds.length}</strong><span>フォロー</span></button>
            <button type="button" onClick={() => setProfileListMode('followers')}><strong>{selectedProfile.followerIds.length}</strong><span>フォロワー</span></button>
            <button type="button" onClick={() => isMyProfile ? setActiveTab('myworld') : setProfileListMode('profile')}><strong>{profilePinCount}</strong><span>my pins</span></button>
            <button type="button"><strong>{profilePublicFolderCount}</strong><span>folders</span></button>
          </div>
          {profileListMode !== 'profile' ? (
            <section className={styles.contentSection}>
              <button className={styles.backButton} type="button" onClick={() => setProfileListMode('profile')}>
                <ArrowLeft size={17} />
                プロフィールへ戻る
              </button>
              <h2>{profileListMode === 'following' ? 'フォロー' : 'フォロワー'}</h2>
              <div className={styles.userList}>
                {(profileListMode === 'following' ? selectedProfile.followingIds : selectedProfile.followerIds).map((userId) => {
                  const user = usersById.get(userId)
                  if (!user) return null
                  return (
                    <button key={user.id} type="button" onClick={() => openProfile(user.id)}>
                      <img src={user.avatarUrl} alt="" />
                      <span>
                        <strong>@{user.username}</strong>
                        <small>{user.bio}</small>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : (
            <>
              <section className={styles.contentSection}>
                <h2>参加しているコミュニティ</h2>
                <div className={styles.communityMiniGrid}>
                  {profileCommunities.map((community) => (
                    <button key={community.id} type="button" onClick={() => openCommunity(community.id)}>
                      <strong>{communityLabel(community)}</strong>
                      <span>{community.memberIds.length}人</span>
                    </button>
                  ))}
                </div>
              </section>
              <section className={styles.contentSection}>
                <h2>最近投稿したピン</h2>
                <div className={styles.thumbnailGrid}>
                  {profileRecentPins.map((pin) => (
                    <button key={pin.id} type="button" onClick={() => setSelectedPinId(pin.id)}>
                      <img src={pin.imageUrl} alt="" />
                      <span>{pin.title}</span>
                    </button>
                  ))}
                </div>
              </section>
              <section className={styles.contentSection}>
                <h2>公開中のピンのmap</h2>
                <PinMap pins={profilePublicPins} selectedPinId={selectedPinId} onPinClick={setSelectedPinId} compact />
              </section>
              <section className={styles.contentSection}>
                <h2>Folders</h2>
                <div className={styles.folderGrid}>
                  {profileFolders.map(renderFolderCard)}
                  {!profileFolders.length && <p className={styles.muted}>folderはまだありません。</p>}
                </div>
              </section>
            </>
          )}
            </>
          )}
        </section>
      )}

      {selectedPin && !(activeTab === 'myworld' || activeTab === 'tovisit') && (
        <>
          {!(activeTab === 'find' && Boolean(selectedCommunity)) && (
            <button className={styles.detailBackdrop} type="button" aria-label="詳細を閉じる" onClick={() => setSelectedPinId(null)} />
          )}
          <PinDetail
            pin={selectedPin}
            owner={usersById.get(selectedPin.ownerId)}
            community={communitiesById.get(pinCommunityIds(selectedPin)[0] ?? '')}
            usersById={usersById}
            isSaved={savedPinIds.includes(selectedPin.id)}
            isMine={selectedPin.ownerId === activeUserId}
            currentUserId={activeUserId}
          commentText={commentText}
          onMapSurface={activeTab === 'find' && Boolean(selectedCommunity)}
          onCommentText={setCommentText}
          onClose={() => setSelectedPinId(null)}
            onLike={() => toggleLike(selectedPin.id)}
            onAddComment={() => addComment(selectedPin.id)}
            onReport={() => reportPin(selectedPin.id)}
            onSave={() => saveExternalPin(selectedPin)}
            onFolderEdit={() => setFolderEditorPinId(selectedPin.id)}
            onOpenProfile={openProfile}
          />
        </>
      )}

      {folderEditorPin && (
        <aside className={styles.modalBackdrop} onClick={() => setFolderEditorPinId(null)}>
          <div className={styles.folderEditor} onClick={(event) => event.stopPropagation()}>
            <button className={styles.closeButton} type="button" onClick={() => setFolderEditorPinId(null)}><X size={17} /></button>
            <h2>フォルダーに追加</h2>
            <p>{folderEditorPin.title}</p>
            <div className={styles.checkboxList}>
              {folderEditorFolders.map((folder) => (
                <label key={folder.id}>
                  <input
                    type="checkbox"
                    checked={folder.pinIds.includes(folderEditorPin.id)}
                    onChange={(event) => togglePinFolder(folderEditorPin.id, folder.id, event.target.checked)}
                  />
                  <span>{folder.name}</span>
                </label>
              ))}
            </div>
            <div className={styles.inlineCreate}>
              <input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="新規フォルダー名" />
              <ColorSwatches value={newFolderColor} onChange={setNewFolderColor} />
              <button type="button" onClick={() => createFolderForPin(folderEditorPin.id)}>作成</button>
            </div>
          </div>
        </aside>
      )}

      {folderEditTarget && (
        <aside className={styles.modalBackdrop} onClick={() => setFolderEditId(null)}>
          <FolderEditModal
            folder={folderEditTarget}
            onClose={() => setFolderEditId(null)}
            onSave={updateFolder}
            onDelete={deleteFolder}
          />
        </aside>
      )}

      {inviteCommunity && (
        <aside className={styles.modalBackdrop} onClick={() => setInviteCommunityId(null)}>
          <div className={styles.invitePanel} onClick={(event) => event.stopPropagation()}>
            <button className={styles.closeButton} type="button" onClick={() => setInviteCommunityId(null)}><X size={17} /></button>
            <span>Limited Community</span>
            <h2>{communityLabel(inviteCommunity)}</h2>
            <p>招待リンクを共有するか、@usernameでユーザーを探して通知を送れます。</p>
            <button className={styles.primaryButton} type="button" onClick={() => shareCommunityLink(inviteCommunity)}>
              Share link
            </button>
            <div className={styles.searchBox}>
              <Search size={18} />
              <input value={inviteQuery} onChange={(event) => setInviteQuery(event.target.value)} placeholder="@usernameで検索" />
            </div>
            <div className={styles.inviteSuggestions}>
              {inviteUserSuggestions.map((user) => (
                <button key={user.id} type="button" onClick={() => sendCommunityInvite(inviteCommunity.id, user.id)}>
                  <img src={user.avatarUrl} alt="" />
                  <span>
                    <strong>@{user.username}</strong>
                    <small>{user.displayName}</small>
                  </span>
                  <b>Send</b>
                </button>
              ))}
              {!inviteUserSuggestions.length && <p className={styles.muted}>該当するユーザーはいません。</p>}
            </div>
          </div>
        </aside>
      )}

      {accountCreatorOpen && (
        <aside className={styles.modalBackdrop} onClick={() => setAccountCreatorOpen(false)}>
          <form className={styles.composer} onSubmit={createLocalAccount} onClick={(event) => event.stopPropagation()}>
            <button className={styles.closeButton} type="button" onClick={() => setAccountCreatorOpen(false)}><X size={17} /></button>
            <strong>Create another account</strong>
            <label>
              Email
              <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} />
            </label>
            <label>
              Password
              <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} />
            </label>
            <label>
              Password again
              <input type="password" value={authPasswordConfirm} onChange={(event) => setAuthPasswordConfirm(event.target.value)} />
            </label>
            <label>
              Display name
              <input value={authDisplayName} onChange={(event) => setAuthDisplayName(event.target.value)} />
            </label>
            <label>
              Username
              <div className={styles.usernameInput}>
                <span>@</span>
                <input value={authUsername} onChange={(event) => setAuthUsername(event.target.value.replace(/^@/, ''))} />
              </div>
            </label>
            <button className={styles.primaryButton} type="submit">Create account</button>
          </form>
        </aside>
      )}

      {communitySubmitOpen && selectedCommunity && (
        <aside className={styles.modalBackdrop} onClick={() => setCommunitySubmitOpen(false)}>
          <form className={styles.composer} onSubmit={submitExistingPinToCommunity} onClick={(event) => event.stopPropagation()}>
            <button className={styles.closeButton} type="button" onClick={() => setCommunitySubmitOpen(false)}><X size={17} /></button>
            <strong>{communityLabel(selectedCommunity)} にMy Worldから共有</strong>
            <label>
              手駒のピン
              <select
                value={communitySubmitPinId ?? ''}
                onChange={(event) => {
                  const pin = pinsById.get(event.target.value)
                  setCommunitySubmitPinId(event.target.value)
                  if (pin) {
                    setCommunitySubmitComposer({
                      title: pin.title,
                      description: pin.description,
                      tags: pin.tags.map((tag) => `#${tag}`).join(' '),
                    })
                  }
                }}
              >
                {myPostedPins.map((pin) => (
                  <option key={pin.id} value={pin.id}>{pin.title}</option>
                ))}
              </select>
            </label>
            {communitySubmitPinId && pinsById.get(communitySubmitPinId) && (
              <img src={pinsById.get(communitySubmitPinId)!.imageUrl} alt="" />
            )}
            <label>
              タイトル
              <input value={communitySubmitComposer.title} onChange={(event) => setCommunitySubmitComposer((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              説明文
              <textarea value={communitySubmitComposer.description} onChange={(event) => setCommunitySubmitComposer((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              #
              <input value={communitySubmitComposer.tags} onChange={(event) => setCommunitySubmitComposer((current) => ({ ...current, tags: event.target.value }))} />
            </label>
            <button className={styles.primaryButton} type="submit" disabled={!communitySubmitPinId}>コミュニティに追加</button>
          </form>
        </aside>
      )}

      {composerOpen && postDraft && (
        <aside className={styles.modalBackdrop} onClick={() => setComposerOpen(false)}>
          <form className={styles.composer} onSubmit={submitCommunityPost} onClick={(event) => event.stopPropagation()}>
            <button className={styles.closeButton} type="button" onClick={() => setComposerOpen(false)}><X size={17} /></button>
            <img src={postDraft.imageUrl} alt="" />
            <strong>{postDraft.communityId ? `${communityLabel(communitiesById.get(postDraft.communityId))} に投稿` : 'My Worldに保存'}</strong>
            {postDraft.coordinates && (
              <div className={styles.locationSummary}>
                <MapIcon size={18} />
                <div>
                  <strong>{postDraft.locationSource === 'gps' ? '写真の位置情報を取得済み' : 'map上で位置を指定済み'}</strong>
                  <span>緯度 {postDraft.coordinates.latitude.toFixed(6)} / 経度 {postDraft.coordinates.longitude.toFixed(6)}</span>
                </div>
              </div>
            )}
            <label>
              撮影日時
              <input type="datetime-local" value={postComposer.takenAt} onChange={(event) => setPostComposer((current) => ({ ...current, takenAt: event.target.value }))} />
            </label>
            <label>
              タイトル
              <input value={postComposer.title} onChange={(event) => setPostComposer((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              説明文
              <textarea value={postComposer.description} onChange={(event) => setPostComposer((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              #
              <input value={postComposer.tags} onChange={(event) => setPostComposer((current) => ({ ...current, tags: event.target.value }))} placeholder="#facade #coffee" />
            </label>
            {tagSuggestions.length > 0 && (
              <div className={styles.tagSuggestions}>
                {tagSuggestions.map(({ tag, count }) => (
                  <button key={tag} type="button" onClick={() => applyTagSuggestion(tag)}>
                    #{tag}
                    <span>{count}件</span>
                  </button>
                ))}
              </div>
            )}
            <div className={styles.composerFolderField}>
              <button type="button" onClick={() => setComposerFolderPanelOpen((value) => !value)}>
                <span>Folder</span>
                <strong>
                  {postComposer.folderIds.length
                    ? myFolders.filter((folder) => postComposer.folderIds.includes(folder.id)).map((folder) => folder.name).join(', ')
                    : 'フォルダーを選択'}
                </strong>
              </button>
              {composerFolderPanelOpen && (
                <div className={styles.composerFolderPanel}>
                  <div className={styles.checkboxList}>
                    <strong>入れるフォルダー</strong>
                    {myFolders.map((folder) => (
                      <label key={folder.id}>
                        <input
                          type="checkbox"
                          checked={postComposer.folderIds.includes(folder.id)}
                          onChange={(event) =>
                            setPostComposer((current) => ({
                              ...current,
                              folderIds: event.target.checked
                                ? [...current.folderIds, folder.id]
                                : current.folderIds.filter((id) => id !== folder.id),
                            }))
                          }
                        />
                        <span>{folder.name}</span>
                      </label>
                    ))}
                    {!myFolders.length && <p className={styles.muted}>フォルダーはまだありません。</p>}
                  </div>
                  <div className={styles.inlineCreate}>
                    <input value={composerFolderName} onChange={(event) => setComposerFolderName(event.target.value)} placeholder="新規フォルダー名" />
                    <ColorSwatches value={composerFolderColor} onChange={setComposerFolderColor} />
                    <button type="button" onClick={createFolderForComposer}>作成</button>
                  </div>
                </div>
              )}
            </div>
            <button className={styles.primaryButton} type="submit" disabled={postSaving}>
              {postSaving ? 'Saving...' : postDraft.communityId ? '投稿' : 'My Worldに保存'}
            </button>
          </form>
        </aside>
      )}

      <nav className={styles.footer}>
        <button className={activeTab === 'home' ? styles.active : ''} type="button" onClick={() => switchTab('home')}><Home size={21} /><span>Home</span></button>
        <button className={activeTab === 'find' ? styles.active : ''} type="button" onClick={() => switchTab('find')}><Search size={21} /><span>Find</span></button>
        <button className={activeTab === 'myworld' ? styles.active : ''} type="button" onClick={() => switchTab('myworld')}><Compass size={21} /><span>My World</span></button>
        <button className={activeTab === 'tovisit' ? styles.active : ''} type="button" onClick={() => switchTab('tovisit')}><BookmarkPlus size={21} /><span>To Visit</span></button>
        <button className={activeTab === 'mypage' ? styles.active : ''} type="button" onClick={() => switchTab('mypage')}><UserRound size={21} /><span>Profile</span></button>
      </nav>
    </main>
  )
}

function FolderShelf({
  title,
  folders,
  pinsById,
  onOpenFolder,
}: {
  title: string
  folders: Folder[]
  pinsById: Map<string, Pin>
  onOpenFolder: (folderId: string) => void
}) {
  return (
    <section className={styles.contentSection}>
      <h2>{title}</h2>
      <div className={styles.findGrid}>
        {folders.map((folder) => {
          const preview = folder.thumbnailUrl || folder.pinIds.map((id) => pinsById.get(id)?.imageUrl).find(Boolean)
          return (
            <button key={`${title}-${folder.id}`} type="button" onClick={() => onOpenFolder(folder.id)}>
              {preview ? <img src={preview} alt="" /> : <span style={{ backgroundColor: folder.color }} />}
              <strong>{folder.name}</strong>
              <small>{folder.pinIds.length} pins / public folder</small>
            </button>
          )
        })}
        {!folders.length && <p className={styles.muted}>公開folderはまだありません。</p>}
      </div>
    </section>
  )
}

function FindFolderDetail({
  folder,
  pinsById,
  onBack,
  onOpenPin,
}: {
  folder: Folder
  pinsById: Map<string, Pin>
  onBack: () => void
  onOpenPin: (pinId: string) => void
}) {
  const folderPins = uniquePinsByMemory(folder.pinIds.map((id) => pinsById.get(id)).filter((pin): pin is Pin => Boolean(pin)))

  return (
    <section className={styles.page}>
      <header className={styles.pageHeaderRow}>
        <div>
          <span>Find / Folder</span>
          <h1>{folder.name}</h1>
          <p>{folder.description || `${folderPins.length} pins`}</p>
        </div>
        <button className={styles.ghostButton} type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          戻る
        </button>
      </header>
      <div className={styles.findFolderHero}>
        {folder.thumbnailUrl || folderPins[0]?.imageUrl ? (
          <img src={folder.thumbnailUrl || folderPins[0]?.imageUrl} alt="" />
        ) : (
          <span style={{ backgroundColor: folder.color }} />
        )}
        <div>
          <strong>{folderPins.length} pins</strong>
          <small>{folder.isPaid ? 'Paid public folder' : 'Public folder'}</small>
        </div>
      </div>
      <div className={styles.findFolderPinList}>
        {folderPins.map((pin, index) => (
          <button key={pin.id} type="button" onClick={() => onOpenPin(pin.id)}>
            <span>{index + 1}</span>
            <img src={pin.imageUrl} alt="" />
            <div>
              <strong>{pin.title}</strong>
              <small>{pin.description || pin.tags.map((tag) => `#${tag}`).join(' ') || '説明文なし'}</small>
            </div>
          </button>
        ))}
        {!folderPins.length && <p className={styles.muted}>このfolderには表示できるpinがありません。</p>}
      </div>
    </section>
  )
}

function CommunityListSection({
  title,
  communities,
  currentUserId,
  onOpen,
  onShare,
}: {
  title: string
  communities: Community[]
  currentUserId: string
  onOpen: (communityId: string) => void
  onShare: (communityId: string) => void
}) {
  return (
    <section className={styles.contentSection}>
      <h2>{title}</h2>
      <div className={styles.communityList}>
        {communities.map((community) => (
          <article key={community.id} className={styles.communityCard}>
            <div>
              <strong>{communityLabel(community)}</strong>
              <h2>{community.name}</h2>
              <p>{community.description}</p>
              <span><Users size={15} /> {community.memberIds.length}人</span>
              {community.privacy === 'limited' && <span><Lock size={15} /> 限定公開</span>}
              {community.inviteCode && <small>招待リンク: /invite/{community.inviteCode}</small>}
            </div>
            <div className={styles.communityCardActions}>
              {community.privacy === 'limited' && community.ownerId === currentUserId && (
                <button className={styles.ghostButton} type="button" onClick={() => onShare(community.id)}>
                  Share
                </button>
              )}
              <button className={styles.primaryButton} type="button" onClick={() => onOpen(community.id)}>
                {community.memberIds.includes(currentUserId) ? 'Open' : 'Join'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function LibraryModeSwitch({
  value,
  onChange,
}: {
  value: LibraryMode
  onChange: (value: LibraryMode) => void
}) {
  return (
    <div className={styles.libraryModeSwitch}>
      <button className={value === 'map' ? styles.active : ''} type="button" onClick={() => onChange('map')}>Map</button>
      <button className={value === 'folder' ? styles.active : ''} type="button" onClick={() => onChange('folder')}>Folder</button>
    </div>
  )
}

function ColorSwatches({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className={styles.colorSwatches} aria-label="フォルダー色">
      {COLORS.map((color) => (
        <button
          key={color}
          className={value === color ? styles.active : ''}
          type="button"
          style={{ backgroundColor: color }}
          aria-label={`色 ${color}`}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  )
}

function FolderLibraryView({
  title,
  mode,
  onModeChange,
  pins,
  folders,
  selectedFolderId,
  onSelectFolder,
  folderSearch,
  onFolderSearch,
  getMeta,
  onOpenPin,
  onToggleFolder,
  onCreateFolder,
  onCreateEmptyFolder,
  onEditFolder,
  onDeleteFolder,
  onDeletePin,
  onAddMemory,
}: {
  title: string
  mode: LibraryMode
  onModeChange: (value: LibraryMode) => void
  pins: Pin[]
  folders: Folder[]
  selectedFolderId: string | null
  onSelectFolder: (folderId: string | null) => void
  folderSearch: string
  onFolderSearch: (value: string) => void
  getMeta: (pin: Pin) => string
  onOpenPin: (pinId: string) => void
  onToggleFolder: (pinId: string, folderId: string, checked: boolean) => void
  onCreateFolder: (pinId: string, name: string, color: string) => boolean
  onCreateEmptyFolder: (name: string, color: string) => Promise<boolean>
  onEditFolder: (folderId: string) => void
  onDeleteFolder: (folderId: string) => void
  onDeletePin: (pinId: string) => void
  onAddMemory?: () => void
}) {
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState(COLORS[0])
  const query = folderSearch.trim().toLowerCase()
  const filteredFolders = folders.filter((folder) => {
    if (!query) return true
    const folderPins = pins.filter((pin) => folder.pinIds.includes(pin.id))
    return `${folder.name} ${folder.description ?? ''} ${folderPins.map((pin) => `${pin.title} ${pin.description} ${pin.tags.join(' ')}`).join(' ')}`.toLowerCase().includes(query)
  })
  const selectedFolder = selectedFolderId ? folders.find((folder) => folder.id === selectedFolderId) ?? null : null
  const selectedPins = selectedFolder ? uniquePinsByMemory(pins.filter((pin) => selectedFolder.pinIds.includes(pin.id))) : []

  return (
    <section className={styles.page}>
      <header className={styles.pageHeaderRow}>
        <div>
          <span>{title}</span>
          <h1>{selectedFolder ? selectedFolder.name : 'Folders'}</h1>
        </div>
        <div className={styles.libraryHeaderActions}>
          {selectedFolder && <button className={styles.ghostButton} type="button" onClick={() => onSelectFolder(null)}><ArrowLeft size={17} />戻る</button>}
          <LibraryModeSwitch value={mode} onChange={onModeChange} />
          {onAddMemory && <button className={styles.primaryButton} type="button" onClick={onAddMemory}><Plus size={18} /> Add Memory</button>}
        </div>
      </header>
      <div className={styles.searchBox}>
        <Search size={18} />
        <input value={folderSearch} onChange={(event) => onFolderSearch(event.target.value)} placeholder="pin、folderを検索" />
      </div>
      {selectedFolder ? (
        <section className={`${styles.contentSection} ${styles.folderPlaylist}`}>
          <div className={styles.folderPlaylistHeader}>
            <h2>{selectedFolder.name}</h2>
            <p>{selectedFolder.description || 'Description'}</p>
            <small>
              {selectedFolder.visibility === 'public' ? 'Public folder' : 'Private folder'}
              {selectedFolder.isPaid ? ` / Paid${selectedFolder.priceYen ? ` ¥${selectedFolder.priceYen}` : ''}` : ''}
            </small>
            <div className={styles.folderPlaylistActions}>
              <button className={styles.ghostButton} type="button" onClick={() => onEditFolder(selectedFolder.id)}>Edit Folder</button>
              <button className={styles.dangerButton} type="button" onClick={() => onDeleteFolder(selectedFolder.id)}>Delete Folder</button>
            </div>
          </div>
          <PinFolderList
            pins={selectedPins}
            folders={folders}
            getMeta={getMeta}
            onOpenPin={onOpenPin}
            onToggleFolder={onToggleFolder}
            onCreateFolder={onCreateFolder}
            onDeletePin={onDeletePin}
          />
        </section>
      ) : (
        <section className={styles.contentSection}>
          <div className={styles.findGrid}>
            {filteredFolders.map((folder) => {
              const preview = folder.thumbnailUrl || folder.pinIds.map((id) => pins.find((pin) => pin.id === id)?.imageUrl).find(Boolean)
              return (
                <button key={folder.id} type="button" onClick={() => onSelectFolder(folder.id)}>
                  {preview ? <img src={preview} alt="" /> : <span style={{ backgroundColor: folder.color }} />}
                  <strong>{folder.name}</strong>
                  <small>{folder.pinIds.length} pins / {folder.visibility}</small>
                  <em
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation()
                      onEditFolder(folder.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      event.stopPropagation()
                      onEditFolder(folder.id)
                    }}
                  >
                    Edit Folder
                  </em>
                </button>
              )
            })}
          </div>
          <div className={styles.createFolderBar}>
            <input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="Create new folder" />
            <ColorSwatches value={newFolderColor} onChange={setNewFolderColor} />
            <button
              type="button"
              onClick={async () => {
                const created = await onCreateEmptyFolder(newFolderName, newFolderColor)
                if (!created) return
                setNewFolderName('')
                setNewFolderColor(COLORS[(COLORS.indexOf(newFolderColor) + 1) % COLORS.length])
              }}
            >
              Create
            </button>
          </div>
        </section>
      )}
    </section>
  )
}

function FolderEditModal({
  folder,
  onClose,
  onSave,
  onDelete,
}: {
  folder: Folder
  onClose: () => void
  onSave: (folderId: string, values: Partial<Folder>) => void
  onDelete: (folderId: string) => void
}) {
  const [name, setName] = useState(folder.name)
  const [description, setDescription] = useState(folder.description ?? '')
  const [color, setColor] = useState(folder.color)
  const [thumbnailUrl, setThumbnailUrl] = useState(folder.thumbnailUrl ?? '')
  const [visibility, setVisibility] = useState<Folder['visibility']>(folder.visibility)
  const [isPaid, setIsPaid] = useState(Boolean(folder.isPaid))
  const [paidFromIndex, setPaidFromIndex] = useState(String(folder.paidFromIndex ?? ''))
  const [priceYen, setPriceYen] = useState(String(folder.priceYen ?? ''))

  useEffect(() => {
    if (visibility === 'public') return
    setIsPaid(false)
    setPaidFromIndex('')
    setPriceYen('')
  }, [visibility])

  const handleThumbnail = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const image = await getDisplayImage(file)
    setThumbnailUrl(image.imageUrl)
  }, [])

  return (
    <form
      className={styles.folderEditor}
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        event.preventDefault()
        onSave(folder.id, {
          name: name.trim() || folder.name,
          description: description.trim(),
          color,
          thumbnailUrl,
          visibility,
          isPaid: visibility === 'public' && isPaid,
          paidFromIndex: visibility === 'public' && isPaid && paidFromIndex ? Number(paidFromIndex) : null,
          priceYen: visibility === 'public' && isPaid && priceYen ? Number(priceYen) : null,
        })
      }}
    >
      <button className={styles.closeButton} type="button" onClick={onClose}><X size={17} /></button>
      <h2>Edit Folder</h2>
      <label>
        サムネ
        <input type="file" accept="image/*,.heic,.heif,.HEIC,.HEIF" onChange={handleThumbnail} />
      </label>
      {thumbnailUrl && <img className={styles.folderEditPreview} src={thumbnailUrl} alt="" />}
      <label>
        名前
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        説明
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <ColorSwatches value={color} onChange={setColor} />
      <label className={styles.profilePublishToggle}>
        <span>Show on My Profile and in Search</span>
        <input
          type="checkbox"
          checked={visibility === 'public'}
          onChange={(event) => setVisibility(event.target.checked ? 'public' : 'private')}
        />
        <b />
      </label>
      {visibility === 'public' && (
        <div className={styles.paidPublishPanel}>
          <label className={styles.checkboxLine}>
            <span>
              <strong>有料公開にしますか？</strong>
              <small>オンにすると価格と、どこから有料にするかを設定できます。</small>
            </span>
            <input type="checkbox" checked={isPaid} onChange={(event) => setIsPaid(event.target.checked)} />
          </label>
          {isPaid && (
            <>
              <label>
                値段
                <input type="number" min="0" inputMode="numeric" value={priceYen} onChange={(event) => setPriceYen(event.target.value)} placeholder="500" />
              </label>
              <label>
                何番目のpinから有料にするか
                <input type="number" min="1" value={paidFromIndex} onChange={(event) => setPaidFromIndex(event.target.value)} />
              </label>
            </>
          )}
        </div>
      )}
      <button className={styles.primaryButton} type="submit">Save</button>
      <button className={styles.dangerButton} type="button" onClick={() => onDelete(folder.id)}>Delete Folder</button>
    </form>
  )
}

function PinFolderList({
  pins,
  folders,
  getMeta,
  onOpenPin,
  onToggleFolder,
  onCreateFolder,
  onDeletePin,
}: {
  pins: Pin[]
  folders: Folder[]
  getMeta: (pin: Pin) => string
  onOpenPin: (pinId: string) => void
  onToggleFolder: (pinId: string, folderId: string, checked: boolean) => void
  onCreateFolder: (pinId: string, name: string, color: string) => boolean
  onDeletePin: (pinId: string) => void
}) {
  const [openPinId, setOpenPinId] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState(COLORS[0])
  const sortedPins = useMemo(
    () => [...pins].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [pins],
  )

  useEffect(() => {
    if (!sortedPins.length) {
      setOpenPinId(null)
      return
    }
    if (openPinId && !sortedPins.some((pin) => pin.id === openPinId)) {
      setOpenPinId(null)
    }
  }, [openPinId, sortedPins])

  if (!sortedPins.length) {
    return <p className={styles.muted}>まだピンがありません。</p>
  }

  return (
    <div className={styles.pinFolderList}>
      {sortedPins.map((pin) => {
        const pinFolders = folders.filter((folder) => folder.pinIds.includes(pin.id))
        const isOpen = openPinId === pin.id

        return (
          <article key={pin.id} className={styles.pinFolderItem}>
            <div className={styles.pinFolderMain}>
              <button type="button" onClick={() => setOpenPinId(isOpen ? null : pin.id)}>
                <i className={styles.pinSelectCircle} />
                <img src={pin.imageUrl} alt="" />
                <span>
                  <strong>{pin.title}</strong>
                  <small>{getMeta(pin)}</small>
                </span>
                <Menu size={22} />
              </button>
            </div>
            {isOpen && (
              <div className={styles.inlineFolderChecks}>
                <p>{pin.description || '説明文なし'}</p>
                <small>{pin.likes} likes / {pin.comments.length} comments / {pin.saves} saves</small>
                <div className={styles.tagRow}>
                  {pin.tags.map((tag) => <b key={tag}>#{tag}</b>)}
                </div>
                <div className={styles.folderChipRow}>
                  {pinFolders.length ? pinFolders.map((folder) => (
                    <span key={folder.id} style={{ borderColor: folder.color }}>
                      {folder.name}
                    </span>
                  )) : <span>フォルダー未設定</span>}
                </div>
                <div className={styles.pinDetailActions}>
                  <button className={styles.ghostButton} type="button" onClick={() => onOpenPin(pin.id)}>詳細を開く</button>
                  <button className={styles.dangerButton} type="button" onClick={() => onDeletePin(pin.id)}>Delete</button>
                </div>
                <strong>入れるフォルダー</strong>
                {folders.map((folder) => (
                  <label key={folder.id}>
                    <input
                      type="checkbox"
                      checked={folder.pinIds.includes(pin.id)}
                      onChange={(event) => onToggleFolder(pin.id, folder.id, event.target.checked)}
                    />
                    <span style={{ backgroundColor: folder.color }} />
                    <b>{folder.name}</b>
                  </label>
                ))}
                <div className={styles.inlineCreate}>
                  <input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="新規フォルダー名" />
                  <ColorSwatches value={newFolderColor} onChange={setNewFolderColor} />
                  <button
                    type="button"
                    onClick={() => {
                      if (!onCreateFolder(pin.id, newFolderName, newFolderColor)) return
                      setNewFolderName('')
                      setNewFolderColor(COLORS[(COLORS.indexOf(newFolderColor) + 1) % COLORS.length])
                    }}
                  >
                    作成
                  </button>
                </div>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

function MapFolderFilter({
  title,
  folders,
  selectedFolderIds,
  onToggle,
}: {
  title: string
  folders: Folder[]
  selectedFolderIds: string[]
  onToggle: (folderId: string, checked: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedCount = folders.filter((folder) => selectedFolderIds.includes(folder.id)).length

  return (
    <div className={styles.folderFilter} onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={() => setOpen((value) => !value)}>
        <SlidersHorizontal size={24} />
        <span>{title}</span>
        <small>{selectedCount}/{folders.length}</small>
      </button>
      {open && (
        <div className={styles.folderFilterPanel}>
          <strong>{title}</strong>
          {!folders.length && <p>フォルダーはまだありません。</p>}
          {folders.map((folder) => (
            <label key={folder.id}>
              <input
                type="checkbox"
                checked={selectedFolderIds.includes(folder.id)}
                onChange={(event) => onToggle(folder.id, event.target.checked)}
              />
              <span style={{ backgroundColor: folder.color }} />
              <b>{folder.name}</b>
              <small>{folder.pinIds.length}</small>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function SplitMapView({
  pins,
  selectedPinId,
  seenPinIds,
  currentLocation,
  startAtCurrentLocation = false,
  onPinClick,
  onListFocus,
  getPinMeta,
  onMapClick,
  onMapSurfaceClick,
  panelsHidden = false,
  onPanelsHiddenChange,
  onDeletePin,
  overlay,
  floatingAction,
}: {
  pins: Pin[]
  selectedPinId: string | null
  seenPinIds?: string[]
  currentLocation?: Coordinates | null
  startAtCurrentLocation?: boolean
  onPinClick: (pinId: string) => void
  onListFocus?: (pinId: string) => void
  getPinMeta?: (pin: Pin) => string
  onMapClick?: (coordinates: Coordinates) => void
  onMapSurfaceClick?: () => void
  panelsHidden?: boolean
  onPanelsHiddenChange?: (hidden: boolean) => void
  onDeletePin?: (pinId: string) => void
  overlay?: ReactNode
  floatingAction?: ReactNode
}) {
  const [visiblePinIds, setVisiblePinIds] = useState<string[]>(pins.map((pin) => pin.id))
  const [focusedPinId, setFocusedPinId] = useState<string | null>(null)
  const [internalPanelsHidden, setInternalPanelsHidden] = useState(false)
  const [mapSearch, setMapSearch] = useState('')
  const [flyToCoordinates, setFlyToCoordinates] = useState<Coordinates | null>(null)
  const [expandedStoryPinId, setExpandedStoryPinId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const listInteractionRef = useRef(false)
  const listInteractionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listCollapsed = onPanelsHiddenChange ? panelsHidden : internalPanelsHidden
  const setPanelsHidden = useCallback((hidden: boolean) => {
    if (onPanelsHiddenChange) {
      onPanelsHiddenChange(hidden)
      return
    }
    setInternalPanelsHidden(hidden)
  }, [onPanelsHiddenChange])

  useEffect(() => {
    const nextIds = pins.map((pin) => pin.id)
    setVisiblePinIds((currentIds) => (sameStringArray(currentIds, nextIds) ? currentIds : nextIds))
  }, [pins])

  useEffect(() => {
    return () => {
      if (listInteractionTimerRef.current) clearTimeout(listInteractionTimerRef.current)
    }
  }, [])

  const visiblePins = useMemo(() => {
    const idSet = new Set(visiblePinIds)
    const nextPins = pins.filter((pin) => idSet.has(pin.id))
    return nextPins.length ? nextPins : pins
  }, [pins, visiblePinIds])

  useEffect(() => {
    if (!visiblePins.length) {
      setFocusedPinId(null)
      return
    }
    if (!focusedPinId || !visiblePins.some((pin) => pin.id === focusedPinId)) {
      setFocusedPinId(visiblePins[0].id)
    }
  }, [focusedPinId, visiblePins])

  const currentMapPin = useMemo(() => {
    return pins.find((pin) => pin.id === focusedPinId) ?? pins.find((pin) => pin.id === selectedPinId) ?? visiblePins[0]
  }, [focusedPinId, pins, selectedPinId, visiblePins])
  const expandedStoryPin = expandedStoryPinId ? pins.find((pin) => pin.id === expandedStoryPinId) ?? null : null

  const handleListScroll = useCallback(() => {
    const list = listRef.current
    if (!list || !visiblePins.length) return
    listInteractionRef.current = true
    if (listInteractionTimerRef.current) clearTimeout(listInteractionTimerRef.current)
    listInteractionTimerRef.current = setTimeout(() => {
      listInteractionRef.current = false
    }, 600)

    let pinId = ''
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 2) {
      pinId = visiblePins[visiblePins.length - 1]?.id ?? ''
    } else if (list.scrollTop <= 2) {
      pinId = visiblePins[0]?.id ?? ''
    } else {
      const listRect = list.getBoundingClientRect()
      const targetY = listRect.top + listRect.height * 0.72
      const buttons = Array.from(list.querySelectorAll<HTMLButtonElement>('button[data-pin-id]'))
      const closest = buttons.reduce<{ id: string; distance: number } | null>((best, button) => {
        const rect = button.getBoundingClientRect()
        const distance = Math.abs(rect.top + rect.height / 2 - targetY)
        if (!best || distance < best.distance) return { id: button.dataset.pinId ?? '', distance }
        return best
      }, null)
      pinId = closest?.id ?? ''
    }

    const pin = visiblePins.find((item) => item.id === pinId)
    if (!pin || pin.id === focusedPinId) return
    setFocusedPinId(pin.id)
  }, [focusedPinId, visiblePins])

  const handleVisiblePinsChange = useCallback((pinIds: string[]) => {
    if (listInteractionRef.current) return
    setVisiblePinIds((currentIds) => (sameStringArray(currentIds, pinIds) ? currentIds : pinIds))
  }, [])

  const selectListPin = useCallback((pinId: string) => {
    setExpandedStoryPinId(null)
    setFocusedPinId(pinId)
    onListFocus?.(pinId)
  }, [onListFocus])

  const selectMapPin = useCallback((pinId: string) => {
    setExpandedStoryPinId(null)
    setFocusedPinId(pinId)
    onPinClick(pinId)
  }, [onPinClick])

  const searchSuggestions = useMemo(() => {
    const query = mapSearch.trim().toLowerCase()
    if (!query) return []
    return pins
      .filter((pin) => `${pin.title} ${pin.description} ${pin.tags.join(' ')}`.toLowerCase().includes(query))
      .slice(0, 5)
  }, [mapSearch, pins])

  const submitMapSearch = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const query = mapSearch.trim()
    if (!query) return

    const matchedPin = searchSuggestions[0]
    if (matchedPin) {
      setFocusedPinId(matchedPin.id)
      onListFocus?.(matchedPin.id)
      return
    }

    if (!MAPBOX_TOKEN) return
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=1&access_token=${MAPBOX_TOKEN}`,
      )
      const data = await response.json()
      const center = data?.features?.[0]?.center
      if (Array.isArray(center) && center.length >= 2) {
        setFlyToCoordinates({ longitude: Number(center[0]), latitude: Number(center[1]) })
      }
    } catch (error) {
      console.warn('地名検索に失敗しました。', error)
    }
  }, [mapSearch, onListFocus, searchSuggestions])

  const moveToCurrentLocation = useCallback(() => {
    if (currentLocation) {
      setFlyToCoordinates(currentLocation)
    }
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFlyToCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [currentLocation])

  return (
    <section className={`${styles.mapPage} ${listCollapsed ? styles.mapPageListCollapsed : ''}`}>
      <div className={styles.splitMap}>
        <div className={styles.splitMapPane}>
          <PinMap
            pins={pins}
            selectedPinId={selectedPinId}
            focusPinId={focusedPinId}
            seenPinIds={seenPinIds}
            currentLocation={currentLocation}
            startAtCurrentLocation={startAtCurrentLocation}
            onPinClick={selectMapPin}
            onMapClick={onMapClick}
            onMapSurfaceClick={() => {
              setExpandedStoryPinId(null)
              onMapSurfaceClick?.()
            }}
            onVisiblePinsChange={handleVisiblePinsChange}
            flyToCoordinates={flyToCoordinates}
          />
          <form className={styles.mapSearchBox} onSubmit={submitMapSearch}>
            <Search size={17} />
            <input value={mapSearch} onChange={(event) => setMapSearch(event.target.value)} placeholder="場所、pinを検索" />
            {searchSuggestions.length > 0 && (
              <div className={styles.mapSearchSuggestions}>
                {searchSuggestions.map((pin) => (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={() => {
                      setMapSearch(pin.title)
                      setFocusedPinId(pin.id)
                      onListFocus?.(pin.id)
                    }}
                  >
                    <img src={pin.imageUrl} alt="" />
                    <span>{pin.title}</span>
                  </button>
                ))}
              </div>
            )}
          </form>
          <button className={styles.locateButton} type="button" aria-label="現在地へ移動" onClick={moveToCurrentLocation}>
            <LocateFixed size={25} />
          </button>
          <button className={styles.hidePanelsButton} type="button" aria-label="パネルを隠す" onClick={() => setPanelsHidden(!listCollapsed)}>
            <EyeOff size={22} />
          </button>
          {overlay}
          {currentMapPin && (!listCollapsed || selectedPinId) && (
            <button className={styles.mapStoryCard} type="button" onClick={() => setExpandedStoryPinId(currentMapPin.id)}>
              <img src={currentMapPin.imageUrl} alt="" />
              <div>
                {getPinMeta && <small>{getPinMeta(currentMapPin)}</small>}
                <strong>{currentMapPin.title}</strong>
                <p>{currentMapPin.description || '説明文なし'}</p>
                <span>{currentMapPin.tags.map((tag) => `#${tag}`).join(' ')}</span>
              </div>
            </button>
          )}
          {expandedStoryPin && (
            <aside className={styles.mapStoryDetail}>
              <button className={styles.closeButton} type="button" aria-label="詳細を閉じる" onClick={() => setExpandedStoryPinId(null)}>
                <X size={16} />
              </button>
              <img src={expandedStoryPin.imageUrl} alt="" />
              <div>
                {getPinMeta && <small>{getPinMeta(expandedStoryPin)}</small>}
                <h2>{expandedStoryPin.title}</h2>
                <p>{expandedStoryPin.description || '説明文なし'}</p>
                {!!expandedStoryPin.tags.length && <span>{expandedStoryPin.tags.map((tag) => `#${tag}`).join(' ')}</span>}
                {onDeletePin && (
                  <button
                    className={styles.dangerButton}
                    type="button"
                    onClick={() => {
                      const pinId = expandedStoryPin.id
                      setExpandedStoryPinId(null)
                      onDeletePin(pinId)
                    }}
                  >
                    Delete Pin
                  </button>
                )}
              </div>
            </aside>
          )}
          {floatingAction && <div className={styles.mapFloatingAction}>{floatingAction}</div>}
        </div>
        {!listCollapsed && (
        <aside className={styles.visibleListPanel}>
          {!listCollapsed && (
            <div ref={listRef} className={styles.visibleListScroll} onScroll={handleListScroll}>
              {visiblePins.map((pin) => (
                <button
                  key={pin.id}
                  data-pin-id={pin.id}
                  className={focusedPinId === pin.id ? styles.currentVisiblePin : ''}
                  type="button"
                  onClick={() => selectListPin(pin.id)}
                >
                  <img src={pin.imageUrl} alt="" />
                  <span>
                    <strong>{pin.title}</strong>
                    <small>{pin.description || communityLabel(undefined)}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>
        )}
      </div>
    </section>
  )
}

function CommunityMapView({
  community,
  pins,
  selectedPinId,
  manualPlacement,
  postMessage,
  activities,
  usersById,
  pinsById,
  timelineOpen,
  chatText,
  onBack,
  onPinClick,
  onListFocus,
  getPinMeta,
  onToggleTimeline,
  onOpenProfile,
  onChatText,
  onSendChat,
  onMapClick,
  onMapSurfaceClick,
  onPost,
}: {
  community: Community
  pins: Pin[]
  selectedPinId: string | null
  manualPlacement: boolean
  postMessage: string
  activities: CommunityActivity[]
  usersById: Map<string, DemoUser>
  pinsById: Map<string, Pin>
  timelineOpen: boolean
  chatText: string
  onBack: () => void
  onPinClick: (pinId: string) => void
  onListFocus?: (pinId: string) => void
  getPinMeta?: (pin: Pin) => string
  onToggleTimeline: () => void
  onOpenProfile: (userId: string) => void
  onChatText: (value: string) => void
  onSendChat: () => void
  onMapClick?: (coordinates: Coordinates) => void
  onMapSurfaceClick?: () => void
  onPost: () => void
}) {
  if (timelineOpen) {
    return (
      <section className={styles.page}>
        <header className={styles.pageHeaderRow}>
          <div>
            <span>{communityLabel(community)}</span>
            <h1>Timeline</h1>
          </div>
          <button className={styles.ghostButton} type="button" onClick={onToggleTimeline}>
            <ArrowLeft size={17} />
            Map
          </button>
        </header>
        <section className={styles.contentSection}>
          <div className={styles.timelineListPage}>
            {activities.map((activity) => {
              const user = usersById.get(activity.userId)
              const pin = activity.pinId ? pinsById.get(activity.pinId) : null
              return (
                <article key={activity.id} className={pin ? styles.timelinePostCard : undefined}>
                  {pin && <img src={pin.imageUrl} alt="" />}
                  <div>
                    <button className={styles.authorLink} type="button" onClick={() => user && onOpenProfile(user.id)}>
                      @{user?.username ?? 'user'}
                    </button>
                    {pin ? (
                      <>
                        <b>{activity.title || pin.title}</b>
                        <span>
                          <MentionText text={activity.text || pin.description || '説明文なし'} usersById={usersById} onOpenProfile={onOpenProfile} />
                        </span>
                        {pin.tags.length > 0 && <em>{pin.tags.map((tag) => `#${tag}`).join(' ')}</em>}
                      </>
                    ) : (
                      <span><MentionText text={activity.text} usersById={usersById} onOpenProfile={onOpenProfile} /></span>
                    )}
                  </div>
                  <small>{formatShortDate(activity.createdAt)}</small>
                </article>
              )
            })}
            {!activities.length && <p className={styles.muted}>まだtimelineはありません。</p>}
          </div>
          <div className={styles.timelineChatPage}>
            <input value={chatText} onChange={(event) => onChatText(event.target.value)} placeholder="コメントを書く" />
            <button type="button" onClick={onSendChat}><Send size={16} /></button>
          </div>
        </section>
      </section>
    )
  }

  return (
    <SplitMapView
      pins={pins}
      selectedPinId={selectedPinId}
      onPinClick={onPinClick}
      onListFocus={onListFocus}
      getPinMeta={getPinMeta}
      onMapClick={onMapClick}
      onMapSurfaceClick={onMapSurfaceClick}
      overlay={(
        <>
          <div className={styles.communityMapActions}>
            <button type="button" onClick={onBack}><ArrowLeft size={18} /></button>
            <button type="button" onClick={onToggleTimeline}>Timeline</button>
          </div>
          {manualPlacement && (
            <div className={styles.placementBanner}>
              map上で投稿位置をクリックしてください。
            </div>
          )}
          {postMessage && <div className={styles.postMessage}>{postMessage}</div>}
        </>
      )}
      floatingAction={(
        <button className={styles.communityPostButton} type="button" onClick={onPost}>
          <Plus size={24} />
          投稿
        </button>
      )}
    />
  )
}

function MentionText({
  text,
  usersById,
  onOpenProfile,
}: {
  text: string
  usersById: Map<string, DemoUser>
  onOpenProfile: (userId: string) => void
}) {
  const usersByUsername = useMemo(() => {
    return new Map(Array.from(usersById.values()).map((user) => [user.username.toLowerCase(), user]))
  }, [usersById])
  const parts = text.split(/(@[a-zA-Z0-9_.]{3,32})/g)

  return (
    <>
      {parts.map((part, index) => {
        const username = part.startsWith('@') ? part.slice(1).toLowerCase() : ''
        const user = username ? usersByUsername.get(username) : null
        if (!user) return <span key={`${part}-${index}`}>{part}</span>
        return (
          <button key={`${part}-${index}`} className={styles.inlineMention} type="button" onClick={() => onOpenProfile(user.id)}>
            @{user.username}
          </button>
        )
      })}
    </>
  )
}

function PinDetail({
  pin,
  owner,
  community,
  usersById,
  isSaved,
  isMine,
  currentUserId,
  commentText,
  onMapSurface,
  onCommentText,
  onClose,
  onLike,
  onAddComment,
  onReport,
  onSave,
  onFolderEdit,
  onOpenProfile,
}: {
  pin: Pin
  owner?: DemoUser
  community?: Community
  usersById: Map<string, DemoUser>
  isSaved: boolean
  isMine: boolean
  currentUserId: string
  commentText: string
  onMapSurface?: boolean
  onCommentText: (value: string) => void
  onClose: () => void
  onLike: () => void
  onAddComment: () => void
  onReport: () => void
  onSave: () => void
  onFolderEdit: () => void
  onOpenProfile: (userId: string) => void
}) {
  return (
    <aside className={`${styles.pinDetail} ${onMapSurface ? styles.pinDetailOnMap : ''}`}>
      <button className={styles.closeButton} type="button" onClick={onClose}><X size={17} /></button>
      <img src={pin.imageUrl} alt="" />
      <div className={styles.pinDetailBody}>
        <span>
          {communityLabel(community)} /{' '}
          <button className={styles.authorLink} type="button" onClick={() => owner && onOpenProfile(owner.id)}>
            @{owner?.username ?? 'user'}
          </button>
        </span>
        <h2>{pin.title}</h2>
        <p>{pin.description || '説明文なし'}</p>
        <small>撮影: {formatShortDate(pin.takenAt)} / 投稿: {formatShortDate(pin.createdAt)}</small>
        <small>{pin.likes} likes / {pin.comments.length} comments / {pin.saves} saves</small>
        <div className={styles.tagRow}>
          {pin.tags.map((tag) => <b key={tag}>#{tag}</b>)}
        </div>
        <div className={styles.actionRow}>
          <button className={pin.likedByMe ? styles.liked : ''} type="button" onClick={onLike}><Heart size={17} /> {pin.likes}</button>
          {isMine ? (
            <button type="button" onClick={onFolderEdit}><FolderPlus size={17} /> フォルダー</button>
          ) : (
            <button type="button" onClick={onSave}><BookmarkPlus size={17} /> {isSaved ? '保存済み' : '追加'}</button>
          )}
          <button type="button" onClick={onReport}><AlertTriangle size={17} /> 通報</button>
        </div>
        <section className={styles.commentBox}>
          <h3><MessageCircle size={16} /> コメント</h3>
          {pin.comments.map((comment) => {
            const user = usersById.get(comment.userId)
            return (
              <p key={comment.id}>
                <button className={styles.authorLink} type="button" onClick={() => user && onOpenProfile(user.id)}>
                  @{comment.userId === currentUserId ? 'me' : user?.username ?? 'user'}
                </button>{' '}
                <MentionText text={comment.text} usersById={usersById} onOpenProfile={onOpenProfile} />
              </p>
            )
          })}
          <div>
            <input value={commentText} onChange={(event) => onCommentText(event.target.value)} placeholder="コメントを書く" />
            <button type="button" onClick={onAddComment}><Send size={16} /></button>
          </div>
        </section>
        {pin.reports > 0 && <small><ShieldCheck size={14} /> 通報 {pin.reports} 件</small>}
      </div>
    </aside>
  )
}
