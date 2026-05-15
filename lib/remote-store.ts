import { supabase } from './supabase'
import {
  CATEGORIES,
  Category,
  MapPin,
  PinComment,
  PinTag,
  SpotFolder,
  TAGS,
  UserProfile,
  Visibility,
  type AppState,
} from './types'

const OFFICIAL_PROFILE_ID = '00000000-0000-4000-8000-000000000001'
const POST_IMAGE_BUCKET = 'post-images'
const PROFILE_IMAGE_BUCKET = 'profile-images'

type ProfileRow = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  cover_image_url: string | null
  bio: string | null
  website_url: string | null
  instagram_url: string | null
  x_url: string | null
  tiktok_url: string | null
}

type PostRow = {
  id: string
  user_id: string
  kind: 'official' | 'user'
  title: string
  category: string
  description: string | null
  latitude: number
  longitude: number
  image_url: string | null
  image_name: string | null
  image_mime_type: string | null
  external_url: string | null
  address: string | null
  visibility: Visibility
  tags: string[] | null
  created_at: string
  updated_at: string
}

type FolderRow = {
  id: string
  user_id: string
  name: string
  visibility: Visibility
  category: string
  tags: string[] | null
  created_at: string
  updated_at: string
}

type FolderPostRow = {
  folder_id: string
  post_id: string
}

type LikeRow = {
  user_id: string
  post_id: string
}

type CommentRow = {
  id: string
  post_id: string
  user_id: string
  body: string
  created_at: string
}

type SavedFolderRow = {
  folder_id: string
}

type SavedPostRow = {
  post_id: string
}

type FollowRow = {
  follower_id: string
  following_id: string
}

const validCategories = new Set<string>(CATEGORIES)
const validTags = new Set<string>(TAGS)

function asCategory(value: string | null | undefined): Category {
  return validCategories.has(value ?? '') ? (value as Category) : '建築'
}

function asCategories(value: string | null | undefined): Category[] {
  return [asCategory(value)]
}

function asTags(values: string[] | null | undefined): PinTag[] {
  return (values ?? []).filter((value): value is PinTag => validTags.has(value))
}

function profileName(profile: ProfileRow | undefined) {
  return profile?.display_name || profile?.username || 'user'
}

function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    coverImageUrl: row.cover_image_url ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    xUrl: row.x_url ?? undefined,
    tiktokUrl: row.tiktok_url ?? undefined,
  }
}

function groupByPost<T extends { post_id: string }>(rows: T[] | null) {
  const grouped = new Map<string, T[]>()
  rows?.forEach((row) => {
    const current = grouped.get(row.post_id) ?? []
    current.push(row)
    grouped.set(row.post_id, current)
  })
  return grouped
}

function mapPost(
  row: PostRow,
  ownerName: string,
  comments: PinComment[],
  likes: number,
  likedByMe: boolean,
): MapPin {
  return {
    id: row.id,
    ownerId: row.user_id,
    kind: row.kind,
    visibility: row.visibility,
    name: row.title,
    comment: row.description ?? undefined,
    imageName: row.image_name ?? undefined,
    imageUrl: row.image_url ?? undefined,
    imageMimeType: row.image_mime_type ?? undefined,
    longitude: row.longitude,
    latitude: row.latitude,
    categories: asCategories(row.category),
    tags: asTags(row.tags),
    ownerName,
    createdAt: row.created_at,
    likes,
    likedByMe,
    comments,
  }
}

function mapFolder(row: FolderRow, ownerName: string, pinIds: string[]): SpotFolder {
  return {
    id: row.id,
    ownerId: row.user_id,
    name: row.name,
    ownerName,
    visibility: row.visibility,
    categories: asCategories(row.category),
    tags: asTags(row.tags),
    pinIds,
    createdAt: row.created_at,
  }
}

function dataUrlToBlob(dataUrl: string) {
  return fetch(dataUrl).then((response) => response.blob())
}

