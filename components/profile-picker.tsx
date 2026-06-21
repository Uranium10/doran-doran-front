"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProfile, type Profile } from "@/lib/profile-context"
import { ageLabel, getStageInfo } from "@/lib/levels"
import { ProfileFormModal, type ProfileFormValues } from "@/components/profile-form-modal"
import { ConfirmModal } from "@/components/confirm-modal"
import { AuthButton } from "@/components/auth-button"

export function ProfilePicker() {
  const router = useRouter()
  const { profiles, selectProfile, addProfile, deleteProfile } = useProfile()
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Profile | null>(null)
  // 방금 만든 프로필 — 문해력 측정 여부를 묻는 모달 대상
  const [pendingMeasure, setPendingMeasure] = useState<Profile | null>(null)

  const handleSelect = (id: string) => {
    selectProfile(id)
    router.push("/dashboard")
  }

  const handleCreate = (values: ProfileFormValues) => {
    const created = addProfile(values)
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
                onClick={() => handleSelect(p.id)}
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
        onClose={() => setPendingMeasure(null)}
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
        onConfirm={() => {
          if (pendingDelete) deleteProfile(pendingDelete.id)
          setPendingDelete(null)
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
