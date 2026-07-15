"use client";

import { useMemo, useState } from "react";

const decisionStatuses = [
  { label: "M2", value: "已通過", note: "靜態決策基線成立" },
  { label: "動態商品資料", value: "待重查", note: "9-11 月與冬季團都納入" },
  { label: "預算", value: "NT$150,000", note: "每人原則上限" },
  { label: "策略", value: "團體優先", note: "自由行作比較基準" },
];

const seasonScopeRows = [
  {
    period: "9-11 月",
    label: "秋季極光團",
    role: "同樣是本網站重點；需納入旅行團與自由行比較。",
  },
  {
    period: "12-3 月",
    label: "冬季極光團",
    role: "可搭配雪地活動，但需檢查低溫、體力與延誤風險。",
  },
  {
    period: "4-6 月",
    label: "延伸觀測",
    role: "可保留搜尋，但要確認是否仍屬可販售極光行程。",
  },
  {
    period: "2027 與其他年份",
    label: "年份不作唯一限制",
    role: "只要是可查核的黃刀鎮極光旅行團，就可放入候選。",
  },
];

const sourceStatusRegistry = {
  yktours: {
    checkedAt: "2026-07-15",
    validUntil: "2026-08-14",
    freshnessStatus: "current",
    freshnessLabel: "今日查核",
    recheckReason: "價格、房型與活動內容會變動；正式下訂前需重查。",
    allowedDomain: "yellowknifetours.com",
    safetyStatus: "verified",
    safetyLabel: "白名單驗證",
    safetyNote: "官方套裝來源，訂購連結網域已列入允許清單。",
    trustLevel: "官方來源",
  },
  everfun: {
    checkedAt: "2026-07-15",
    validUntil: "歷史樣本",
    freshnessStatus: "recheck",
    freshnessLabel: "歷史基準，需重查",
    recheckReason: "此為 2026 已成團樣本，只可作價格底線，不可視為目前可售。",
    allowedDomain: "everfuntravel.com",
    safetyStatus: "verified",
    safetyLabel: "白名單驗證",
    safetyNote: "旅行社來源網域已列入允許清單，但商品是否仍可售需重查。",
    trustLevel: "旅行社來源",
  },
  airCanada: {
    checkedAt: "2026-07-15",
    validUntil: "2026-07-16",
    freshnessStatus: "recheck",
    freshnessLabel: "票價高波動，需重查",
    recheckReason: "航空票價與艙等會即時變動，只作成本估算支援。",
    allowedDomain: "aircanada.com",
    safetyStatus: "verified",
    safetyLabel: "白名單驗證",
    safetyNote: "航空公司官方網域已列入允許清單。",
    trustLevel: "航空官方",
  },
} as const;

type SourceStatusId = keyof typeof sourceStatusRegistry;

type CostBasis = {
  readiness: "complete" | "partial" | "missing" | "historical";
  label: string;
  totalLabel: string;
  flightDetail: string;
  hotelDetail: string;
  scheduleDetail: string;
  priceDetail: string;
  missingItems: string[];
};

const sourceSyncRows = [
  {
    name: "Yellowknife Tours 5D4N Gold",
    source: "Yellowknife Tours",
    sourceStatusId: "yktours",
    status: "已併入排序",
    amount: "CAD 1,490 + 5% GST 起（約 NT$35,698）",
    bookingUrl: "https://yellowknifetours.com/winter-packages/",
    note: "2026-2027 冬季套裝來源；需另加國際/內陸機票、冬衣、小費與稅費。",
  },
  {
    name: "Yellowknife Tours 5D4N Diamond",
    source: "Yellowknife Tours",
    sourceStatusId: "yktours",
    status: "已併入排序",
    amount: "CAD 2,398 + 5% GST 起（約 NT$57,452）",
    bookingUrl: "https://yellowknifetours.com/winter-packages/",
    note: "飯店與活動等級較高，總費用更接近預算上限。",
  },
  {
    name: "長汎 2026 三月低價團樣本",
    source: "長汎旅遊",
    sourceStatusId: "everfun",
    status: "已併入排序",
    amount: "NT$142,451",
    bookingUrl: "https://www.everfuntravel.com/globaltour/detail/UWP26319BR10TB",
    note: "歷史團體基準，不代表目前可下訂，但保留作價格底線。",
  },
  {
    name: "Air Canada YVR-YZF 月份票價",
    source: "Air Canada",
    sourceStatusId: "airCanada",
    status: "支援成本估算",
    amount: "2026/09-12 CAD 318 起（約 NT$7,256）；2027/01-03 CAD 339 起（約 NT$7,735）",
    bookingUrl: "https://www.aircanada.com/en-ca/flights-from-vancouver-to-yellowknife",
    note: "航班價格會變動；用來修正自由行與當地套裝總額，不單獨列為旅行團。",
  },
] as const;

const auroraLevels = [
  {
    level: "A 級",
    title: "抵達日不計",
    detail: "3 個完整極光夜，最符合核心任務。",
  },
  {
    level: "B 級",
    title: "3 晚，含抵達日",
    detail: "可列入比較，但不得說成三個完整夜。",
  },
];

const tourRows = [
  {
    date: "2026/01/15-01/24",
    tourName: "玩美加族~加拿大極光10日",
    code: "UWP26115BR10TA",
    cost: "NT$149,451",
    buffer: "NT$549",
    status: "臨界通過",
    budgetClass: "yellow",
    night: "B 級",
    risk: "預算幾乎沒有緩衝，任何保險、行李或匯率變動都可能超標。",
  },
  {
    date: "2026/02/12-02/21",
    tourName: "玩美加族~加拿大極光10日",
    code: "UWP26212BR10TA",
    cost: "NT$165,451",
    buffer: "-NT$15,451",
    status: "超標",
    budgetClass: "red",
    night: "B 級",
    risk: "寒假與旺季溢價明顯，必要費用後已超過上限。",
  },
  {
    date: "2026/02/19-02/28",
    tourName: "玩美加族~加拿大極光10日",
    code: "UWP26219BR10TA",
    cost: "NT$155,451",
    buffer: "-NT$5,451",
    status: "超標",
    budgetClass: "red",
    night: "B 級",
    risk: "標價接近預算，但加回必要費用後已超標。",
  },
  {
    date: "2026/03/19-03/28",
    tourName: "玩美加族~加拿大極光10日",
    code: "UWP26319BR10TB",
    cost: "NT$142,451",
    buffer: "NT$7,549",
    status: "有緩衝",
    budgetClass: "green",
    night: "B 級",
    risk: "四個樣本中唯一保有合理餘額，但仍需等待 2027 公開資料。",
  },
];

type TravelMode = "group" | "independent" | "either";
type AuroraTarget = "A" | "B" | "either";
type ComfortLevel = "basic" | "balanced" | "comfort" | "any";
type ResultStatus = "strong" | "conditional" | "backup" | "exclude";

