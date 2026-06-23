import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/profile-context"

/**
 * 백엔드 API Base URL.
 * NEXT_PUBLIC_API_BASE_URL 이 있으면 사용하고, 없으면 배포 서버로 폴백한다.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  "https://doran-doran.onrender.com/api/v1"

/**
 * 게스트(비로그인) 프로필 여부.
 * profileId 가 없거나 "guest" 로 시작하면 게스트로 본다.
 */
export function isGuestProfile(profileId: string | null | undefined): boolean {
  return !profileId || profileId.startsWith("guest")
}

/** Supabase 세션의 access_token 을 Authorization 헤더로 실어 준다. */
async function buildHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  const supabase = getSupabaseBrowserClient()
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

/** 공통 fetch 래퍼. 실패 시 에러를 throw 한다(호출부에서 콘솔 출력/로딩 해제). */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(await buildHeaders()),
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    },
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(
      `API ${res.status} ${res.statusText}: ${path}${detail ? ` — ${detail}` : ""}`,
    )
  }

  // 본문이 비어 있을 수 있으므로(텍스트 → JSON) 안전하게 파싱한다.
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// ---------------------------------------------------------------------------
// 1. 구글 계정 로그인 동기화 (front -> back)
// ---------------------------------------------------------------------------
export type SyncUserInput = { user_id: string; email: string; name: string }

export async function syncUser(input: SyncUserInput): Promise<void> {
  await request("/users/sync", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

/**
 * 현재 Supabase 세션을 읽어 백엔드와 동기화한다.
 * 같은 user_id 에 대해 중복 호출되지 않도록 모듈 단위로 가드한다.
 */
let lastSyncedUserId: string | null = null

export async function syncCurrentUser(): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  const session = data.session
  if (!session?.user) return
  if (lastSyncedUserId === session.user.id) return

  lastSyncedUserId = session.user.id
  try {
    const meta = session.user.user_metadata ?? {}
    await syncUser({
      user_id: session.user.id,
      email: session.user.email ?? "",
      name: meta.name ?? meta.full_name ?? "",
    })
  } catch (e) {
    // 실패 시 다음 기회에 재시도할 수 있도록 가드를 해제한다.
    lastSyncedUserId = null
    console.error("[v0] 유저 동기화 실패:", e)
  }
}

// ---------------------------------------------------------------------------
// 2. 프로필 목록 불러오기 (back -> front)
// ---------------------------------------------------------------------------
export async function fetchProfiles(userId: string): Promise<Profile[]> {
  const data = await request<{ profiles: Profile[] }>(
    `/profiles?user_id=${encodeURIComponent(userId)}`,
  )
  return data?.profiles ?? []
}

// ---------------------------------------------------------------------------
// 3. 새 프로필 생성 (front -> back)
// ---------------------------------------------------------------------------
export type CreateProfileInput = {
  user_id: string
  name: string
  birth_date: string
  avatar_url: string
}

export async function createProfile(
  input: CreateProfileInput,
): Promise<Profile> {
  return request<Profile>("/profiles", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

// ---------------------------------------------------------------------------
// 4. 프로필 수정 (front -> back)
// ---------------------------------------------------------------------------
export type UpdateProfileInput = {
  name: string
  birth_date: string
  avatar_url: string
}

export async function patchProfile(
  profileId: string,
  input: UpdateProfileInput,
): Promise<Profile> {
  return request<Profile>(`/profiles/${profileId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

// ---------------------------------------------------------------------------
// 5. 프로필 삭제 (front -> back)
// ---------------------------------------------------------------------------
export async function deleteProfileApi(profileId: string): Promise<void> {
  await request(`/profiles/${profileId}`, { method: "DELETE" })
}
