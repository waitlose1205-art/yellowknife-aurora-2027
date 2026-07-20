import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { inspectSourceCoverage } from "../scripts/pipeline/source-manifest.mjs";

async function loadJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

test("published tour data has unique sources and a recommendable Yellowknife set", async () => {
  const payload = await loadJson("../public/data/tour-products.latest.json");
  const sourcePayload = await loadJson("../public/data/source-status.json");

  assert.ok(payload.products.length > 0);
  assert.deepEqual(inspectSourceCoverage(sourcePayload.sources).missingAgencies, []);

  const sourceUrls = payload.products.map((product) => product.sourceUrl);
  assert.equal(new Set(sourceUrls).size, sourceUrls.length);
  assert.ok(sourceUrls.every((sourceUrl) => /^https:\/\//.test(sourceUrl)));
  assert.ok(payload.products.every((product) => product.sourceVerificationStatus !== "mismatch"));

  const recommendableYellowknife = payload.products.filter(
    (product) =>
      product.destination === "黃刀鎮" &&
      product.sourceVerificationStatus === "verified" &&
      product.dataStatus === "available" &&
      product.priceTwd !== null &&
      /\d{1,2}:\d{2}/.test(product.flightSummary) &&
      /→|->|至|到/.test(product.flightSummary),
  );
  assert.ok(recommendableYellowknife.length > 0);
});

test("available products do not contain known missing-value markers", async () => {
  const payload = await loadJson("../public/data/tour-products.latest.json");
  const missingPattern = /未取得|未揭露|需進商品頁確認|來源列表未揭露/;
  const availableProducts = payload.products.filter((product) => product.dataStatus === "available");

  for (const product of availableProducts) {
    assert.ok(product.productName);
    assert.ok(product.priceTwd !== null);
    assert.ok(product.sourceUrl);
    assert.doesNotMatch(
      [product.selectableDates, product.flightSummary, product.bookingStatus, product.priceLabel].join(" "),
      missingPattern,
    );
  }
});

test("Everfun live booking states match the official detail pages", async () => {
  const payload = await loadJson("../public/data/tour-products.latest.json");
  const bySource = new Map(payload.products.map((product) => [product.sourceUrl, product]));
  const iceland = bySource.get(
    "https://www.everfuntravel.com/globaltour/detail/ENG26D24BR08TA",
  );
  const yellowknife = bySource.get(
    "https://www.everfuntravel.com/globaltour/detail/UWP26904BR10TA",
  );

  assert.equal(iceland?.bookingStatus, "可售名額 15/25；報名中");
  assert.equal(iceland?.bookingStatusType, "bookable");
  assert.equal(yellowknife?.bookingStatus, "可售名額 0/27；候補");
  assert.equal(yellowknife?.bookingStatusType, "limited");
});

test("independent travel estimates remain disabled until sourced inputs exist", async () => {
  const payload = await loadJson("../public/data/independent-travel-estimates.latest.json");
  assert.equal(payload.status, "not-ready");
  assert.deepEqual(payload.estimates, []);
  assert.ok(payload.missingDependencies.length >= 4);
  assert.match(payload.publicationRule, /不產生或公開自由行總價/);
});