type PlannerFilters = {
  budget: number;
  preferredMode: TravelMode;
  auroraTarget: AuroraTarget;
  riskTolerance: 1 | 2 | 3;
  comfort: ComfortLevel;
  requireVerified: boolean;
};

type CandidateOption = {
  id: string;
  title: string;
  packageName: string;
  mode: Exclude<TravelMode, "either">;
  estimatedCost: number;
  auroraLevel: Exclude<AuroraTarget, "either">;
  riskLevel: 1 | 2 | 3;
  comfort: Exclude<ComfortLevel, "any">;
  verified: boolean;
  dataState: string;
  guideUrl: string;
  guideLabel: string;
  guideNote: string;
  description: string;
  nextStep: string;
  departureWindow: string;
  productType: string;
  rankingSummary: string;
  costBasis: CostBasis;
  bookingUrl?: string;
  bookingLabel?: string;
  sourceStatusId?: SourceStatusId;
  sourceName?: string;
  sourceCheckedAt?: string;
  sourceSummary?: string;
  importedFromSource?: boolean;
};

const budgetRange = {
  min: 100000,
  max: 400000,
  step: 10000,
};

const defaultPlanner: PlannerFilters = {
  budget: 150000,
  preferredMode: "group",
  auroraTarget: "A",
  riskTolerance: 2,
  comfort: "balanced",
  requireVerified: false,
};

const modeChoices = [
  { value: "group", label: "團體優先" },
  { value: "either", label: "兩者都看" },
  { value: "independent", label: "自由行優先" },
] as const;

const auroraChoices = [
  { value: "A", label: "A級：至少 3 個完整極光夜", note: "抵達日不計" },
  { value: "B", label: "B級：至少 3 晚", note: "含抵達日" },
  { value: "either", label: "不限夜數", note: "僅作開放比較" },
] as const;

const riskChoices = [
  { value: 1, label: "保守" },
  { value: 2, label: "平衡" },
  { value: 3, label: "彈性" },
] as const;

const comfortChoices = [
  { value: "basic", label: "節制" },
  { value: "balanced", label: "平衡" },
  { value: "comfort", label: "舒適" },
  { value: "any", label: "不限" },
] as const;

const directionCategories = [
  {
    id: "group-a",
    label: "A級團體候選方向",
    title: "可選擇的 A級團體候選方向",
    summary: "A級代表抵達日不計，需保留至少 3 個完整極光夜。這裡只列方向；未匯入具體團名、價格與訂購網址前，不進入排序。",
    items: [
      {
        name: "台灣旅行社完整極光夜團",
        condition: "需有明確旅遊團名稱、訂購網址、總團費與 3 個完整極光夜口徑。",
        status: "尚未匯入具體旅行團",
      },
      {
        name: "9-11 月秋季 A級團體團",
        condition: "需確認秋季團仍包含黃刀鎮極光觀賞，且抵達日不計入完整夜。",
        status: "待匯入旅行團",
      },
      {
        name: "12-3 月冬季 A級團體團",
        condition: "需同時檢查低溫、航班延誤、飯店與補看規則。",
        status: "待匯入旅行團",
      },
    ],
  },
  {
    id: "group-b",
    label: "B級團體價格方向",
    title: "B級團體價格方向",
    summary: "B級代表 3 晚可能含抵達日，只能當價格備援，不能宣稱為 3 個完整極光夜。",
    items: [
      {
        candidateId: "group-2026-march",
        name: "玩美加族~加拿大極光10日",
        condition: "2026 三月低價團體歷史樣本，B級夜數，可作團體價格底線但不可直接下訂。",
        status: "B級歷史旅行團",
      },
      {
        name: "促銷團或短天數團",
        condition: "若抵達日被算入極光夜，排序時必須降級。",
        status: "待匯入旅行團",
      },
    ],
  },
  {
    id: "independent",
    label: "自由行候選",
    title: "自由行候選方案",
    summary: "自由行可先引用 2026 已成團樣本的航段結構、住宿等級與行程節奏作參考，再用 2027 航班與套裝價格區間重算。",
    items: [
      {
        candidateId: "source-yktours-gold-5d4n",
        name: "Yellowknife Tours 5D4N Gold Hotel Package",
        condition: "當地套裝價已查到；航班、住宿節奏先用 2026 團體樣本作參考，2027 正式下訂前重查。",
        status: "當地套裝＋2026參考",
      },
      {
        candidateId: "source-yktours-diamond-5d4n",
        name: "Yellowknife Tours 5D4N Diamond Hotel Package",
        condition: "舒適型當地套裝價已查到；以 2026 飯店等級與航段結構作自由行參考。",
        status: "舒適套裝＋2026參考",
      },
      {
        candidateId: "independent-comfort",
        name: "自由行舒適型雙人基準",
        condition: "以 2026 低價團航段、Chateau Nova／Explorer Hotel 等級與 M2.1 航班區間作估算。",
        status: "2026樣本參考估算",
      },
      {
        candidateId: "independent-basic",
        name: "自由行節制型備援",
        condition: "需先確認低價航班與住宿是否仍保住 A級完整極光夜。",
        status: "2026樣本參考估算",
      },
    ],
  },
] as const;

type DirectionCategoryId = (typeof directionCategories)[number]["id"];

