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

/** 일반 요청 기본 타임아웃(ms). */
const DEFAULT_TIMEOUT_MS = 30_000
/**
 * 동화/문제 생성처럼 LLM 작업이 끼어 오래 걸리는 요청용 타임아웃(ms).
 * 타임아웃이 없으면 서버가 응답을 늦게/안 줄 때 화면이 무한로딩에 빠진다.
 */
export const LONG_TIMEOUT_MS = 120_000

export type RequestOptions = {
  /** 이 요청의 타임아웃(ms). 미지정 시 DEFAULT_TIMEOUT_MS. */
  timeoutMs?: number
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

/** 공통 fetch 래퍼. 실패 시 에러를 throw 한다(호출부에서 콘솔 출력/로딩 해제). */
export async function request<T>(
  path: string,
  init?: RequestInit,
  options?: RequestOptions,
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  // AbortController 로 타임아웃을 걸어, 응답이 안 와도 영원히 대기하지 않게 한다.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      // 화면 이탈 취소와 요청 시간 제한을 둘 다 지킨다.
      signal: init?.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal,
      headers: {
        ...(await buildHeaders()),
        ...((init?.headers as Record<string, string> | undefined) ?? {}),
      },
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error(
        `요청 시간이 초과됐어요 (${Math.round(timeoutMs / 1000)}초): ${path}`,
      )
    }
    throw e
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const detail = typeof body?.detail === "string" ? body.detail : "요청을 처리하지 못했습니다."
    throw new ApiError(res.status, detail)
  }

  // 본문이 비어 있을 수 있으므로(텍스트 → JSON) 안전하게 파싱한다.
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** 인증이 필요한 PDF를 Blob으로 받은 뒤 기기에 저장한다. 서버 URL을 새 탭에 노출하지 않는다. */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120_000)
  let response: Response
  try {
    const headers = await buildHeaders()
    delete headers["Content-Type"]
    response = await fetch(`${API_BASE_URL}${path}`, {headers, signal: controller.signal})
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("PDF를 만드는 시간이 너무 오래 걸리고 있어요. 다시 시도해 주세요.")
    throw error
  } finally { clearTimeout(timer) }
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, typeof body?.detail === "string" ? body.detail : "PDF를 저장하지 못했어요.")
  }
  const blob = await response.blob()
  if (blob.type !== "application/pdf" || blob.size < 100) throw new Error("완성된 PDF를 받지 못했어요.")
  const safe = fallbackName.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90) || "도란도란 자료.pdf"
  const href = URL.createObjectURL(blob), anchor = document.createElement("a")
  try { anchor.href=href;anchor.download=safe.endsWith(".pdf")?safe:`${safe}.pdf`;document.body.appendChild(anchor);anchor.click() }
  finally { anchor.remove();setTimeout(()=>URL.revokeObjectURL(href),1000) }
}

// ---------------------------------------------------------------------------
// 1. 구글 계정 로그인 동기화 (front -> back)
// ---------------------------------------------------------------------------
export async function syncUser(): Promise<void> {
  // 사용자 ID·이메일은 서버가 JWT 검증 결과에서 얻는다. 본문으로 신원을 주장하지 않는다.
  await request("/users/sync", {
    method: "POST",
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
    await syncUser()
  } catch (e) {
    // 실패 시 다음 기회에 재시도할 수 있도록 가드를 해제한다.
    lastSyncedUserId = null
    console.error("[v0] 유저 동기화 실패:", e)
  }
}

// ---------------------------------------------------------------------------
// 2. 프로필 목록 불러오기 (back -> front)
// ---------------------------------------------------------------------------
export async function fetchProfiles(): Promise<Profile[]> {
  // 조회 대상 사용자는 Authorization 토큰으로 결정한다.
  const data = await request<{ profiles: Profile[] }>(
    "/profiles",
  )
  return data?.profiles ?? []
}

// ---------------------------------------------------------------------------
// 3. 새 프로필 생성 (front -> back)
// ---------------------------------------------------------------------------
export type CreateProfileInput = {
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
