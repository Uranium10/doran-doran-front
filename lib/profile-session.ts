import type { Profile } from "./profile-context"
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">
export type ProfileSessionState = { owner: string | null | undefined; profiles: Profile[]; selected: string | null; loading: boolean; error: string | null }

/** 인증 복원과 목록 조회를 구분해, 초기 null을 로그아웃으로 오해하지 않게 한다. */
export class ProfileSession {
  private state: ProfileSessionState = { owner: undefined, profiles: [], selected: null, loading: true, error: null }
  private listeners = new Set<() => void>()
  private revision = 0
  private pending: Promise<void> | null = null
  constructor(private fetchProfiles: () => Promise<Profile[]>, private storage: Store) {}
  snapshot = () => this.state
  epoch = () => this.revision
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  private update(patch: Partial<ProfileSessionState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()) }
  private key(owner: string) { return `doran-profile:${owner}` }
  private save(id: string | null) {
    if (!this.state.owner) return
    try { if (id) this.storage.setItem(this.key(this.state.owner), id); else this.storage.removeItem(this.key(this.state.owner)) } catch {}
  }
  private clearOwner(owner: string) {
    try {
      this.storage.removeItem(this.key(owner))
      // 답안/본문은 탭 안에만 보관하며 로그아웃·계정 변경 때 함께 지운다.
      const prefix = `doran-view:${owner}:`
      for (let i = this.storage.length - 1; i >= 0; i--) {
        const key = this.storage.key(i)
        if (key?.startsWith(prefix)) this.storage.removeItem(key)
      }
    } catch {}
  }
  attach(owner: string | null): boolean {
    if (this.state.owner === owner) return false
    if (this.state.owner) this.clearOwner(this.state.owner)
    this.revision++; this.pending = null
    let selected: string | null = null
    try { if (owner) selected = this.storage.getItem(this.key(owner)) } catch {}
    this.update({ owner, profiles: [], selected, loading: !!owner, error: null })
    return true
  }
  failAuth() { this.update({ loading: false, error: "로그인 상태를 확인하지 못했어요. 다시 시도해 주세요." }) }
  refresh = (): Promise<void> => {
    if (!this.state.owner) return Promise.resolve()
    if (this.pending) return this.pending
    const revision = this.revision
    this.update({ loading: true, error: null })
    const task = this.fetchProfiles().then(profiles => {
      if (revision !== this.revision) return
      const selected = profiles.some(p => p.id === this.state.selected) ? this.state.selected : null
      this.save(selected)
      this.update({ profiles, selected, loading: false, error: null })
    }).catch(() => {
      if (revision === this.revision) this.update({ loading: false, error: "프로필을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요." })
    }).finally(() => { if (revision === this.revision) this.pending = null })
    this.pending = task
    return task
  }
  select = (id: string) => {
    if (!this.state.owner || (!this.state.loading && !this.state.profiles.some(p => p.id === id))) return
    this.save(id); this.update({ selected: id })
  }
  clear = () => { this.save(null); this.update({ selected: null }) }
  mutate(revision: number, update: (profiles: Profile[]) => Profile[]) {
    if (revision !== this.revision || !this.state.owner) return
    const profiles = update(this.state.profiles)
    const selected = profiles.some(p => p.id === this.state.selected) ? this.state.selected : null
    this.save(selected); this.update({ profiles, selected })
  }
  /** StrictMode의 효과 재설치에서도 사용 가능하게 계정/캐시는 유지하고 늦은 요청만 무효화한다. */
  invalidate() { this.revision++; this.pending = null }
}
