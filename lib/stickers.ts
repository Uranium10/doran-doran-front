import { request } from "./api";
import { STICKERS_PER_PAGE } from "./sticker-pagination";
export type Sticker = {
  subject_kind?: "character" | "memory";
  id: string;
  story_id: string;
  title: string;
  reward_kind: "friend" | "mastery";
  earned_at: string;
  trashed_at?: string | null;
  asset_status: "queued" | "running" | "ready" | "failed";
  image_url: string | null;
  speaker: string;
  message: string;
  story_available: boolean;
};
export type StickerBook = {
  stickers: Sticker[];
  total: number;
  active_total: number;
  trash_total: number;
  next_offset: number | null;
};
export type StickerAction = "trash" | "restore" | "delete";
export const fetchStickers = (
  profileId: string,
  offset = 0,
  storyId?: string,
  signal?: AbortSignal,
  trashed = false,
) =>
  request<StickerBook>(
    `/stickers?profile_id=${encodeURIComponent(profileId)}&offset=${offset}&limit=${STICKERS_PER_PAGE}&trashed=${trashed}${storyId ? `&story_id=${encodeURIComponent(storyId)}` : ""}`,
    { signal },
  );
export const manageStickers = (
  profileId: string,
  ids: string[],
  action: StickerAction,
) =>
  request<{ affected: number; action: StickerAction }>("/stickers/manage", {
    method: "POST",
    body: JSON.stringify({ profile_id: profileId, ids, action }),
  });
