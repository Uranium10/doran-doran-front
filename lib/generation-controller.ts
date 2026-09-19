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
    if (!job) { this.write("pending", null); this.update({ job: null, connectionLost: false }); return }
    const tracked: TrackedJob = { ...job, mode: "queue" }
    this.write("pending", active(job) ? job.job_id : null)
    if (this.read("dismissed") === job.job_id && !active(job)) {
      this.update({ job: null, connectionLost: false, error: null }); return
    }
    // 안전 차단은 다시 같은 입력을 보내도록 권하지 않고, 입력 수정이 필요함을 알린다.
    const safetyBlocked = job.status === "failed" && job.error_code === "safety_blocked"
    this.update({ job: tracked, connectionLost: false, error: safetyBlocked
      ? "아이와 함께 읽기 어려운 내용이 감지되었어요. 이름이나 소재, 오늘의 일을 바꿔 주세요." : null })
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
        catch (error) { if (statusOf(error) !== 404) throw error; result = (await this.api.current()).job }
      } else { result = (await this.api.current()).job }
      // 조회 중 새 요청을 시작했거나 로그아웃하면 오래된 응답으로 새 화면을 덮지 않는다.
      if (this.stopped || version !== this.revision) return
      if (this.state.job?.mode === "legacy" && this.state.job.status === "completed" && !result) return
      const missingSubmission = Boolean(pending && !result)
      this.receive(result)
      if (missingSubmission) this.update({ error: "접수된 동화를 찾지 못했어요. 다시 만들기를 눌러 주세요." })
    } catch (error) {
      if (this.stopped || version !== this.revision) return
      this.update({ connectionLost: true, error: statusOf(error) === 401 ? "다시 로그인하면 동화 소식을 확인할 수 있어요." : null })
    } finally {
      this.polling = false
      this.schedule(this.state.connectionLost ? 5000 : active(this.state.job) ? Math.max(1000, Math.min(this.state.job!.poll_after_ms, 5000)) : 15000)
    }
  }
  start = async (profileId: string, input: StoryInput) => {
    if (this.stopped) return
    if (this.state.starting || active(this.state.job)) throw new Error("이미 만들고 있는 동화가 있어요.")
    this.revision += 1; clearTimeout(this.timer)
    const id = this.uuid()
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
        this.update({ job: null, error: error instanceof Error ? error.message : "동화를 시작하지 못했어요." })
      }
    } finally {
      this.update({ starting: false }); this.schedule(0)
    }
  }
  dismiss = () => {
    if (active(this.state.job) || this.state.starting) return
    if (this.state.job) this.write("dismissed", this.state.job.job_id)
    this.update({ job: null, error: null }); this.schedule(15000)
  }
  dispose = () => { this.stopped = true; this.revision += 1; clearTimeout(this.timer); this.listeners.clear() }
}
