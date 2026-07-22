import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPECTED_SOURCE_COUNT,
  getSourceAgeDays,
  inspectSourceCoverage,
} from "../scripts/pipeline/source-manifest.mjs";
import {
  compareDatasetQuality,
  summarizeDataset,
} from "../scripts/pipeline/quality-gate.mjs";

test("source manifest recognizes complete and incomplete agency coverage", () => {
  const completeSources = [
    "山富旅遊",
    "東南旅遊",
    "雄獅旅遊",
    "可樂旅遊",
    "五福旅遊",
    "喜鴻旅遊",
    "鳳凰旅遊",
    "長汎旅遊",
  ].map((agency) => ({ agency, concreteRows: 1, coverageStatus: "partial" }));

  assert.equal(completeSources.length, EXPECTED_SOURCE_COUNT);
  assert.deepEqual(inspectSourceCoverage(completeSources).missingAgencies, []);
  assert.deepEqual(inspectSourceCoverage(completeSources).partialAgencies, completeSources.map(({ agency }) => agency));

  const incomplete = inspectSourceCoverage(completeSources.slice(1));
  assert.deepEqual(incomplete.missingAgencies.map((source) => source.agency), ["山富旅遊"]);
});

test("source age calculation uses whole UTC days and rejects invalid dates", () => {
  const now = new Date("2026-07-20T12:00:00Z");
  assert.equal(getSourceAgeDays("2026-07-17", now), 3);
  assert.equal(getSourceAgeDays("not-a-date", now), Number.POSITIVE_INFINITY);
});

test("quality gate rejects a meaningful drop in usable products", () => {
  const makeProducts = (count, dataStatus = "available") =>
    Array.from({ length: count }, (_, index) => ({
      id: String(index),
      dataStatus,
      sourceVerificationStatus: "verified",
      priceTwd: 100000,
      flightSummary: "去程 2026/09/01 10:00 台北 → 18:00 溫哥華",
    }));
  const previous = { products: makeProducts(100) };
  const next = { products: [...makeProducts(80), ...makeProducts(20, "partial")] };

  assert.deepEqual(summarizeDataset(previous), {
    totalProducts: 100,
    availableProducts: 100,
    recommendableProducts: 100,
  });
  assert.deepEqual(
    compareDatasetQuality(previous, next).regressions.map(({ metric }) => metric),
    ["availableProducts", "recommendableProducts"],
  );
});
