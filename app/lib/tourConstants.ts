import type { FilterState, FlightCompleteness, Product } from "./tourTypes";

export const ALL_DESTINATIONS = "全部目的地";
export const ALL_AGENCIES = "全部旅行社";
export const PRIMARY_DESTINATION = "黃刀鎮";

export const DEFAULT_FILTERS: FilterState = {
  budget: 150000,
  destination: PRIMARY_DESTINATION,
  agency: ALL_AGENCIES,
  month: 0,
  minimumNights: 0,
  onlyConcrete: true,
};

export const monthOptions = [
  { value: 0, label: "不限月份" },
  { value: 9, label: "9 月" },
  { value: 10, label: "10 月" },
  { value: 11, label: "11 月" },
  { value: 12, label: "12 月" },
  { value: 1, label: "1 月" },
  { value: 2, label: "2 月" },
  { value: 3, label: "3 月" },
];

export const dataStatusLabel: Record<Product["dataStatus"], string> = {
  available: "欄位完整",
  partial: "部分可用",
  "needs-check": "需進商品頁確認",
  unavailable: "未取得商品",
};

export const sourceVerificationLabel = {
  verified: "來源頁身分已核對",
  mismatch: "來源疑似不一致",
  unchecked: "來源頁身分待核對",
  unavailable: "未提供來源",
} as const;

export const flightCompletenessLabel: Record<FlightCompleteness, string> = {
  complete: "已取得航段與時間",
  partial: "僅有部分航班資訊",
  "official-not-disclosed": "官方尚未完整公開",
  unavailable: "尚未取得航班資訊",
};
