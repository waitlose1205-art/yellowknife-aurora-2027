"use client";

import { useMemo, useState } from "react";

const decisionStatuses = [
  { label: "M2", value: "已通過", note: "靜態決策基線成立" },
  { label: "2027 動態資料", value: "待重查", note: "不可作最終下訂依據" },
  { label: "預算", value: "NT$150,000", note: "每人原則上限" },
  { label: "策略", value: "團體優先", note: "自由行作比較基準" },
];

const actionCards = [
  {
    title: "2026 樣本正規化",
    status: "已完成",
    standard: "四個已成團樣本完成同口徑比較，含必要費用、夜數、風險與判定。",
  },
  {
    title: "2027 航班重查",
    status: "待即時查核",
    standard: "15 組候選填入查核日期、官方來源、票價、轉機、行李與 YZF 抵離時間。",
  },
  {
    title: "團體 vs 自由行成本表",
    status: "基準完成",
    standard: "同時列出團體低價樣本、自由行節制型、舒適型、高舒適型與單人情境。",
  },
  {
    title: "2027 商品篩選",
    status: "規則完成",
    standard: "新商品必須通過日期、總費用、航班、飯店、補看與延誤條款檢查。",
  },
];

const agingRules = [
  {
    dataType: "航班票價與可售艙等",
    agingLabel: "快照資料；超過 7 天標示需重查",
    trigger: "下訂前、價格異動、出發前 30 天與 7 天",
    handling: "先手動填入查核日、來源、票價與幣別，不自動抓價。",
  },
  {
    dataType: "航班時刻與轉機時間",
    agingLabel: "動態資料；正式付款前必重查",
    trigger: "航班改時、航空公司釋出冬季班表、出發前 30 天與 7 天",
    handling: "以官方航空公司與機場資訊為準，分票行李不可假設直掛。",
  },
  {
    dataType: "飯店與團體商品條款",
    agingLabel: "發布版本資料；每次修訂需重查",
    trigger: "旅行社商品頁更新、業務提供書面補件、付款前",
    handling: "飯店若只寫或同級，維持 PENDING_2027_RECHECK。",
  },
  {
    dataType: "活動、補看與取消規則",
    agingLabel: "條款資料；行程定案與出發前重查",
    trigger: "商品條款更新、天候政策變更、出發前 7 天",
    handling: "若無補看或延誤保護，不得列為強候選。",
  },
  {
    dataType: "匯率、ESTA、eTA、必要費用",
    agingLabel: "計算基準；每次比較需標示日期",
    trigger: "重新估算總成本、匯率大幅波動、付款前",
    handling: "先做日期標籤與欄位準備，不啟用進階預算自動化。",
  },
];

const activationStages = [
  {
    stage: "Stage 0",
    title: "凍結保護",
    description: "Backlog 只作排序與準備，不改動 M2 架構、不展開功能。",
  },
  {
    stage: "Stage 1",
    title: "來源老化準備",
    description: "建立查核日、資料類型、有效期、重查觸發與 PENDING 標籤。",
  },
  {
    stage: "Stage 2",
    title: "預算情報準備",
    description: "等第一批即時重查完成後，再加入緩衝、匯率與必要費用判讀。",
  },
  {
    stage: "Stage 3",
    title: "匯入與通用化",
    description: "只有在欄位與來源穩定後，才評估自動匯入與跨目的地引擎。",
  },
];

const enabledFeatures = [
  {
    title: "來源老化監控",
    status: "已啟用",
    detail: "把各類資料標成有效、快到期或需重查，避免過期資訊被拿來下訂。",
  },
  {
    title: "預算情報判定",
    status: "已啟用",
    detail: "依必要費用後總額判斷有緩衝、臨界或超標，先用本機規則運作。",
  },
  {
    title: "資料匯入檢核",
    status: "已啟用",
    detail: "啟用資料欄位檢核與人工匯入門檻，尚未連接外部即時抓取。",
  },
  {
    title: "跨目的地模板",
    status: "模板啟用",
    detail: "把黃刀鎮決策欄位抽成可複用模板，但不改動目前專案核心架構。",
  },
];

