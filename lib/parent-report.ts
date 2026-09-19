import { getStageInfo } from "./levels";

export type ParentChild = {
  id: string;
  name: string;
  avatar_url: string | null;
  level: number | null;
  guidance: string;
};
export type SkillScore = { name: string; total: number; correct: number };
export type GrowthPoint = {
  id: string;
  created_at: string;
  level: number;
  kind: string;
  baseline: boolean;
};
export type ParentResult = {
  id: string;
  kind: string;
  assessment_type: string;
  created_at: string;
  correct_answers: number;
  total_questions: number;
  level_after: number;
  is_practice: boolean;
  story_title: string | null;
  cover_color: string | null;
};
export type ParentReport = {
  profile_id: string;
  level: number | null;
  days: number;
  since: string;
  as_of: string;
  tier: { name: string; min_level: number; max_level: number } | null;
  summary: {
    books_total: number;
    books_read: number;
    questions_total: number;
    questions_correct: number;
  };
  growth: GrowthPoint[];
  skills: SkillScore[];
  recent_results: ParentResult[];
  results_total: number;
  offset: number;
  week: { assessments: number; books_read: number };
};

export const answerRate = (correct: number, total: number) =>
  total > 0
    ? Math.round(Math.max(0, Math.min(1, correct / total)) * 100)
    : null;
export const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
  });
export const levelLabel = (level: number) => {
  const stage = getStageInfo(level);
  const progress = Math.round((level - Math.floor(level)) * 100);
  return `${stage?.name ?? ""} ${stage?.step ?? 1}${progress ? ` · ${progress}%` : "단계"}`;
};

/** 날짜 간격은 실제 시간을 따른다. Y축만 관찰된 범위에 맞춰 확대하며 최솟값/최댓값을 숨기지 않는다. */
export function growthScale(
  report: Pick<ParentReport, "growth" | "since" | "as_of">,
) {
  const points = report.growth
    .filter(
      (p) =>
        Number.isFinite(p.level) &&
        p.level >= 1 &&
        p.level <= 20 &&
        Number.isFinite(Date.parse(p.created_at)),
    )
    .slice()
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const values = points.map((p) => p.level);
  const min = values.length ? Math.min(...values) : 1,
    max = values.length ? Math.max(...values) : 2;
  const span = Math.max(0.4, max - min);
  const step =
    span <= 0.8 ? 0.1 : span <= 2 ? 0.5 : span <= 5 ? 1 : span <= 10 ? 2 : 4;
  let low = Math.max(1, Math.floor((min - span * 0.12) / step) * step);
  let high = Math.min(20, Math.ceil((max + span * 0.12) / step) * step);
  if (high - low < step * 2) {
    low = Math.max(1, low - step);
    high = Math.min(20, high + step);
  }
  const ticks: number[] = [];
  for (let v = low; v <= high + 0.001; v += step)
    ticks.push(Math.round(v * 100) / 100);
  const start = Date.parse(report.since),
    end = Math.max(start + 1, Date.parse(report.as_of));
  return {
    points,
    ticks,
    low,
    high,
    x: (date: string) =>
      Math.max(0, Math.min(1, (Date.parse(date) - start) / (end - start))),
    y: (level: number) => (high - level) / (high - low),
  };
}

/** 정답률이 낮더라도 소수 문항으로 아이의 능력을 단정하지 않는다. 실제 문항 유형을 그대로 사용한다. */
export const practiceAreas = (skills: SkillScore[]) =>
  skills
    .filter((s) => s.total >= 5 && (answerRate(s.correct, s.total) ?? 100) < 75)
    .slice()
    .sort(
      (a, b) => a.correct / a.total - b.correct / b.total || b.total - a.total,
    )
    .slice(0, 2);
export function weeklyNote(name: string, report: ParentReport) {
  if (!report.week.assessments && !report.week.books_read)
    return "최근 7일의 새 기록이 아직 없어요. 함께 읽고 싶은 책 한 권을 골라 보세요.";
  return `${name}님은 최근 7일 동안 동화 ${report.week.books_read}권을 끝까지 읽고, ${report.week.assessments}번의 풀이·측정을 남겼어요.`;
}
