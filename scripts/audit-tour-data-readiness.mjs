import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { summarizeDataset } from "./pipeline/quality-gate.mjs";
import { EXPECTED_SOURCE_COUNT, inspectSourceCoverage } from "./pipeline/source-manifest.mjs";
import { classifyFlight } from "./pipeline/flight-quality.mjs";

const inputPath = join(process.cwd(), "public", "data", "tour-products.latest.json");
const outputDir = join(process.cwd(), "exports");
const sourceStatusPath = join(process.cwd(), "public", "data", "source-status.json");
const checkedAt = new Date().toISOString().slice(0, 10);

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function isMissingLike(value) {
  const text = clean(value);
  return (
    !text ||
    /未取得|未揭露|未公開完整航班|需進商品頁確認|來源列表未揭露|未於專題頁摘要顯示/.test(
      text,
    )
  );
}

function getMissingFields(product) {
  const checks = [
    ["可選擇日期", product.selectableDates],
    ["預計航班", product.flightSummary],
    ["行程計畫表", product.itinerarySummary],
    ["報名狀態", product.bookingStatus],
    ["金額", product.priceLabel],
    ["官方頁標題", product.sourceTitle],
  ];
  return checks.filter(([, value]) => isMissingLike(value)).map(([label]) => label);
}

function getIssueLevel(product, flightStatus, missingFields) {
  if (product.sourceVerificationStatus === "mismatch") return "high";
  if (flightStatus === "missing-flight" || flightStatus === "code-only") return "high";
  if (flightStatus === "dynamic-page-not-read") return "high";
  if (flightStatus === "official-not-disclosed") return "medium";
  if (product.sourceVerificationStatus === "unchecked") return "medium";
  if (missingFields.length >= 2) return "medium";
  if (flightStatus !== "has-flight-times") return "medium";
  if (missingFields.length) return "low";
  return "ok";
}

function getNextAction(product, flightStatus) {
  if (product.sourceVerificationStatus === "mismatch") {
    return "來源頁標題與商品名稱不一致；需重新配對正確商品網址";
  }
  if (product.sourceVerificationStatus === "unchecked") {
    return "官方頁標題尚未取得；需用瀏覽器渲染或官方 API 查核";
  }
  if (flightStatus === "missing-flight") {
    return "未取得航班資訊；需進商品頁、航班頁或行前說明補查";
  }
  if (flightStatus === "code-only") {
    return "只有航空公司代碼；需補班號、起訖機場與時間";
  }
  if (flightStatus === "dynamic-page-not-read") {
    return "官方頁採動態載入；需改用瀏覽器渲染或尋找後端 API";
  }
  if (flightStatus === "official-not-disclosed") {
    return "官方頁未公開完整航班；保留為可比較商品，但不得視為已完成航班查核";
  }
  if (flightStatus === "airline-or-partial-only") {
    return "已取得航空公司或部分航班線索；需補完整航段與時間";
  }
  if (flightStatus === "reference-route-no-time") {
    return "已有參考航班或航線；需補正式時間";
  }
  return "目前可作推薦排序資料使用";
}

if (!existsSync(inputPath)) {
  throw new Error(`找不到資料檔：${inputPath}`);
}
mkdirSync(outputDir, { recursive: true });

const dataset = JSON.parse(readFileSync(inputPath, "utf8"));
const datasetSummary = summarizeDataset(dataset);
const sourcePayload = existsSync(sourceStatusPath)
  ? JSON.parse(readFileSync(sourceStatusPath, "utf8"))
  : { sources: [] };
const sourceCoverage = inspectSourceCoverage(sourcePayload.sources ?? []);
const rows = dataset.products.map((product) => {
  const flightStatus = classifyFlight(product.flightSummary);
  const missingFields = getMissingFields(product);
  const issueLevel = getIssueLevel(product, flightStatus, missingFields);
  return {
    issueLevel,
    agency: product.agency,
    id: product.id,
    productName: product.productName,
    destination: product.destination,
    selectableDates: product.selectableDates,
    flightStatus,
    flightSummary: product.flightSummary,
    missingFields: missingFields.join("、") || "無",
    sourceVerificationStatus: product.sourceVerificationStatus,
    sourceVerificationNote: product.sourceVerificationNote,
    dataStatus: product.dataStatus,
    priceLabel: product.priceLabel,
    bookingStatus: product.bookingStatus,
    sourceUrl: product.sourceUrl,
    nextAction: getNextAction(product, flightStatus),
  };
});

