import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
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
const liveDetailCheck = process.argv.includes("--live-detail-check");

const supplementalInputPaths = [
  "taiwan_aurora_tours_refresh_2026-07-16_all-agency-detail.xls",
  "taiwan_aurora_tours_refresh_2026-07-16_colatour-fixed.xls",
  "taiwan_aurora_tours_refresh_2026-07-16_lion-api.xls",
  "taiwan_aurora_tours_refresh_2026-07-16_four-agency-no-eztravel.xls",
]
  .map((file) => join(process.cwd(), "exports", file))
  .filter((file) => existsSync(file) && file !== inputPath);

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

function decodeHtml(value) {
  return clean(value)
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeHeader(header) {
  const cleanHeader = clean(header).replace(/^\d+\.\s*/, "");
  const headerMap = {
    旅行社: "旅行社名稱",
    "產品或來源": "產品名稱",
    預計航班: "航班",
    來源網址: "訂購/來源網址",
    "資料狀態/查核限制": "資料狀態",
  };

  return headerMap[cleanHeader] || cleanHeader;
}

function parseWorkbook(xml, preferredSheets = ["極光旅行團查詢", "今日起極光旅行團主表"]) {
  const sheets = [...xml.matchAll(/<Worksheet[^>]*ss:Name="([^"]+)"[\s\S]*?<Table>([\s\S]*?)<\/Table>/g)]
    .map((sheet) => ({ name: decodeXml(sheet[1]), table: sheet[2] }));
  const sheet =
    sheets.find((candidate) => preferredSheets.includes(candidate.name)) ||
    sheets.find((candidate) => /旅行團|主表/.test(candidate.name)) ||
    sheets[0];

  if (!sheet) {
    throw new Error("找不到可讀取的工作表");
  }

  const rows = [...sheet.table.matchAll(/<Row[^>]*>([\s\S]*?)<\/Row>/g)].map((row) =>
    [...row[1].matchAll(/<Data[^>]*>([\s\S]*?)<\/Data>/g)].map((cell) =>
      clean(decodeXml(cell[1])),
    ),
  );
  const headers = rows.shift()?.map(normalizeHeader) ?? [];
  return rows
    .filter((row) => row.some(Boolean))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])))
    .filter((row) => row.旅行社名稱 && row.產品名稱);
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
  const status = getBookingStatus(row);
  if (/未取得具體|未取得/.test(row.產品名稱)) return "unavailable";
  if (/結團|額滿|暫滿|候補/.test(status)) return "limited";
  if (/保證|已成團|可售|報名|熱銷|成團/.test(status)) return "bookable";
  return "needs-check";
}

function inferDataStatus(row) {
  if (/未取得具體|未取得/.test(row.產品名稱)) return "unavailable";
  const missing = [row.可選擇日期, row.航班, getBookingStatus(row), row.金額].filter((value) =>
    /未取得|未揭露|需進商品頁確認|來源列表未揭露/.test(value),
  );
  if (missing.length === 0) return "available";
  if (missing.length <= 2) return "partial";
  return "needs-check";
}

function isMissingValue(value) {
  return /未取得|未揭露|需進商品頁確認|來源列表未揭露|未於專題頁摘要顯示/.test(clean(value));
}

function inferBookingFromItinerary(value) {
  const text = clean(value);
  const match = text.match(/(?:席位\s*[^；]+；)?成團狀態\s*[^；]+/);
  return match?.[0] || "";
}

function getBookingStatus(row) {
  const status = clean(row.報名狀態);
  const itineraryStatus = inferBookingFromItinerary(row.行程計畫表);
  if ((!status || isMissingValue(status)) && itineraryStatus) return itineraryStatus;
  return status;
}

function normalizeSourceUrl(url) {
  const value = clean(url);
  if (!value) return "";
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    return parsed.toString();
  } catch {
    return value;
  }
}

