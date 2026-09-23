import type { AssessmentPayload, GenerationJob, StoryInput } from "./workpad-data"

export type TrackedJob = GenerationJob & { mode: "queue" | "legacy" }
export type GenerationState = { job: TrackedJob | null; starting: boolean; connectionLost: boolean; error: string | null }
type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">
type Services = {
  current: () => Promise<{ available: boolean; job: GenerationJob | null }>
  get: (id: string) => Promise<GenerationJob>
  enqueue: (profileId: string, input: StoryInput, key: string) => Promise<GenerationJob>
  legacy: (profileId: string, input: StoryInput) => Promise<AssessmentPayload>
}
const active = (job: GenerationJob | null) => job?.status === "queued" || job?.status === "running"
const statusOf = (error: unknown) => typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0

/** 화면 수명과 분리된 계정 단위 작업 추적기. 페이지 이동은 서버 작업을 취소하지 않는다. */
export class GenerationController {
  state: GenerationState = { job: null, starting: false, connectionLost: false, error: null }
  private listeners = new Set<() => void>()
  private timer: ReturnType<typeof setTimeout> | undefined
  private stopped = false
  private polling = false
  private revision = 0
  private retrying = false
  // 입력은 현재 로그인 세션 메모리에만 보관한다. 새로고침/로그아웃 뒤에는 작성 화면을 연다.
  private lastAttempt: { id: string; profileId: string; input: StoryInput } | null = null
  private memory = new Map<string, string>()
  constructor(private userId: string, private api: Services, private storage: StoragePort,
    private onReady: (job: TrackedJob) => void, private uuid: () => string = () => crypto.randomUUID()) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  snapshot = () => this.state
  private key(name: string) { return `doran-generation:${this.userId}:${name}` }
  private read(name: string) {
    try { return this.storage.getItem(this.key(name)) ?? this.memory.get(name) ?? null } catch { return this.memory.get(name) ?? null }
  }
  private write(name: string, value: string | null) {
    if (value === null) this.memory.delete(name); else this.memory.set(name, value)
    // 브라우저 저장소가 차단돼도 현재 탭의 생성은 계속된다. 입력·본문·JWT는 저장하지 않는다.
    try { if (value === null) this.storage.removeItem(this.key(name)); else this.storage.setItem(this.key(name), value) } catch {}
  }
  private update(values: Partial<GenerationState>) {
    if (this.stopped) return
    this.state = { ...this.state, ...values }; this.listeners.forEach(listener => listener())
  }
  private schedule(ms: number) {
    clearTimeout(this.timer)
    if (!this.stopped) this.timer = setTimeout(() => { void this.refresh() }, ms)
  }
  private receive(job: GenerationJob | null) {
    // 4xx 접수 거절은 서버 작업이 없다. 자동 조회의 빈 값/예전 결과로 새 실패 안내를 지우지 않는다.
    // 다른 탭에서 실제로 새 생성을 시작했거나 같은 작업이 복구된 경우에만 새 상태를 받는다.
    if (this.state.job?.status === "failed" && (!job || (job.job_id !== this.state.job.job_id && !active(job)))) {
      this.update({ connectionLost: false }); return
    }
    if (!job) { this.write("pending", null); this.update({ job: null, connectionLost: false }); return }
    const tracked: TrackedJob = { ...job, mode: "queue" }
    this.write("pending", active(job) ? job.job_id : null)
    if (this.read("dismissed") === job.job_id && !active(job)) {
      this.update({ job: null, connectionLost: false, error: null }); return
    }
    // 안전 차단은 다시 같은 입력을 보내도록 권하지 않고, 입력 수정이 필요함을 알린다.
    const safetyBlocked = job.status === "failed" && job.error_code === "safety_blocked"
    this.update({ job: tracked, connectionLost: false, error: safetyBlocked
      ? "AI 제공자의 안전 필터가 생성을 중단했어요. 입력한 소재나 표현을 바꿔 다시 시도해 주세요." : job.status === "failed" && job.error_code === "source_topic_unmatched"
      ? "이 주제에 어울리는 옛이야기를 찾지 못했어요. 다른 주제를 골라 주세요."
      : job.status === "failed" && job.error_code === "source_check_unavailable"
      ? "옛이야기와 주제를 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요." : null })
    if (job.status === "completed" && job.result && this.read("notified") !== job.job_id) {
      this.write("notified", job.job_id)
      this.onReady(tracked)
    }
  }
  /** 최신 작업 조회로 새로고침/다른 기기에서도 복구한다. 실패 시 POST를 재전송하지 않는다. */
  refresh = async () => {
    if (this.stopped || this.polling || this.state.starting || (this.state.job?.mode === "legacy" && active(this.state.job))) return
    this.polling = true
    const version = this.revision
    try {
      const pending = active(this.state.job) ? this.state.job!.job_id : this.read("pending")
      let result: GenerationJob | null
      if (pending) {
        try { result = await this.api.get(pending) }
        catch (error) {
          if (statusOf(error) !== 404) throw error
          const latest = (await this.api.current()).job
          // 이전 완료 책을 방금 접수한 책의 성공으로 오인하지 않는다. 다른 탭의 활성 작업은 복구한다.
          result = latest && (latest.job_id === pending || active(latest)) ? latest : null
        }
      } else { result = (await this.api.current()).job }
      // 조회 중 새 요청을 시작했거나 로그아웃하면 오래된 응답으로 새 화면을 덮지 않는다.
      if (this.stopped || version !== this.revision) return
      if (this.state.job?.mode === "legacy" && this.state.job.status === "completed" && !result) return
      if (pending && !result) {
        // 접수 실패 안내를 과거 완료 기록으로 덮지 않는다. 늦은 접수 응답은 같은 ID로 계속 확인한다.
        const missing: TrackedJob = { job_id: pending, profile_id: this.state.job?.profile_id ?? null,
          story_id: null, created_at: null, finished_at: null, status: "failed", stage: "failed",
          result: null, error_code: "submission_missing", poll_after_ms: 2000, mode: "queue" }
        this.update({ job: missing, connectionLost: false,
          error: "생성 요청이 접수되지 않았어요. 잠시 후 다시 만들기를 눌러 주세요." })
      } else { this.receive(result) }
    } catch (error) {
      if (this.stopped || version !== this.revision) return
      this.update({ connectionLost: true, error: this.state.job?.status === "failed" ? this.state.error : statusOf(error) === 401 ? "다시 로그인하면 동화 소식을 확인할 수 있어요." : null })
    } finally {
      this.polling = false
      this.schedule(this.state.connectionLost ? 5000 : active(this.state.job) ? Math.max(1000, Math.min(this.state.job!.poll_after_ms, 5000)) : 15000)
    }
  }
  canRetry = () => Boolean(this.lastAttempt && this.state.job?.status === "failed"
    && this.state.job.job_id === this.lastAttempt.id && this.lastAttempt.input.useJobs
    && !["safety_blocked", "source_topic_unmatched", "profile_unavailable", "submission_invalid", "submission_unauthorized"].includes(this.state.job.error_code ?? ""))

