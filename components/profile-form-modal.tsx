"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X, ImagePlus, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Profile } from "@/lib/profile-context"

const AVATAR_CHOICES = [
  "/avatars/child-1.png",
  "/avatars/child-2.png",
  "/avatars/child-3.png",
]

export type ProfileFormValues = {
  name: string
  birth_date: string
  avatar_url: string
}

export function ProfileFormModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean
  mode: "create" | "edit"
  initial?: Pick<Profile, "name" | "birth_date" | "avatar_url">
  onClose: () => void
  onSubmit: (values: ProfileFormValues) => void | Promise<void>
}) {
  const [name, setName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[0])
  // 사용자가 업로드한 커스텀 썸네일 (data URL). 프리셋과 별개로 보관한다.
  const [customAvatar, setCustomAvatar] = useState<string | null>(null)
  // API 호출 중 중복 제출/닫기를 막기 위한 로딩 상태
  const [submitting, setSubmitting] = useState(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 포털은 클라이언트에서만 렌더 (SSR 안전장치)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // 모달이 열릴 때 초기값을 채운다.
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "")
      setBirthDate(initial?.birth_date ?? "")
      const initialAvatar = initial?.avatar_url ?? AVATAR_CHOICES[0]
      setAvatar(initialAvatar)
      // 초기 아바타가 프리셋에 없으면 업로드한 커스텀 이미지로 간주한다.
      setCustomAvatar(
        initialAvatar && !AVATAR_CHOICES.includes(initialAvatar)
          ? initialAvatar
          : null,
      )
    }
  }, [open, initial])

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setCustomAvatar(dataUrl)
      setAvatar(dataUrl)
    }
    reader.readAsDataURL(file)
    // 같은 파일 재선택도 동작하도록 값 초기화
    e.target.value = ""
  }

  // Escape 로 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open || !mounted) return null

  const canSubmit = name.trim().length > 0 && birthDate.length > 0

  const submit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        birth_date: birthDate,
        avatar_url: avatar,
      })
    } catch (e) {
      console.error("[v0] 프로필 저장 실패:", e)
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-form-title"
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-in fade-in-0"
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2
            id="profile-form-title"
            className="font-heading text-xl text-foreground"
          >
            {mode === "create" ? "새 프로필 만들기" : "프로필 수정"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          {/* 썸네일 선택 */}
          <div className="space-y-2">
            <Label className="text-base">썸네일</Label>
            <div className="flex items-center gap-3">
              {AVATAR_CHOICES.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setAvatar(src)}
                  className={cn(
                    "relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 transition-all",
                    avatar === src
                      ? "ring-primary ring-offset-2 ring-offset-card"
                      : "ring-border hover:ring-primary/40",
                  )}
                  aria-label="썸네일 선택"
                  aria-pressed={avatar === src}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src || "/placeholder.svg"}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {avatar === src && (
                    <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              ))}
              {/* 업로드한 커스텀 썸네일 (있을 때만 선택지로 노출) */}
              {customAvatar && (
                <button
                  type="button"
                  onClick={() => setAvatar(customAvatar)}
                  className={cn(
                    "relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 transition-all",
                    avatar === customAvatar
                      ? "ring-primary ring-offset-2 ring-offset-card"
                      : "ring-border hover:ring-primary/40",
                  )}
                  aria-label="업로드한 썸네일 선택"
                  aria-pressed={avatar === customAvatar}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={customAvatar || "/placeholder.svg"}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {avatar === customAvatar && (
                    <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              )}

              {/* 직접 업로드 버튼 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                aria-label="썸네일 직접 올리기"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFilePick}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              기본 그림을 고르거나, 사진을 직접 올릴 수 있어요.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-name" className="text-base">
              아이 이름
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 도란이"
              className="h-12 rounded-xl text-base"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-birth" className="text-base">
              생년월일
            </Label>
            <Input
              id="profile-birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="h-12 rounded-xl text-base"
            />
            <p className="text-xs text-muted-foreground">
              나이에 맞춰 문해력 측정 방식이 자동으로 달라져요.
            </p>
          </div>
        </div>

        <div className="flex gap-3 border-t border-border px-6 py-4">
          <Button
            variant="secondary"
            className="h-11 flex-1 rounded-full"
            onClick={onClose}
            disabled={submitting}
          >
            취소
          </Button>
          <Button
            className="h-11 flex-1 rounded-full"
            onClick={submit}
            disabled={!canSubmit || submitting}
          >
            {submitting
              ? "저장 중…"
              : mode === "create"
                ? "만들기"
                : "저장하기"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