const candidateOptions: CandidateOption[] = [
  {
    id: "source-yktours-gold-5d4n",
    title: "來源匯入：冬季當地套裝低價候選",
    packageName: "Yellowknife Tours 5D4N Gold Hotel Package",
    mode: "independent",
    estimatedCost: 132000,
    auroraLevel: "A",
    riskLevel: 2,
    comfort: "balanced",
    verified: true,
    dataState: "來源同步",
    guideUrl: "#source-sync",
    guideLabel: "查看來源同步",
    guideNote: "來源頁列 2026-2027 冬季套裝，Gold 5D4N 雙人房型有 CAD 1,490 + 5% GST 起價；依 1 CAD≈NT$22.8176 換算約 NT$35,698，總額仍需加機票與必要費。",
    description: "網站自動匯入的可查核來源候選；價格較有機會落在預算內，但不是台灣旅行社全包團。",
    nextStep: "前往訂購網站確認日期、房型、活動內容，再加回國際與內陸機票。",
    departureWindow: "12-4 月冬季套裝",
    productType: "當地套裝",
    rankingSummary: "價格低於預算、A級完整極光夜、官方來源可查、訂購連結通過白名單驗證。",
    costBasis: {
      readiness: "partial",
      label: "2026樣本參考估算",
      totalLabel: "參考總額 NT$132,000；Gold 套裝約 NT$35,698 起，航班與住宿節奏參考 2026 樣本",
      flightDetail: "參考 2026 團體：台灣長程飛西雅圖、陸路進溫哥華、再接加拿大內陸段至 YZF；自由行可改用 TPE-YVR-YZF 或 YVR 過夜方案。",
      hotelDetail: "參考 2026 團體住宿等級：Chateau Nova、Explorer Hotel 或同級；此套裝偏 Quality Inn／Nova Inn 等級，正式房型需重查。",
      scheduleDetail: "參考 2026/03/19-03/28 十日節奏：Day 3 抵達 YZF，Day 4 約 2 小時市區自由；自由行應把抵達夜作緩衝，保留後續 3 個完整極光夜。",
      priceDetail: "以 Gold 套裝 CAD 1,490 + 5% GST、M2.1 機票區間與 2026 團體必要費結構估算；2027 付款頁需重查。",
      missingItems: ["2027 正式航班票價", "2027 YZF 抵離時間", "2027 實際房型", "付款頁總額"],
    },
    bookingUrl: "https://yellowknifetours.com/winter-packages/",
    bookingLabel: "前往 Yellowknife Tours 訂購/詢價",
    sourceStatusId: "yktours",
    sourceName: "Yellowknife Tours",
    sourceCheckedAt: "2026-07-15",
    sourceSummary: "5D4N Gold Hotel Package；CAD 1,490 + 5% GST 起，約 NT$35,698；自由行總額以 2026 團體樣本與航班區間估算。",
    importedFromSource: true,
  },
  {
    id: "source-yktours-diamond-5d4n",
    title: "來源匯入：冬季當地套裝舒適候選",
    packageName: "Yellowknife Tours 5D4N Diamond Hotel Package",
    mode: "independent",
    estimatedCost: 155000,
    auroraLevel: "A",
    riskLevel: 2,
    comfort: "comfort",
    verified: true,
    dataState: "來源同步",
    guideUrl: "#source-sync",
    guideLabel: "查看來源同步",
    guideNote: "來源頁列 Diamond 5D4N 雙人房型有 CAD 2,398 + 5% GST 起價；依 1 CAD≈NT$22.8176 換算約 NT$57,452，舒適度較高但總費用貼近預算上限。",
    description: "網站自動匯入的舒適型來源候選；適合作為自由行舒適基準的實際商品版本。",
    nextStep: "前往訂購網站確認飯店、餐食、活動與可選日期，並重算台幣總額。",
    departureWindow: "12-4 月冬季套裝",
    productType: "當地舒適套裝",
    rankingSummary: "A級完整極光夜與官方來源加分，但舒適型總費用接近或超過預算時會降級。",
    costBasis: {
      readiness: "partial",
      label: "2026樣本參考估算",
      totalLabel: "參考總額 NT$135,000-155,000；Diamond 套裝約 NT$57,452 起",
      flightDetail: "參考 2026 團體航段結構與 M2.1 航班區間；舒適版優先 TPE-YVR 直飛＋YVR 過夜＋隔日 AC 下午班進 YZF。",
      hotelDetail: "參考 2026 Chateau Nova、Explorer Hotel 或同級；Diamond 版以 Explorer 等級或較佳房型作舒適基準。",
      scheduleDetail: "參考 2026 十日節奏，但自由行調整為 YVR 緩衝與 YZF 4 晚，確保抵達夜不計後仍有 3 個完整極光夜。",
      priceDetail: "以 Diamond 套裝 CAD 2,398 + 5% GST、M2.1 機票區間與 2026 必要費結構估算；接近 NT$150,000 時需重查低票價。",
      missingItems: ["2027 正式航班票價", "2027 實際房型", "YVR 過夜住宿價", "付款頁總額"],
    },
    bookingUrl: "https://yellowknifetours.com/winter-packages/",
    bookingLabel: "前往 Yellowknife Tours 訂購/詢價",
    sourceStatusId: "yktours",
    sourceName: "Yellowknife Tours",
    sourceCheckedAt: "2026-07-15",
    sourceSummary: "5D4N Diamond Hotel Package；CAD 2,398 + 5% GST 起，約 NT$57,452；自由行總額參考 2026 團體節奏與舒適住宿等級。",
    importedFromSource: true,
  },
  {
    id: "group-2026-march",
    title: "2026 三月低價團體樣本",
    packageName: "歷史樣本：玩美加族~加拿大極光10日（三月低價團）",
    mode: "group",
    estimatedCost: 142451,
    auroraLevel: "B",
    riskLevel: 1,
    comfort: "balanced",
    verified: true,
    dataState: "歷史基準",
    guideUrl: "#historical-baseline",
    guideLabel: "查看 2026 團體樣本",
    guideNote: "此項目是歷史比較基準，不是 2027 可下訂商品。",
    description: "目前最乾淨的團體價格基準，低於 NT$150,000 且有緩衝，但不是 2027 可下訂商品。",
    nextStep: "用來當旅行團報價的對照底線，不能直接下訂。",
    departureWindow: "2026/03 歷史樣本",
    productType: "團體歷史樣本",
    rankingSummary: "價格有緩衝、旅行社來源可查；但夜數屬B級且資料是歷史樣本，因此不能當成目前可下訂商品。",
    costBasis: {
      readiness: "historical",
      label: "歷史團體總額",
      totalLabel: "歷史必要費後 NT$142,451",
      flightDetail: "2026 團體樣本含旅行社規劃航段結構；2027 航班仍需重查。",
      hotelDetail: "黃刀鎮住宿以 Chateau Nova、Explorer Hotel 或同級為方向；實際入住需以當期商品為準。",
      scheduleDetail: "2026/03/19-03/28 歷史出發日期已知；不可直接套用至 2027。",
      priceDetail: "以團費、公告小費、ESTA、eTA 等必要費用後估算。",
      missingItems: ["2027 可售日期", "2027 實際團費", "2027 航班與飯店確認"],
    },
    bookingUrl: "https://www.everfuntravel.com/globaltour/detail/UWP26319BR10TB",
    bookingLabel: "查看長汎旅遊團頁",
    sourceStatusId: "everfun",
    sourceName: "長汎旅遊",
    sourceCheckedAt: "2026-07-15",
    sourceSummary: "歷史團體樣本；只作價格基準，不代表目前仍可售。",
    importedFromSource: true,
  },
  {
    id: "independent-comfort",
    title: "自由行舒適型雙人基準",
    packageName: "自由行方案：雙人舒適型 3 完整極光夜",
    mode: "independent",
    estimatedCost: 132000,
    auroraLevel: "A",
    riskLevel: 2,
    comfort: "comfort",
    verified: false,
    dataState: "規劃基準",
    guideUrl: "#pending-2027-recheck",
    guideLabel: "查看自由行查核項目",
    guideNote: "目前採 2026 團體航段、飯店等級與 M2.1 航班價格區間作估算；正式下訂前仍需重查。",
    description: "保留完整極光夜與較高舒適度，是團體方案的主要比較基準。",
    nextStep: "重查航班、飯店與極光活動後，與團體總費用並列表。",
    departureWindow: "2027 參考 2026 三月節奏",
    productType: "自由行規劃基準",
    rankingSummary: "A級完整極光夜與舒適度符合需求；航班、飯店與時間先用 2026 團體樣本作參考，正式報價需重查。",
    costBasis: {
      readiness: "partial",
      label: "2026樣本參考估算",
      totalLabel: "參考區間 NT$108,000-132,000",
      flightDetail: "參考 2026 團體航段與 M2.1 航班排序：優先 TPE-YVR 直飛或 Air Canada 聯程，YVR 保留過夜或至少 4 小時分票緩衝。",
      hotelDetail: "參考 2026 Chateau Nova、Explorer Hotel 或同級；自由行舒適型優先指定 Explorer 或 Chateau Nova。",
      scheduleDetail: "參考 2026/03/19-03/28 十日節奏，但自由行改為抵達夜緩衝＋3 個完整極光夜，避免把抵達日算入 A 級夜數。",
      priceDetail: "採 M2.1 舒適型雙人區間：機票 NT$42,000-55,000、Gold Explorer 或同級、2 晚 YVR 較佳住宿與必要費。",
      missingItems: ["2027 航班票價重查", "2027 飯店房價重查", "YZF 抵離時間確認", "活動與保險總額確認"],
    },
  },
  {
    id: "independent-basic",
    title: "自由行節制型備援",
    packageName: "自由行方案：節制型 3 完整極光夜備援",
    mode: "independent",
    estimatedCost: 115000,
    auroraLevel: "A",
    riskLevel: 3,
    comfort: "basic",
    verified: false,
    dataState: "規劃基準",
    guideUrl: "#decision-gates",
    guideLabel: "查看決策門檻",
    guideNote: "此項目以降低成本為主，但會提高轉機、住宿與現地安排負擔。",
    description: "最容易壓低總額，但需要承擔更多轉機、飯店與現地安排操作。",
    nextStep: "只有在願意提高操作負擔時，才納入備援池。",
    departureWindow: "2027 參考 2026 三月節奏",
    productType: "自由行節制基準",
    rankingSummary: "價格有優勢且符合 A級夜數；以 2026 團體航段與飯店等級作參考，但操作風險較高。",
    costBasis: {
      readiness: "partial",
      label: "2026樣本參考估算",
      totalLabel: "參考區間 NT$95,000-115,000",
      flightDetail: "參考 2026 團體長旅行鏈作風險基準；節制型可用較低價的 TPE-ICN/YVR 或 TPE-YVR 組合，但仍需保留 YVR 轉機緩衝。",
      hotelDetail: "參考 2026 同級住宿下限；節制型可接受 Quality Inn／Nova Inn 或同級，但不得犧牲安全與夜間恢復。",
      scheduleDetail: "參考 2026 Day 3 抵 YZF 的節奏；自由行需確保 YZF 至少 4 晚，抵達夜只當緩衝。",
      priceDetail: "採 M2.1 節制型雙人區間：機票 NT$36,000-48,000、Gold Quality/Nova、2 晚 YVR 平價住宿與基本餐飲交通。",
      missingItems: ["2027 低價航班重查", "2027 節制型房價重查", "轉機緩衝確認", "必要費總額確認"],
    },
  },
  {
    id: "independent-solo",
    title: "自由行單人舒適型",
    packageName: "自由行方案：單人舒適型上限警戒",
    mode: "independent",
    estimatedCost: 165000,
    auroraLevel: "A",
    riskLevel: 3,
    comfort: "comfort",
    verified: false,
    dataState: "高波動估算",
    guideUrl: "#decision-gates",
    guideLabel: "查看排除門檻",
    guideNote: "此項目主要用來提醒單房差與舒適度成本，不作目前主推薦。",
    description: "單房差與舒適度會明顯推高成本，適合當上限警戒，不適合作為目前主方案。",
    nextStep: "除非預算提高或找到明確降價來源，否則維持排除。",
    departureWindow: "2027 參考 2026 三月節奏",
    productType: "自由行上限警戒",
    rankingSummary: "A級夜數與舒適度達標；參考 2026 住宿等級後，單房差仍是主要超標來源。",
    costBasis: {
      readiness: "partial",
      label: "2026樣本參考估算",
      totalLabel: "參考區間 NT$125,000-165,000",
      flightDetail: "參考 2026 航段結構與 M2.1 單人機票區間；若採分票，YVR 過夜與行李風險需納入。",
      hotelDetail: "參考 2026 Chateau Nova、Explorer Hotel 或同級；單人版以 Explorer 單人或同級房價作上限警戒。",
      scheduleDetail: "參考 2026 十日節奏並保留抵達夜緩衝；單人移動需降低深夜抵達與嚴寒步行風險。",
      priceDetail: "採 M2.1 單人自由行區間：Gold Explorer 單人、溫哥華單人房、機票與必要費，單房差是主要成本來源。",
      missingItems: ["2027 單人房價重查", "2027 航班票價重查", "YVR 過夜成本確認", "必要費總額確認"],
    },
  },
];

