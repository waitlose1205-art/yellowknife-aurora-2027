const airlineNameByCode = {
  BR: "長榮航空",
  CI: "中華航空",
  JX: "星宇航空",
  CX: "國泰航空",
  TG: "泰國航空",
  NZ: "紐西蘭航空",
  EK: "阿聯酋航空",
  QR: "卡達航空",
  TK: "土耳其航空",
};

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return clean(String(value ?? "").replace(/<[^>]+>/g, " "));
}

function uniqueMatches(text, regex, limit = 8) {
  return [...new Set(clean(text).match(regex) || [])].slice(0, limit);
}

function decodeEmbeddedJsonText(value) {
  return clean(value)
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0026/g, "&")
    .replace(/\\"/g, '"')
    .replace(/\\r|\\n|\\t/g, " ");
}

function getJsonField(segment, field) {
  return clean(segment.match(new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`, "i"))?.[1] || "");
}

function formatFlightSegment(segment) {
  const airline = getJsonField(segment, "Airline_Name");
  const code = getJsonField(segment, "Airline_Code");
  const date = getJsonField(segment, "Flight_Date");
  const departTime = getJsonField(segment, "Departure_Time");
  const departCity = getJsonField(segment, "City_Name_D");
  const arriveTime = getJsonField(segment, "Arrival_Time");
  const arriveCity = getJsonField(segment, "City_Name_A");
  if (!airline && !code && !departCity && !arriveCity) return "";
  return `${airline || airlineNameByCode[code] || "航空公司未公布"}${code ? ` ${code}` : ""}：${date} ${departTime} ${departCity} → ${arriveTime} ${arriveCity}`;
}

export function extractColatourFlight(html) {
  const normalized = decodeEmbeddedJsonText(html);
  const goBlock = normalized.match(/"FlightData_GoList"\s*:\s*\[\{([\s\S]*?)\}\]/)?.[1] || "";
  const backBlock = normalized.match(/"FlightData_BackList"\s*:\s*\[\{([\s\S]*?)\}\]/)?.[1] || "";
  const go = formatFlightSegment(goBlock);
  const back = formatFlightSegment(backBlock);
  return [go ? `去程 ${go}` : "", back ? `回程 ${back}` : ""].filter(Boolean).join("；");
}

export function extractTravel4uFlight(text) {
  const flightSection = text.match(/航班\s+參考航班([\s\S]{0,900}?)(?:※|行程特色|商品明細)/)?.[1] || "";
  if (!flightSection) return "";
  const segments = [];
  const segmentRegex = /Day\s+\d+\s+(長榮航空|中華航空|星宇航空|國泰航空|泰國航空|紐西蘭航空|阿聯酋航空|卡達航空|土耳其航空)\s+((?:BR|CI|JX|CX|TG|NZ|EK|QR|TK)\s?\d{1,4})\s+Departure\s+(.+?)\s+(\d{1,2}:\d{2}(?:\+\d)?)\s+Arrival\s+(.+?)\s+(\d{1,2}:\d{2}(?:\+\d)?)/g;
  for (const match of flightSection.matchAll(segmentRegex)) {
    const [, airline, flightCode, departureAirport, departureTime, arrivalAirport, arrivalTime] = match;
    segments.push(`${airline} ${flightCode.replace(/\s+/g, "")}：${departureAirport} ${departureTime} → ${arrivalAirport} ${arrivalTime}`);
  }
  return [segments[0] ? `去程 ${segments[0]}` : "", segments[1] ? `回程 ${segments[1]}` : ""]
    .filter(Boolean)
    .join("；");
}

export function extractPhoenixFlight(html) {
  const modal = html.match(/id=["']myPlane["'][\s\S]*?id=["']myHotel["']/i)?.[0] || "";
  if (!modal) return "";
  const segments = [];
  const rowRegex = /<div Class=["']row myTable["'][\s\S]*?<p>\s*<strong>([^<]+)<\/strong><small>([^<]*)<\/small>\s*----\s*<strong>([^<]+)<\/strong><small>([^<]*)<\/small>\s*((?:BR|CI|JX|CX|TG|NZ|EK|QR|TK)\s*\d{1,4})\s*<\/p>[\s\S]*?出發[\s\S]*?<div Class=["']col-xs-10 text-center["']>([^<]*?\d{1,2}:\d{2})<\/div>[\s\S]*?抵達[\s\S]*?<div Class=["']col-xs-10 text-center["']>([^<]*?\d{1,2}:\d{2})<\/div>/gi;
  for (const match of modal.matchAll(rowRegex)) {
    const [, departureCity, departureAirport, arrivalCity, arrivalAirport, flightCode, departureTime, arrivalTime] = match.map((value) => stripHtml(value));
    const code = flightCode.match(/^(BR|CI|JX|CX|TG|NZ|EK|QR|TK)/i)?.[1]?.toUpperCase() || "";
    segments.push(`${airlineNameByCode[code] || "航空公司未公布"} ${flightCode.replace(/\s+/g, "")}：${departureTime} ${departureCity}${departureAirport ? `(${departureAirport})` : ""} → ${arrivalTime} ${arrivalCity}${arrivalAirport ? `(${arrivalAirport})` : ""}`);
  }
  return [segments[0] ? `去程 ${segments[0]}` : "", segments[1] ? `回程 ${segments[1]}` : ""]
    .filter(Boolean)
    .join("；");
}

function extractAirlineHintFromText(value) {
  const text = clean(value);
  const codeMatch = text.match(/\b(BR|CI|JX|CX|TG|NZ|EK|QR|TK)\b/i);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    return `${airlineNameByCode[code] || ""}${airlineNameByCode[code] ? " " : ""}${code}`;
  }
  return text.match(/長榮航空|中華航空|星宇航空|國泰航空|泰國航空|紐西蘭航空|阿聯酋航空|卡達航空|土耳其航空|加拿大航空|Air Canada|WestJet/)?.[0] || "";
}

export function extractAgencyFlight({ html, text, productName, manualFlight = "" }) {
  if (manualFlight) return manualFlight;
  const colatourFlight = extractColatourFlight(html);
  if (colatourFlight) return `${colatourFlight}；實際以行前說明資料為準`;
  const travel4uFlight = extractTravel4uFlight(text);
  if (travel4uFlight) return `${travel4uFlight}；實際以行前說明資料為準`;
  const phoenixFlight = extractPhoenixFlight(html);
  if (phoenixFlight) return `${phoenixFlight}；實際以行前說明資料為準`;
  const productAirline = extractAirlineHintFromText(productName);
  if (productAirline) return `${productAirline}；產品名稱可讀航空線索，完整航段需進商品頁確認`;
  const focusedText =
    text.match(/(?:交通資訊|多元交通體驗|五星級航空)[\s\S]{0,360}/)?.[0] ||
    text.match(/(?:長榮航空|中華航空|星宇航空|紐西蘭航空|阿聯酋航空|卡達航空|土耳其航空)[\s\S]{0,160}/)?.[0] ||
    "";
  const focusedAirline = extractAirlineHintFromText(focusedText);
  if (focusedAirline) return `${focusedAirline}；官方頁可讀航空線索，完整航段需進商品頁確認`;
  const flightCodes = uniqueMatches(text, /\b(?:BR|CI|JX|CX|TG|NZ|EK|QR|TK)\s?\d{2,4}\b/g, 4);
  if (flightCodes.length) return `參考航班：${flightCodes.join("、")}；完整航段需進商品頁確認`;
  return "";
}
