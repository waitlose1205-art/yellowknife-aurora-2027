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
  eztravel: {
    checkedAt: "2026-07-16",
    validUntil: "2026-07-17",
    freshnessStatus: "recheck",
    freshnessLabel: "今日比對，未入排序",
    recheckReason: "目前只確認 ezTravel 有美加/加拿大跟團入口與一般加拿大商品；未取得黃刀鎮極光團具體頁。",
    allowedDomain: "vacation.eztravel.com.tw",
    safetyStatus: "verified",
    safetyLabel: "白名單驗證",
    safetyNote: "旅行社官方網域已列入允許清單；需等具體團名、日期、價格與航班頁面後才顯示為候選。",
    trustLevel: "旅行社來源待查",
  },
} as const;

type SourceStatusId = keyof typeof sourceStatusRegistry;

type FlightOption = {
  priority: number;
  airline: string;
  route: string;
  role: string;
  recommendedUse: string;
  riskCheck: string;
  estimate: string;
  bookingUrl: string;
};

type MonthlyHotelEstimate = {
  month: string;
  yellowknife: string;
  vancouver: string;
  total: string;
  note: string;
};

const independentFlightOptions: FlightOption[] = [
  {
    priority: 1,
    airline: "Air Canada 加拿大航空",
    route: "TPE -> YVR / YEG / YYC / YYZ -> YZF",
    role: "可直接查台北到黃刀鎮完整行程",
    recommendedUse: "自由行首選；優先同一張票到底、加拿大境內轉機少、行李可直掛。",
    riskCheck: "準點率與罷工紀錄需納入風險；冬季至少保留 4 小時以上轉機緩衝或 YVR 過夜。",
    estimate: "估算機票 NT$48,000-58,000；2027 付款頁需重查。",
    bookingUrl: "https://www.aircanada.com/en-ca/flights-from-taipei-to-yellowknife",
  },
  {
    priority: 2,
    airline: "EVA Air 長榮航空",
    route: "TPE -> YVR / YYZ，再接加拿大境內段",
    role: "長程直飛品質穩定",
    recommendedUse: "搭配 Air Canada、WestJet 或 Canadian North；適合舒適型自由行。",
    riskCheck: "若分開開票，行李直掛、延誤責任與 YVR 過夜成本要獨立確認。",
    estimate: "估算機票 NT$49,000-57,000 + YVR 住宿。",
    bookingUrl: "https://flights.evaair.com/en/flights-from-taipei-to-vancouver",
  },
  {
    priority: 3,
    airline: "China Airlines 中華航空",
    route: "TPE -> YVR，再接加拿大境內段",
    role: "長程替代方案",
    recommendedUse: "價格好時納入；可作 Air Canada 或長榮的替代長程段。",
    riskCheck: "分開開票會提高行李與誤點風險；不排短轉機。",
    estimate: "估算機票 NT$46,000-52,000 + YVR 住宿。",
    bookingUrl: "https://flights.china-airlines.com/en-tw/flights-from-taipei-to-vancouver",
  },
  {
    priority: 4,
    airline: "WestJet",
    route: "YYC / YEG -> YZF",
    role: "加拿大境內價格備援",
    recommendedUse: "當 Calgary 或 Edmonton 轉機價格明顯較好時才納入。",
    riskCheck: "曾有罷工與取消航班新聞；冬季不排短轉機，不作唯一方案。",
    estimate: "估算總機票 NT$44,000-56,000；內陸段需當季重查。",
    bookingUrl: "https://www.westjet.com/",
  },
  {
    priority: 5,
    airline: "Canadian North",
    route: "YEG -> YZF 與北方航線",
    role: "Edmonton 北方航線備援",
    recommendedUse: "適合接 Edmonton；作為 Air Canada / WestJet 之外的北方段備案。",
    riskCheck: "班次與天候變動較大；需查當季班表與行李銜接。",
    estimate: "估算總機票 NT$48,000-60,000；北方段需重查。",
    bookingUrl: "https://canadiannorth.com/",
  },
  {
    priority: 6,
    airline: "Air North",
    route: "季節性 YVR / YXY / YYZ / YOW -> YZF",
    role: "季節班備案",
    recommendedUse: "若剛好有 Vancouver-Yellowknife 季節班，可作有價值備案。",
    riskCheck: "季節性與班次少是主要風險；不可作唯一方案。",
    estimate: "估算總機票 NT$46,000-58,000；需確認季節班是否開航。",
    bookingUrl: "https://www.flyairnorth.com/",
  },
  {
    priority: 7,
    airline: "STARLUX 星宇航空",
    route: "TPE -> SEA / SFO / LAX -> Canada -> YZF",
    role: "價格或哩程備案",
    recommendedUse: "只在價格或哩程明顯有利時使用；不作主推薦。",
    riskCheck: "美國轉機段數多，需檢查入境/轉機條件、行李責任與延誤風險。",
    estimate: "估算機票 NT$52,000-68,000 + 美國轉機成本。",
    bookingUrl: "https://www.starlux-airlines.com/",
  },
];

