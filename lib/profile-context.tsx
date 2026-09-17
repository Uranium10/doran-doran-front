"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { ProfileSession } from "./profile-session"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  createProfile,
  deleteProfileApi,
  fetchProfiles,
  patchProfile,
} from "@/lib/api"

export type Profile = {
  id: string
  name: string
  birth_date: string // YYYY-MM-DD
  avatar_url: string
  level: number | null
}

export type NewProfileInput = {
  name: string
  birth_date: string
  avatar_url?: string
}

export type EditProfileInput = {
  name: string
  birth_date: string
  avatar_url: string
}

type ProfileContextValue = {
  profiles: Profile[]
  currentProfile: Profile | null
  /** 프로필 목록을 처음 불러오는 중인지 여부 */
  loading: boolean
  error: string | null
  /** 탭 내 진행 상태의 계정/프로필 구분 키. 인증 판단에는 사용하지 않는다. */
  sessionScope: string | null
  selectProfile: (id: string) => void
  clearCurrentProfile: () => void
  /** 서버에서 프로필 목록을 다시 불러온다. */
  refreshProfiles: () => Promise<void>
  /** 새 프로필 생성 (POST /profiles) */
  addProfile: (input: NewProfileInput) => Promise<Profile>
  /** 프로필 수정 (PATCH /profiles/{id}) */
  editProfile: (id: string, values: EditProfileInput) => Promise<Profile>
  /** 로컬 상태만 갱신한다 (측정 결과 level 반영 등, 서버 연동 전용 아님) */
  updateProfile: (id: string, patch: Partial<Omit<Profile, "id">>) => void
  /** 프로필 삭제 (DELETE /profiles/{id}) */
  deleteProfile: (id: string) => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

const FALLBACK_AVATARS = [
  "/avatars/child-1.png",
  "/avatars/child-2.png",
  "/avatars/child-3.png",
]

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => new ProfileSession(fetchProfiles, {
    getItem: key => window.sessionStorage.getItem(key),
    setItem: (key, value) => window.sessionStorage.setItem(key, value),
    removeItem: key => window.sessionStorage.removeItem(key),
    key: index => window.sessionStorage.key(index),
    get length() { return window.sessionStorage.length },
  }))
  const state = useSyncExternalStore(session.subscribe, session.snapshot, session.snapshot)
  const { profiles, loading, error } = state
  const restoreAuth = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) { session.attach(null); return }
    let active = true
    let authEvents = 0
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const attach = (owner: string | null) => {
      if (!active) return
      session.attach(owner)
      // Supabase 인증 콜백이 종료된 후 JWT를 읽도록 다음 이벤트 루프로 미룬다.
      if (owner && session.snapshot().loading) {
        const timer = setTimeout(() => { timers.delete(timer); if (active) void session.refresh() }, 0)
        timers.add(timer)
      }
    }
    const restore = async () => {
      const startedAt = authEvents
      try {
        const { data, error } = await supabase.auth.getSession()
        if (active && authEvents === startedAt) {
          if (error) session.failAuth()
          else attach(data.session?.user.id ?? null)
        }
      } catch { if (active && authEvents === startedAt) session.failAuth() }
    }
    restoreAuth.current = restore
    void restore()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      authEvents++; attach(next?.user.id ?? null)
    })
    return () => { active = false; timers.forEach(clearTimeout); subscription.unsubscribe(); session.invalidate() }
  }, [session])

  const refreshProfiles = useCallback(async () => {
    if (session.snapshot().owner === undefined) await restoreAuth.current()
    else await session.refresh()
  }, [session])

  const addProfile = useCallback(
    async (input: NewProfileInput) => {
      if (!session.snapshot().owner) throw new Error("로그인이 필요합니다.")
      const revision = session.epoch()
      const created = await createProfile({
        name: input.name.trim() || "새 친구",
        birth_date: input.birth_date,
        avatar_url:
          input.avatar_url?.trim() ||
          FALLBACK_AVATARS[
            session.snapshot().profiles.length % FALLBACK_AVATARS.length
          ],
      })
      // 서버가 생성된 프로필 객체를 정상 반환했는지 검증한다.
      // (null/빈 응답을 그대로 목록에 넣으면 렌더링이 깨지므로 방어)
      if (!created || !created.id) {
        throw new Error(
          "프로필 생성 응답이 올바르지 않습니다(생성된 객체를 반환하지 않음).",
        )
      }
      session.mutate(revision, prev => [...prev, created])
      return created
    },
    [session],
  )

  const editProfile = useCallback(
    async (id: string, values: EditProfileInput) => {
      const revision = session.epoch()
      const updated = await patchProfile(id, values)
      session.mutate(revision, prev => prev.map(p => p.id === id ? updated : p))
      return updated
    },
    [session],
  )

  const updateProfile = useCallback(
    (id: string, patch: Partial<Omit<Profile, "id">>) => {
      session.mutate(session.epoch(), prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
    },
    [session],
  )

  const deleteProfile = useCallback(async (id: string) => {
    const revision = session.epoch()
    await deleteProfileApi(id)
    session.mutate(revision, prev => prev.filter(p => p.id !== id))
  }, [session])

  const value = useMemo<ProfileContextValue>(() => {
    const currentProfile =
      profiles.find((p) => p.id === state.selected) ?? null
    return {
      profiles,
      currentProfile,
      loading,
      error,
      sessionScope: state.owner && currentProfile ? `doran-view:${state.owner}:${currentProfile.id}` : null,
      selectProfile: session.select,
      clearCurrentProfile: session.clear,
      refreshProfiles,
      addProfile,
      editProfile,
      updateProfile,
      deleteProfile,
    }
  }, [
    profiles,
    state.selected,
    state.owner,
    session,
    error,
    loading,
    refreshProfiles,
    addProfile,
    editProfile,
    updateProfile,
    deleteProfile,
  ])

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) {
    throw new Error("useProfile must be used within a ProfileProvider")
  }
  return ctx
}
