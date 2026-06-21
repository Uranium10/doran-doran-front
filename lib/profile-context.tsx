"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
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
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // 최신 profiles 길이를 콜백에서 참조하기 위한 ref (fallback 아바타 선택용)
  const profilesRef = useRef<Profile[]>(profiles)
  profilesRef.current = profiles

  // Supabase 세션의 user.id 를 추적한다. (프로필 조회/생성 시 사용)
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) setUserId(data.session?.user?.id ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const refreshProfiles = useCallback(async () => {
    if (!userId) {
      setProfiles([])
      return
    }
    setLoading(true)
    try {
      const list = await fetchProfiles(userId)
      setProfiles(list)
    } catch (e) {
      console.error("[v0] 프로필 목록 조회 실패:", e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // userId 가 확정되면(로그인 완료) 프로필 목록을 불러온다.
  useEffect(() => {
    void refreshProfiles()
  }, [refreshProfiles])

  const addProfile = useCallback(
    async (input: NewProfileInput) => {
      if (!userId) throw new Error("로그인이 필요합니다.")
      const created = await createProfile({
        user_id: userId,
        name: input.name.trim() || "새 친구",
        birth_date: input.birth_date,
        avatar_url:
          input.avatar_url?.trim() ||
          FALLBACK_AVATARS[
            profilesRef.current.length % FALLBACK_AVATARS.length
          ],
      })
      // 서버가 생성된 프로필 객체를 정상 반환했는지 검증한다.
      // (null/빈 응답을 그대로 목록에 넣으면 렌더링이 깨지므로 방어)
      if (!created || !created.id) {
        throw new Error(
          "프로필 생성 응답이 올바르지 않습니다(생성된 객체를 반환하지 않음).",
        )
      }
      setProfiles((prev) => [...prev, created])
      return created
    },
    [userId],
  )

  const editProfile = useCallback(
    async (id: string, values: EditProfileInput) => {
      const updated = await patchProfile(id, values)
      setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)))
      return updated
    },
    [],
  )

  const updateProfile = useCallback(
    (id: string, patch: Partial<Omit<Profile, "id">>) => {
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      )
    },
    [],
  )

  const deleteProfile = useCallback(async (id: string) => {
    await deleteProfileApi(id)
    setProfiles((prev) => prev.filter((p) => p.id !== id))
    setCurrentProfileId((cur) => (cur === id ? null : cur))
  }, [])

  const value = useMemo<ProfileContextValue>(() => {
    const currentProfile =
      profiles.find((p) => p.id === currentProfileId) ?? null
    return {
      profiles,
      currentProfile,
      loading,
      selectProfile: (id) => setCurrentProfileId(id),
      clearCurrentProfile: () => setCurrentProfileId(null),
      refreshProfiles,
      addProfile,
      editProfile,
      updateProfile,
      deleteProfile,
    }
  }, [
    profiles,
    currentProfileId,
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
