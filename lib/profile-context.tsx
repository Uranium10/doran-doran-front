"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type Profile = {
  id: string
  name: string
  birth_date: string // YYYY-MM-DD
  avatar_url: string
  level: number | null
}

// 더미 시드 프로필 (백엔드 없이 메모리에서만 유지)
const SEED_PROFILES: Profile[] = [
  {
    id: "p-doran",
    name: "도란이",
    birth_date: "2019-04-12", // 만 6세 이상 -> 아동 모드
    avatar_url: "/avatars/child-1.png",
    level: 5,
  },
  {
    id: "p-bom",
    name: "봄이",
    birth_date: "2021-09-03", // 만 4세 -> 영유아 모드
    avatar_url: "/avatars/child-2.png",
    level: null,
  },
  {
    id: "p-aram",
    name: "아람이",
    birth_date: "2022-11-20", // 만 3세 -> 영유아 모드
    avatar_url: "/avatars/child-3.png",
    level: null,
  },
]

export type NewProfileInput = {
  name: string
  birth_date: string
  avatar_url?: string
}

type ProfileContextValue = {
  profiles: Profile[]
  currentProfile: Profile | null
  selectProfile: (id: string) => void
  clearCurrentProfile: () => void
  addProfile: (input: NewProfileInput) => Profile
  updateProfile: (id: string, patch: Partial<Omit<Profile, "id">>) => void
  deleteProfile: (id: string) => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

const FALLBACK_AVATARS = [
  "/avatars/child-1.png",
  "/avatars/child-2.png",
  "/avatars/child-3.png",
]

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>(SEED_PROFILES)
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)

  const value = useMemo<ProfileContextValue>(() => {
    const currentProfile =
      profiles.find((p) => p.id === currentProfileId) ?? null

    return {
      profiles,
      currentProfile,
      selectProfile: (id) => setCurrentProfileId(id),
      clearCurrentProfile: () => setCurrentProfileId(null),
      addProfile: (input) => {
        const created: Profile = {
          id: `p-${Date.now()}`,
          name: input.name.trim() || "새 친구",
          birth_date: input.birth_date,
          avatar_url:
            input.avatar_url?.trim() ||
            FALLBACK_AVATARS[profiles.length % FALLBACK_AVATARS.length],
          level: null,
        }
        setProfiles((prev) => [...prev, created])
        return created
      },
      updateProfile: (id, patch) => {
        setProfiles((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        )
      },
      deleteProfile: (id) => {
        setProfiles((prev) => prev.filter((p) => p.id !== id))
        setCurrentProfileId((cur) => (cur === id ? null : cur))
      },
    }
  }, [profiles, currentProfileId])

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