const summary = {
  checkedAt,
  sourceCheckedAt: dataset.checkedAt,
  generatedAt: dataset.generatedAt,
  totalProducts: rows.length,
  availableProducts: datasetSummary.availableProducts,
  recommendableProducts: datasetSummary.recommendableProducts,
  sourceCount: sourcePayload.sources?.length ?? 0,
  expectedSourceCount: EXPECTED_SOURCE_COUNT,
  sourceCoverage,
  byIssueLevel: {},
  byFlightStatus: {},
  byAgency: {},
};

for (const row of rows) {
  summary.byIssueLevel[row.issueLevel] = (summary.byIssueLevel[row.issueLevel] || 0) + 1;
  summary.byFlightStatus[row.flightStatus] = (summary.byFlightStatus[row.flightStatus] || 0) + 1;
  summary.byAgency[row.agency] ||= {
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    ok: 0,
    missingFlight: 0,
    codeOnly: 0,
    officialNotDisclosed: 0,
    dynamicPageNotRead: 0,
    uncheckedSource: 0,
    mismatchSource: 0,
  };

  const agency = summary.byAgency[row.agency];
  agency.total += 1;
  agency[row.issueLevel] += 1;
  if (row.flightStatus === "missing-flight") agency.missingFlight += 1;
  if (row.flightStatus === "code-only") agency.codeOnly += 1;
  if (row.flightStatus === "official-not-disclosed") agency.officialNotDisclosed += 1;
  if (row.flightStatus === "dynamic-page-not-read") agency.dynamicPageNotRead += 1;
  if (row.sourceVerificationStatus === "unchecked") agency.uncheckedSource += 1;
  if (row.sourceVerificationStatus === "mismatch") agency.mismatchSource += 1;
}

const csvHeaders = [
  "issueLevel",
  "agency",
  "id",
  "productName",
  "destination",
  "selectableDates",
  "flightStatus",
  "flightSummary",
  "missingFields",
  "sourceVerificationStatus",
  "sourceVerificationNote",
  "dataStatus",
  "priceLabel",
  "bookingStatus",
  "sourceUrl",
  "nextAction",
];
const problemRows = rows.filter((row) => row.issueLevel !== "ok");
const highRows = problemRows.filter((row) => row.issueLevel === "high");
const csvRows = [
  csvHeaders.join(","),
  ...problemRows.map((row) => csvHeaders.map((header) => csvEscape(row[header])).join(",")),
];

const summaryLines = [
  "# 旅行團資料可用性查核",
  "",
  `查核日期：${checkedAt}`,
  `資料基準日：${dataset.checkedAt}`,
  `資料產生時間：${dataset.generatedAt}`,
  `商品總數：${summary.totalProducts}`,
  `主要欄位完整：${summary.availableProducts}`,
  `具推薦資格：${summary.recommendableProducts}`,
  `來源覆蓋：${summary.sourceCount}/${summary.expectedSourceCount}`,
  "",
  "## 問題等級",
  "",
  ...Object.entries(summary.byIssueLevel).map(([key, value]) => `- ${key}: ${value}`),
  "",
  "## 航班狀態",
  "",
  ...Object.entries(summary.byFlightStatus).map(([key, value]) => `- ${key}: ${value}`),
  "",
  "## 旅行社彙整",
  "",
  "| 旅行社 | 總數 | High | Medium | Low | OK | 缺航班 | 代碼-only | 官方未公開 | 動態頁未讀 | 未驗證來源 | 來源不一致 |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...Object.entries(summary.byAgency).map(
    ([agency, value]) =>
      `| ${agency} | ${value.total} | ${value.high} | ${value.medium} | ${value.low} | ${value.ok} | ${value.missingFlight} | ${value.codeOnly} | ${value.officialNotDisclosed} | ${value.dynamicPageNotRead} | ${value.uncheckedSource} | ${value.mismatchSource} |`,
  ),
  "",
  "## High 優先處理清單",
  "",
  ...highRows.slice(0, 60).map(
    (row) =>
      `- ${row.agency}｜${row.id}｜${row.flightStatus}｜${row.productName}｜下一步：${row.nextAction}`,
  ),
  "",
  highRows.length > 60 ? `另有 ${highRows.length - 60} 筆 High 項目，請看 CSV。` : "",
  "",
].filter((line) => line !== "");

const baseName = `tour-data-readiness-audit-${checkedAt}`;
writeFileSync(join(outputDir, `${baseName}.json`), JSON.stringify({ summary, rows }, null, 2), "utf8");
writeFileSync(join(outputDir, `${baseName}.csv`), `${csvRows.join("\n")}\n`, "utf8");
writeFileSync(join(outputDir, `${baseName}.md`), `${summaryLines.join("\n")}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      summary,
      problemRows: problemRows.length,
      files: {
        json: join(outputDir, `${baseName}.json`),
        csv: join(outputDir, `${baseName}.csv`),
        md: join(outputDir, `${baseName}.md`),
      },
    },
    null,
    2,
  ),
);
