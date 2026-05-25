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

const RECOMMEND_TYPES = ['event', 'folder_pick', 'official_folder', 'community_pick', 'post_pick', 'announcement'] as const

function cleanUuid(value?: string) {
  return value && value.trim() ? value.trim() : null
}

function cleanType(value?: string) {
  return RECOMMEND_TYPES.includes(value as typeof RECOMMEND_TYPES[number]) ? value : 'event'
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
    item_type: cleanType(body.item_type),
    title,
    description: body.description?.trim() || null,
    image_url: body.image_url?.trim() || null,
    target_url: body.target_url?.trim() || null,
    folder_id: cleanUuid(body.folder_id),
    post_id: cleanUuid(body.post_id),
    community_id: cleanUuid(body.community_id),
    priority: Number.isFinite(body.priority) ? body.priority : 100,
    is_published: body.is_published ?? true,
    updated_at: new Date().toISOString(),
  }

  const query = body.id
    ? context.client.from('recommend_items').update(row).eq('id', body.id).select('*').single()
    : context.client.from('recommend_items').insert({ ...row, created_by: context.user.id }).select('*').single()

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}

export async function PATCH(request: NextRequest) {
  const context = await requireAdmin(request)
  if (isResponse(context)) return context

  const body = await request.json() as { items?: Array<{ id?: string; priority?: number }> }
  const items = Array.isArray(body.items) ? body.items : []
  const updates = items
    .filter((item) => item.id && Number.isFinite(item.priority))
    .map((item) => context.client
      .from('recommend_items')
      .update({ priority: item.priority, updated_at: new Date().toISOString() })
      .eq('id', item.id))

  if (!updates.length) {
    return NextResponse.json({ error: '更新するRecommendがありません。' }, { status: 400 })
  }

  const results = await Promise.all(updates)
  const failed = results.find((result) => result.error)
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
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