async function uploadImageIfNeeded(userId: string, pin: MapPin) {
  if (!supabase || !pin.imageUrl?.startsWith('data:')) return pin.imageUrl ?? null

  const blob = await dataUrlToBlob(pin.imageUrl)
  const extension = pin.imageMimeType?.includes('png') ? 'png' : 'jpg'
  const path = `${userId}/${pin.id}.${extension}`
  const { error } = await supabase.storage.from(POST_IMAGE_BUCKET).upload(path, blob, {
    cacheControl: '3600',
    contentType: pin.imageMimeType ?? blob.type,
    upsert: true,
  })

  if (error) {
    console.error(error)
    return pin.imageUrl
  }

  return supabase.storage.from(POST_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

async function uploadProfileImageIfNeeded(profile: UserProfile) {
  if (!supabase || !profile.avatarUrl?.startsWith('data:')) return profile.avatarUrl ?? null

  const blob = await dataUrlToBlob(profile.avatarUrl)
  const extension = blob.type.includes('png') ? 'png' : 'jpg'
  const path = `${profile.id}/avatar.${extension}`
  const { error } = await supabase.storage.from(PROFILE_IMAGE_BUCKET).upload(path, blob, {
    cacheControl: '3600',
    contentType: blob.type || 'image/jpeg',
    upsert: true,
  })

  if (error) {
    console.error(error)
    return profile.avatarUrl
  }

  return supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

function toPostRow(pin: MapPin, userId: string, imageUrl: string | null) {
  return {
    id: pin.id,
    user_id: pin.kind === 'official' ? OFFICIAL_PROFILE_ID : pin.ownerId ?? userId,
    kind: pin.kind,
    title: pin.name,
    category: pin.categories[0] ?? '建築',
    description: pin.comment ?? null,
    latitude: pin.latitude,
    longitude: pin.longitude,
    image_url: imageUrl,
    image_name: pin.imageName ?? null,
    image_mime_type: pin.imageMimeType ?? null,
    external_url: null,
    address: null,
    visibility: pin.visibility,
    tags: pin.tags,
    created_at: pin.createdAt,
    updated_at: new Date().toISOString(),
  }
}

function toFolderRow(folder: SpotFolder, userId: string) {
  return {
    id: folder.id,
    user_id: folder.ownerId ?? userId,
    visibility: folder.visibility,
    name: folder.name,
    category: folder.categories[0] ?? '建築',
    tags: folder.tags,
    created_at: folder.createdAt,
    updated_at: new Date().toISOString(),
  }
}

export function hasRemoteStore() {
  return Boolean(supabase)
}

export async function ensureRemoteProfile(userId: string, displayName = '自分') {
  if (!supabase || userId === 'server') return

  const username = displayName === '自分' ? `member_${userId.slice(0, 8)}` : displayName
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      username,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )

  if (error) {
    console.error(error)
  }
}

export async function loadRemoteProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,username,display_name,avatar_url,cover_image_url,bio,website_url,instagram_url,x_url,tiktok_url')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    return data ? mapProfile(data as ProfileRow) : null
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function saveRemoteProfile(profile: UserProfile) {
  if (!supabase) return

  try {
    const avatarUrl = await uploadProfileImageIfNeeded(profile)
    const { error } = await supabase.from('profiles').upsert(
      {
        id: profile.id,
        username: profile.username,
        display_name: profile.displayName,
        avatar_url: avatarUrl,
        cover_image_url: null,
        bio: profile.bio ?? null,
        website_url: profile.websiteUrl ?? null,
        instagram_url: null,
        x_url: null,
        tiktok_url: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

    if (error) throw error
  } catch (error) {
    console.error(error)
  }
}

export async function loadRemoteAppState(userId: string): Promise<AppState | null> {
  if (!supabase) return null

  try {
    await ensureRemoteProfile(userId)

    const [
      profilesResult,
      postsResult,
      foldersResult,
      folderPostsResult,
      likesResult,
      commentsResult,
      savedFoldersResult,
      savedPostsResult,
      followsResult,
    ] = await Promise.all([
      supabase.from('profiles').select('id,username,display_name,avatar_url,cover_image_url,bio,website_url,instagram_url,x_url,tiktok_url'),
      supabase.from('posts').select('*'),
      supabase.from('folders').select('*'),
      supabase.from('folder_posts').select('folder_id,post_id'),
      supabase.from('post_likes').select('user_id,post_id'),
      supabase.from('post_comments').select('id,post_id,user_id,body,created_at').order('created_at'),
      supabase.from('saved_folders').select('folder_id').eq('user_id', userId),
      supabase.from('saved_posts').select('post_id').eq('user_id', userId),
      supabase
        .from('follows')
        .select('follower_id,following_id')
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`),
    ])

    if (profilesResult.error) throw profilesResult.error
    if (postsResult.error) throw postsResult.error
    if (foldersResult.error) throw foldersResult.error
    if (folderPostsResult.error) throw folderPostsResult.error
    if (likesResult.error) throw likesResult.error
    if (commentsResult.error) throw commentsResult.error
    if (savedFoldersResult.error) throw savedFoldersResult.error
    if (savedPostsResult.error) throw savedPostsResult.error
    if (followsResult.error) throw followsResult.error

    const profiles = (profilesResult.data ?? []) as ProfileRow[]
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
    const commentsByPost = groupByPost((commentsResult.data ?? []) as CommentRow[])
    const likesByPost = groupByPost((likesResult.data ?? []) as LikeRow[])
    const folderPosts = (folderPostsResult.data ?? []) as FolderPostRow[]
    const pinIdsByFolder = new Map<string, string[]>()

    folderPosts.forEach((row) => {
      const current = pinIdsByFolder.get(row.folder_id) ?? []
      current.push(row.post_id)
      pinIdsByFolder.set(row.folder_id, current)
    })

    const pins = ((postsResult.data ?? []) as PostRow[]).map((row) => {
      const comments =
        commentsByPost.get(row.id)?.map((comment) => ({
          id: comment.id,
          pinId: comment.post_id,
          body: comment.body,
          authorName: profileName(profileById.get(comment.user_id)),
          createdAt: comment.created_at,
        })) ?? []
      const likes = likesByPost.get(row.id) ?? []
      return mapPost(
        row,
        profileName(profileById.get(row.user_id)),
        comments,
        likes.length,
        likes.some((like) => like.user_id === userId),
      )
    })

    const folders = ((foldersResult.data ?? []) as FolderRow[]).map((row) =>
      mapFolder(row, profileName(profileById.get(row.user_id)), pinIdsByFolder.get(row.id) ?? []),
    )
    const follows = (followsResult.data ?? []) as FollowRow[]

    return {
      officialPins: pins.filter((pin) => pin.kind === 'official'),
      myPins: pins.filter((pin) => pin.kind === 'user' && pin.ownerId === userId),
      publicPins: pins.filter((pin) => pin.kind === 'user' && pin.visibility === 'public'),
      myFolders: folders.filter((folder) => folder.ownerId === userId),
      publicFolders: folders.filter((folder) => folder.visibility === 'public'),
      savedFolderIds: ((savedFoldersResult.data ?? []) as SavedFolderRow[]).map((row) => row.folder_id),
      savedPinIds: ((savedPostsResult.data ?? []) as SavedPostRow[]).map((row) => row.post_id),
      hiddenPinIds: [],
      followingUserIds: follows
        .filter((row) => row.follower_id === userId)
        .map((row) => profileName(profileById.get(row.following_id))),
      followerUserIds: follows
        .filter((row) => row.following_id === userId)
        .map((row) => profileName(profileById.get(row.follower_id))),
    }
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function saveRemotePost(userId: string, pin: MapPin, folder: SpotFolder | null) {
  if (!supabase) return

  try {
    await ensureRemoteProfile(userId)

    if (folder) {
      const { error } = await supabase.from('folders').upsert(toFolderRow(folder, userId))
      if (error) throw error
    }

    const imageUrl = await uploadImageIfNeeded(userId, pin)
    const { error: postError } = await supabase.from('posts').upsert(toPostRow(pin, userId, imageUrl))
    if (postError) throw postError

    if (pin.folderId) {
      const { error: relationError } = await supabase.from('folder_posts').upsert({
        folder_id: pin.folderId,
        post_id: pin.id,
      })
      if (relationError) throw relationError
    }
  } catch (error) {
    console.error(error)
  }
}

export async function saveRemoteOfficialPin(pin: MapPin) {
  if (!supabase) return

  try {
    await ensureRemoteProfile(OFFICIAL_PROFILE_ID, '運営')
    const imageUrl = await uploadImageIfNeeded(OFFICIAL_PROFILE_ID, pin)
    const { error } = await supabase.from('posts').upsert(toPostRow(pin, OFFICIAL_PROFILE_ID, imageUrl))
    if (error) throw error
  } catch (error) {
    console.error(error)
  }
}

export async function saveRemoteFolder(userId: string, folderId: string) {
  if (!supabase) return

  try {
    await ensureRemoteProfile(userId)
    const { error } = await supabase.from('saved_folders').upsert({
      user_id: userId,
      folder_id: folderId,
    })
    if (error) throw error
  } catch (error) {
    console.error(error)
  }
}

export async function saveRemotePin(userId: string, pinId: string) {
  if (!supabase) return

  try {
    await ensureRemoteProfile(userId)
    const { error } = await supabase.from('saved_posts').upsert({
      user_id: userId,
      post_id: pinId,
    })
    if (error) throw error
  } catch (error) {
    console.error(error)
  }
}

export async function setRemoteLike(userId: string, pinId: string, liked: boolean) {
  if (!supabase) return

  try {
    await ensureRemoteProfile(userId)

    if (liked) {
      const { error } = await supabase.from('post_likes').upsert({ user_id: userId, post_id: pinId })
      if (error) throw error
      return
    }

    const { error } = await supabase.from('post_likes').delete().eq('user_id', userId).eq('post_id', pinId)
    if (error) throw error
  } catch (error) {
    console.error(error)
  }
}

export async function setRemoteFollow(userId: string, targetName: string, following: boolean) {
  if (!supabase) return

  try {
    await ensureRemoteProfile(userId)
    const { data: target, error: targetError } = await supabase
      .from('profiles')
      .select('id')
      .or(`username.eq.${targetName},display_name.eq.${targetName}`)
      .limit(1)
      .maybeSingle()

    if (targetError) throw targetError
    if (!target?.id || target.id === userId) return

    if (following) {
      const { error } = await supabase.from('follows').upsert({ follower_id: userId, following_id: target.id })
      if (error) throw error
      return
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', target.id)
    if (error) throw error
  } catch (error) {
    console.error(error)
  }
}

export async function saveRemoteComment(userId: string, comment: PinComment) {
  if (!supabase) return

  try {
    await ensureRemoteProfile(userId)
    const { error } = await supabase.from('post_comments').insert({
      id: comment.id,
      post_id: comment.pinId,
      user_id: userId,
      body: comment.body,
      created_at: comment.createdAt,
    })
    if (error) throw error
  } catch (error) {
    console.error(error)
  }
}
