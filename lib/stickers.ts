import { request } from "./api"
export type Sticker = { id: string; story_id: string; title: string; reward_kind: "friend" | "mastery"; earned_at: string;
  asset_status: "queued" | "running" | "ready" | "failed"; image_url: string | null; speaker: string; message: string; story_available: boolean }
export type StickerBook = { stickers: Sticker[]; total: number; next_offset: number | null }
export const fetchStickers = (profileId: string, offset = 0, storyId?: string, signal?: AbortSignal) => request<StickerBook>(
  `/stickers?profile_id=${encodeURIComponent(profileId)}&offset=${offset}&limit=24${storyId ? `&story_id=${encodeURIComponent(storyId)}` : ""}`, { signal })
