import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | undefined

/**
 * Browser-side Supabase client (singleton).
 *
 * Uses the default session management so that Supabase persists the session
 * (incl. access_token / refresh_token) in localStorage and auto-refreshes it.
 * This keeps the JWT readily available for authenticated backend calls:
 *
 *   const { data } = await supabase.auth.getSession()
 *   const token = data.session?.access_token
 *   fetch(url, { headers: { Authorization: `Bearer ${token}` } })
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    // Don't crash the page — log once and let callers degrade gracefully.
    console.warn(
      "[v0] Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 를 추가해 주세요.",
    )
    return null
  }

  client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return client
}
