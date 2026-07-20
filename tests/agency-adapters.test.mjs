import assert from "node:assert/strict";
import test from "node:test";
import {
  extractColatourFlight,
  extractTravel4uFlight,
} from "../scripts/pipeline/agencies/flight-adapter.mjs";
import {
  getSourceVerification,
  normalizeSourceUrl,
} from "../scripts/pipeline/verification.mjs";

test("Colatour adapter extracts outbound and return flight segments", () => {
  const html = String.raw`{
    "FlightData_GoList":[{"Airline_Name":"長榮航空","Airline_Code":"BR26","Flight_Date":"2026/09/04","Departure_Time":"23:40","City_Name_D":"台北","Arrival_Time":"19:40","City_Name_A":"西雅圖"}],
    "FlightData_BackList":[{"Airline_Name":"長榮航空","Airline_Code":"BR25","Flight_Date":"2026/09/12","Departure_Time":"01:30","City_Name_D":"西雅圖","Arrival_Time":"05:20","City_Name_A":"台北"}]
  }`;
  const result = extractColatourFlight(html);
  assert.match(result, /去程 長榮航空 BR26/);
  assert.match(result, /回程 長榮航空 BR25/);
});

test("Travel4u adapter extracts two labeled flight rows", () => {
  const text =
    "航班 參考航班 Day 1 長榮航空 BR 26 Departure 台北桃園 TPE 23:40 Arrival 西雅圖 SEA 19:40 Day 9 長榮航空 BR 25 Departure 西雅圖 SEA 01:30 Arrival 台北桃園 TPE 05:20 ※";
  const result = extractTravel4uFlight(text);
  assert.match(result, /去程 長榮航空 BR26/);
  assert.match(result, /回程 長榮航空 BR25/);
});

test("source verification separates identity matching from field completeness", () => {
  const row = {
    產品名稱: "加拿大黃刀鎮極光三晚十日",
    官方頁標題: "加拿大黃刀鎮極光三晚十日｜山富旅遊",
    "訂購/來源網址": "https://example.com/tour?utm_source=test#detail",
    資料狀態: "航班待補",
  };
  assert.equal(getSourceVerification(row).status, "verified");
  assert.equal(normalizeSourceUrl(row["訂購/來源網址"]), "https://example.com/tour");
});
