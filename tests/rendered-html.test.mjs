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
  assert.match(html, /自動匯入資料源摘要/);
  assert.match(html, /Source Appendix/);
  assert.match(html, /末頁查核摘要/);
  assert.match(html, /Yellowknife Tours 5D4N Gold/);
  assert.match(html, /匯率：1 CAD ≈ NT\$22\.8176/);
  assert.match(html, /約 NT\$35,698/);
  assert.match(html, /約 NT\$57,452/);
  assert.match(html, /訂購網站/);
  assert.match(html, /Yellowknife Tours/);
  assert.match(html, /ezTravel 美加\/加拿大跟團比對/);
  assert.match(html, /待查，不併入排序/);
  assert.match(html, /今日比對，未入排序/);
  assert.ok(
    html.indexOf('class="closingPanel"') < html.indexOf('id="source-sync"'),
    "source appendix must render after the closing recommendation",
  );
  assert.doesNotMatch(html, /即時查詢入口|全網即時搜尋|開啟主要資料源查詢|查詢此來源/);
  assert.match(html, /旅行方案候選清單/);
  assert.doesNotMatch(html, /候選方向分類/);
  assert.match(html, /可選擇的 A級團體候選方向/);
  assert.match(html, /自由行候選/);
  assert.match(html, /旅行團與方案清單/);
  assert.match(html, /東南／雄獅／山富：A級完整夜候選/);
  assert.match(html, /旅行社候選：東南旅遊／雄獅旅遊／山富旅遊/);
  assert.match(html, /全球極光旅行社查核排序/);
  assert.match(html, /已查 9 家台灣旅行社/);
  assert.match(html, /東南旅遊/);
  assert.match(html, /雄獅旅遊/);
  assert.match(html, /山富旅遊/);
  assert.match(html, /可樂旅遊/);
  assert.match(html, /五福旅遊/);
  assert.match(html, /喜鴻旅遊/);
  assert.match(html, /鳳凰旅遊/);
  assert.match(html, /可讀最低價 NT\$136,900 起/);
  assert.match(html, /芬蘭/);
  assert.match(html, /阿拉斯加/);
  assert.match(html, /澳洲/);
  assert.match(html, /agencyDisclosure/);
  assert.match(html, /點選展開／收合完整排序/);
  assert.ok(
    html.indexOf('id="candidate-directions"') < html.indexOf('id="global-agency-ranking"'),
    "global agency ranking must render below candidate options",
  );
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
  assert.match(html, /尚未查核；請先確認條件，才會產生推薦/);
  assert.match(html, /請先設定條件並按「確認並查核」/);
  assert.match(html, /目前不顯示最適合選項/);
  assert.match(html, /預算上限/);
  assert.match(html, /NT\$100,000 - NT\$400,000/);
  assert.match(html, /條件必要性與候選影響/);
  assert.match(html, /最低極光夜數/);
  assert.match(html, /A級要求會降級只達 B級的候選/);
  assert.match(html, /未產生推薦/);
  assert.match(html, /長汎 2026 團體樣本（四出發日）/);
  assert.match(html, /已匯入(?:<!-- -->|\s)*2(?:<!-- -->|\s)*筆可排序候選/);
  assert.match(html, /2026 已結束行程僅作歷史基準/);
  assert.match(html, /訂購網站/);
  assert.doesNotMatch(html, /互動決策模擬器|適合選項排序/);
  assert.match(html, /查核基準日：2026-07-15/);
  assert.match(html, /旅遊團名稱/);
  assert.match(html, /玩美加族~加拿大極光10日/);
  assert.match(html, /白名單驗證/);
  assert.match(html, /資料新鮮度/);
  assert.match(html, /僅作歷史基準/);
  assert.match(html, /自由行已引用 2026 團體航段、住宿與行程節奏作參考/);
  assert.match(html, /航班/);
  assert.match(html, /住宿/);
  assert.match(html, /排序理由/);
  assert.match(html, /尚未確認價格基準/);
  assert.match(html, /以目前預算上限/);
  assert.match(html, /尚未公布/);
  assert.match(html, /待查項目不評分/);
  assert.doesNotMatch(html, /recommendationBadge pending[\s\S]{0,120}分數/);
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
  assert.match(page, /SourceSyncSection/);
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
  assert.match(page, /globalAuroraAgencyRows/);
  assert.match(page, /GlobalAuroraAgencySection/);
  assert.match(page, /yellowknifeAgencyCandidates/);
  assert.match(page, /globalPriorityAgencyCandidates/);
  assert.match(page, /priceWatchAgencyCandidates/);
  assert.match(page, /agencyCandidates/);
  assert.match(page, /旅行社候選：東南旅遊／雄獅旅遊／山富旅遊/);
  assert.match(page, /雄獅旅遊全球極光專題/);
  assert.match(page, /東南旅遊追逐極光專題/);
  assert.match(page, /山富旅遊世界極光專案/);
  assert.match(page, /liontravel/);
  assert.match(page, /settour/);
  assert.match(page, /travel4u/);
  assert.match(page, /colatour/);
  assert.match(page, /phoenix/);
  assert.match(page, /ezTravel 美加\/加拿大跟團比對/);
  assert.match(page, /待查，不併入排序/);
  assert.match(page, /plannerImpactRows/);
  assert.match(page, /getDirectionResultNote/);
  assert.match(page, /待查項目不評分/);
  assert.match(page, /costBasis/);
  assert.match(page, /自由行目前採 2026 團體樣本作參考/);
  assert.match(page, /tourName/);
  assert.match(page, /evaluateOption/);
  assert.match(page, /mobileTourCards/);
  assert.match(page, /自由行候選/);
  assert.match(page, /B級團體待查/);
  assert.match(page, /group-b-price-watch/);
  assert.match(page, /group-b-autumn-price/);
  assert.match(page, /group-b-winter-price/);
  assert.match(page, /當地套裝＋2026參考/);
  assert.match(page, /決策選項列表/);
  assert.match(page, /hasConfirmedPlanner/);
  assert.match(page, /isRecommendationOption/);
  assert.match(page, /isActionableStatus/);
  assert.match(page, /ResultStatus = "strong" \| "conditional" \| "backup" \| "pending" \| "exclude"/);
  assert.match(page, /directionInfoDetail/);
  assert.match(page, /directionRankingSummary/);
  assert.match(page, /flightOptionList/);
  assert.match(page, /hotelRateList/);
  assert.match(page, /Air Canada 加拿大航空/);
  assert.match(page, /STARLUX 星宇航空/);
  assert.match(page, /自由行住宿月份估算/);
  assert.match(page, /getDecisionGates/);
  assert.match(page, /getDirectionIdForFilters/);
  assert.match(page, /group-a-taiwan-complete/);
  assert.match(page, /價格尚未公布，預算只作搜尋上限/);
  assert.match(page, /查看航班、住宿與價格詳細資訊/);
  assert.match(page, /Chateau Nova、Explorer Hotel 或同級/);
  assert.doesNotMatch(page, /尚未填入|估算待補|自由行估算缺/);
  assert.doesNotMatch(page, /互動決策模擬器|適合選項排序|頁面會即時排序適合的選項|候選方向價格基準/);
  assert.doesNotMatch(page, /actionCards|下一步行動卡|Next Actions/);
  assert.match(css, /\.budgetRow\.green/);
  assert.match(css, /\.scopeGrid/);
  assert.match(css, /\.sourceSyncSection/);
  assert.match(css, /\.compactSourceSection/);
  assert.match(css, /\.impactAudit/);
  assert.match(css, /\.directionSection/);
  assert.match(css, /\.directionChooser/);
  assert.match(css, /\.directionTourMeta/);
  assert.match(css, /\.globalAgencySection/);
  assert.match(css, /\.agencyDisclosure/);
  assert.match(css, /\.agencyDisclosureSummary/);
  assert.match(css, /\.agencyRankingGrid/);
  assert.match(css, /\.agencyScoreCard/);
  assert.match(css, /\.directionAgencyLinks/);
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
  assert.match(staticHtml, /staticAgencyCandidates/);
  assert.match(staticHtml, /global-agency-ranking/);
  assert.match(staticHtml, /全球極光旅行社查核排序/);
  assert.match(staticHtml, /已查 9 家台灣旅行社/);
  assert.match(staticHtml, /agencyDisclosure/);
  assert.match(staticHtml, /點選展開／收合完整排序/);
  assert.match(staticHtml, /旅行社候選：東南旅遊／雄獅旅遊／山富旅遊/);
  assert.match(staticHtml, /directionAgencyLinks/);
  assert.match(staticHtml, /可讀最低價 NT\$136,900 起/);
  assert.match(staticHtml, /雄獅旅遊/);
  assert.match(staticHtml, /山富旅遊/);
  assert.match(staticHtml, /可樂旅遊/);
  assert.match(staticHtml, /plannerImpactRows/);
  assert.match(staticHtml, /Source Appendix/);
  assert.match(staticHtml, /ezTravel 美加\/加拿大跟團比對/);
  assert.match(staticHtml, /待查，不併入排序/);
  assert.match(staticHtml, /今日比對，未入排序/);
  assert.match(staticHtml, /getDirectionResultNote/);
  assert.match(staticHtml, /待查項目不評分/);
  assert.match(staticHtml, /draftPlannerState/);
  assert.match(staticHtml, /applyPlanner/);
  assert.match(staticHtml, /getDecisionGates/);
  assert.match(staticHtml, /getDirectionIdForFilters/);
  assert.match(staticHtml, /group-a-taiwan-complete/);
  assert.match(staticHtml, /group-b-price-watch/);
  assert.match(staticHtml, /group-b-autumn-price/);
  assert.match(staticHtml, /group-b-winter-price/);
  assert.match(staticHtml, /directionDetail/);
  assert.match(staticHtml, /data-direction="independent"/);
  assert.match(staticHtml, /directionTourMeta/);
  assert.match(staticHtml, /directionBudgetBasis/);
  assert.match(staticHtml, /directionInfoDetail/);
  assert.match(staticHtml, /查看航班、住宿與價格詳細資訊/);
  assert.match(staticHtml, /Chateau Nova、Explorer Hotel 或同級/);
  assert.match(staticHtml, /自由行候選/);
  assert.match(staticHtml, /B級團體待查/);
  assert.match(staticHtml, /當地套裝＋2026參考/);
  assert.match(staticHtml, /決策選項列表/);
  assert.match(staticHtml, /條件必要性與候選影響/);
  assert.match(staticHtml, /A級要求會降級只達 B級的候選/);
  assert.match(staticHtml, /hasConfirmedPlanner/);
  assert.match(staticHtml, /isRecommendationOption/);
  assert.match(staticHtml, /isActionableStatus/);
  assert.match(staticHtml, /flightOptionList/);
  assert.match(staticHtml, /hotelRateList/);
  assert.match(staticHtml, /Air Canada 加拿大航空/);
  assert.match(staticHtml, /STARLUX 星宇航空/);
  assert.match(staticHtml, /自由行住宿月份估算/);
  assert.ok(
    staticHtml.indexOf('id="decision-simulator"') < staticHtml.indexOf('id="candidate-directions"'),
    "static decision options must render before candidate directions",
  );
  assert.ok(
    staticHtml.indexOf('id="candidate-directions"') < staticHtml.indexOf('id="global-agency-ranking"'),
    "static global agency ranking must render below candidate options",
  );
  assert.ok(
    staticHtml.indexOf('class="closingPanel"') < staticHtml.indexOf('id="source-sync"'),
    "static source appendix must render at the page end",
  );
  assert.match(staticHtml, /確認並查核/);
  assert.match(staticHtml, /尚未查核；請先確認條件，才會產生推薦/);
  assert.doesNotMatch(staticHtml, /尚未填入|估算待補|自由行估算缺/);
  assert.doesNotMatch(staticHtml, /下一步行動卡|Next Actions|actionGrid|actionCard|適合選項排序|互動決策模擬器|頁面會即時排序適合的選項|候選方向價格基準/);
  assert.doesNotMatch(staticHtml, /<small>分數 \$\{linkedResult\.score\}<\/small>/);
  assert.match(staticHtml, /sourceStatusRegistry/);
  assert.match(staticHtml, /costBasis/);
  assert.match(staticHtml, /旅遊團名稱/);
  assert.match(staticHtml, /玩美加族~加拿大極光10日/);
  assert.match(staticHtml, /歷史樣本：玩美加族~加拿大極光10日（三月低價團）/);
  assert.match(layout, /黃刀鎮極光旅決策儀表板/);
  const pageDirectionBlock = page.match(/const directionCategories = \[[\s\S]*?\] as const;/)?.[0] ?? "";
  const staticDirectionBlock = staticHtml.match(/const directionCategories = \[[\s\S]*?\];/)?.[0] ?? "";
  assert.doesNotMatch(pageDirectionBlock, /group-2026|B級歷史旅行團|2026\/01|2026\/02|2026\/03/);
  assert.doesNotMatch(staticDirectionBlock, /group-2026|B級歷史旅行團|2026\/01|2026\/02|2026\/03/);
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
