const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");
const scope = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../lib/sticker-pagination.ts"),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText,
  scope,
);
const { stickerLastPage, stickerPages, STICKERS_PER_PAGE } = scope.exports;
test("4 stickers per page and clamp after last item deletion", () => {
  assert.equal(STICKERS_PER_PAGE, 4);
  for (const [total, last] of [
    [0, 0],
    [1, 0],
    [4, 0],
    [5, 1],
    [8, 1],
    [9, 2],
  ])
    assert.equal(stickerLastPage(total), last);
  assert.equal(Math.min(2, stickerLastPage(8)), 1);
});
test("compact page window always includes current and bounds without overflow", () => {
  for (let total = 1; total <= 1200; total++)
    for (const current of [
      0,
      1,
      Math.floor(stickerLastPage(total) / 2),
      stickerLastPage(total),
    ]) {
      const list = Array.from(stickerPages(current, total)),
        numbers = list.filter((x) => x !== null),
        last = stickerLastPage(total);
      assert(list.length <= 7);
      assert(numbers.includes(0));
      assert(numbers.includes(last));
      assert(numbers.includes(Math.min(current, last)));
      assert.equal(new Set(numbers).size, numbers.length);
      assert(numbers.every((n) => n >= 0 && n <= last));
    }
});
