"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Nanum_Pen_Script } from "next/font/google";
import {
  Sparkles,
  Star,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Undo2,
  X,
  Check,
} from "lucide-react";
import {
  fetchStickers,
  manageStickers,
  type Sticker,
  type StickerBook,
  type StickerAction,
} from "@/lib/stickers";
import {
  stickerPages,
  stickerLastPage,
  STICKERS_PER_PAGE,
} from "@/lib/sticker-pagination";
import {
  bookPath,
  isParentOrigin,
  type BookOrigin,
} from "@/lib/book-navigation";
import styles from "./sticker-book.module.css";

const handwriting = Nanum_Pen_Script({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sticker-hand",
});
type Pending = { ids: string[]; action: "trash" | "delete"; title?: string };

function StickerCard({
  sticker,
  from,
  trash,
  selected,
  busy,
  onSelect,
  onRemove,
  onRestore,
  editable,
}: {
  sticker: Sticker;
  from: BookOrigin;
  trash: boolean;
  selected: boolean;
  busy: boolean;
  editable: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onRestore: () => void;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const visible = sticker.image_url && sticker.image_url !== failedUrl;
  return (
    <article
      className={`${styles.sticker} ${styles.mastery} ${sticker.subject_kind === "memory" ? styles.memorySticker : ""} ${selected ? styles.selectedSticker : ""}`}
    >
      <div className={styles.cardTop}>
        <p className={styles.kind}>
          <Star size={14} />
          {sticker.subject_kind === "memory"
            ? "이야기 한 조각"
            : "완벽한 한 권"}
        </p>
        {trash && (
          <label className={styles.pick}>
            <input
              type="checkbox"
              checked={selected}
              disabled={busy}
              onChange={onSelect}
              aria-label={`${sticker.title} 스티커 선택`}
            />
            <span aria-hidden="true">{selected && <Check size={15} />}</span>
          </label>
        )}
      </div>
      <div className={styles.art}>
        {visible ? (
          <img
            src={sticker.image_url!}
            alt={`${sticker.speaker} ${sticker.subject_kind === "memory" ? "추억 " : ""}스티커`}
            loading="lazy"
            onError={() => setFailedUrl(sticker.image_url)}
          />
        ) : (
          <div className={styles.placeholder}>
            <Sparkles size={46} strokeWidth={1} />
            <span>
              {sticker.asset_status === "failed"
                ? "그림 준비가 늦어지고 있어요"
                : sticker.asset_status === "ready"
                  ? "그림을 다시 불러와 주세요"
                  : "스티커를 만들고 있어요"}
            </span>
            <small>획득 기록은 소중히 보관했어요</small>
          </div>
        )}
      </div>
      <blockquote className={styles.bubble}>
        {sticker.message}
        <cite>
          {sticker.subject_kind === "memory"
            ? `간직할 추억 · ${sticker.speaker}`
            : `— ${sticker.speaker}`}
        </cite>
      </blockquote>
      <div className={styles.caption}>
        <time dateTime={sticker.earned_at}>
          {new Date(sticker.earned_at).toLocaleDateString("ko-KR")} 획득
        </time>
        {sticker.story_available ? (
          <Link href={bookPath(sticker.story_id, from)}>{sticker.title}</Link>
        ) : (
          <span>{sticker.title}</span>
        )}
      </div>
      {editable && (
        <div className={styles.cardActions}>
          {trash && (
            <button
              type="button"
              disabled={busy}
              onClick={onRestore}
              aria-label={`${sticker.title} 스티커 복원`}
            >
              <Undo2 size={16} />
              다시 붙이기
            </button>
          )}
          <button
            type="button"
            className={styles.remove}
            disabled={busy}
            onClick={onRemove}
            aria-label={`${sticker.title} 스티커 ${trash ? "영구 삭제" : "삭제"}`}
            title={trash ? "영구 삭제" : "휴지통으로 옮기기"}
          >
            <Trash2 size={16} />
            <span>{trash ? "영구 삭제" : "삭제"}</span>
          </button>
        </div>
      )}
    </article>
  );
}

/** native dialog가 초점을 가두고, 닫으면 눌렀던 버튼으로 돌려준다. 처리 중에는 중복 삭제/닫기를 막는다. */
function DeleteDialog({
  pending,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  pending: Pending | null;
  busy: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useId();
  const open = pending !== null;
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className={styles.deleteDialog}
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <button
        type="button"
        className={styles.closeDialog}
        aria-label="확인창 닫기"
        disabled={busy}
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <Trash2 className={styles.dialogIcon} size={30} strokeWidth={1.5} />
      <h2 id={heading}>
        {pending?.action === "delete"
          ? "정말 영영 지울까요?"
          : "휴지통으로 옮길까요?"}
      </h2>
      <p>
        {pending?.title
          ? `‘${pending.title}’ 스티커를`
          : `선택한 스티커 ${pending?.ids.length ?? 0}장을`}{" "}
        {pending?.action === "delete"
          ? "영구 삭제해요. 다시 붙이거나 같은 동화에서 다시 받을 수 없어요."
          : "잠시 떼어 놓아요. 휴지통에서 다시 붙일 수 있어요."}
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.dialogActions}>
        <button autoFocus type="button" disabled={busy} onClick={onClose}>
          그대로 둘래요
        </button>
        <button
          type="button"
          disabled={busy}
          className={styles.confirmDelete}
          onClick={onConfirm}
        >
          {busy
            ? "정리하고 있어요…"
            : pending?.action === "delete"
              ? "영구 삭제"
              : "휴지통으로"}
        </button>
      </div>
    </dialog>
  );
}

