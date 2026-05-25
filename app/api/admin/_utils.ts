import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '../../../lib/supabase-admin'

export type AdminContext = {
  client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
  user: {
    id: string
    email?: string
  }
}

export async function requireAdmin(request: NextRequest): Promise<AdminContext | NextResponse> {
  const client = createSupabaseAdminClient()
  if (!client) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY が未設定です。VercelのEnvironment Variablesに追加してください。' },
      { status: 500 },
    )
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
  }

  const { data: userData, error: userError } = await client.auth.getUser(token)
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'ログイン情報を確認できませんでした。' }, { status: 401 })
  }

  const { data: adminRow, error: adminError } = await client
    .from('admin_users')
    .select('user_id,role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (adminError) {
    return NextResponse.json(
      { error: 'admin_users が未設定です。追加SQLをSupabaseでrunしてください。' },
      { status: 500 },
    )
  }

  if (!adminRow) {
    return NextResponse.json({ error: 'このアカウントには運営権限がありません。' }, { status: 403 })
  }

  return {
    client,
    user: {
      id: userData.user.id,
      email: userData.user.email,
    },
  }
}

export function isResponse(value: AdminContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

export async function safeQuery<T>(query: PromiseLike<{ data: T | null; error: { message: string } | null; count?: number | null }>) {
  const result = await query
  if (result.error) return { data: null, count: result.count ?? null, error: result.error.message }
  return { data: result.data, count: result.count ?? null, error: null }
}