function normalizeProductName(name) {
  return clean(name)
    .replace(/[｜|│]/g, " ")
    .replace(/[~～－—–・．、，,。:：()（）【】\[\]《》「」『』]/g, " ")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function productKeys(row) {
  const agency = clean(row.旅行社名稱);
  const sourceUrl = normalizeSourceUrl(row["訂購/來源網址"]);
  const name = normalizeProductName(row.產品名稱);
  return [
    sourceUrl ? `url:${sourceUrl}` : "",
    agency && name ? `name:${agency}:${name}` : "",
  ].filter(Boolean);
}

function completenessScore(row) {
  const fields = [row.可選擇日期, row.航班, row.行程計畫表, row.報名狀態, row.金額];
  return fields.reduce((score, value) => {
    const text = clean(value);
    if (!text) return score;
    return score + (isMissingValue(text) ? 1 : 4);
  }, 0);
}

function shouldUseSupplementalValue(currentValue, nextValue) {
  const current = clean(currentValue);
  const next = clean(nextValue);
  if (!next) return false;
  if (!current) return true;
  if (isMissingValue(current) && !isMissingValue(next)) return true;
  return next.length > current.length * 1.4 && !isMissingValue(next);
}

function loadSupplementalRows(paths) {
  const rows = [];
  for (const file of paths) {
    const xml = readFileSync(file, "utf8");
    for (const row of parseWorkbook(xml)) {
      rows.push({
        ...row,
        __sourceFile: basename(file),
        __score: completenessScore(row),
      });
    }
  }
  return rows;
}

function buildSupplementalIndex(rows) {
  const index = new Map();
  for (const row of rows) {
    for (const key of productKeys(row)) {
      const current = index.get(key);
      if (!current || row.__score > current.__score) {
        index.set(key, row);
      }
    }
  }
  return index;
}

function mergeRowWithSupplemental(row, supplementalIndex) {
  const matches = productKeys(row)
    .map((key) => supplementalIndex.get(key))
    .filter(Boolean)
    .sort((a, b) => b.__score - a.__score);
  const supplemental = matches[0];

  if (!supplemental) return row;

  const merged = { ...row };
  for (const field of ["可選擇日期", "航班", "行程計畫表", "報名狀態", "金額", "訂購/來源網址"]) {
    if (shouldUseSupplementalValue(merged[field], supplemental[field])) {
      merged[field] = supplemental[field];
    }
  }

  merged.資料狀態 = [
    clean(row.資料狀態),
    `已合併 ${supplemental.__sourceFile} 的商品頁查核資料`,
  ]
    .filter(Boolean)
    .join("；");

  return merged;
}

function stripHtml(html) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function uniqueMatches(text, regex, limit = 8) {
  return [...new Set(clean(text).match(regex) || [])].slice(0, limit);
}

function requestText(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      resolve(null);
      return;
    }

    const client = parsed.protocol === "http:" ? http : https;
    const request = client.get(
      parsed,
      {
        timeout: 15000,
        headers: {
          "accept-language": "zh-TW,zh;q=0.9,en;q=0.8",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        },
      },
      (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location &&
          redirects < 4
        ) {
          resolve(requestText(new URL(response.headers.location, parsed).href, redirects + 1));
          return;
        }

        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () =>
          resolve({
            statusCode: response.statusCode,
            contentType: response.headers["content-type"] || "",
            data,
            finalUrl: parsed.href,
          }),
        );
      },
    );
    request.on("timeout", () => request.destroy(new Error("detail request timeout")));
    request.on("error", reject);
  });
}

function extractGenericDetail(html) {
  const text = stripHtml(html);
  return {
    dates: uniqueMatches(
      text,
      /(?:20\d{2}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}(?:\([日一二三四五六]\))?)/g,
      10,
    ),
    prices: uniqueMatches(text, /(?:NT\$|TWD|NTD)?\s?\$?\s?\d{1,3}(?:,\d{3})+(?:\s?起)?/g, 8),
    airlines: uniqueMatches(
      text,
      /(?:長榮航空|中華航空|星宇航空|國泰航空|泰國航空|紐西蘭航空|阿聯酋航空|卡達航空|土耳其航空|加拿大航空|Air Canada|WestJet|BR|CI|JX|CX|TG|NZ|EK|QR|TK)/g,
      10,
    ),
    booking:
      text.match(/(?:已成團|保證出發|可報名|可售|熱銷|候補|額滿|結團|暫滿)/)?.[0] || "",
  };
}

