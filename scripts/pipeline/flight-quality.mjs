function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function classifyFlight(value) {
  const text = clean(value);
  if (/^[A-Z]{2}$/.test(text)) return "code-only";
  if (/官方商品頁目前未公開完整航班|官方頁目前未公開完整航班/.test(text)) {
    return "official-not-disclosed";
  }
  if (/喜鴻官方頁採動態載入/.test(text)) return "dynamic-page-not-read";
  if (/完整航段與飛行時間需進商品頁確認|完整航段仍以商品頁為準|完整航段需進商品頁確認/.test(text)) {
    return "airline-or-partial-only";
  }
  if (!text || /未取得|來源列表未揭露|需進商品頁確認/.test(text)) return "missing-flight";
  if (/參考航班/.test(text) && !/\d{1,2}:\d{2}/.test(text)) return "reference-route-no-time";
  if (/\d{1,2}:\d{2}/.test(text) && /→|->|至|到/.test(text)) return "has-flight-times";
  return "partial-flight-text";
}
