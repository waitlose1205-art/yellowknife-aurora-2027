export const SOURCE_MANIFEST = [
  { agency: "山富旅遊", adapter: "generic-html", minimumProducts: 1, declaredScope: "極光主題公開商品" },
  { agency: "東南旅遊", adapter: "generic-html", minimumProducts: 1, declaredScope: "極光主題公開商品" },
  { agency: "雄獅旅遊", adapter: "liontravel-json", minimumProducts: 1, declaredScope: "極光主題公開商品" },
  { agency: "可樂旅遊", adapter: "colatour-html", minimumProducts: 1, declaredScope: "極光主題公開商品" },
  { agency: "五福旅遊", adapter: "generic-html", minimumProducts: 1, declaredScope: "極光主題公開商品" },
  { agency: "喜鴻旅遊", adapter: "browser-rendered", minimumProducts: 1, declaredScope: "極光主題公開商品" },
  { agency: "鳳凰旅遊", adapter: "generic-html", minimumProducts: 1, declaredScope: "極光主題公開商品" },
  { agency: "長汎旅遊", adapter: "generic-html", minimumProducts: 1, declaredScope: "極光主題公開商品" },
];

export const EXPECTED_SOURCE_COUNT = SOURCE_MANIFEST.length;
export const DEFAULT_MAX_SOURCE_AGE_DAYS = 7;

export function inspectSourceCoverage(sources) {
  const byAgency = new Map(sources.map((source) => [source.agency, source]));
  const missingAgencies = SOURCE_MANIFEST.filter(({ agency, minimumProducts }) => {
    const source = byAgency.get(agency);
    return !source || source.concreteRows < minimumProducts;
  }).map(({ agency, adapter, minimumProducts }) => ({ agency, adapter, minimumProducts }));
  const unexpectedAgencies = sources
    .filter((source) => !SOURCE_MANIFEST.some(({ agency }) => agency === source.agency))
    .map((source) => source.agency);

  const partialAgencies = sources
    .filter((source) => source.coverageStatus !== "complete")
    .map((source) => source.agency);

  return { missingAgencies, unexpectedAgencies, partialAgencies };
}

export function getSourceAgeDays(checkedAt, now = new Date()) {
  const checkedTime = Date.parse(`${checkedAt}T00:00:00Z`);
  if (!Number.isFinite(checkedTime)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - checkedTime) / 86_400_000);
}