const independentHotelMonthlyRates: MonthlyHotelEstimate[] = [
  {
    month: "9月",
    yellowknife: "YZF NT$5,000-7,000/晚",
    vancouver: "YVR NT$4,000-5,800/晚",
    total: "6 晚房費約 NT$34,000-49,600/房",
    note: "秋季可列入極光重點；仍需確認可售套裝與接駁。",
  },
  {
    month: "10月",
    yellowknife: "YZF NT$5,200-7,600/晚",
    vancouver: "YVR NT$4,100-5,900/晚",
    total: "6 晚房費約 NT$35,000-50,800/房",
    note: "秋季與初冬交界，價格常比深冬穩定。",
  },
  {
    month: "11月",
    yellowknife: "YZF NT$5,800-8,600/晚",
    vancouver: "YVR NT$4,300-6,300/晚",
    total: "6 晚房費約 NT$39,800-57,000/房",
    note: "冬季需求上升前需提早鎖房型。",
  },
  {
    month: "12月",
    yellowknife: "YZF NT$6,500-9,800/晚",
    vancouver: "YVR NT$4,800-7,200/晚",
    total: "6 晚房費約 NT$45,600-68,400/房",
    note: "假期與冬季活動需求增加，需保留預算緩衝。",
  },
  {
    month: "1月",
    yellowknife: "YZF NT$6,800-10,500/晚",
    vancouver: "YVR NT$4,800-7,500/晚",
    total: "6 晚房費約 NT$46,800-72,000/房",
    note: "嚴冬月份，住宿與延誤備援都要拉高。",
  },
  {
    month: "2月",
    yellowknife: "YZF NT$7,200-11,200/晚",
    vancouver: "YVR NT$5,000-7,800/晚",
    total: "6 晚房費約 NT$48,800-76,400/房",
    note: "寒假與旺季警戒，預算上限需重新測試。",
  },
  {
    month: "3月",
    yellowknife: "YZF NT$6,600-9,800/晚",
    vancouver: "YVR NT$4,700-7,200/晚",
    total: "6 晚房費約 NT$45,800-68,400/房",
    note: "可對照 2026 三月低價團體樣本。",
  },
];

