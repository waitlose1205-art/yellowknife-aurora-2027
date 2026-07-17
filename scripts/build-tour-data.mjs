import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const inputPath =
  process.argv[2] ||
  join(
    process.cwd(),
    "exports",
    "taiwan_aurora_tours_refresh_2026-07-17_nine-agencies.xls",
  );
const outputDir = join(process.cwd(), "public", "data");
const checkedAt = "2026-07-17";

const agencies = [
  "山富旅遊",
  "東南旅遊",
  "雄獅旅遊",
  "可樂旅遊",
  "五福旅遊",
  "喜鴻旅遊",
  "鳳凰旅遊",
  "長汎旅遊",
];

const destinationRules = [
  ["黃刀鎮", /黃刀|Yellowknife|YZF/i],
  ["阿拉斯加", /阿拉斯加|費爾班克斯/i],
  ["芬蘭", /芬蘭|北歐|羅浮敦|羅弗敦|挪威|瑞典|玻璃極光屋|極光屋/i],
  ["冰島", /冰島|藍冰洞|藍湖/i],
  ["紐西蘭南極光", /紐西蘭|南極光|塔斯馬尼亞/i],
  ["加拿大", /加拿大|育空|白馬|溫哥華|洛磯/i],
];

function decodeXml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function parseWorkbook(xml) {
  const sheetMatch = xml.match(
    /<Worksheet[^>]*ss:Name="極光旅行團查詢"[\s\S]*?<Table>([\s\S]*?)<\/Table>/,
  );
  if (!sheetMatch) {
    throw new Error("找不到工作表：極光旅行團查詢");
  }

  const rows = [...sheetMatch[1].matchAll(/<Row>([\s\S]*?)<\/Row>/g)].map((row) =>
    [...row[1].matchAll(/<Data[^>]*>([\s\S]*?)<\/Data>/g)].map((cell) =>
      clean(decodeXml(cell[1])),
    ),
  );
  const headers = rows.shift();
  return rows
    .filter((row) => row.some(Boolean))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])),
    );
}

function parsePriceTwd(label) {
  const text = clean(label).replace(/第二人\s*省\s*\$?[\d,]+/g, "");
  const match = text.match(/(?:NT\$|TWD\s*)?([1-9]\d{1,2}(?:,\d{3})+|[1-9]\d{4,6})/);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

function parseMonths(dateText) {
  const months = new Set();
  for (const match of clean(dateText).matchAll(/(?:20\d{2}[./-])?(\d{1,2})[./-]\d{1,2}/g)) {
    const month = Number(match[1]);
    if (month >= 1 && month <= 12) months.add(month);
  }
  return [...months].sort((a, b) => a - b);
}

function parseDays(text) {
  const match = clean(text).match(/(\d+)\s*(?:日|天)/);
  return match ? Number(match[1]) : null;
}

function inferDestination(row) {
  const haystack = `${row.產品名稱} ${row.行程計畫表}`;
  for (const [destination, rule] of destinationRules) {
    if (rule.test(haystack)) return destination;
  }
  return "其他極光";
}

function inferAuroraNights(row) {
  const text = `${row.產品名稱} ${row.行程計畫表}`;
  const match = text.match(/(?:極光|追光|賞極光)[^\d]{0,8}(\d)\s*(?:晚|次)/);
  if (match) return Number(match[1]);
  if (/三晚|3晚|３晚/.test(text)) return 3;
  return null;
}

function inferStatus(row) {
  const status = clean(row.報名狀態);
  if (/未取得具體|未取得/.test(row.產品名稱)) return "unavailable";
  if (/結團|額滿|暫滿|候補/.test(status)) return "limited";
  if (/保證|已成團|可售|報名|熱銷|成團/.test(status)) return "bookable";
  return "needs-check";
}

function inferDataStatus(row) {
  if (/未取得具體|未取得/.test(row.產品名稱)) return "unavailable";
  const missing = [row.可選擇日期, row.航班, row.報名狀態, row.金額].filter((value) =>
    /未取得|未揭露|需進商品頁確認|來源列表未揭露/.test(value),
  );
  if (missing.length === 0) return "available";
  if (missing.length <= 2) return "partial";
  return "needs-check";
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

const xml = readFileSync(inputPath, "utf8");
const rawRows = parseWorkbook(xml);
const products = rawRows.filter((row) => agencies.includes(clean(row.旅行社名稱))).map((row, index) => {
  const name = clean(row.產品名稱);
  const priceTwd = parsePriceTwd(row.金額);
  const sourceUrl = clean(row["訂購/來源網址"]);
  return {
    id: `${clean(row.旅行社名稱)}-${index + 1}`,
    agency: clean(row.旅行社名稱),
    productName: name,
    destination: inferDestination(row),
    selectableDates: clean(row.可選擇日期),
    months: parseMonths(row.可選擇日期),
    days: parseDays(name) || parseDays(row.行程計畫表),
    auroraNights: inferAuroraNights(row),
    flightSummary: clean(row.航班),
    itinerarySummary: clean(row.行程計畫表),
    bookingStatus: clean(row.報名狀態),
    bookingStatusType: inferStatus(row),
    priceLabel: clean(row.金額),
    priceTwd,
    currency: row.金額.includes("TWD") ? "TWD" : "NTD",
    sourceUrl,
    checkedAt,
    dataStatus: inferDataStatus(row),
  };
});

const generatedAt = new Date().toISOString();
const sourceStatus = agencies.map((agency) => {
  const rows = products.filter((product) => product.agency === agency);
  const concreteRows = rows.filter((product) => product.dataStatus !== "unavailable");
  const availableRows = rows.filter((product) => product.dataStatus === "available");
  return {
    agency,
    checkedAt,
    generatedAt,
    sourceFile: basename(inputPath),
    totalRows: rows.length,
    concreteRows: concreteRows.length,
    availableRows: availableRows.length,
    status: concreteRows.length ? "updated" : "no-concrete-product",
    nextStep: concreteRows.length
      ? "下次排程或手動查核時重新產生靜態資料檔"
      : "需改用站內搜尋 UI、客服或分類頁再次確認",
  };
});

const payload = {
  schemaVersion: 1,
  checkedAt,
  generatedAt,
  sourceFile: basename(inputPath),
  updateMode: "offline-generated-static-json",
  products,
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(
  join(outputDir, "tour-products.latest.json"),
  `${JSON.stringify(payload, null, 2)}\n`,
  "utf8",
);
writeFileSync(
  join(outputDir, "source-status.json"),
  `${JSON.stringify({ checkedAt, generatedAt, sources: sourceStatus }, null, 2)}\n`,
  "utf8",
);

const csvHeaders = [
  "agency",
  "productName",
  "destination",
  "selectableDates",
  "flightSummary",
  "itinerarySummary",
  "bookingStatus",
  "priceLabel",
  "sourceUrl",
  "checkedAt",
  "dataStatus",
];
const csvRows = [
  csvHeaders.join(","),
  ...products.map((product) => csvHeaders.map((header) => csvEscape(product[header])).join(",")),
];
writeFileSync(join(outputDir, "tour-products.latest.csv"), `${csvRows.join("\n")}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      inputPath,
      outputDir,
      products: products.length,
      sources: sourceStatus,
    },
    null,
    2,
  ),
);
