"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ChevronDown, Users, Pencil, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProfile } from "@/lib/profile-context"
import { getStageInfo, getTierProgress } from "@/lib/levels"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ProfileFormModal, type ProfileFormValues } from "@/components/profile-form-modal"

/**
 * 선택된 아이 프로필 배지 + 드롭다운 메뉴.
 * app-header(앱 내부)와 site-header(랜딩, 프로필 선택 완료 시) 양쪽에서 공유한다.
 */
export function ProfileMenu({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const { currentProfile, clearCurrentProfile, editProfile } = useProfile()
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // 프로필이 바뀌면 이미지 에러 상태 초기화
  useEffect(() => {
    setImgError(false)
  }, [currentProfile?.id])

  // 바깥 클릭 / Escape 로 팝오버 닫기
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  if (!currentProfile) return null

  const stage = getStageInfo(currentProfile.level ?? null)
  // 레벨이 있으면 현재 티어 → 다음 티어 진척도 게이지를 메뉴에 노출한다.
  const tierProgress = getTierProgress(currentProfile.level ?? null)

  const goSwitchProfile = () => {
    setMenuOpen(false)
    clearCurrentProfile()
    // 프로필 선택 후 복귀 지점을 결정하기 위해 현재 출발 화면을 전달한다.
    // 랜딩(/)에서 바꾸면 측정 완료 프로필은 랜딩으로, 그 외 화면(대시보드 등)에서는 항상 대시보드로.
    const from = pathname === "/" ? "landing" : "app"
    router.push(`/profiles?from=${from}`)
  }

  const handleSignOut = async () => {
    setMenuOpen(false)
    clearCurrentProfile()
    const supabase = getSupabaseBrowserClient()
    if (supabase) await supabase.auth.signOut()
    router.push("/")
  }

  const handleEditSubmit = async (values: ProfileFormValues) => {
    // PATCH 성공 시에만 모달을 닫는다. 실패 시 throw 되어 모달이 열린 채 로딩만 해제된다.
    await editProfile(currentProfile.id, {
      name: values.name,
      birth_date: values.birth_date,
      avatar_url: values.avatar_url,
    })
    setEditOpen(false)
  }

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-foreground shadow-sm outline-none transition-all hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-2 ring-primary/20">
          {currentProfile.avatar_url && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentProfile.avatar_url || "/placeholder.svg"}
              alt={`${currentProfile.name} 프로필 사진`}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-semibold text-foreground">
              {currentProfile.name.charAt(0)}
            </span>
          )}
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span className="font-heading text-sm tracking-tight">
            {currentProfile.name}님
          </span>
          <span className="text-[11px] text-primary">
            {stage ? stage.label : "측정 전"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "ml-0.5 h-4 w-4 shrink-0 opacity-70 transition-transform duration-200",
            menuOpen && "rotate-180",
          )}
        />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
              {currentProfile.avatar_url && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentProfile.avatar_url || "/placeholder.svg"}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold">
                  {currentProfile.name.charAt(0)}
                </span>
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading text-sm">
                {currentProfile.name}님
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {stage ? stage.label : "문해력 측정 전"}
              </p>
            </div>
          </div>

          {/* 레벨이 있으면 현재 티어 → 다음 티어 진척도 게이지 (퀴즈 결과 화면과 동일한 표현) */}
          {tierProgress && (
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-heading text-foreground">
                  {tierProgress.currentLabel}
                </span>
                {tierProgress.nextLabel && (
                  <span className="text-muted-foreground">
                    {tierProgress.nextLabel}
                  </span>
                )}
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary ring-1 ring-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${tierProgress.achievement}%` }}
                />
              </div>
              <p className="mt-1.5 text-right text-[11px] font-medium text-primary">
                {tierProgress.nextLabel
                  ? `다음 단계까지 ${100 - tierProgress.achievement}%`
                  : "최고 단계 달성!"}
              </p>
            </div>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={goSwitchProfile}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Users className="h-4 w-4" />
            다른 프로필로 이동
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false)
              setEditOpen(true)
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Pencil className="h-4 w-4" />
            프로필 수정
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      )}

      <ProfileFormModal
        open={editOpen}
        mode="edit"
        initial={{
          name: currentProfile.name,
          birth_date: currentProfile.birth_date,
          avatar_url: currentProfile.avatar_url,
        }}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSubmit}
      />
    </div>
  )
}
