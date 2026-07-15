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
  assert.doesNotMatch(html, /下一步行動卡|Next Actions/);
  assert.match(html, /極光旅遊團搜尋範圍/);
  assert.match(html, /9-11 月/);
  assert.match(html, /秋季極光團/);
  assert.match(html, /已同步來源商品會自動進入排序/);
  assert.match(html, /自動匯入資料源/);
  assert.match(html, /Yellowknife Tours 5D4N Gold/);
  assert.match(html, /匯率：1 CAD ≈ NT\$22\.8176/);
  assert.match(html, /約 NT\$35,698/);
  assert.match(html, /約 NT\$57,452/);
  assert.match(html, /訂購網站/);
  assert.match(html, /Yellowknife Tours/);
  assert.doesNotMatch(html, /即時查詢入口|全網即時搜尋|開啟主要資料源查詢|查詢此來源/);
  assert.match(html, /候選方向分類/);
  assert.match(html, /可選擇的 A級團體候選方向/);
  assert.match(html, /自由行候選/);
  assert.match(html, /旅行團與方案清單/);
  assert.match(html, /台灣旅行社完整極光夜團/);
  assert.match(html, /價格尚未公布，預算只作搜尋上限/);
  assert.doesNotMatch(
    html,
    /秋冬 A 級團體候選方向|秋冬 B 級團體價格優先方向|待查商品：黃刀鎮 A級完整極光夜團|待查商品：黃刀鎮 B級價格優先團/,
  );
  assert.match(html, /決策選項列表/);
  assert.ok(
    html.indexOf('id="decision-simulator"') < html.indexOf('id="candidate-directions"'),
    "decision options must render before candidate directions",
  );
  assert.match(html, /確認並查核/);
  assert.match(html, /條件已確認；下方推薦與候選方向已同步/);
  assert.match(html, /已確認條件/);
  assert.match(html, /預算上限/);
  assert.match(html, /NT\$100,000 - NT\$400,000/);
  assert.match(html, /目前最適合/);
  assert.match(html, /Yellowknife Tours 5D4N Gold/);
  assert.match(html, /長汎 2026 團體樣本（四出發日）/);
  assert.match(html, /已匯入 <!-- -->6<!-- --> 筆可排序候選|已匯入 6 筆可排序候選/);
  assert.match(html, /前往 Yellowknife Tours 訂購\/詢價/);
  assert.doesNotMatch(html, /互動決策模擬器|適合選項排序/);
  assert.match(html, /查核基準日：2026-07-15/);
  assert.match(html, /旅遊團名稱/);
  assert.match(html, /玩美加族~加拿大極光10日/);
  assert.match(html, /白名單驗證/);
  assert.match(html, /資料新鮮度/);
  assert.match(html, /2026樣本參考估算/);
  assert.match(html, /自由行已引用 2026 團體航段、住宿與行程節奏作參考/);
  assert.match(html, /航班/);
  assert.match(html, /住宿/);
  assert.match(html, /排序理由/);
  assert.match(html, /已確認價格基準/);
  assert.match(html, /以目前預算上限/);
  assert.match(html, /尚未公布/);
  assert.match(html, /低於 NT\$150,000/);
  assert.doesNotMatch(html, /尚未填入|估算待補|自由行估算缺/);
  assert.doesNotMatch(html, /頁面會即時排序適合的選項|候選方向價格基準/);
  assert.doesNotMatch(html, /<th>團號<\/th>|查看長汎團號頁|歷史樣本：UWP26319BR10TB 三月低價團/);
  assert.match(html, /手機版團體樣本卡片/);
  assert.doesNotMatch(html, /Your site is taking shape|Codex is working|react-loading-skeleton/);
});

