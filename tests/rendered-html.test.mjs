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

test("server-renders the aurora recommendation shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>極光旅行團靜態推薦系統<\/title>/i);
  assert.match(html, /極光旅行團靜態資料推薦系統/);
  assert.match(html, /決策選項列表/);
  assert.match(html, /預算上限/);
  assert.match(html, /最低極光夜數/);
  assert.match(html, /確認篩選/);
  assert.match(html, /資料來源與更新時間/);
  assert.match(html, /Source Freshness/);
  assert.doesNotMatch(html, /Backlog|後續啟用方式|Low Resource Mode|Next Actions/);
});

test("keeps the site split into page, component, and domain modules", async () => {
  const [page, decisionFilters, results, sourceStatus, constants, logic, types, workstreams] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/components/DecisionFilters.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/components/RecommendationResults.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/components/SourceStatusSection.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/lib/tourConstants.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/lib/tourLogic.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/lib/tourTypes.ts", import.meta.url), "utf8"),
      readFile(new URL("../docs/optimization-workstreams.md", import.meta.url), "utf8"),
    ]);

  assert.match(page, /DecisionFilters/);
  assert.match(page, /RecommendationResults/);
  assert.match(page, /SourceStatusSection/);
  assert.match(page, /filterProducts/);
  assert.match(page, /groupProductsByAgency/);
  assert.doesNotMatch(page, /type Product =|function getScore|function isMissing/);

  assert.match(decisionFilters, /預算上限/);
  assert.match(decisionFilters, /最低極光夜數/);
  assert.match(results, /AgencyOptionCard/);
  assert.match(results, /ProductDisclosure/);
  assert.match(sourceStatus, /資料來源與更新時間/);
  assert.match(constants, /DEFAULT_FILTERS/);
  assert.match(logic, /getScore/);
  assert.match(logic, /filterProducts/);
  assert.match(logic, /groupProductsByAgency/);
  assert.match(types, /export type Product/);

  assert.match(workstreams, /每日更新/);
  assert.match(workstreams, /多旅行社解析/);
  assert.match(workstreams, /航班住宿補全/);
  assert.match(workstreams, /自由行估算/);
  assert.doesNotMatch(`${page}\n${decisionFilters}\n${results}`, /Backlog|enabledFeatures/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