  retry = async () => {
    if (this.stopped || this.retrying || this.state.starting || !this.canRetry()) return
    this.retrying = true
    const attempt = this.lastAttempt!
    this.revision += 1; clearTimeout(this.timer)
    this.update({ starting: true, error: "접수된 이야기가 있는지 확인하고 있어요." })
    try {
      let found: GenerationJob | null = null
      try { found = await this.api.get(attempt.id) }
      catch (error) { if (statusOf(error) !== 404) throw error }
      if (this.stopped) return
      if (found && found.status !== "failed") { this.receive(found); return }
      // 미접수/응답 유실은 같은 키를 사용해 늦은 원래 POST와 중복 생성되지 않게 한다.
      // 서버가 실패를 확정한 경우에만 새 키로 새 작업을 만든다.
      if (found && ["safety_blocked", "source_topic_unmatched", "profile_unavailable", "submission_invalid", "submission_unauthorized"].includes(found.error_code ?? "")) {
        this.receive(found); return
      }
      this.update({ starting: false, job: null })
      await this.submit(attempt.profileId, attempt.input, found ? this.uuid() : attempt.id)
    } catch (error) {
      if (!this.stopped) this.update({ connectionLost: true,
        error: statusOf(error) === 401 ? "다시 로그인한 뒤 시도해 주세요." : "책방과 연결하지 못했어요. 잠시 후 다시 시도해 주세요." })
    } finally {
      this.retrying = false
      if (!this.stopped) { this.update({ starting: false }); this.schedule(5000) }
    }
  }
  start = async (profileId: string, input: StoryInput) => {
    if (this.retrying) throw new Error("다시 시도할 준비를 하고 있어요.")
    return this.submit(profileId, input)
  }
  private submit = async (profileId: string, input: StoryInput, retryId?: string) => {
    if (this.stopped) return
    if (this.state.starting || active(this.state.job)) throw new Error("이미 만들고 있는 동화가 있어요.")
    this.revision += 1; clearTimeout(this.timer)
    const id = retryId ?? this.uuid()
    this.lastAttempt = { id, profileId, input: { ...input } }
    const initial: TrackedJob = { job_id: id, profile_id: profileId, story_id: null, created_at: null, finished_at: null,
      status: input.useJobs ? "queued" : "running", stage: input.useJobs ? "queued" : "legacy",
      result: null, error_code: null, poll_after_ms: 2000, mode: input.useJobs ? "queue" : "legacy" }
    this.update({ job: initial, starting: true, connectionLost: false, error: null })
    try {
      if (input.useJobs) {
        this.write("pending", id)
        const job = await this.api.enqueue(profileId, input, id)
        if (this.stopped) return
        this.receive(job)
      } else {
        // 큐 미설치 기간의 호환 경로. SPA 화면 이동은 가능하지만 새로고침 복구는 지원하지 않는다.
        const result = await this.api.legacy(profileId, input)
        if (this.stopped) return
        const completed: TrackedJob = { ...initial, result, story_id: result.story_id, status: "completed", stage: "completed" }
        this.update({ job: completed }); this.onReady(completed)
      }
    } catch (error) {
      if (this.stopped) return
      const status = statusOf(error)
      if (input.useJobs && (status === 0 || status >= 500 || status === 409)) {
        // 응답을 잃었어도 서버가 접수했을 수 있다. 같은 ID/최신 작업을 조회해서 확인한다.
        this.update({ connectionLost: true, error: "접수 여부를 확인하고 있어요. 잠시만 기다려 주세요." })
      } else {
        this.write("pending", null)
        this.update({ job: { ...initial, status: "failed", stage: "failed",
          error_code: status === 400 || status === 422 ? "submission_invalid" : status === 401 || status === 403 ? "submission_unauthorized" : "submission_rejected" },
          connectionLost: false, error: error instanceof Error ? error.message : "동화를 시작하지 못했어요." })
      }
    } finally {
      this.update({ starting: false }); this.schedule(0)
    }
  }
  dismiss = () => {
    if (active(this.state.job) || this.state.starting) return
    if (this.state.job) this.write("dismissed", this.state.job.job_id)
    if (this.state.job?.error_code === "submission_missing") this.write("pending", null)
    this.update({ job: null, error: null }); this.schedule(15000)
  }
  dispose = () => { this.stopped = true; this.revision += 1; this.lastAttempt = null; clearTimeout(this.timer); this.listeners.clear() }
}
