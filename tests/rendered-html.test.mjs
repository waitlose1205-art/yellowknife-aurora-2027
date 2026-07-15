import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Yellowknife decision dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>黃刀鎮極光旅決策儀表板<\/title>/i);
  assert.match(html, /黃刀鎮極光旅決策儀表板/);
  assert.match(html, /M2\.1 市場實證與重查準備階段/);
  assert.match(html, /決策狀態列/);
  assert.match(html, /A\/B 極光夜數視覺標籤/);
  assert.match(html, /PENDING_2027_RECHECK/);
  assert.doesNotMatch(html, /Backlog|來源老化機制|來源老化監控|預算情報判定|資料匯入檢核|跨目的地模板啟用/);
  assert.match(html, /極光旅遊團搜尋範圍/);
  assert.match(html, /9-11 月/);
  assert.match(html, /秋季極光團/);
  assert.match(html, /靜態網站不會自動爬旅行社頁面/);
  assert.match(html, /互動決策模擬器/);
  assert.match(html, /預算上限/);
  assert.match(html, /NT\$100,000 - NT\$400,000/);
  assert.match(html, /目前最適合/);
  assert.match(html, /待查商品：黃刀鎮 A級完整極光夜團/);
  assert.match(html, /前往 2027 重查清單/);
  assert.match(html, /適合選項排序/);
  assert.match(html, /查核基準日：2026-07-15/);
  assert.match(html, /手機版團體樣本卡片/);
  assert.doesNotMatch(html, /Your site is taking shape|Codex is working|react-loading-skeleton/);
});

test("keeps the finished site free of starter preview wiring", async () => {
  const [page, layout, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /decisionStatuses/);
  assert.match(page, /actionCards/);
  assert.match(page, /seasonScopeRows/);
  assert.match(page, /useState<PlannerFilters>/);
  assert.match(page, /candidateOptions/);
  assert.match(page, /evaluateOption/);
  assert.match(page, /mobileTourCards/);
  assert.match(css, /\.budgetRow\.green/);
  assert.match(css, /\.scopeGrid/);
  assert.match(css, /\.simulatorShell/);
  assert.match(css, /\.segmentedControl/);
  assert.match(css, /\.optionCard\.strong/);
  assert.match(css, /\.tourCard\.red/);
  assert.match(layout, /黃刀鎮極光旅決策儀表板/);
  assert.doesNotMatch(page, /Backlog|enabledFeatures|agingMonitor|budgetIntelligence|destinationTemplate/);
  assert.doesNotMatch(css, /backlogRank|enabledGrid|templateGrid|ruleItem/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview|_sites-preview/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