/** 프로필/결과지가 바뀌면 선택과 비동기 요청의 생명을 함께 끝낸다. */
export function StickerCollection(props: {
  profileId: string;
  storyId?: string;
  from?: BookOrigin;
}) {
  return (
    <StickerWorkspace
      key={`${props.profileId}:${props.storyId ?? "book"}`}
      {...props}
    />
  );
}

function StickerWorkspace({
  profileId,
  storyId,
  from = "stickers",
}: {
  profileId: string;
  storyId?: string;
  from?: BookOrigin;
}) {
  const [trash, setTrash] = useState(false),
    [page, setPage] = useState(0),
    [retry, setRetry] = useState(0);
  const [state, setState] = useState<{
    key: string;
    data?: StickerBook;
    error?: string;
  }>({ key: "" });
  const [selected, setSelected] = useState<string[]>([]),
    [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(""),
    [notice, setNotice] = useState("");
  const alive = useRef(true),
    mutation = useRef(false),
    epoch = useRef(0),
    panel = useId();
  const key = `${trash}:${page}`;
  const data = state.key === key ? state.data : undefined;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true,
      attempts = 0,
      inFlight = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const refresh = async () => {
      if (!active || inFlight || mutation.current || document.hidden) return;
      inFlight = true;
      clearTimeout(timer);
      const revision = epoch.current;
      try {
        const next = await fetchStickers(
          profileId,
          page * STICKERS_PER_PAGE,
          storyId,
          controller.signal,
          trash,
        );
        if (!active || revision !== epoch.current) return;
        // 마지막 페이지에서 마지막 한 장을 지운 경우, 존재하는 마지막 페이지로 자연스럽게 이동한다.
        if (page > stickerLastPage(next.total)) {
          setPage(stickerLastPage(next.total));
          return;
        }
        setState({ key, data: next });
        attempts++;
        if (
          attempts < 12 &&
          next.stickers.some(
            (s) =>
              s.asset_status === "queued" ||
              s.asset_status === "running" ||
              (s.asset_status === "ready" && !s.image_url),
          )
        )
          timer = setTimeout(refresh, 10000);
      } catch {
        if (active && revision === epoch.current)
          setState((old) => ({
            ...(old.key === key ? old : {}),
            key,
            error: "스티커를 불러오지 못했어요. 다시 펼쳐 주세요.",
          }));
      } finally {
        inFlight = false;
      }
    };
    const visible = () => {
      if (!document.hidden) void refresh();
      else clearTimeout(timer);
    };
    void refresh();
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", visible);
    };
  }, [profileId, storyId, trash, page, retry, key]);
  const changeTab = (next: boolean) => {
    if (busy) return;
    setTrash(next);
    setPage(0);
    setSelected([]);
    setActionError("");
    setNotice("");
  };
  const perform = async (ids: string[], action: StickerAction) => {
    if (mutation.current || !ids.length) return;
    mutation.current = true;
    epoch.current++;
    setBusy(true);
    setActionError("");
    try {
      await manageStickers(profileId, ids, action);
      if (!alive.current) return;
      setPending(null);
      setSelected([]);
      setState({ key });
      setNotice(
        action === "restore"
          ? "스티커북에 다시 붙였어요."
          : action === "delete"
            ? "선택한 스티커를 영구 삭제했어요."
            : "휴지통으로 옮겼어요. 언제든 다시 붙일 수 있어요.",
      );
    } catch {
      if (alive.current)
        setActionError(
          "정리하지 못했어요. 목록을 확인한 뒤 다시 시도해 주세요.",
        );
    } finally {
      mutation.current = false;
      if (alive.current) {
        setBusy(false);
        setRetry((n) => n + 1);
      }
    }
  };
  const toggle = (id: string) =>
    setSelected((old) =>
      old.includes(id)
        ? old.filter((x) => x !== id)
        : old.length < 100
          ? [...old, id]
          : old,
    );
  const ask = (value: Pending) => {
    setActionError("");
    setPending(value);
  };
  const allPicked =
    !!data?.stickers.length &&
    data.stickers.every((s) => selected.includes(s.id));
  const tabs = (
    <div className={styles.tabs} role="tablist" aria-label="스티커 보관함">
      {[false, true].map((value) => (
        <button
          key={String(value)}
          type="button"
          role="tab"
          id={`${panel}-${value}`}
          aria-selected={trash === value}
          aria-controls={panel}
          tabIndex={trash === value ? 0 : -1}
          disabled={busy}
          onClick={() => changeTab(value)}
          onKeyDown={(e) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              const next =
                e.key === "Home" ? false : e.key === "End" ? true : !value;
              changeTab(next);
              (
                document.getElementById(
                  `${panel}-${next}`,
                ) as HTMLButtonElement | null
              )?.focus();
            }
          }}
        >
          {value ? "휴지통" : "나의 스티커"}
          <span>
            {state.data
              ? value
                ? state.data.trash_total
                : state.data.active_total
              : ""}
          </span>
        </button>
      ))}
    </div>
  );
  return (
    <section
      className={`${handwriting.variable} ${storyId ? styles.rewards : styles.collection}`}
      aria-label="획득한 스티커"
    >
      {storyId ? (
        <div className={styles.rewardHeading}>
          <h2>이야기 속 친구의 선물</h2>
          <Link
            href={isParentOrigin(from) ? "/stickers?from=parent" : "/stickers"}
          >
            스티커북 보기 →
          </Link>
        </div>
      ) : (
        tabs
      )}
      <div
        id={panel}
        role={storyId ? undefined : "tabpanel"}
        aria-labelledby={storyId ? undefined : `${panel}-${trash}`}
        aria-busy={busy || (!data && !state.error)}
      >
        <div className={styles.collectionMeta}>
          <p>
            {trash
              ? "떼어 놓은 스티커도 소중히 보관해요."
              : "한 장 한 장, 우리의 모험을 붙여요."}
          </p>
          <span>{data ? `${data.total}장` : ""}</span>
        </div>
        <p role="status" className={styles.notice}>
          {notice}
        </p>
        {actionError && !pending && (
          <p role="alert" className={styles.error}>
            {actionError}
          </p>
        )}
        {state.key === key && state.error && (
          <p role="alert" className={styles.error}>
            {state.error}{" "}
            <button type="button" onClick={() => setRetry((v) => v + 1)}>
              다시 펼치기
            </button>
          </p>
        )}
        {trash && (
          <div className={styles.selectionBar}>
            <label>
              <input
                type="checkbox"
                disabled={busy || !data?.stickers.length}
                checked={allPicked}
                aria-label="이 페이지의 스티커 모두 선택"
                onChange={() => {
                  if (data)
                    setSelected((old) =>
                      allPicked
                        ? old.filter(
                            (id) => !data.stickers.some((s) => s.id === id),
                          )
                        : [
                            ...new Set([
                              ...old,
                              ...data.stickers.map((s) => s.id),
                            ]),
                          ].slice(0, 100),
                    );
                }}
              />
              모두 선택
            </label>
            {/* 선택 전에도 행 높이를 유지해 아이콘이 나타날 때 책장이 밀리지 않게 한다. */}
            {selected.length > 0 && (
              <>
                <span aria-live="polite">{selected.length}장 선택</span>
                <div>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label="선택한 스티커 다시 붙이기"
                    title="다시 붙이기"
                    onClick={() => void perform(selected, "restore")}
                  >
                    <Undo2 size={19} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.remove}
                    disabled={busy}
                    aria-label="선택한 스티커 영구 삭제"
                    title="영구 삭제"
                    onClick={() => ask({ ids: [...selected], action: "delete" })}
                  >
                    <Trash2 size={19} aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {!data && !(state.key === key && state.error) && (
          <div role="status" className={styles.loading}>
            스티커를 펼치고 있어요…
          </div>
        )}
        {data?.total === 0 && (
          <div className={styles.empty}>
            {trash ? (
              <>
                <Trash2 size={44} strokeWidth={1} />
                <h3>휴지통이 비어 있어요</h3>
                <p>
                  떼어 놓은 스티커는 여기서
                  <br />
                  다시 붙이거나 영구 삭제할 수 있어요.
                </p>
              </>
            ) : (
              <>
                <img
                  className={styles.emptyPicture}
                  src="/images/stickers/reading-friends.webp"
                  alt="책을 읽는 호랑이, 토끼, 도깨비"
                  width="190"
                  height="190"
                />
                <h3>
                  {data.trash_total
                    ? "스티커가 휴지통에 있어요"
                    : "다음 이야기 친구를 기다려요"}
                </h3>
                <p>
                  동화 문제를 전부 맞히면
                  <br />
                  동화마다 스티커 한 장을 받아요.
                </p>
                <Link
                  className={styles.emptyLink}
                  href={
                    isParentOrigin(from) ? "/library?from=parent" : "/library"
                  }
                >
                  이야기 만나러 가기 <ArrowRight size={17} />
                </Link>
              </>
            )}
          </div>
        )}
        {!!data?.total && (
          <>
            <div className={styles.grid}>
              {data.stickers.map((sticker) => (
                <StickerCard
                  key={sticker.id}
                  sticker={sticker}
                  from={from}
                  trash={trash}
                  selected={selected.includes(sticker.id)}
                  busy={busy}
                  editable={!storyId}
                  onSelect={() => toggle(sticker.id)}
                  onRemove={() =>
                    ask({
                      ids: [sticker.id],
                      action: trash ? "delete" : "trash",
                      title: sticker.title,
                    })
                  }
                  onRestore={() => void perform([sticker.id], "restore")}
                />
              ))}
            </div>
            <nav className={styles.pagination} aria-label="스티커 페이지">
              <button
                type="button"
                aria-label="이전 스티커 페이지"
                disabled={busy || page === 0}
                onClick={() => {
                  setPage((p) => p - 1);
                  setNotice("");
                }}
              >
                <ChevronLeft size={20} />
              </button>
              {stickerPages(page, data.total).map((number, index) =>
                number === null ? (
                  <span key={`gap-${index}`} className={styles.pageGap}>
                    …
                  </span>
                ) : (
                  <button
                    key={number}
                    type="button"
                    aria-label={`${number + 1}페이지`}
                    aria-current={page === number ? "page" : undefined}
                    disabled={busy}
                    onClick={() => {
                      setPage(number);
                      setNotice("");
                    }}
                  >
                    {number + 1}
                    <svg viewBox="0 0 54 48" fill="none" aria-hidden="true">
                      <path d="M43 8C27 0 5 6 4 24c-2 16 21 22 36 13C57 27 47 5 29 6" />
                      <path d="M41 6C24 3 7 8 6 24c-1 14 23 19 36 9" />
                    </svg>
                  </button>
                ),
              )}
              <button
                type="button"
                aria-label="다음 스티커 페이지"
                disabled={busy || page >= stickerLastPage(data.total)}
                onClick={() => {
                  setPage((p) => p + 1);
                  setNotice("");
                }}
              >
                <ChevronRight size={20} />
              </button>
            </nav>
            <p className={styles.pageNote}>
              {page + 1} / {stickerLastPage(data.total) + 1} 쪽 · 한 쪽에 네
              장씩
            </p>
          </>
        )}
        <button
          type="button"
          className={styles.refresh}
          disabled={busy}
          onClick={() => setRetry((v) => v + 1)}
        >
          스티커 소식 새로고침
        </button>
      </div>
      <DeleteDialog
        pending={pending}
        busy={busy}
        error={actionError}
        onClose={() => {
          if (!busy) {
            setPending(null);
            setActionError("");
          }
        }}
        onConfirm={() => {
          if (pending) void perform(pending.ids, pending.action);
        }}
      />
    </section>
  );
}