const agingMonitor = [
  {
    source: "2026 團體樣本",
    lastChecked: "2026-07-15",
    freshness: "歷史基準",
    status: "可用作比較，不可當 2027 承諾",
    action: "2027 商品發布後重新比對。",
  },
  {
    source: "2027 航班票價",
    lastChecked: "待即時重查",
    freshness: "動態資料",
    status: "需重查",
    action: "查核官方航空公司頁面後才能進入候選。",
  },
  {
    source: "飯店與團體商品條款",
    lastChecked: "待正式發布",
    freshness: "版本資料",
    status: "PENDING_2027_RECHECK",
    action: "取得飯店名稱、或同級條件與取消條款。",
  },
  {
    source: "補看、延誤與改目的地規則",
    lastChecked: "待正式發布",
    freshness: "任務保護資料",
    status: "PENDING_2027_RECHECK",
    action: "沒有補看或重新進入 YZF 機制時不得列強候選。",
  },
];

const budgetIntelligence = [
  {
    item: "低於 NT$145,000",
    signal: "有緩衝",
    decision: "可進強候選池，但仍需檢查夜數與延誤保護。",
  },
  {
    item: "NT$145,000-150,000",
    signal: "臨界",
    decision: "只能條件候選；需補上保險、行李、匯率與備用金。",
  },
  {
    item: "高於 NT$150,000",
    signal: "超標",
    decision: "原則排除，除非使用者明確解除預算限制。",
  },
  {
    item: "單房差或高舒適自由行",
    signal: "高波動",
    decision: "獨立計算，不混入雙人舒適型基準。",
  },
];

const importChecks = [
  "每筆資料必須有來源網址、查核日期、幣別與欄位名稱。",
  "外部資料匯入後先進 PENDING，不直接覆蓋正式結論。",
  "票價、班表、飯店、補看規則需分別標記資料類型。",
  "任何缺少 YZF 抵離時間的商品，不得自動進入強候選。",
];

const destinationTemplate = [
  ["任務排序", "核心體驗、安全、體力、一般體驗"],
  ["動態資料", "票價、班表、住宿、活動、天氣、緊急資訊"],
  ["成本模型", "標價、必要費、匯率、保險、住宿差、備用金"],
  ["決策門檻", "強候選、條件候選、備援、排除"],
];

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

const candidateOptions: CandidateOption[] = [
  {
    id: "group-2027-a",
    title: "2027 A 級團體候選方向",
    packageName: "待重查團體：2027 黃刀鎮 A級完整極光夜團",
    mode: "group",
    estimatedCost: 148000,
    auroraLevel: "A",
    riskLevel: 2,
    comfort: "balanced",
    verified: false,
    dataState: "2027 待重查",
    guideUrl: "#pending-2027-recheck",
    guideLabel: "前往 2027 重查清單",
    guideNote: "此項目尚不是可下訂商品，需先補齊航班、飯店、YZF 抵離與補看規則。",
    description: "抵達日不計，保留 3 個完整極光夜；適合把團體放第一順位，但要等商品與航班重新查核。",
    nextStep: "等 2027 商品上架後，先查 YZF 抵離時間、補看規則、飯店與總費用。",
  },
  {
    id: "group-2027-b",
    title: "2027 B 級團體價格優先方向",
    packageName: "待重查團體：2027 黃刀鎮 B級價格優先團",
    mode: "group",
    estimatedCost: 138000,
    auroraLevel: "B",
    riskLevel: 2,
    comfort: "balanced",
    verified: false,
    dataState: "2027 待重查",
    guideUrl: "#pending-2027-recheck",
    guideLabel: "前往 2027 重查清單",
    guideNote: "此項目只能作價格備援，需確認是否真的具備 3 個完整極光夜。",
    description: "以 3 晚含抵達日為前提，價格較容易留出緩衝，但極光夜數可能被高估。",
    nextStep: "只作價格備援；若沒有完整 3 個極光夜，不應升為強候選。",
  },
  {
    id: "group-2026-march",
    title: "2026 三月低價團體樣本",
    packageName: "歷史樣本：UWP26319BR10TB 三月低價團",
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
    nextStep: "用來當 2027 團體報價的對照底線，不能直接下訂。",
  },
  {
    id: "independent-comfort",
    title: "自由行舒適型雙人基準",
    packageName: "自由行方案：雙人舒適型 3 完整極光夜",
    mode: "independent",
    estimatedCost: 148000,
    auroraLevel: "A",
    riskLevel: 2,
    comfort: "comfort",
    verified: false,
    dataState: "規劃基準",
    guideUrl: "#pending-2027-recheck",
    guideLabel: "查看自由行查核項目",
    guideNote: "需重查 2027 航班、住宿、極光活動與總費用後才能作正式比較。",
    description: "保留完整極光夜與較高舒適度，是團體方案的主要比較基準。",
    nextStep: "重查 2027 航班、飯店與極光活動後，與團體總費用並列表。",
  },
  {
    id: "independent-basic",
    title: "自由行節制型備援",
    packageName: "自由行方案：節制型 3 完整極光夜備援",
    mode: "independent",
    estimatedCost: 132000,
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
  },
  {
    id: "independent-solo",
    title: "自由行單人舒適型",
    packageName: "自由行方案：單人舒適型上限警戒",
    mode: "independent",
    estimatedCost: 175000,
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
  },
];

