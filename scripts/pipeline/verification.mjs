function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeSourceUrl(url) {
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

export function normalizeProductName(name) {
  return clean(name)
    .replace(/[｜|│]/g, " ")
    .replace(/[~～－—–・．、，,。:：()（）【】\[\]《》「」『』]/g, " ")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function normalizeForVerification(value) {
  return normalizeProductName(value)
    .replace(/20\d{2}[./-]?\d{0,2}[./-]?\d{0,2}/g, "")
    .replace(/\d{1,3}(?:,\d{3})+/g, "")
    .replace(/\d+[日天晚次]/g, "")
    .replace(/早鳥|優惠|限時|第二人|保證出發|已成團|可報名|熱銷/g, "");
}

function getBigrams(value) {
  const text = normalizeForVerification(value);
  const bigrams = new Set();
  for (let index = 0; index < text.length - 1; index += 1) {
    bigrams.add(text.slice(index, index + 2));
  }
  return bigrams;
}

export function getSimilarity(firstValue, secondValue) {
  const first = getBigrams(firstValue);
  const second = getBigrams(secondValue);
  if (!first.size || !second.size) return 0;

  let overlap = 0;
  for (const item of first) {
    if (second.has(item)) overlap += 1;
  }
  return overlap / Math.min(first.size, second.size);
}

export function isGenericSourceTitle(value) {
  const title = normalizeForVerification(value);
  if (title.length < 4) return true;
  return /^(雄獅旅遊|鳳凰旅遊|可樂旅遊|東南旅遊|山富旅遊|五福旅遊|喜鴻旅遊|長汎旅遊|首頁|旅遊)$/i.test(
    title,
  );
}

export function getSourceVerification(row) {
  const sourceUrl = normalizeSourceUrl(row["訂購/來源網址"]);
  const sourceTitle = clean(row.官方頁標題);
  const statusText = clean(row.資料狀態);

  if (/來源疑似不一致|來源不一致|商品頁不一致/.test(statusText)) {
    return { status: "mismatch", note: "來源頁與商品列疑似不一致，需人工重查來源網址" };
  }
  if (!sourceUrl) {
    return { status: "unavailable", note: "未提供可查核來源網址" };
  }
  if (!sourceTitle || isGenericSourceTitle(sourceTitle)) {
    return { status: "unchecked", note: "尚未取得可比對的官方頁標題" };
  }

  const similarity = getSimilarity(row.產品名稱, sourceTitle);
  if (similarity < 0.3) {
    return {
      status: "mismatch",
      note: `官方頁標題與商品名稱落差過大；相似度 ${Math.round(similarity * 100)}%`,
    };
  }
  return {
    status: "verified",
    note: `官方頁標題與商品名稱可對應；相似度 ${Math.round(similarity * 100)}%`,
  };
}
