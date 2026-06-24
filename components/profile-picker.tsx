"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProfile, type Profile } from "@/lib/profile-context"
import { ageLabel, getStageInfo, needsMeasurement } from "@/lib/levels"
import { ProfileFormModal, type ProfileFormValues } from "@/components/profile-form-modal"
import { ConfirmModal } from "@/components/confirm-modal"
import { AuthButton } from "@/components/auth-button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export function ProfilePicker() {
  const router = useRouter()
  const {
    profiles,
    loading,
    selectProfile,
    addProfile,
    deleteProfile,
    refreshProfiles,
  } = useProfile()
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Profile | null>(null)
  // 방금 만든 프로필 — 문해력 측정 여부를 묻는 모달 대상
  const [pendingMeasure, setPendingMeasure] = useState<Profile | null>(null)

  // 프로필 선택 화면 진입 시 서버에서 최신 목록을 불러온다.
  useEffect(() => {
    void refreshProfiles()
  }, [refreshProfiles])
  // 로그인 정보가 없으면 홈화면으로 사출
  useEffect(() => {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
          router.replace("/")
        }
      })
    }, [router])



  const handleSelect = (profile: Profile) => {
    selectProfile(profile.id)
    // 출발 화면(from)에 따라 복귀 지점을 결정한다.
    // - 랜딩(from=landing)에서 이미 측정이 끝난 프로필로 바꾼 경우에만 랜딩(/)으로 복귀
    // - 그 외(대시보드 등에서 변경, 또는 측정 전 프로필)는 항상 대시보드로 이동
    const from = new URLSearchParams(window.location.search).get("from")
    const goLanding = from === "landing" && !needsMeasurement(profile.level)
    router.push(goLanding ? "/" : "/dashboard")
  }

  const handleCreate = async (values: ProfileFormValues) => {
    // 실패 시 에러를 throw 하여 모달이 로딩을 해제하고 열린 상태를 유지하게 한다.
    const created = await addProfile(values)
    setCreateOpen(false)
    // 생성 직후, 측정 데이터가 없으니 측정 여부를 물어본다.
    setPendingMeasure(created)
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
      {/* 구글 계정 로그인 상태 (우상단) — 로그아웃 시 사이트 기본 화면으로 이동 */}
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <AuthButton onSignedOut={() => router.push("/")} />
      </div>

      <div className="mb-12 text-center">
        <p className="font-mono text-xs tracking-widest text-primary">
          도란도란
        </p>
        <h1 className="mt-2 text-balance font-heading text-4xl text-foreground sm:text-5xl">
          누가 이야기를 들을까요?
        </h1>
        <p className="mt-3 text-pretty text-muted-foreground">
          프로필을 선택하면 아이에게 꼭 맞는 동화 여정이 시작돼요.
        </p>
        {loading && profiles.length === 0 && (
          <p
            className="mt-4 text-sm text-muted-foreground"
            aria-live="polite"
          >
            프로필을 불러오는 중이에요…
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-start justify-center gap-6 sm:gap-8">
        {profiles.map((p) => {
          const stage = getStageInfo(p.level)
          return (
            <div key={p.id} className="group/profile relative">
              {/* 삭제 버튼: hover 시 우상단에 나타남 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setPendingDelete(p)
                }}
                aria-label={`${p.name} 프로필 삭제`}
                className="absolute -right-1 -top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 shadow-sm transition-all hover:border-destructive hover:text-destructive group-hover/profile:opacity-100"
              >
                <Minus className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => handleSelect(p)}
                className="flex w-28 flex-col items-center gap-3 outline-none sm:w-32"
              >
                <span className="relative block h-28 w-28 overflow-hidden rounded-full ring-4 ring-transparent transition-all duration-200 group-hover/profile:ring-primary group-hover/profile:ring-offset-4 group-hover/profile:ring-offset-background sm:h-32 sm:w-32">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.avatar_url || "/placeholder.svg"}
                    alt={`${p.name} 프로필 사진`}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover/profile:scale-105"
                  />
                </span>
                <span className="flex flex-col items-center">
                  <span className="font-heading text-lg text-foreground">
                    {p.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ageLabel(p.birth_date)} ·{" "}
                    <span className="text-primary">
                      {stage ? stage.label : "측정 전"}
                    </span>
                  </span>
                </span>
              </button>
            </div>
          )
        })}

        {/* 새 프로필 추가 */}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex w-28 flex-col items-center gap-3 outline-none sm:w-32"
        >
          <span
            className={cn(
              "flex h-28 w-28 items-center justify-center rounded-full border-4 border-dashed border-border text-muted-foreground transition-all duration-200 hover:border-primary hover:text-primary sm:h-32 sm:w-32",
            )}
          >
            <Plus className="h-10 w-10" />
          </span>
          <span className="font-heading text-lg text-muted-foreground">
            프로필 추가
          </span>
        </button>
      </div>

      <ProfileFormModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      {/* 프로필 생성 직후: 문해력 측정 안내 (대시보드와 동일한 모달) */}
      <ConfirmModal
        open={pendingMeasure !== null}
        title="문해력 측정이 필요해요"
        description="동화 제공을 위해 문해력 측정이 필요해요. 지금 하러 갈까요?"
        confirmLabel="지금 할게요"
        cancelLabel="나중에 할게요"
        onConfirm={() => {
          if (pendingMeasure) {
            selectProfile(pendingMeasure.id)
            setPendingMeasure(null)
            router.push("/literacy")
          }
        }}
        onClose={() => {
          // "나중에 할게요" — 측정은 건너뛰되 새 프로필로 대시보드까지는 이동한다.
          if (pendingMeasure) {
            selectProfile(pendingMeasure.id)
            setPendingMeasure(null)
            router.push("/dashboard")
          }
        }}
      />

      <ConfirmModal
        open={pendingDelete !== null}
        title="정말 삭제할까요?"
        description={
          pendingDelete
            ? `${pendingDelete.name} 프로필과 기록이 모두 사라져요. 이 동작은 되돌릴 수 없어요.`
            : undefined
        }
        confirmLabel="삭제하기"
        cancelLabel="그냥 둘게요"
        destructive
        onConfirm={async () => {
          if (pendingDelete) await deleteProfile(pendingDelete.id)
          setPendingDelete(null)
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
