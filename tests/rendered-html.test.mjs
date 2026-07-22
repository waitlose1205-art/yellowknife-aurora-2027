import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the general tour search and comparison shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>台灣旅行團搜尋與比較｜透明收錄範圍<\/title>/i);
  assert.match(html, /TAIWAN/);
  assert.match(html, /TOURS/);
  assert.match(html, /台灣旅行團搜尋與比較/);
  assert.match(html, /預算上限/);
  assert.match(html, /旅遊範圍/);
  assert.match(html, /搜尋旅行團/);
  assert.match(html, /部分收錄/);
  assert.match(html, /不宣稱收錄台灣所有旅行團/);
  assert.match(html, /og\.png/);
  assert.match(html, /summary_large_image/);
  assert.doesNotMatch(html, /Backlog|低資源模式|Low Resource Mode|Next Actions/);
});

test("keeps workbench presentation separate from domain logic", async () => {
  const [page, constants, logic, types, workstreams] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/tourConstants.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/tourLogic.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/tourTypes.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/optimization-workstreams.md", import.meta.url), "utf8"),
  ]);

  assert.match(page, /className="workbench"/);
  assert.match(page, /comparisonTable/);
  assert.match(page, /filterProducts/);
  assert.match(page, /selectedIds/);
  assert.doesNotMatch(page, /type Product =|function getScore|function isMissing/);

  assert.match(constants, /DEFAULT_FILTERS/);
  assert.match(constants, /ALL_SCOPES/);
  assert.match(constants, /ALL_THEMES/);
  assert.match(logic, /getScore/);
  assert.match(logic, /filterProducts/);
  assert.match(logic, /getThemeOptions/);
  assert.match(logic, /sourceVerificationStatus !== "verified"/);
  assert.match(logic, /dataStatus !== "available"/);
  assert.match(logic, /savingsRate/);
  assert.doesNotMatch(logic, /budgetUseRate/);
  assert.match(types, /export type Product/);

  assert.match(workstreams, /資料品質/);
  assert.doesNotMatch(page, /Backlog|enabledFeatures/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
