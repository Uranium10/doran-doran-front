"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

/**
 * Renders nothing. On mount it checks for an existing (auto-logged-in)
 * Supabase session and, if present, redirects to the profile selection page.
 * Place this on the public landing page so already-authenticated users skip
 * straight to /profiles.
 */
export function AuthRedirectGate() {
  const router = useRouter()

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        router.replace("/profiles")
      }
    })

    return () => {
      active = false
    }
  }, [router])

  return null
}