const currencyFormatter = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return `NT$${currencyFormatter.format(value)}`;
}

function clampBudget(value: number) {
  return Math.min(budgetRange.max, Math.max(budgetRange.min, value));
}

function getModeLabel(mode: CandidateOption["mode"]) {
  return mode === "group" ? "團體" : "自由行";
}

function getComfortLabel(level: Exclude<ComfortLevel, "any">) {
  return level === "basic" ? "節制" : level === "comfort" ? "舒適" : "平衡";
}

function getAuroraLevelLabel(level: Exclude<AuroraTarget, "either">) {
  return level === "A" ? "A級：3 個完整極光夜" : "B級：3 晚含抵達日";
}

function getSourceStatus(option: CandidateOption) {
  return option.sourceStatusId ? sourceStatusRegistry[option.sourceStatusId] : null;
}

function getEstimateLabel(option: CandidateOption) {
  return option.costBasis.readiness === "complete" || option.costBasis.readiness === "historical"
    ? formatCurrency(option.estimatedCost)
    : option.costBasis.totalLabel;
}

function getBudgetStatus(option: CandidateOption, budget: number) {
  const delta = budget - option.estimatedCost;

  if (delta >= 5000) {
    return {
      className: "under",
      label: `低於目前預算 ${formatCurrency(delta)}`,
    };
  }

  if (delta >= 0) {
    return {
      className: "near",
      label: `臨界通過，剩 ${formatCurrency(delta)}`,
    };
  }

  return {
    className: "over",
    label: `超過目前預算 ${formatCurrency(Math.abs(delta))}`,
  };
}

