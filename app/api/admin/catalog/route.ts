import { NextRequest, NextResponse } from 'next/server'
import { isResponse, requireAdmin, safeQuery } from '../_utils'

export const dynamic = 'force-dynamic'

const CATALOG_KINDS = ['folders', 'communities', 'posts', 'users'] as const

type CatalogKind = typeof CATALOG_KINDS[number]

function getKind(value: string | null): CatalogKind {
  return CATALOG_KINDS.includes(value as CatalogKind) ? value as CatalogKind : 'folders'
}

function toSearchTerm(value: string | null) {
  return value?.trim().replace(/[%,]/g, ' ') ?? ''
}

function toLimit(value: string | null) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 80
  return Math.max(10, Math.min(160, Math.floor(parsed)))
}

export async function GET(request: NextRequest) {
  const context = await requireAdmin(request)
  if (isResponse(context)) return context

  const kind = getKind(request.nextUrl.searchParams.get('kind'))
  const search = toSearchTerm(request.nextUrl.searchParams.get('q'))
  const limit = toLimit(request.nextUrl.searchParams.get('limit'))
  const like = `%${search}%`

  if (kind === 'folders') {
    let query = context.client
      .from('app_folder_cards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (search) {
      query = query.or(`name.ilike.${like},description.ilike.${like},username.ilike.${like},display_name.ilike.${like}`)
    }

    const result = await safeQuery(query)
    return NextResponse.json({
      kind,
      rows: result.data ?? [],
      warnings: result.error ? [result.error] : [],
    })
  }

  if (kind === 'communities') {
    let query = context.client
      .from('app_community_cards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (search) {
      query = query.or(`name.ilike.${like},description.ilike.${like},slug.ilike.${like}`)
    }

    const result = await safeQuery(query)
    return NextResponse.json({
      kind,
      rows: result.data ?? [],
      warnings: result.error ? [result.error] : [],
    })
  }

  if (kind === 'posts') {
    let query = context.client
      .from('app_post_cards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (search) {
      query = query.or(`title.ilike.${like},description.ilike.${like},username.ilike.${like},display_name.ilike.${like}`)
    }

    const result = await safeQuery(query)
    return NextResponse.json({
      kind,
      rows: result.data ?? [],
      warnings: result.error ? [result.error] : [],
    })
  }

  let query = context.client
    .from('profiles')
    .select('id,username,display_name,avatar_url,bio,pin_count,public_pin_count,folder_count,public_folder_count,follower_count,following_count,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (search) {
    query = query.or(`username.ilike.${like},display_name.ilike.${like},bio.ilike.${like}`)
  }

  const result = await safeQuery(query)
  return NextResponse.json({
    kind,
    rows: result.data ?? [],
    warnings: result.error ? [result.error] : [],
  })
}