const currencyFormatter = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "TWD",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
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

function evaluateOption(option: CandidateOption, filters: PlannerFilters) {
  let score = 40;
  const reasons: string[] = [];
  const cautions: string[] = [];
  const blockers: string[] = [];
  const budgetDelta = option.estimatedCost - filters.budget;

  if (budgetDelta <= -5000) {
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
    blockers.push("尚未完成 2027 正式重查。");
  } else {
    score -= 4;
    cautions.push("屬於規劃或待重查資料，不可直接下訂。");
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
  "2027 團體商品完整航班與班號",
  "實際飯店名稱或同級條件",
  "YZF 抵達與離開時間",
  "極光補看、延誤與改目的地規則",
  "必要附加費後的每人總費用",
  "行李、選位、分票與直掛風險",
];

const gates = [
  ["強候選", "低於 NT$150,000，YZF 夜數清楚，並接近 A 級三個完整極光夜。"],
  ["條件候選", "價格可接受，但需要明確補看、延誤或 YVR 過夜方案。"],
  ["備援", "價格、體力或證據信心不足，但仍符合基本安全與轉機上限。"],
  ["排除", "超預算、轉機過度、核心極光夜無保護，或使用未知 2027 細節作賣點。"],
];

export default function Home() {
  const [filters, setFilters] = useState<PlannerFilters>(defaultPlanner);

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

  return (
    <main>
      <section className="hero">
        <div className="heroOverlay" />
        <div className="heroContent">
          <p className="eyebrow">Aurora Intelligence Project - Yellowknife 2027</p>
          <h1>黃刀鎮極光旅決策儀表板</h1>
          <p className="lead">
            目前是 M2.1 市場實證與重查準備階段，不是最終下訂狀態。所有 2027
            動態資料在正式付款前都必須重新查核。
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
          <strong>查核基準日：2026-07-15；2027 正式下訂前需重查。</strong>
        </div>
      </section>

      <section className="pageSection simulatorSection" id="decision-simulator">
        <div className="sectionHeader">
          <p className="eyebrow">Decision Simulator</p>
          <h2>互動決策模擬器</h2>
          <p>自行調整預算、旅行型態、極光夜數與風險容忍度，頁面會即時排序適合的選項。</p>
        </div>

        <div className="simulatorShell">
          <aside className="controlPanel" aria-label="可調整條件">
            <div className="controlGroup">
              <div className="controlLabel">
                <span>預算上限</span>
                <strong>{formatCurrency(filters.budget)}</strong>
              </div>
              <input
                aria-label="預算上限"
                max={budgetRange.max}
                min={budgetRange.min}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, budget: clampBudget(Number(event.target.value)) }))
                }
                step={budgetRange.step}
                type="range"
                value={filters.budget}
              />
              <input
                aria-label="直接輸入預算"
                className="budgetNumber"
                max={budgetRange.max}
                min={budgetRange.min}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    budget: clampBudget(Number(event.target.value) || current.budget),
                  }))
                }
                step={budgetRange.step}
                type="number"
                value={filters.budget}
              />
              <span className="rangeHint">可選區間：NT$100,000 - NT$400,000</span>
            </div>

            <div className="controlGroup">
              <span className="controlTitle">旅行型態</span>
              <div className="segmentedControl">
                {modeChoices.map((choice) => (
                  <button
                    aria-pressed={filters.preferredMode === choice.value}
                    className={filters.preferredMode === choice.value ? "active" : ""}
                    key={choice.value}
                    onClick={() => setFilters((current) => ({ ...current, preferredMode: choice.value }))}
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
                    aria-pressed={filters.auroraTarget === choice.value}
                    className={filters.auroraTarget === choice.value ? "active" : ""}
                    key={choice.value}
                    onClick={() => setFilters((current) => ({ ...current, auroraTarget: choice.value }))}
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
                    aria-pressed={filters.riskTolerance === choice.value}
                    className={filters.riskTolerance === choice.value ? "active" : ""}
                    key={choice.value}
                    onClick={() => setFilters((current) => ({ ...current, riskTolerance: choice.value }))}
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
                    aria-pressed={filters.comfort === choice.value}
                    className={filters.comfort === choice.value ? "active" : ""}
                    key={choice.value}
                    onClick={() => setFilters((current) => ({ ...current, comfort: choice.value }))}
                    type="button"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="toggleRow">
              <input
                checked={filters.requireVerified}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, requireVerified: event.target.checked }))
                }
                type="checkbox"
              />
              <span>只採已查核資料；未重查的 2027 方向自動降級。</span>
            </label>

            <p className="simulatorHint">判定結果是規劃輔助，不會取代 2027 正式查核與下訂前確認。</p>
          </aside>

          <div className="resultPanel" aria-live="polite">
            <div className={`topRecommendation ${bestOption.status}`}>
              <span className="recommendationKicker">目前最適合</span>
              <strong>{bestOption.option.packageName}</strong>
              <div className="recommendationMeta">
                <span>{bestOption.option.title}</span>
                <span>{bestOption.option.dataState}</span>
                <span>{getAuroraLevelLabel(bestOption.option.auroraLevel)}</span>
              </div>
              <p>
                {bestOption.statusLabel}；分數 {bestOption.score}。{bestOption.option.description}
              </p>
              <div className="recommendationAction">
                <a href={bestOption.option.guideUrl}>{bestOption.option.guideLabel}</a>
                <small>{bestOption.option.guideNote}</small>
              </div>
            </div>

            <div className="resultToolbar">
              <h3>適合選項排序</h3>
              <div className="resultCounts">
                <span>可考慮 {activeCount}</span>
                <span>排除 {evaluatedOptions.length - activeCount}</span>
              </div>
            </div>

            <div className="optionList">
              {evaluatedOptions.map((result) => (
                <article className={`optionCard ${result.status}`} key={result.option.id}>
                  <div className="optionHeader">
                    <span className={`recommendationBadge ${result.status}`}>{result.statusLabel}</span>
                    <div>
                      <h3>{result.option.title}</h3>
                      <p>{result.option.description}</p>
                    </div>
                  </div>

                  <div className="optionMetrics">
                    <span>
                      <strong>{formatCurrency(result.option.estimatedCost)}</strong>
                      <small>估算總額</small>
                    </span>
                    <span>
                      <strong>{getAuroraLevelLabel(result.option.auroraLevel)}</strong>
                      <small>極光夜數規則</small>
                    </span>
                    <span>
                      <strong>{getModeLabel(result.option.mode)}</strong>
                      <small>旅行型態</small>
                    </span>
                    <span>
                      <strong>{getComfortLabel(result.option.comfort)}</strong>
                      <small>舒適度</small>
                    </span>
                  </div>

                  <div className="reasonColumns">
                    <div>
                      <strong>符合原因</strong>
                      <ul className="reasonList">
                        {result.reasons.slice(0, 3).map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <strong>注意事項</strong>
                      <ul className={result.blockers.length > 0 ? "blockerList" : "reasonList"}>
                        {[...result.blockers, ...result.cautions].slice(0, 3).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <p className="nextStep">
                    <strong>下一步：</strong>
                    {result.option.nextStep}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pageSection">
        <div className="sectionHeader">
          <p className="eyebrow">Next Actions</p>
          <h2>下一步行動卡</h2>
        </div>
        <div className="actionGrid">
          {actionCards.map((card, index) => (
            <article className="actionCard" key={card.title}>
              <span className="stepNumber">{String(index + 1).padStart(2, "0")}</span>
              <h3>{card.title}</h3>
              <span className="miniStatus">{card.status}</span>
              <p>
                <strong>完成標準：</strong>
                {card.standard}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="tableSection agingSection">
        <div className="sectionHeader tableHeader">
          <div>
            <p className="eyebrow">Source Aging Spec</p>
            <h2>來源老化機制準備規格</h2>
            <p>
              這是第一優先 Backlog 的準備稿，只定義標籤、觸發點與人工處理方式，不啟用自動化。
            </p>
          </div>
          <div className="sourceNote">
            <strong>目的</strong>
            <span>避免過期票價、班表、飯店與條款被誤用</span>
          </div>
        </div>
        <div className="tableWrap agingTableWrap">
          <table className="agingTable">
            <thead>
              <tr>
                <th>資料類型</th>
                <th>老化標籤</th>
                <th>重查觸發</th>
                <th>目前處理方式</th>
              </tr>
            </thead>
            <tbody>
              {agingRules.map((rule) => (
                <tr key={rule.dataType}>
                  <td>
                    <strong>{rule.dataType}</strong>
                  </td>
                  <td>{rule.agingLabel}</td>
                  <td>{rule.trigger}</td>
                  <td>{rule.handling}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pageSection">
        <div className="sectionHeader">
          <p className="eyebrow">Activation Roadmap</p>
          <h2>Backlog 啟用階段</h2>
          <p>全部 Backlog 優化到位後，仍依階段啟用；現在停在 Stage 1 的準備狀態。</p>
        </div>
        <div className="stageGrid">
          {activationStages.map((stage) => (
            <article className="stageCard" key={stage.stage}>
              <span>{stage.stage}</span>
              <h3>{stage.title}</h3>
              <p>{stage.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pageSection enabledSection">
        <div className="sectionHeader">
          <p className="eyebrow">Enabled Backlog Layer</p>
          <h2>Backlog 功能啟用層</h2>
          <p>
            優化層完成後，已啟用本機判讀功能；外部即時資料源仍需正式接入與人工確認。
          </p>
        </div>
        <div className="enabledGrid">
          {enabledFeatures.map((feature) => (
            <article className="enabledCard" key={feature.title}>
              <span>{feature.status}</span>
              <h3>{feature.title}</h3>
              <p>{feature.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="tableSection agingSection">
        <div className="sectionHeader tableHeader">
          <div>
            <p className="eyebrow">Live Decision Guard</p>
            <h2>來源老化監控</h2>
            <p>此表已作為頁面判讀功能啟用，用來阻止過期或缺欄位資料被升級為結論。</p>
          </div>
          <div className="sourceNote">
            <strong>功能狀態：已啟用</strong>
            <span>本機規則判讀；未連接外部自動抓取</span>
          </div>
        </div>
        <div className="tableWrap agingTableWrap">
          <table className="agingTable">
            <thead>
              <tr>
                <th>資料來源</th>
                <th>最後查核</th>
                <th>資料層級</th>
                <th>目前狀態</th>
                <th>下一步動作</th>
              </tr>
            </thead>
            <tbody>
              {agingMonitor.map((item) => (
                <tr key={item.source}>
                  <td>
                    <strong>{item.source}</strong>
                  </td>
                  <td>{item.lastChecked}</td>
                  <td>{item.freshness}</td>
                  <td>{item.status}</td>
                  <td>{item.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="contentGrid">
        <article className="panel intelligencePanel">
          <div className="sectionHeader">
            <p className="eyebrow">Budget Intelligence</p>
            <h2>預算情報判定</h2>
            <p>以 NT$150,000 為硬上限，先啟用本機判定規則。</p>
          </div>
          <div className="ruleList">
            {budgetIntelligence.map((rule) => (
              <div className="ruleItem" key={rule.item}>
                <strong>{rule.item}</strong>
                <span>{rule.signal}</span>
                <p>{rule.decision}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel importPanel">
          <div className="sectionHeader">
            <p className="eyebrow">Import Gate</p>
            <h2>資料匯入檢核</h2>
            <p>自動即時資料匯入先啟用檢核層，不直接抓取或覆蓋正式結論。</p>
          </div>
          <ul className="checkList">
            {importChecks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="tableSection templateSection">
        <div className="sectionHeader tableHeader">
          <div>
            <p className="eyebrow">Reusable Template</p>
            <h2>跨目的地模板啟用</h2>
            <p>只啟用模板抽象，不把其他目的地帶入目前黃刀鎮決策。</p>
          </div>
          <div className="sourceNote">
            <strong>功能狀態：模板啟用</strong>
            <span>目前仍以黃刀鎮專案為唯一決策面</span>
          </div>
        </div>
        <div className="templateGrid">
          {destinationTemplate.map(([label, body]) => (
            <div className="templateItem" key={label}>
              <strong>{label}</strong>
              <span>{body}</span>
            </div>
          ))}
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
            <span>2027 正式下訂前需重查</span>
          </div>
        </div>
        <div className="tableWrap tourTableWrap">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>團號</th>
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
                  <td>{row.code}</td>
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
                <strong>{row.code}</strong>
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
            {gates.map(([label, body]) => (
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
        <h2>先穩住比較基準，再等待 2027 商品公開</h2>
        <p>
          旅行團仍可作為低操作負擔方案，但目前看來自由行舒適型雙人仍是重要基準。
          任何 2027 團體商品，只要缺少完整日期、團費、航班、YZF 抵離時間、飯店、
          極光補看或延誤條款，就先標示為 PENDING_2027_RECHECK。
        </p>
      </section>
    </main>
  );
}