function getDirectionIdForOption(option: CandidateOption): DirectionCategoryId {
  if (option.mode === "independent") {
    return "independent";
  }

  return option.auroraLevel === "A" ? "group-a" : "group-b";
}

function isSamePlannerFilters(first: PlannerFilters, second: PlannerFilters) {
  return (
    first.budget === second.budget &&
    first.preferredMode === second.preferredMode &&
    first.auroraTarget === second.auroraTarget &&
    first.riskTolerance === second.riskTolerance &&
    first.comfort === second.comfort &&
    first.requireVerified === second.requireVerified
  );
}

function rankDirectionItems(
  items: (typeof directionCategories)[number]["items"],
  evaluatedById: Map<string, ReturnType<typeof evaluateOption>>,
) {
  const statusOrder: Record<ResultStatus, number> = { strong: 0, conditional: 1, backup: 2, exclude: 3 };

  return [...items].sort((first, second) => {
    const firstResult = "candidateId" in first ? evaluatedById.get(first.candidateId) : null;
    const secondResult = "candidateId" in second ? evaluatedById.get(second.candidateId) : null;

    if (firstResult && secondResult) {
      return statusOrder[firstResult.status] - statusOrder[secondResult.status] || secondResult.score - firstResult.score;
    }

    if (firstResult) {
      return -1;
    }

    if (secondResult) {
      return 1;
    }

    return 0;
  });
}

function getDirectionCandidate(candidateId?: string) {
  return candidateId ? candidateOptions.find((option) => option.id === candidateId) ?? null : null;
}

function evaluateOption(option: CandidateOption, filters: PlannerFilters) {
  let score = 40;
  const reasons: string[] = [];
  const cautions: string[] = [];
  const blockers: string[] = [];
  const budgetDelta = option.estimatedCost - filters.budget;
  const sourceStatus = getSourceStatus(option);

  if (option.mode === "independent" && option.costBasis.readiness === "missing") {
    score -= 32;
    blockers.push(`自由行缺少 ${option.costBasis.missingItems.join("、")}，不能視為完整預算。`);
  } else if (option.mode === "independent" && option.costBasis.readiness === "partial") {
    score -= 8;
    cautions.push(`自由行目前採 2026 團體樣本作參考，需重查 ${option.costBasis.missingItems.join("、")} 後才能下訂。`);
  }

  if (option.costBasis.readiness === "missing") {
    cautions.push("價格仍待補完整資料，預算判讀只作提醒。");
  } else if (budgetDelta <= -5000) {
    score += 30;
    reasons.push(`低於預算 ${formatCurrency(Math.abs(budgetDelta))}，有實際緩衝。`);
  } else if (budgetDelta <= 0) {
    score += 20;
    cautions.push("低於預算但緩衝偏薄，必要費與匯率需重算。");
  } else {
    score -= 35;
    blockers.push(`超過預算 ${formatCurrency(budgetDelta)}。`);
  }

  if (filters.auroraTarget === "A") {
    if (option.auroraLevel === "A") {
      score += 25;
      reasons.push("符合 A 級：抵達日不計，保留完整極光夜。");
    } else {
      score -= 22;
      blockers.push("只有 B 級夜數，可能把抵達日誤算成完整極光夜。");
    }
  } else if (filters.auroraTarget === "B") {
    score += option.auroraLevel === "A" ? 18 : 14;
    reasons.push(option.auroraLevel === "A" ? "高於最低夜數要求。" : "符合 B 級最低夜數。");
  } else {
    score += 8;
    reasons.push("夜數條件未限制，保留作比較。");
  }

  if (filters.preferredMode === "either") {
    score += 12;
    reasons.push("符合團體與自由行並行比較。");
  } else if (filters.preferredMode === option.mode) {
    score += 18;
    reasons.push(`符合目前偏好的${getModeLabel(option.mode)}模式。`);
  } else {
    score += 4;
    cautions.push(`不是目前偏好的模式，但可作${getModeLabel(option.mode)}比較基準。`);
  }

  if (option.riskLevel <= filters.riskTolerance) {
    score += 22;
    reasons.push("風險等級在目前可接受範圍內。");
  } else if (option.riskLevel === filters.riskTolerance + 1) {
    score -= 12;
    cautions.push("風險略高，需要額外備援或人工確認。");
  } else {
    score -= 28;
    blockers.push("風險高於目前容忍度。");
  }

  if (option.verified) {
    score += 12;
    reasons.push("已有查核基準，可作比較。");
  } else if (filters.requireVerified) {
    score -= 30;
    blockers.push("尚未完成商品與動態資料正式重查。");
  } else {
    score -= 4;
    cautions.push("屬於規劃或待重查資料，不可直接下訂。");
  }

  if (sourceStatus) {
    if (sourceStatus.safetyStatus === "verified") {
      score += 8;
      reasons.push(`${sourceStatus.safetyLabel}：${sourceStatus.allowedDomain}`);
    }

    if (sourceStatus.freshnessStatus === "current") {
      score += 6;
      reasons.push(`資料新鮮度：${sourceStatus.freshnessLabel}`);
    } else {
      score -= 8;
      cautions.push(`資料新鮮度：${sourceStatus.freshnessLabel}，${sourceStatus.recheckReason}`);
    }
  }

  if (filters.comfort === "any") {
    score += 5;
  } else if (filters.comfort === option.comfort) {
    score += 10;
    reasons.push("舒適度符合目前設定。");
  } else if (filters.comfort === "comfort" && option.comfort === "basic") {
    score -= 10;
    cautions.push("舒適度低於設定，可能增加體力與操作負擔。");
  } else {
    score -= 4;
    cautions.push("舒適度與設定不同，需確認是否可接受。");
  }

  let status: ResultStatus = "exclude";
  if (blockers.length === 0 && score >= 112) {
    status = "strong";
  } else if (blockers.length === 0 && score >= 88) {
    status = "conditional";
  } else if (blockers.length <= 1 && score >= 68) {
    status = "backup";
  }

  const statusLabel =
    status === "strong" ? "強候選" : status === "conditional" ? "條件候選" : status === "backup" ? "備援" : "排除";

  return {
    option,
    score: Math.max(0, Math.min(160, score)),
    reasons,
    cautions,
    blockers,
    status,
    statusLabel,
  };
}

const pendingItems = [
  "旅行團商品完整航班與班號",
  "實際飯店名稱或同級條件",
  "YZF 抵達與離開時間",
  "自由行已引用 2026 團體航段、住宿與行程節奏作參考；2027 正式航班、房價、YZF 抵離時間仍需重查",
  "極光補看、延誤與改目的地規則",
  "必要附加費後的每人總費用",
  "行李、選位、分票與直掛風險",
];

