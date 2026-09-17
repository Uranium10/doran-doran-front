import type { AssessmentPayload } from "./workpad-data"
import type { LiteracyResult } from "./levels"
import { objectValue } from "./use-session-view"

export type DashboardView = { view: "home" | "form" | "book" | "post-quiz" | "result"; assessment: AssessmentPayload | null; result: LiteracyResult | null }
export const dashboardInitial: DashboardView = { view: "home", assessment: null, result: null }
export type LiteracyView = { assessment: AssessmentPayload | null; result: LiteracyResult | null; attempt: number }
export const literacyInitial: LiteracyView = { assessment: null, result: null, attempt: 0 }
export type LibraryView = { view: "grid" | "list"; readingId: string | null }
export const libraryInitial: LibraryView = { view: "grid", readingId: null }

// 브라우저 저장값은 신뢰하지 않는다. 렌더에 필요한 구조가 깨졌으면 안전하게 기본 화면으로 돌아간다.
function assessmentValue(value: unknown): value is AssessmentPayload {
  return objectValue(value) && ["posttest", "pretest", "checklist", "library", "readonly"].includes(String(value.assessment_type)) &&
    (value.story_id === null || typeof value.story_id === "string") && (value.title === null || typeof value.title === "string") &&
    Array.isArray(value.pages) && value.pages.every(p => objectValue(p) && typeof p.text === "string" && typeof p.heading === "string" && typeof p.image === "string") &&
    Array.isArray(value.quizzes) && value.quizzes.every(q => objectValue(q) && typeof q.question_id === "string" && typeof q.prompt === "string" && Array.isArray(q.options) && q.options.every(o => objectValue(o) && typeof o.value === "string" && typeof o.label === "string"))
}
function resultValue(value: unknown): value is LiteracyResult {
  return objectValue(value) && typeof value.kind === "string" && ["level","correct","total","achievement"].every(key => typeof value[key] === "number") && typeof value.lowerLabel === "string" && typeof value.upperLabel === "string"
}
export function validDashboard(value: unknown): value is DashboardView {
  if (!objectValue(value) || !["home","form","book","post-quiz","result"].includes(String(value.view))) return false
  if (value.assessment !== null && !assessmentValue(value.assessment)) return false
  if (value.result !== null && !resultValue(value.result)) return false
  if ((value.view === "book" || value.view === "post-quiz") && !assessmentValue(value.assessment)) return false
  if (value.view === "post-quiz" && !(value.assessment as AssessmentPayload).quizzes.length) return false
  return value.view !== "result" || resultValue(value.result)
}
export const validLiteracy = (value: unknown): value is LiteracyView => objectValue(value) && (value.assessment === null || assessmentValue(value.assessment)) && (value.result === null || resultValue(value.result)) && Number.isInteger(value.attempt)
export const validLibrary = (value: unknown): value is LibraryView => objectValue(value) && (value.view === "grid" || value.view === "list") && (value.readingId === null || typeof value.readingId === "string")
