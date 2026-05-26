import { NextRequest, NextResponse } from 'next/server'
import { isResponse, requireAdmin } from '../_utils'

export const dynamic = 'force-dynamic'

type FolderPayload = {
  name?: string
  description?: string
  color?: string
  visibility?: 'private' | 'public' | 'followers'
  post_ids?: string[]
}

function cleanPostIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export async function POST(request: NextRequest) {
  const context = await requireAdmin(request)
  if (isResponse(context)) return context

  const body = await request.json() as FolderPayload
  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: 'フォルダー名を入力してください。' }, { status: 400 })
  }

  const postIds = cleanPostIds(body.post_ids)
  const firstPostId = postIds[0]
  let thumbnailUrl: string | null = null

  if (firstPostId) {
    const { data } = await context.client
      .from('posts')
      .select('image_url')
      .eq('id', firstPostId)
      .maybeSingle()
    thumbnailUrl = typeof data?.image_url === 'string' ? data.image_url : null
  }

  const { data: folder, error: folderError } = await context.client
    .from('folders')
    .insert({
      user_id: context.user.id,
      name,
      description: body.description?.trim() || '',
      color: body.color || '#126b58',
      visibility: body.visibility || 'public',
      folder_kind: 'my_world',
      thumbnail_url: thumbnailUrl,
    })
    .select('*')
    .single()

  if (folderError) {
    return NextResponse.json({ error: folderError.message }, { status: 500 })
  }

  if (postIds.length) {
    const rows = postIds.map((postId, index) => ({
      folder_id: folder.id,
      post_id: postId,
      user_id: context.user.id,
      sort_order: index + 1,
    }))

    const { error: postsError } = await context.client
      .from('folder_posts')
      .insert(rows)

    if (postsError) {
      await context.client.from('folders').delete().eq('id', folder.id)
      return NextResponse.json({ error: postsError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ folder })
}
