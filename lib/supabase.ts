import { createClient } from '@supabase/supabase-js'

function normalizeSupabaseUrl(value: string | undefined) {
  const trimmed = value?.trim().replace(/\/+$/, '')
  if (!trimmed) return undefined

  return trimmed.replace(/\/rest\/v1$/i, '')
}

const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null