function extractLionDetail(html) {
  const match = html.match(/id="detailPagePara"[^>]*data-TravelInfo="([^"]+)"/);
  if (!match) return null;

  try {
    const detail = JSON.parse(decodeHtml(match[1]));
    const group = detail.GroupInfo;
    if (!group) return null;

    const outbound = `${detail.GoAirline || "未公布"}：${detail.GoDepartureAirport || "未公布"} ${detail.GoDepartureTime || "未公布"} → ${detail.GoArriveAirport || "未公布"} ${detail.GoArriveTime || "未公布"}`;
    const inbound = `${detail.BackAirline || "未公布"}：${detail.BackDepartureAirport || "未公布"} ${detail.BackDepartureTime || "未公布"} → ${detail.BackArriveAirport || "未公布"} ${detail.BackArriveTime || "未公布"}`;

    return {
      dates: group.GoDate ? [`${group.GoDate} - ${group.BackDate || "回程日未公布"}`] : [],
      flight: `${outbound}；${inbound}；去程轉機 ${detail.GoTransferCount ?? "未公布"} 次、回程轉機 ${detail.BackTransferCount ?? "未公布"} 次；團號 ${group.GroupID || "未公布"}；TourID ${group.TourID || "未公布"}`,
      booking: `席位 ${group.SpareSeats ?? "未公布"}/${group.TotalSeats ?? "未公布"}；成團狀態 ${group.IsEnsureGroup ? "已成團/保證出發" : "未標示保證出發"}`,
      price: group.Price ? `TWD ${group.Price} 起` : "",
    };
  } catch {
    return null;
  }
}

async function enrichRowFromDetailPage(row) {
  const url = normalizeSourceUrl(row["訂購/來源網址"]);
  if (!url || !/^https?:\/\//.test(url)) return row;

  try {
    const response = await requestText(url);
    if (!response || response.statusCode >= 400 || !response.data) return row;

    const lionDetail = url.includes("travel.liontravel.com/detail")
      ? extractLionDetail(response.data)
      : null;
    const genericDetail = extractGenericDetail(response.data);
    const merged = { ...row };
    const notes = [];

    if (lionDetail?.flight && shouldUseSupplementalValue(merged.航班, lionDetail.flight)) {
      merged.航班 = lionDetail.flight;
      notes.push("商品頁內嵌結構化航班");
    } else if (
      isMissingValue(merged.航班) &&
      genericDetail.airlines.length &&
      !/首頁|專題/.test(url)
    ) {
      merged.航班 = `${genericDetail.airlines.join("、")}；完整航段仍以商品頁為準`;
      notes.push("商品頁可讀航空線索");
    }

    if (lionDetail?.dates?.length && shouldUseSupplementalValue(merged.可選擇日期, lionDetail.dates[0])) {
      merged.可選擇日期 = `${lionDetail.dates[0]}；原始列表：${merged.可選擇日期}`;
      notes.push("商品頁可讀日期");
    } else if (isMissingValue(merged.可選擇日期) && genericDetail.dates.length) {
      merged.可選擇日期 = genericDetail.dates.join("、");
      notes.push("商品頁可讀日期線索");
    }

    if (lionDetail?.price && shouldUseSupplementalValue(merged.金額, lionDetail.price)) {
      merged.金額 = lionDetail.price;
      notes.push("商品頁可讀金額");
    } else if (isMissingValue(merged.金額) && genericDetail.prices.length) {
      merged.金額 = genericDetail.prices[0];
      notes.push("商品頁可讀金額線索");
    }

    if (lionDetail?.booking && shouldUseSupplementalValue(merged.報名狀態, lionDetail.booking)) {
      merged.報名狀態 = lionDetail.booking;
      notes.push("商品頁可讀報名狀態");
    } else if (isMissingValue(merged.報名狀態) && genericDetail.booking) {
      merged.報名狀態 = genericDetail.booking;
      notes.push("商品頁可讀報名狀態線索");
    }

    if (notes.length) {
      merged.資料狀態 = [clean(merged.資料狀態), `每日明細查核：${notes.join("、")}`]
        .filter(Boolean)
        .join("；");
    }

    return merged;
  } catch {
    return row;
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

const xml = readFileSync(inputPath, "utf8");
const rawRows = parseWorkbook(xml);
const supplementalRows = loadSupplementalRows(supplementalInputPaths);
const supplementalIndex = buildSupplementalIndex(supplementalRows);
const mergedRows = rawRows.map((row) => mergeRowWithSupplemental(row, supplementalIndex));
const enrichedRows = liveDetailCheck
  ? await mapWithConcurrency(mergedRows, 4, (row) => enrichRowFromDetailPage(row))
  : mergedRows;
const products = enrichedRows.filter((row) => agencies.includes(clean(row.旅行社名稱))).map((row, index) => {
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
    bookingStatus: getBookingStatus(row),
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
      liveDetailCheck,
      supplementalInputPaths: supplementalInputPaths.map((file) => basename(file)),
      sources: sourceStatus,
    },
    null,
    2,
  ),
);
