const { test } = require("node:test"),
  assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");
function load(name) {
  const scope = { exports: {}, require: (p) => load(p.replace("./", "")) };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(path.join(__dirname, "../lib", name + ".ts"), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    scope,
  );
  return scope.exports;
}
const { growthScale, practiceAreas, answerRate, levelLabel, weeklyNote } =
  load("parent-report");
const point = (level, date) => ({
  id: date,
  level,
  created_at: date,
  kind: "post-story",
  baseline: false,
});
const report = {
  since: "2026-09-01T00:00:00Z",
  as_of: "2026-09-11T00:00:00Z",
  growth: [
    point(12.2, "2026-09-11T00:00:00Z"),
    point(12.1, "2026-09-02T00:00:00Z"),
    point(12, "2026-09-01T00:00:00Z"),
  ],
};
test("small fractional changes visible, dates keep real spacing", () => {
  const s = growthScale(report);
  assert.ok(s.high - s.low < 1);
  assert.equal(s.points[0].level, 12);
  assert.equal(s.x("2026-09-02T00:00:00Z"), 0.1);
  assert.ok(s.y(12.2) < s.y(12.1));
  assert.match(levelLabel(12.2), /나무 1 · 20%/);
});
test("wide scale and boundaries do not clip steps 1 and 20", () => {
  for (const growth of [
    [point(1, report.since)],
    [point(20, report.since)],
    [point(1, report.since), point(20, report.as_of)],
  ]) {
    const s = growthScale({ ...report, growth });
    assert.ok(s.low >= 1 && s.high <= 20 && s.low < s.high);
    for (const p of growth) assert.ok(s.y(p.level) >= 0 && s.y(p.level) <= 1);
  }
});
test("empty and malformed points do not invent progress", () => {
  const s = growthScale({
    ...report,
    growth: [
      point(NaN, report.since),
      point(0, report.since),
      point(21, report.since),
      point(5, "bad"),
    ],
  });
  assert.equal(s.points.length, 0);
  assert.ok(Number.isFinite(s.y(1)));
});
test("not enough answers is unknown, not a zero score or diagnosis", () => {
  assert.equal(answerRate(0, 0), null);
  assert.equal(answerRate(2, 3), 67);
  assert.equal(
    practiceAreas([{ name: "추론", total: 4, correct: 0 }]).length,
    0,
  );
  assert.equal(
    practiceAreas([{ name: "추론", total: 8, correct: 6 }]).length,
    0,
  );
});
test("practice hints are limited to two sufficiently sampled areas", () => {
  const a = practiceAreas([
    { name: "A", total: 10, correct: 5 },
    { name: "B", total: 10, correct: 1 },
    { name: "C", total: 10, correct: 4 },
  ]);
  assert.equal(a.map((x) => x.name).join(","), "B,C");
});
test("weekly summary uses recorded facts only", () => {
  assert.match(
    weeklyNote("아이", { week: { assessments: 0, books_read: 0 } }),
    /아직 없어요/,
  );
  assert.match(
    weeklyNote("아이", { week: { assessments: 2, books_read: 1 } }),
    /1권.*2번/,
  );
});