function getDecisionGates(budget: number) {
  return [
    ["強候選", `低於 ${formatCurrency(budget)}，YZF 夜數清楚，並接近 A 級三個完整極光夜。`],
    ["條件候選", `價格接近 ${formatCurrency(budget)}，但需要明確補看、延誤或 YVR 過夜方案。`],
    ["備援", `價格、體力或證據信心不足，但仍未明顯超過 ${formatCurrency(budget)} 的可比較上限。`],
    ["排除", `超過 ${formatCurrency(budget)}、轉機過度、核心極光夜無保護，或使用未知 2027 細節作賣點。`],
  ];
}

export default function Home() {
  const [filters, setFilters] = useState<PlannerFilters>(defaultPlanner);
  const [draftFilters, setDraftFilters] = useState<PlannerFilters>(defaultPlanner);
  const [selectedDirectionId, setSelectedDirectionId] = useState<DirectionCategoryId | null>(null);
  const hasPendingChanges = !isSamePlannerFilters(draftFilters, filters);

  const evaluatedOptions = useMemo(
    () =>
      candidateOptions
        .map((option) => evaluateOption(option, filters))
        .sort((a, b) => {
          const order: Record<ResultStatus, number> = { strong: 0, conditional: 1, backup: 2, exclude: 3 };
          return order[a.status] - order[b.status] || b.score - a.score;
        }),
    [filters],
  );

  const bestOption = evaluatedOptions.find((result) => result.status !== "exclude") ?? evaluatedOptions[0];
  const activeCount = evaluatedOptions.filter((result) => result.status !== "exclude").length;
  const evaluatedById = new Map(evaluatedOptions.map((result) => [result.option.id, result]));
  const syncedDirectionId = getDirectionIdForOption(bestOption.option);
  const activeDirectionId = selectedDirectionId ?? syncedDirectionId;
  const selectedDirection =
    directionCategories.find((category) => category.id === activeDirectionId) ?? directionCategories[0];
  const rankedDirectionItems = rankDirectionItems(selectedDirection.items, evaluatedById);
  const bestSourceStatus = getSourceStatus(bestOption.option);
  const decisionGates = getDecisionGates(filters.budget);
  const applyPlannerFilters = () => {
    setFilters(draftFilters);
    setSelectedDirectionId(null);
  };
  const updateDraftFilters = (updater: (current: PlannerFilters) => PlannerFilters) => {
    setDraftFilters(updater);
  };

  return (
    <main>
      <section className="hero">
        <div className="heroOverlay" />
        <div className="heroContent">
          <p className="eyebrow">Aurora Intelligence Project - Yellowknife 2027</p>
          <h1>黃刀鎮極光旅決策儀表板</h1>
          <p className="lead">
            目前是 M2.1 市場實證與重查準備階段，不是最終下訂狀態。所有旅行團、票價與班表資料在正式付款前都必須重新查核。
          </p>
          <div className="decisionBar" aria-label="決策狀態列">
            {decisionStatuses.map((item) => (
              <div className="decisionStatus" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.note}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="summaryBand" aria-label="目前結論">
        <div className="summaryItem">
          <span className="summaryLabel">目前結論</span>
          <strong>2026 團體樣本顯示，低操作負擔可行，但預算緩衝薄。</strong>
        </div>
        <div className="summaryItem">
          <span className="summaryLabel">查核基準</span>
          <strong>查核基準日：2026-07-15；正式下訂前需重查旅行團、票價與班表。</strong>
        </div>
      </section>

      <section className="pageSection scopeSection">
        <div className="sectionHeader tableHeader">
          <div>
            <p className="eyebrow">Search Scope</p>
            <h2>極光旅遊團搜尋範圍</h2>
            <p>
              本網站不只看 2027 年 1-3 月；9 月、10 月、11 月的秋季極光團，以及冬季極光團，都應納入同一套比較。
            </p>
          </div>
          <div className="sourceNote">
            <strong>目前資料狀態</strong>
            <span>已同步來源商品會自動進入排序；缺少團名、價格或訂購網址者不列入推薦。</span>
          </div>
        </div>
        <div className="scopeGrid">
          {seasonScopeRows.map((item) => (
            <article className="scopeCard" key={item.period}>
              <span>{item.period}</span>
              <h3>{item.label}</h3>
              <p>{item.role}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pageSection sourceSyncSection" id="source-sync">
        <div className="sectionHeader tableHeader">
          <div>
            <p className="eyebrow">Source Sync</p>
            <h2>自動匯入資料源</h2>
            <p>
              網站會把已查核的旅行社與官方來源資料併入「候選方向分類」與「決策選項列表」。沒有團名、價格或訂購網址的資料，只保留在來源同步狀態，不進入推薦。
            </p>
          </div>
          <div className="sourceNote">
            <strong>同步狀態</strong>
            <span>
              已匯入 {candidateOptions.filter((option) => option.importedFromSource).length} 筆可排序候選；匯率：1 CAD ≈
              NT$22.8176；查核基準日：2026-07-15。
            </span>
          </div>
        </div>

        <div className="sourceGrid">
          {sourceSyncRows.map((source) => {
            const sourceState = sourceStatusRegistry[source.sourceStatusId];

            return (
              <article className="sourceCard" key={source.name}>
                <div className="sourceCardHeader">
                  <span>{source.status}</span>
                  <h3>{source.name}</h3>
                </div>
                <p>{source.source}</p>
                <strong>{source.amount}</strong>
                <div className="sourceStatusGrid">
                  <span>資料新鮮度：{sourceState.freshnessLabel}</span>
                  <span>{sourceState.safetyLabel}</span>
                  <span>{sourceState.trustLevel}</span>
                </div>
                <small>{source.note}</small>
                <small>{sourceState.recheckReason}</small>
                <div className="sourceActions">
                  <a href={source.bookingUrl} rel="noreferrer" target="_blank">
                    訂購網站
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="pageSection simulatorSection" id="decision-simulator">
        <div className="sectionHeader">
          <p className="eyebrow">Decision Options</p>
          <h2>決策選項列表</h2>
          <p>先設定預算、旅行型態、極光夜數與風險容忍度；按下確認並查核後，才更新推薦與候選方向。</p>
        </div>

        <div className="simulatorShell">
          <aside className="controlPanel" aria-label="可調整條件">
            <div className="controlGroup">
              <div className="controlLabel">
                <span>預算上限</span>
                <strong>{formatCurrency(draftFilters.budget)}</strong>
              </div>
              <input
                aria-label="預算上限"
                max={budgetRange.max}
                min={budgetRange.min}
                onChange={(event) =>
                  updateDraftFilters((current) => ({ ...current, budget: clampBudget(Number(event.target.value)) }))
                }
                step={budgetRange.step}
                type="range"
                value={draftFilters.budget}
              />
              <input
                aria-label="直接輸入預算"
                className="budgetNumber"
                max={budgetRange.max}
                min={budgetRange.min}
                onChange={(event) =>
                  updateDraftFilters((current) => ({
                    ...current,
                    budget: clampBudget(Number(event.target.value) || current.budget),
                  }))
                }
                step={budgetRange.step}
                type="number"
                value={draftFilters.budget}
              />
              <span className="rangeHint">可選區間：NT$100,000 - NT$400,000</span>
            </div>

            <div className="controlGroup">
              <span className="controlTitle">旅行型態</span>
              <div className="segmentedControl">
                {modeChoices.map((choice) => (
                  <button
                    aria-pressed={draftFilters.preferredMode === choice.value}
                    className={draftFilters.preferredMode === choice.value ? "active" : ""}
                    key={choice.value}
                    onClick={() => updateDraftFilters((current) => ({ ...current, preferredMode: choice.value }))}
                    type="button"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="controlGroup">
              <span className="controlTitle">最低極光夜數</span>
              <div className="segmentedControl auroraControl">
                {auroraChoices.map((choice) => (
                  <button
                    aria-pressed={draftFilters.auroraTarget === choice.value}
                    className={draftFilters.auroraTarget === choice.value ? "active" : ""}
                    key={choice.value}
                    onClick={() => updateDraftFilters((current) => ({ ...current, auroraTarget: choice.value }))}
                    type="button"
                  >
                    <span>{choice.label}</span>
                    <small>{choice.note}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="controlGroup">
              <span className="controlTitle">風險容忍度</span>
              <div className="segmentedControl">
                {riskChoices.map((choice) => (
                  <button
                    aria-pressed={draftFilters.riskTolerance === choice.value}
                    className={draftFilters.riskTolerance === choice.value ? "active" : ""}
                    key={choice.value}
                    onClick={() => updateDraftFilters((current) => ({ ...current, riskTolerance: choice.value }))}
                    type="button"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="controlGroup">
              <span className="controlTitle">舒適程度</span>
              <div className="segmentedControl comfortControl">
                {comfortChoices.map((choice) => (
                  <button
                    aria-pressed={draftFilters.comfort === choice.value}
                    className={draftFilters.comfort === choice.value ? "active" : ""}
                    key={choice.value}
                    onClick={() => updateDraftFilters((current) => ({ ...current, comfort: choice.value }))}
                    type="button"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="toggleRow">
              <input
                checked={draftFilters.requireVerified}
                onChange={(event) =>
                  updateDraftFilters((current) => ({ ...current, requireVerified: event.target.checked }))
                }
                type="checkbox"
              />
              <span>只採已查核資料；未重查的 2027 方向自動降級。</span>
            </label>

            <div className="applyPlannerBox">
              <button className="applyPlannerButton" onClick={applyPlannerFilters} type="button">
                確認並查核
              </button>
              <span className={`applyPlannerStatus ${hasPendingChanges ? "pending" : "ready"}`}>
                {hasPendingChanges
                  ? "條件已修改，尚未查核；下方仍顯示上次確認結果。"
                  : "條件已確認；下方推薦與候選方向已同步。"}
              </span>
            </div>

            <p className="simulatorHint">查核結果是規劃輔助，不會取代正式下訂前確認。</p>
          </aside>

          <div className="resultPanel" aria-live="polite">
            <div className={`topRecommendation ${bestOption.status}`}>
              <span className="recommendationKicker">目前最適合</span>
              <strong>{bestOption.option.packageName}</strong>
              <div className="resultCounts">
                <span>可考慮 {activeCount}</span>
                <span>排除 {evaluatedOptions.length - activeCount}</span>
              </div>
              <div className="recommendationMeta">
                <span>已確認條件</span>
                <span>預算基準 {formatCurrency(filters.budget)}</span>
                <span>{bestOption.option.productType}</span>
                <span>{bestOption.option.departureWindow}</span>
                <span>{bestOption.option.title}</span>
                <span>{bestOption.option.dataState}</span>
                <span>{bestOption.option.costBasis.label}</span>
                <span>{getAuroraLevelLabel(bestOption.option.auroraLevel)}</span>
                {bestOption.option.sourceName ? <span>{bestOption.option.sourceName}</span> : null}
                {bestSourceStatus ? <span>{bestSourceStatus.safetyLabel}</span> : null}
                {bestSourceStatus ? <span>{bestSourceStatus.freshnessLabel}</span> : null}
              </div>
              <p>
                {bestOption.statusLabel}；分數 {bestOption.score}。{bestOption.option.description}
              </p>
              <div className="rankingSummary">
                <strong>為什麼這樣排：</strong>
                <span>{bestOption.option.rankingSummary}</span>
              </div>
              <div className="recommendationAction">
                {bestOption.option.bookingUrl ? (
                  <a className="bookingLink" href={bestOption.option.bookingUrl} rel="noreferrer" target="_blank">
                    {bestOption.option.bookingLabel ?? "訂購網站"}
                  </a>
                ) : null}
                <a href={bestOption.option.guideUrl}>{bestOption.option.guideLabel}</a>
                <small>{bestOption.option.guideNote}</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pageSection directionSection" id="candidate-directions">
        <div className="sectionHeader tableHeader">
          <div>
            <p className="eyebrow">Candidate Directions</p>
            <h2>候選方向分類</h2>
            <p>
              這裡使用上方已確認條件，把 A級團體、B級團體與自由行候選分開。點選分類後，下方會列出旅行團或自由行方案。
            </p>
          </div>
          <div className="sourceNote">
            <strong>排序規則</strong>
            <span>按下確認並查核後，才會依預算、夜數、型態與風險重新排序。</span>
          </div>
        </div>

        <div className="directionChooser" aria-label="候選方向分類選擇">
          {directionCategories.map((category) => (
            <button
              aria-pressed={activeDirectionId === category.id}
              className={activeDirectionId === category.id ? "active" : ""}
              key={category.id}
              onClick={() => setSelectedDirectionId(category.id)}
              type="button"
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="directionDetail">
          <div className="directionIntro">
            <h3>{selectedDirection.title}</h3>
            <p>{selectedDirection.summary}</p>
          </div>
          <div className="directionBudgetNote">
            已確認價格基準：{formatCurrency(filters.budget)}；候選方向已依上方確認條件重新查核。
          </div>
          <div className="directionListHeader">旅行團與方案清單</div>
          <div className="directionList">
            {rankedDirectionItems.map((item) => {
              const linkedOption = "candidateId" in item ? getDirectionCandidate(item.candidateId) : null;
              const linkedResult = linkedOption ? evaluatedById.get(linkedOption.id) : null;
              const budgetStatus = linkedOption ? getBudgetStatus(linkedOption, filters.budget) : null;

              return (
                <article className={`directionItem ${linkedOption ? "linked" : "pending"}`} key={item.name}>
                  <span>{item.status}</span>
                  <h3>{item.name}</h3>
                  {linkedResult ? (
                    <div className="directionResultRow">
                      <span className={`recommendationBadge ${linkedResult.status}`}>{linkedResult.statusLabel}</span>
                      <small>分數 {linkedResult.score}</small>
                    </div>
                  ) : null}
                  <p>{item.condition}</p>
                  {linkedOption ? (
                    <div className="directionTourMeta">
                      <strong>{linkedOption.packageName}</strong>
                      <small>
                        {linkedOption.productType}｜{linkedOption.departureWindow}
                      </small>
                      <small>{linkedOption.costBasis.totalLabel}</small>
                      {budgetStatus ? (
                        <small className={`directionBudgetBasis ${budgetStatus.className}`}>
                          以目前預算上限 {formatCurrency(filters.budget)} 判讀：{budgetStatus.label}
                        </small>
                      ) : null}
                      <small>資料狀態：{linkedOption.dataState}</small>
                    </div>
                  ) : null}
                  {linkedOption ? (
                    <details className="directionInfoDetail">
                      <summary>查看航班、住宿與價格詳細資訊</summary>
                      <div className="directionInfoGrid">
                        <span>
                          <strong>航班</strong>
                          {linkedOption.costBasis.flightDetail}
                        </span>
                        <span>
                          <strong>住宿</strong>
                          {linkedOption.costBasis.hotelDetail}
                        </span>
                        <span>
                          <strong>時間</strong>
                          {linkedOption.costBasis.scheduleDetail}
                        </span>
                        <span>
                          <strong>價格</strong>
                          {linkedOption.costBasis.priceDetail}
                        </span>
                      </div>
                      {linkedOption.costBasis.missingItems.length > 0 ? (
                        <div className="directionUnpublished">
                          <strong>尚未公布／需重查</strong>
                          <span>{linkedOption.costBasis.missingItems.join("、")}</span>
                        </div>
                      ) : null}
                    </details>
                  ) : (
                    <div className="directionUnpublished">
                      <strong>詳細資訊</strong>
                      <span>尚未公布</span>
                    </div>
                  )}
                  {linkedResult ? (
                    <div className="directionRankingSummary">
                      <strong>排序理由</strong>
                      <span>{linkedOption?.rankingSummary}</span>
                      {[...linkedResult.blockers, ...linkedResult.cautions].length > 0 ? (
                        <small>{[...linkedResult.blockers, ...linkedResult.cautions].slice(0, 2).join("；")}</small>
                      ) : null}
                    </div>
                  ) : (
                    <div className="directionRankingSummary">
                      <strong>排序理由</strong>
                      <span>尚未公布具體價格、航班、住宿與訂購網址，暫不納入推薦。</span>
                    </div>
                  )}
                  {linkedOption?.bookingUrl ? (
                    <a className="directionTourLink" href={linkedOption.bookingUrl} rel="noreferrer" target="_blank">
                      {linkedOption.bookingLabel ?? "訂購網站"}
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="contentGrid">
        <article className="panel warningPanel">
          <div className="sectionHeader">
            <p className="eyebrow">Aurora Nights</p>
            <h2>A/B 極光夜數視覺標籤</h2>
          </div>
          <div className="badgeGrid">
            {auroraLevels.map((item) => (
              <div className="auroraBadge" key={item.level}>
                <span>{item.level}</span>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="sectionHeader">
            <p className="eyebrow">Mission Priority</p>
            <h2>判定順序</h2>
          </div>
          <div className="priorityStack">
            <span>1. 極光機會</span>
            <span>2. 安全</span>
            <span>3. 體力</span>
            <span>4. 體驗</span>
          </div>
        </article>
      </section>

      <section className="tableSection" id="historical-baseline">
        <div className="sectionHeader tableHeader">
          <div>
            <p className="eyebrow">Historical Baseline</p>
            <h2>2026 團體樣本比較強化</h2>
            <p>
              綠：低於預算且有緩衝；黃：臨界通過；紅：必要費用後超標。
            </p>
          </div>
          <div className="sourceNote">
            <strong>查核基準日：2026-07-15</strong>
            <span>正式下訂前需重查</span>
          </div>
        </div>
        <div className="tableWrap tourTableWrap">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>旅遊團名稱</th>
                <th>必要費用後</th>
                <th>預算餘額</th>
                <th>夜數</th>
                <th>判定</th>
                <th>主要風險</th>
              </tr>
            </thead>
            <tbody>
              {tourRows.map((row) => (
                <tr className={`budgetRow ${row.budgetClass}`} key={row.code}>
                  <td>{row.date}</td>
                  <td>{row.tourName}</td>
                  <td>{row.cost}</td>
                  <td>{row.buffer}</td>
                  <td>
                    <span className="nightPill">{row.night}</span>
                  </td>
                  <td>
                    <span className={`statusPill ${row.budgetClass}`}>{row.status}</span>
                  </td>
                  <td>{row.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobileTourCards" aria-label="手機版團體樣本卡片">
          {tourRows.map((row) => (
            <article className={`tourCard ${row.budgetClass}`} key={row.code}>
              <div>
                <span className="cardDate">{row.date}</span>
                <strong>{row.tourName}</strong>
              </div>
              <dl>
                <div>
                  <dt>總額</dt>
                  <dd>{row.cost}</dd>
                </div>
                <div>
                  <dt>夜數</dt>
                  <dd>{row.night}</dd>
                </div>
                <div>
                  <dt>判定</dt>
                  <dd>{row.status}</dd>
                </div>
                <div>
                  <dt>風險</dt>
                  <dd>{row.risk}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="contentGrid">
        <article className="panel pendingPanel" id="pending-2027-recheck">
          <div className="sectionHeader">
            <p className="eyebrow">PENDING_2027_RECHECK</p>
            <h2>尚不可下結論</h2>
            <p>缺少下列任一資訊時，只能列為待重查，不可作最終下訂判定。</p>
          </div>
          <ul className="checkList">
            {pendingItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel" id="decision-gates">
          <div className="sectionHeader">
            <p className="eyebrow">Decision Gates</p>
            <h2>決策門檻區</h2>
          </div>
          <div className="gateList">
            {decisionGates.map(([label, body]) => (
              <div className="gateItem" key={label}>
                <strong>{label}</strong>
                <span>{body}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="closingPanel">
        <p className="eyebrow">Current Recommendation</p>
        <h2>先穩住比較基準，再匯入可查核的極光團商品</h2>
        <p>
          旅行團仍可作為低操作負擔方案，但目前看來自由行舒適型雙人仍是重要基準。
          任何極光旅行團商品，只要缺少完整日期、團費、航班、YZF 抵離時間、飯店、
          極光補看或延誤條款，就先標示為 PENDING_2027_RECHECK。
        </p>
      </section>
    </main>
  );
}