type CostBasis = {
  readiness: "complete" | "partial" | "missing" | "historical";
  label: string;
  totalLabel: string;
  flightDetail: string;
  hotelDetail: string;
  scheduleDetail: string;
  priceDetail: string;
  missingItems: string[];
  flightOptions?: FlightOption[];
  hotelMonthlyRates?: MonthlyHotelEstimate[];
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
    name: "長汎 2026 團體樣本（四出發日）",
    source: "長汎旅遊",
    sourceStatusId: "everfun",
    status: "僅作歷史基準",
    amount: "NT$142,451-165,451",
    bookingUrl: "https://www.everfuntravel.com/globaltour/detail/UWP26319BR10TB",
    note: "四筆 2026 團體歷史基準，不代表目前可下訂，不進入候選方向或推薦排序。",
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
  {
    name: "ezTravel 美加/加拿大跟團比對",
    source: "ezTravel 易遊網",
    sourceStatusId: "eztravel",
    status: "待查，不併入排序",
    amount: "已見一般加拿大商品；未取得黃刀鎮極光團具體價格",
    bookingUrl: "https://vacation.eztravel.com.tw/oversea/america-canada-newzealand-australia/",
    note: "比對美加分類與加拿大團頁；未查得黃刀鎮/極光關鍵字。取得具體團名、日期、價格與航班後才進入候選。",
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
type ResultStatus = "strong" | "conditional" | "backup" | "pending" | "exclude";

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

const plannerImpactRows = [
  {
    item: "預算上限",
    requirement: "必須",
    impact: "直接改變低於、臨界、超標與決策門檻；候選判讀以確認後的預算上限為準。",
  },
  {
    item: "旅行型態",
    requirement: "必須",
    impact: "決定預設候選分類，並加權團體或自由行，不會把非偏好型態完全隱藏。",
  },
  {
    item: "最低極光夜數",
    requirement: "必須",
    impact: "A級要求會降級只達 B級的候選；B級要求會保留價格備援。",
  },
  {
    item: "風險容忍度",
    requirement: "必須",
    impact: "航班銜接、資料缺口與來源新鮮度風險高於設定時會降級或排除。",
  },
  {
    item: "舒適程度",
    requirement: "排序條件",
    impact: "影響節制、平衡、舒適方案排序；不是單獨決定是否可下訂的硬門檻。",
  },
  {
    item: "只採已查核資料",
    requirement: "查核開關",
    impact: "開啟後，未完成重查或缺具體旅行團資料的項目只保留為待查方向。",
  },
] as const;

const directionCategories = [
  {
    id: "group-a",
    label: "A級團體候選方向",
    title: "可選擇的 A級團體候選方向",
    summary: "A級代表抵達日不計，需保留至少 3 個完整極光夜。尚未公告價格的商品會保留在待查候選中，但不可視為可下訂。",
    items: [
      {
        candidateId: "group-a-taiwan-complete",
        name: "台灣旅行社完整極光夜團",
        condition: "需有明確旅遊團名稱、訂購網址、總團費與 3 個完整極光夜口徑。",
        status: "尚未匯入具體旅行團",
      },
      {
        candidateId: "group-a-autumn",
        name: "9-11 月秋季 A級團體團",
        condition: "需確認秋季團仍包含黃刀鎮極光觀賞，且抵達日不計入完整夜。",
        status: "待匯入旅行團",
      },
      {
        candidateId: "group-a-winter",
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
    summary: "B級代表 3 晚可能含抵達日，只能當價格備援，不能宣稱為 3 個完整極光夜。此分類只列未來可查核商品方向，已結束的 2026 行程只留在歷史基準表。",
    items: [
      {
        candidateId: "group-b-price-watch",
        name: "B級團體價格優先團",
        condition: "需有未來可售日期、旅遊團名稱、訂購網址、總團費與 3 晚極光口徑。",
        status: "待匯入旅行團",
      },
      {
        candidateId: "group-b-autumn-price",
        name: "9-11 月 B級價格團",
        condition: "秋季商品若只標示 3 晚極光，需確認是否把抵達日算入。",
        status: "待匯入旅行團",
      },
      {
        candidateId: "group-b-winter-price",
        name: "12-3 月 B級價格團",
        condition: "冬季價格團需確認 YZF 抵離時間、補看規則與必要費後總額。",
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
    id: "group-a-taiwan-complete",
    title: "A級團體待查：台灣旅行社完整極光夜團",
    packageName: "待查商品：台灣旅行社 3 完整極光夜團",
    mode: "group",
    estimatedCost: 0,
    auroraLevel: "A",
    riskLevel: 2,
    comfort: "balanced",
    verified: false,
    dataState: "待匯入來源",
    guideUrl: "#pending-2027-recheck",
    guideLabel: "查看缺資料清單",
    guideNote: "此項目用來保留 A級團體搜尋方向；未取得旅行社商品前不可下訂。",
    description: "符合 A級團體方向，但目前缺少正式團名、價格、航班、飯店與訂購頁。",
    nextStep: "匯入旅行社商品後，比對是否真的有 3 個完整極光夜。",
    departureWindow: "2027 或 9-11 月待查",
    productType: "A級團體待查",
    rankingSummary: "A級團體條件符合目標，但資料尚未公布；只作搜尋方向，不作可下訂推薦。",
    costBasis: {
      readiness: "missing",
      label: "價格尚未公布",
      totalLabel: "價格尚未公布；以已確認預算作搜尋上限",
      flightDetail: "尚未公布完整航班與班號。",
      hotelDetail: "尚未公布飯店名稱或同級條件。",
      scheduleDetail: "尚未公布 YZF 抵達、離開時間與完整極光夜切分。",
      priceDetail: "尚未公布團費、稅費、小費、保險與必要附加費總額。",
      missingItems: ["正式旅遊團名稱", "訂購網址", "總團費", "航班", "飯店", "3 個完整極光夜口徑"],
    },
  },
  {
    id: "group-a-autumn",
    title: "A級團體待查：9-11 月秋季極光團",
    packageName: "待查商品：9-11 月秋季 3 完整極光夜團",
    mode: "group",
    estimatedCost: 0,
    auroraLevel: "A",
    riskLevel: 2,
    comfort: "balanced",
    verified: false,
    dataState: "待匯入來源",
    guideUrl: "#pending-2027-recheck",
    guideLabel: "查看缺資料清單",
    guideNote: "秋季極光團也屬本網站重點；需等商品公告後重查。",
    description: "保留 9-11 月 A級團體搜尋方向，避免只看冬季或只看 2027 年初。",
    nextStep: "匯入秋季團商品，確認是否仍包含黃刀鎮極光與 3 個完整觀賞夜。",
    departureWindow: "9-11 月待查",
    productType: "A級秋季團體待查",
    rankingSummary: "秋季時間符合搜尋範圍，但目前缺少可查核商品資料。",
    costBasis: {
      readiness: "missing",
      label: "價格尚未公布",
      totalLabel: "價格尚未公布；以已確認預算作搜尋上限",
      flightDetail: "尚未公布秋季團航班與 YZF 抵離時間。",
      hotelDetail: "尚未公布秋季團飯店。",
      scheduleDetail: "尚未公布是否有 3 個完整極光夜，抵達日不得計入 A級夜數。",
      priceDetail: "尚未公布團費與必要附加費。",
      missingItems: ["秋季可售日期", "團費", "航班", "飯店", "完整極光夜數", "訂購網址"],
    },
  },
  {
    id: "group-a-winter",
    title: "A級團體待查：12-3 月冬季完整極光夜團",
    packageName: "待查商品：12-3 月冬季 3 完整極光夜團",
    mode: "group",
    estimatedCost: 0,
    auroraLevel: "A",
    riskLevel: 2,
    comfort: "balanced",
    verified: false,
    dataState: "待匯入來源",
    guideUrl: "#pending-2027-recheck",
    guideLabel: "查看缺資料清單",
    guideNote: "冬季團需額外檢查低溫、延誤、補看與飯店位置。",
    description: "保留冬季 A級團體搜尋方向；正式商品匯入後再與 B級價格團比較。",
    nextStep: "匯入冬季旅行社商品，確認航班延誤備援與補看規則。",
    departureWindow: "12-3 月待查",
    productType: "A級冬季團體待查",
    rankingSummary: "冬季極光條件可能較強，但沒有價格與航班前不能排序為可下訂商品。",
    costBasis: {
      readiness: "missing",
      label: "價格尚未公布",
      totalLabel: "價格尚未公布；以已確認預算作搜尋上限",
      flightDetail: "尚未公布冬季團航班、轉機與延誤備援。",
      hotelDetail: "尚未公布冬季團飯店與保暖動線。",
      scheduleDetail: "尚未公布 YZF 夜數配置與補看規則。",
      priceDetail: "尚未公布團費、冬衣、稅費、小費與必要附加費總額。",
      missingItems: ["冬季可售日期", "航班延誤備援", "飯店", "補看規則", "總費用", "訂購網址"],
    },
  },
  {
    id: "group-b-price-watch",
    title: "B級團體待查：價格優先團",
    packageName: "待查商品：B級 3 晚價格優先團",
    mode: "group",
    estimatedCost: 0,
    auroraLevel: "B",
    riskLevel: 2,
    comfort: "balanced",
    verified: false,
    dataState: "待匯入來源",
    guideUrl: "#pending-2027-recheck",
    guideLabel: "查看缺資料清單",
    guideNote: "此項目只代表未來可售 B級團體搜尋方向；不能用 2026 已結束行程替代。",
    description: "保留 B級價格優先搜尋方向，需等未來可售商品匯入後才可比較。",
    nextStep: "匯入可售旅行團後，比對總團費、訂購網址、YZF 抵離時間與是否含抵達日。",
    departureWindow: "未來可售日期待查",
    productType: "B級團體待查",
    rankingSummary: "B級價格方向可作備援，但目前缺少可售商品資料；不可用已結束行程當候選。",
    costBasis: {
      readiness: "missing",
      label: "價格尚未公布",
      totalLabel: "價格尚未公布；以已確認預算作搜尋上限",
      flightDetail: "尚未公布未來團體航班與 YZF 抵離時間。",
      hotelDetail: "尚未公布未來團體飯店或同級條件。",
      scheduleDetail: "尚未公布 3 晚極光是否含抵達日；需明確標成 B級。",
      priceDetail: "尚未公布團費、稅費、小費、保險與必要附加費總額。",
      missingItems: ["未來可售日期", "旅遊團名稱", "訂購網址", "總團費", "航班", "飯店", "B級夜數口徑"],
    },
  },
  {
    id: "group-b-autumn-price",
    title: "B級團體待查：9-11 月價格團",
    packageName: "待查商品：9-11 月 B級價格團",
    mode: "group",
    estimatedCost: 0,
    auroraLevel: "B",
    riskLevel: 2,
    comfort: "balanced",
    verified: false,
    dataState: "待匯入來源",
    guideUrl: "#pending-2027-recheck",
    guideLabel: "查看缺資料清單",
    guideNote: "秋季 B級團可列入重點，但需先確認不是已結束或不可售商品。",
    description: "保留 9-11 月 B級價格團搜尋方向，適合檢查秋季是否有較低總額。",
    nextStep: "匯入秋季可售團後，確認 3 晚極光口徑、飯店、航班與訂購頁。",
    departureWindow: "9-11 月待查",
    productType: "B級秋季團體待查",
    rankingSummary: "秋季 B級團可作價格備援；目前缺少可售商品資料。",
    costBasis: {
      readiness: "missing",
      label: "價格尚未公布",
      totalLabel: "價格尚未公布；以已確認預算作搜尋上限",
      flightDetail: "尚未公布秋季團航班與 YZF 抵離時間。",
      hotelDetail: "尚未公布秋季團飯店。",
      scheduleDetail: "尚未公布是否把抵達日算入 3 晚極光。",
      priceDetail: "尚未公布團費與必要附加費。",
      missingItems: ["秋季可售日期", "旅遊團名稱", "團費", "航班", "飯店", "訂購網址"],
    },
  },
  {
    id: "group-b-winter-price",
    title: "B級團體待查：12-3 月價格團",
    packageName: "待查商品：12-3 月 B級價格團",
    mode: "group",
    estimatedCost: 0,
    auroraLevel: "B",
    riskLevel: 2,
    comfort: "balanced",
    verified: false,
    dataState: "待匯入來源",
    guideUrl: "#pending-2027-recheck",
    guideLabel: "查看缺資料清單",
    guideNote: "冬季 B級價格團須額外查低溫、延誤與補看規則。",
    description: "保留 12-3 月 B級價格團搜尋方向，用來追蹤冬季低價團是否值得列入備援。",
    nextStep: "匯入冬季可售團後，確認總費用、航班延誤備援、飯店與補看條款。",
    departureWindow: "12-3 月待查",
    productType: "B級冬季團體待查",
    rankingSummary: "冬季 B級團可能有價格優勢，但缺少可售商品資料前不能推薦。",
    costBasis: {
      readiness: "missing",
      label: "價格尚未公布",
      totalLabel: "價格尚未公布；以已確認預算作搜尋上限",
      flightDetail: "尚未公布冬季團航班、轉機與延誤備援。",
      hotelDetail: "尚未公布冬季團飯店與保暖動線。",
      scheduleDetail: "尚未公布 YZF 夜數配置與補看規則。",
      priceDetail: "尚未公布團費、冬衣、稅費、小費與必要附加費總額。",
      missingItems: ["冬季可售日期", "航班延誤備援", "飯店", "補看規則", "總費用", "訂購網址"],
    },
  },
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
      flightOptions: independentFlightOptions,
      hotelMonthlyRates: independentHotelMonthlyRates,
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
      flightOptions: independentFlightOptions,
      hotelMonthlyRates: independentHotelMonthlyRates,
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
    id: "group-2026-jan15",
    title: "2026 一月團體樣本",
    packageName: "歷史樣本：玩美加族~加拿大極光10日（2026/01/15）",
    mode: "group",
    estimatedCost: 149451,
    auroraLevel: "B",
    riskLevel: 1,
    comfort: "balanced",
    verified: true,
    dataState: "歷史基準",
    guideUrl: "#historical-baseline",
    guideLabel: "查看 2026 團體樣本",
    guideNote: "此項目是 2026 歷史比較基準，不是目前可下訂商品。",
    description: "B級團體歷史樣本，必要費後接近原始 NT$150,000 預算；預算提高時仍可作價格比較。",
    nextStep: "作為 B級團體價格樣本；正式下訂前需重查 2027 商品。",
    departureWindow: "2026/01 歷史樣本",
    productType: "團體歷史樣本",
    rankingSummary: "價格接近原始預算、旅行社來源可查；但夜數屬 B級且資料是歷史樣本。",
    costBasis: {
      readiness: "historical",
      label: "歷史團體總額",
      totalLabel: "歷史必要費後 NT$149,451",
      flightDetail: "2026 團體樣本含旅行社規劃航段結構；2027 航班仍需重查。",
      hotelDetail: "黃刀鎮住宿以 Chateau Nova、Explorer Hotel 或同級為方向；實際入住需以當期商品為準。",
      scheduleDetail: "2026/01/15-01/24 歷史出發日期已知；不可直接套用至 2027。",
      priceDetail: "以團費、公告小費、ESTA、eTA 等必要費用後估算。",
      missingItems: ["2027 可售日期", "2027 實際團費", "2027 航班與飯店確認"],
    },
    bookingUrl: "https://www.everfuntravel.com/globaltour/detail/UWP26115BR10TA",
    bookingLabel: "查看長汎旅遊團頁",
    sourceStatusId: "everfun",
    sourceName: "長汎旅遊",
    sourceCheckedAt: "2026-07-15",
    sourceSummary: "2026 一月團體歷史樣本；只作價格基準，不代表目前仍可售。",
    importedFromSource: true,
  },
  {
    id: "group-2026-feb12",
    title: "2026 二月寒假團體樣本",
    packageName: "歷史樣本：玩美加族~加拿大極光10日（2026/02/12）",
    mode: "group",
    estimatedCost: 165451,
    auroraLevel: "B",
    riskLevel: 2,
    comfort: "balanced",
    verified: true,
    dataState: "歷史基準",
    guideUrl: "#historical-baseline",
    guideLabel: "查看 2026 團體樣本",
    guideNote: "此項目是寒假旺季價格警戒，不是目前可下訂商品。",
    description: "B級團體寒假歷史樣本，價格較高；預算提高後可納入比較，但仍是歷史資料。",
    nextStep: "用來檢查旺季團費是否仍在已確認預算內。",
    departureWindow: "2026/02 歷史樣本",
    productType: "團體歷史樣本",
    rankingSummary: "可作旺季價格上緣；但夜數屬 B級，且資料是歷史樣本。",
    costBasis: {
      readiness: "historical",
      label: "歷史團體總額",
      totalLabel: "歷史必要費後 NT$165,451",
      flightDetail: "2026 團體樣本含旅行社規劃航段結構；2027 航班仍需重查。",
      hotelDetail: "黃刀鎮住宿以 Chateau Nova、Explorer Hotel 或同級為方向；實際入住需以當期商品為準。",
      scheduleDetail: "2026/02/12-02/21 歷史出發日期已知；不可直接套用至 2027。",
      priceDetail: "以團費、公告小費、ESTA、eTA 等必要費用後估算。",
      missingItems: ["2027 可售日期", "2027 實際團費", "2027 航班與飯店確認"],
    },
    bookingUrl: "https://www.everfuntravel.com/globaltour/detail/UWP26212BR10TA",
    bookingLabel: "查看長汎旅遊團頁",
    sourceStatusId: "everfun",
    sourceName: "長汎旅遊",
    sourceCheckedAt: "2026-07-15",
    sourceSummary: "2026 二月寒假團體歷史樣本；只作價格基準，不代表目前仍可售。",
    importedFromSource: true,
  },
  {
    id: "group-2026-feb19",
    title: "2026 二月團體樣本",
    packageName: "歷史樣本：玩美加族~加拿大極光10日（2026/02/19）",
    mode: "group",
    estimatedCost: 155451,
    auroraLevel: "B",
    riskLevel: 2,
    comfort: "balanced",
    verified: true,
    dataState: "歷史基準",
    guideUrl: "#historical-baseline",
    guideLabel: "查看 2026 團體樣本",
    guideNote: "此項目是 2026 歷史比較基準，不是目前可下訂商品。",
    description: "B級團體歷史樣本，必要費後略高於原始預算；預算提高時可作中高價比較。",
    nextStep: "作為 B級團體價格樣本；正式下訂前需重查 2027 商品。",
    departureWindow: "2026/02 歷史樣本",
    productType: "團體歷史樣本",
    rankingSummary: "可作二月中高價參考；但夜數屬 B級，且資料是歷史樣本。",
    costBasis: {
      readiness: "historical",
      label: "歷史團體總額",
      totalLabel: "歷史必要費後 NT$155,451",
      flightDetail: "2026 團體樣本含旅行社規劃航段結構；2027 航班仍需重查。",
      hotelDetail: "黃刀鎮住宿以 Chateau Nova、Explorer Hotel 或同級為方向；實際入住需以當期商品為準。",
      scheduleDetail: "2026/02/19-02/28 歷史出發日期已知；不可直接套用至 2027。",
      priceDetail: "以團費、公告小費、ESTA、eTA 等必要費用後估算。",
      missingItems: ["2027 可售日期", "2027 實際團費", "2027 航班與飯店確認"],
    },
    bookingUrl: "https://www.everfuntravel.com/globaltour/detail/UWP26219BR10TA",
    bookingLabel: "查看長汎旅遊團頁",
    sourceStatusId: "everfun",
    sourceName: "長汎旅遊",
    sourceCheckedAt: "2026-07-15",
    sourceSummary: "2026 二月團體歷史樣本；只作價格基準，不代表目前仍可售。",
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
      flightOptions: independentFlightOptions,
      hotelMonthlyRates: independentHotelMonthlyRates,
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
      flightOptions: independentFlightOptions,
      hotelMonthlyRates: independentHotelMonthlyRates,
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
      flightOptions: independentFlightOptions,
      hotelMonthlyRates: independentHotelMonthlyRates,
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

function isRecommendationOption(option: CandidateOption) {
  return option.costBasis.readiness !== "historical";
}

function isActionableStatus(status: ResultStatus) {
  return status === "strong" || status === "conditional" || status === "backup";
}

const resultStatusOrder: Record<ResultStatus, number> = {
  strong: 0,
  conditional: 1,
  backup: 2,
  pending: 3,
  exclude: 4,
};

function getBudgetStatus(option: CandidateOption, budget: number) {
  if (option.costBasis.readiness === "missing") {
    return {
      className: "unknown",
      label: "價格尚未公布，預算只作搜尋上限",
    };
  }

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

function getDirectionIdForFilters(filters: PlannerFilters, fallback: CandidateOption): DirectionCategoryId {
  if (filters.preferredMode === "independent") {
    return "independent";
  }

  if (filters.preferredMode === "group") {
    return filters.auroraTarget === "A" ? "group-a" : filters.auroraTarget === "B" ? "group-b" : "group-b";
  }

  if (filters.auroraTarget === "B") {
    return "group-b";
  }

  return getDirectionIdForOption(fallback);
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
  return [...items].sort((first, second) => {
    const firstResult = "candidateId" in first ? evaluatedById.get(first.candidateId) : null;
    const secondResult = "candidateId" in second ? evaluatedById.get(second.candidateId) : null;

    if (firstResult && secondResult) {
      if (firstResult.status === "pending" && secondResult.status === "pending") {
        return 0;
      }

      return resultStatusOrder[firstResult.status] - resultStatusOrder[secondResult.status] || secondResult.score - firstResult.score;
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

  if (option.costBasis.readiness === "missing") {
    score -= 32;
    blockers.push(`缺少 ${option.costBasis.missingItems.join("、")}，不能視為完整預算或可下訂商品。`);
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
  if (option.costBasis.readiness === "missing") {
    status = "pending";
  } else if (blockers.length === 0 && score >= 112) {
    status = "strong";
  } else if (blockers.length === 0 && score >= 88) {
    status = "conditional";
  } else if (blockers.length <= 1 && score >= 68) {
    status = "backup";
  }

  const statusLabel =
    status === "strong"
      ? "強候選"
      : status === "conditional"
        ? "條件候選"
        : status === "backup"
          ? "備援"
          : status === "pending"
            ? "待查"
            : "排除";

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
    ["待查", "缺少未來可售日期、價格、航班、飯店或訂購網址；只能保留為搜尋方向。"],
    ["排除", `超過 ${formatCurrency(budget)}、轉機過度、核心極光夜無保護，或使用未知 2027 細節作賣點。`],
  ];
}

function getDirectionResultNote(result: ReturnType<typeof evaluateOption>) {
  return result.status === "pending" ? "待查項目不評分" : `分數 ${result.score}`;
}

function SourceSyncSection() {
  const importedCount = candidateOptions.filter(
    (option) => option.importedFromSource && isRecommendationOption(option),
  ).length;

  return (
    <section className="pageSection sourceSyncSection compactSourceSection" id="source-sync">
      <div className="sectionHeader tableHeader">
        <div>
          <p className="eyebrow">Source Appendix</p>
          <h2>自動匯入資料源摘要</h2>
          <p>
            此區只作末頁查核附錄，保留來源新鮮度、白名單與訂購連結；主要決策仍以上方候選方向與確認查核結果為準。
          </p>
        </div>
        <div className="sourceNote">
          <strong>末頁查核摘要</strong>
          <span>
            已匯入 {importedCount} 筆可排序候選；ezTravel 目前只作比對來源；2026 已結束行程僅作歷史基準；匯率：1 CAD ≈
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
  );
}

export default function Home() {
  const [filters, setFilters] = useState<PlannerFilters>(defaultPlanner);
  const [draftFilters, setDraftFilters] = useState<PlannerFilters>(defaultPlanner);
  const [selectedDirectionId, setSelectedDirectionId] = useState<DirectionCategoryId | null>(null);
  const [hasConfirmedPlanner, setHasConfirmedPlanner] = useState(false);
  const hasPendingChanges = !isSamePlannerFilters(draftFilters, filters);
  const needsPlannerCheck = !hasConfirmedPlanner || hasPendingChanges;

  const evaluatedOptions = useMemo(
    () =>
      candidateOptions
        .filter(isRecommendationOption)
        .map((option) => evaluateOption(option, filters))
        .sort((a, b) => {
          return resultStatusOrder[a.status] - resultStatusOrder[b.status] || b.score - a.score;
        }),
    [filters],
  );

  const bestOption = evaluatedOptions.find((result) => isActionableStatus(result.status)) ?? evaluatedOptions[0];
  const activeCount = evaluatedOptions.filter((result) => isActionableStatus(result.status)).length;
  const pendingCount = evaluatedOptions.filter((result) => result.status === "pending").length;
  const excludeCount = evaluatedOptions.filter((result) => result.status === "exclude").length;
  const evaluatedById = new Map(evaluatedOptions.map((result) => [result.option.id, result]));
  const syncedDirectionId = getDirectionIdForFilters(filters, bestOption.option);
  const activeDirectionId = selectedDirectionId ?? syncedDirectionId;
  const selectedDirection =
    directionCategories.find((category) => category.id === activeDirectionId) ?? directionCategories[0];
  const rankedDirectionItems = rankDirectionItems(selectedDirection.items, evaluatedById);
  const bestSourceStatus = getSourceStatus(bestOption.option);
  const decisionGates = getDecisionGates(filters.budget);
  const applyPlannerFilters = () => {
    setFilters(draftFilters);
    setSelectedDirectionId(null);
    setHasConfirmedPlanner(true);
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

            <div className="impactAudit" aria-label="條件必要性與候選影響">
              <strong>條件必要性與候選影響</strong>
              {plannerImpactRows.map((row) => (
                <span key={row.item}>
                  <b>{row.item}</b>
                  <small>{row.requirement}</small>
                  <em>{row.impact}</em>
                </span>
              ))}
            </div>

            <div className="applyPlannerBox">
              <button className="applyPlannerButton" onClick={applyPlannerFilters} type="button">
                確認並查核
              </button>
              <span className={`applyPlannerStatus ${needsPlannerCheck ? "pending" : "ready"}`}>
                {!hasConfirmedPlanner
                  ? "尚未查核；請先確認條件，才會產生推薦。"
                  : hasPendingChanges
                    ? "條件已修改，尚未查核；下方仍顯示上次確認結果。"
                    : "條件已確認；下方推薦與候選方向已同步。"}
              </span>
            </div>

            <p className="simulatorHint">查核結果是規劃輔助，不會取代正式下訂前確認。</p>
          </aside>

          <div className="resultPanel" aria-live="polite">
            {!hasConfirmedPlanner ? (
              <div className="topRecommendation pending">
                <span className="recommendationKicker">尚未查核</span>
                <strong>請先設定條件並按「確認並查核」</strong>
                <div className="resultCounts">
                  <span>未產生推薦</span>
                  <span>預算尚未套用</span>
                </div>
                <p>目前不顯示最適合選項，避免在未決策價格或條件前誤判。</p>
              </div>
            ) : (
              <div className={`topRecommendation ${bestOption.status}`}>
                <span className="recommendationKicker">{hasPendingChanges ? "上次確認結果" : "目前最適合"}</span>
                <strong>{bestOption.option.packageName}</strong>
                <div className="resultCounts">
                  <span>可考慮 {activeCount}</span>
                  <span>待查 {pendingCount}</span>
                  <span>排除 {excludeCount}</span>
                </div>
                <div className="recommendationMeta">
                  <span>已確認條件</span>
                  {hasPendingChanges ? <span>有未查核變更</span> : null}
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
                  {bestOption.statusLabel}；{getDirectionResultNote(bestOption)}。{bestOption.option.description}
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
            )}
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
            {!hasConfirmedPlanner
              ? "尚未確認價格基準；請先在上方按「確認並查核」。"
              : hasPendingChanges
                ? `上次確認價格基準：${formatCurrency(filters.budget)}；目前條件尚未重新查核。`
                : `已確認價格基準：${formatCurrency(filters.budget)}；候選方向已依上方確認條件重新查核。`}
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
                      <small>{getDirectionResultNote(linkedResult)}</small>
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
                      {linkedOption.costBasis.flightOptions ? (
                        <div className="flightOptionList">
                          <strong>自由行航班候選</strong>
                          {linkedOption.costBasis.flightOptions.map((flight) => (
                            <div className="flightOptionCard" key={flight.airline}>
                              <span>{flight.priority}</span>
                              <div>
                                <strong>{flight.airline}</strong>
                                <small>{flight.route}</small>
                                <p>{flight.role}；{flight.recommendedUse}</p>
                                <small>{flight.estimate}</small>
                                <small>{flight.riskCheck}</small>
                                <a href={flight.bookingUrl} rel="noreferrer" target="_blank">
                                  航空公司查詢
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {linkedOption.costBasis.hotelMonthlyRates ? (
                        <div className="hotelRateList">
                          <strong>自由行住宿月份估算</strong>
                          {linkedOption.costBasis.hotelMonthlyRates.map((hotel) => (
                            <div className="hotelRateCard" key={hotel.month}>
                              <strong>{hotel.month}</strong>
                              <span>{hotel.yellowknife}</span>
                              <span>{hotel.vancouver}</span>
                              <span>{hotel.total}</span>
                              <small>{hotel.note}</small>
                            </div>
                          ))}
                        </div>
                      ) : null}
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

      <SourceSyncSection />
    </main>
  );
}
