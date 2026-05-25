import { NextRequest, NextResponse } from 'next/server'
import { isResponse, requireAdmin } from '../_utils'

export const dynamic = 'force-dynamic'

type RecommendPayload = {
  id?: string
  item_type?: string
  title?: string
  description?: string
  image_url?: string
  target_url?: string
  folder_id?: string
  post_id?: string
  community_id?: string
  priority?: number
  is_published?: boolean
}

function cleanUuid(value?: string) {
  return value && value.trim() ? value.trim() : null
}

export async function POST(request: NextRequest) {
  const context = await requireAdmin(request)
  if (isResponse(context)) return context

  const body = await request.json() as RecommendPayload
  const title = body.title?.trim()
  if (!title) {
    return NextResponse.json({ error: 'タイトルを入力してください。' }, { status: 400 })
  }

  const row = {
    item_type: body.item_type || 'event',
    title,
    description: body.description?.trim() || null,
    image_url: body.image_url?.trim() || null,
    target_url: body.target_url?.trim() || null,
    folder_id: cleanUuid(body.folder_id),
    post_id: cleanUuid(body.post_id),
    community_id: cleanUuid(body.community_id),
    priority: Number.isFinite(body.priority) ? body.priority : 100,
    is_published: body.is_published ?? true,
    created_by: context.user.id,
    updated_at: new Date().toISOString(),
  }

  const query = body.id
    ? context.client.from('recommend_items').update(row).eq('id', body.id).select('*').single()
    : context.client.from('recommend_items').insert(row).select('*').single()

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}

export async function DELETE(request: NextRequest) {
  const context = await requireAdmin(request)
  if (isResponse(context)) return context

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'idが必要です。' }, { status: 400 })
  }

  const { error } = await context.client.from('recommend_items').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