test("keeps the finished site free of starter preview wiring", async () => {
  const [page, layout, css, packageJson, staticHtml] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);

  assert.match(page, /decisionStatuses/);
  assert.match(page, /seasonScopeRows/);
  assert.match(page, /sourceSyncRows/);
  assert.match(page, /importedFromSource/);
  assert.match(page, /useState<PlannerFilters>/);
  assert.match(page, /draftFilters/);
  assert.match(page, /applyPlannerFilters/);
  assert.match(page, /DirectionCategoryId/);
  assert.match(page, /directionCategories/);
  assert.match(page, /selectedDirectionId/);
  assert.match(page, /getDirectionCandidate/);
  assert.match(page, /getBudgetStatus/);
  assert.match(page, /candidateOptions/);
  assert.match(page, /sourceStatusRegistry/);
  assert.match(page, /costBasis/);
  assert.match(page, /自由行目前採 2026 團體樣本作參考/);
  assert.match(page, /tourName/);
  assert.match(page, /evaluateOption/);
  assert.match(page, /mobileTourCards/);
  assert.match(page, /自由行候選/);
  assert.match(page, /B級歷史旅行團/);
  assert.match(page, /當地套裝＋2026參考/);
  assert.match(page, /決策選項列表/);
  assert.match(page, /directionInfoDetail/);
  assert.match(page, /directionRankingSummary/);
  assert.match(page, /getDecisionGates/);
  assert.match(page, /getDirectionIdForFilters/);
  assert.match(page, /group-a-taiwan-complete/);
  assert.match(page, /group-2026-jan15/);
  assert.match(page, /group-2026-feb12/);
  assert.match(page, /group-2026-feb19/);
  assert.match(page, /價格尚未公布，預算只作搜尋上限/);
  assert.match(page, /查看航班、住宿與價格詳細資訊/);
  assert.match(page, /Chateau Nova、Explorer Hotel 或同級/);
  assert.doesNotMatch(page, /尚未填入|估算待補|自由行估算缺/);
  assert.doesNotMatch(page, /互動決策模擬器|適合選項排序|頁面會即時排序適合的選項|候選方向價格基準/);
  assert.doesNotMatch(page, /actionCards|下一步行動卡|Next Actions/);
  assert.match(css, /\.budgetRow\.green/);
  assert.match(css, /\.scopeGrid/);
  assert.match(css, /\.sourceSyncSection/);
  assert.match(css, /\.directionSection/);
  assert.match(css, /\.directionChooser/);
  assert.match(css, /\.directionTourMeta/);
  assert.match(css, /\.directionTourLink/);
  assert.match(css, /\.directionBudgetBasis/);
  assert.match(css, /\.directionBudgetBasis\.unknown/);
  assert.match(css, /\.directionInfoDetail/);
  assert.match(css, /\.directionRankingSummary/);
  assert.match(css, /\.sourceGrid/);
  assert.match(css, /\.sourceStatusGrid/);
  assert.match(css, /\.rankingSummary/);
  assert.match(css, /\.simulatorShell/);
  assert.match(css, /\.segmentedControl/);
  assert.match(css, /\.applyPlannerButton/);
  assert.match(css, /\.applyPlannerStatus\.pending/);
  assert.match(css, /\.tourCard\.red/);
  assert.match(staticHtml, /directionCategories/);
  assert.match(staticHtml, /draftPlannerState/);
  assert.match(staticHtml, /applyPlanner/);
  assert.match(staticHtml, /getDecisionGates/);
  assert.match(staticHtml, /getDirectionIdForFilters/);
  assert.match(staticHtml, /group-a-taiwan-complete/);
  assert.match(staticHtml, /group-2026-jan15/);
  assert.match(staticHtml, /group-2026-feb12/);
  assert.match(staticHtml, /group-2026-feb19/);
  assert.match(staticHtml, /directionDetail/);
  assert.match(staticHtml, /data-direction="independent"/);
  assert.match(staticHtml, /directionTourMeta/);
  assert.match(staticHtml, /directionBudgetBasis/);
  assert.match(staticHtml, /directionInfoDetail/);
  assert.match(staticHtml, /查看航班、住宿與價格詳細資訊/);
  assert.match(staticHtml, /Chateau Nova、Explorer Hotel 或同級/);
  assert.match(staticHtml, /自由行候選/);
  assert.match(staticHtml, /B級歷史旅行團/);
  assert.match(staticHtml, /當地套裝＋2026參考/);
  assert.match(staticHtml, /決策選項列表/);
  assert.ok(
    staticHtml.indexOf('id="decision-simulator"') < staticHtml.indexOf('id="candidate-directions"'),
    "static decision options must render before candidate directions",
  );
  assert.match(staticHtml, /確認並查核/);
  assert.doesNotMatch(staticHtml, /尚未填入|估算待補|自由行估算缺/);
  assert.doesNotMatch(staticHtml, /下一步行動卡|Next Actions|actionGrid|actionCard|適合選項排序|互動決策模擬器|頁面會即時排序適合的選項|候選方向價格基準/);
  assert.match(staticHtml, /sourceStatusRegistry/);
  assert.match(staticHtml, /costBasis/);
  assert.match(staticHtml, /旅遊團名稱/);
  assert.match(staticHtml, /玩美加族~加拿大極光10日/);
  assert.match(staticHtml, /歷史樣本：玩美加族~加拿大極光10日（三月低價團）/);
  assert.match(layout, /黃刀鎮極光旅決策儀表板/);
  assert.doesNotMatch(`${page}\n${staticHtml}`, /<th>團號<\/th>|查看長汎團號頁|歷史樣本：UWP26319BR10TB 三月低價團/);
  assert.doesNotMatch(page, /Backlog|enabledFeatures|agingMonitor|budgetIntelligence|destinationTemplate/);
  assert.doesNotMatch(
    `${page}\n${staticHtml}`,
    /秋冬 A 級團體候選方向|秋冬 B 級團體價格優先方向|待查商品：黃刀鎮 A級完整極光夜團|待查商品：黃刀鎮 B級價格優先團|group-2027-a|group-2027-b/,
  );
  assert.doesNotMatch(css, /backlogRank|enabledGrid|templateGrid|ruleItem/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview|_sites-preview/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
