"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  agency: string;
  productName: string;
  destination: string;
  selectableDates: string;
  months: number[];
  days: number | null;
  auroraNights: number | null;
  flightSummary: string;
  itinerarySummary: string;
  bookingStatus: string;
  bookingStatusType: "bookable" | "limited" | "needs-check" | "unavailable";
  priceLabel: string;
  priceTwd: number | null;
  currency: string;
  sourceUrl: string;
  checkedAt: string;
  dataStatus: "available" | "partial" | "needs-check" | "unavailable";
};

type ProductPayload = {
  schemaVersion: number;
  checkedAt: string;
  generatedAt: string;
  sourceFile: string;
  updateMode: string;
  products: Product[];
};

type SourceStatus = {
  agency: string;
  checkedAt: string;
  generatedAt: string;
  sourceFile: string;
  totalRows: number;
  concreteRows: number;
  availableRows: number;
  status: "updated" | "no-concrete-product";
  nextStep: string;
};

type SourcePayload = {
  checkedAt: string;
  generatedAt: string;
  sources: SourceStatus[];
};

const monthOptions = [
  { value: 0, label: "不限月份" },
  { value: 9, label: "9 月" },
  { value: 10, label: "10 月" },
  { value: 11, label: "11 月" },
  { value: 12, label: "12 月" },
  { value: 1, label: "1 月" },
  { value: 2, label: "2 月" },
  { value: 3, label: "3 月" },
];

const dataStatusLabel: Record<Product["dataStatus"], string> = {
  available: "欄位完整",
  partial: "部分可用",
  "needs-check": "需進商品頁確認",
  unavailable: "未取得商品",
};

const bookingStatusLabel: Record<Product["bookingStatusType"], string> = {
  bookable: "可報名",
  limited: "候補/額滿/結團",
  "needs-check": "需確認",
  unavailable: "未取得",
};

function formatCurrency(value: number) {
  return `NT$${value.toLocaleString("zh-TW")}`;
}

function getScore(product: Product, budget: number) {
  let score = 0;
  if (product.dataStatus === "available") score += 40;
  if (product.dataStatus === "partial") score += 26;
  if (product.bookingStatusType === "bookable") score += 30;
  if (product.bookingStatusType === "needs-check") score += 10;
  if (product.priceTwd && product.priceTwd <= budget) score += 25;
  if (product.auroraNights && product.auroraNights >= 3) score += 10;
  return score;
}

function getDestinationOptions(products: Product[]) {
  return ["全部目的地", ...Array.from(new Set(products.map((product) => product.destination))).sort()];
}

function getAgencyOptions(products: Product[]) {
  return ["全部旅行社", ...Array.from(new Set(products.map((product) => product.agency))).sort()];
}

function isMissing(value: string) {
  return /未取得|未揭露|需進商品頁確認|來源列表未揭露/.test(value);
}

export default function Home() {
  const [payload, setPayload] = useState<ProductPayload | null>(null);
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [error, setError] = useState("");
  const [budget, setBudget] = useState(150000);
  const [destination, setDestination] = useState("全部目的地");
  const [agency, setAgency] = useState("全部旅行社");
  const [month, setMonth] = useState(0);
  const [minimumNights, setMinimumNights] = useState(0);
  const [onlyConcrete, setOnlyConcrete] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [productResponse, sourceResponse] = await Promise.all([
          fetch("/data/tour-products.latest.json", { cache: "no-store" }),
          fetch("/data/source-status.json", { cache: "no-store" }),
        ]);

        if (!productResponse.ok || !sourceResponse.ok) {
          throw new Error("資料檔讀取失敗");
        }

        const productData = (await productResponse.json()) as ProductPayload;
        const sourceData = (await sourceResponse.json()) as SourcePayload;
        setPayload(productData);
        setSources(sourceData.sources);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "資料讀取失敗");
      }
    }

    loadData();
  }, []);

  const products = payload?.products ?? [];
  const destinations = useMemo(() => getDestinationOptions(products), [products]);
  const agencies = useMemo(() => getAgencyOptions(products), [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => (destination === "全部目的地" ? true : product.destination === destination))
      .filter((product) => (agency === "全部旅行社" ? true : product.agency === agency))
      .filter((product) => (month === 0 ? true : product.months.includes(month)))
      .filter((product) =>
        minimumNights === 0 ? true : (product.auroraNights ?? 0) >= minimumNights,
      )
      .filter((product) => (onlyConcrete ? product.dataStatus !== "unavailable" : true))
      .sort((first, second) => {
        const secondScore = getScore(second, budget);
        const firstScore = getScore(first, budget);
        if (secondScore !== firstScore) return secondScore - firstScore;
        const firstPrice = first.priceTwd ?? Number.MAX_SAFE_INTEGER;
        const secondPrice = second.priceTwd ?? Number.MAX_SAFE_INTEGER;
        return firstPrice - secondPrice;
      });
  }, [agency, budget, destination, minimumNights, month, onlyConcrete, products]);

  const agencyGroups = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const product of filteredProducts) {
      const current = groups.get(product.agency) ?? [];
      current.push(product);
      groups.set(product.agency, current);
    }

    return Array.from(groups.entries())
      .map(([agencyName, agencyProducts]) => {
        const sortedProducts = agencyProducts
          .slice()
          .sort((first, second) => {
            const secondScore = getScore(second, budget);
            const firstScore = getScore(first, budget);
            if (secondScore !== firstScore) return secondScore - firstScore;
            const firstPrice = first.priceTwd ?? Number.MAX_SAFE_INTEGER;
            const secondPrice = second.priceTwd ?? Number.MAX_SAFE_INTEGER;
            return firstPrice - secondPrice;
          });
        const prices = sortedProducts
          .map((product) => product.priceTwd)
          .filter((price): price is number => price !== null)
          .sort((first, second) => first - second);
        const completeCount = sortedProducts.filter(
          (product) => product.dataStatus === "available",
        ).length;
        const partialCount = sortedProducts.filter(
          (product) => product.dataStatus === "partial",
        ).length;
        const bookableCount = sortedProducts.filter(
          (product) => product.bookingStatusType === "bookable",
        ).length;

        return {
          agency: agencyName,
          products: sortedProducts,
          bestProduct: sortedProducts[0],
          score: sortedProducts[0] ? getScore(sortedProducts[0], budget) : 0,
          destinations: Array.from(new Set(sortedProducts.map((product) => product.destination))),
          priceRange:
            prices.length === 0
              ? "價格需確認"
              : prices.length === 1
                ? formatCurrency(prices[0])
                : `${formatCurrency(prices[0])} - ${formatCurrency(prices[prices.length - 1])}`,
          completeCount,
          partialCount,
          bookableCount,
        };
      })
      .sort((first, second) => {
        if (second.score !== first.score) return second.score - first.score;
        return first.agency.localeCompare(second.agency, "zh-Hant");
      });
  }, [budget, filteredProducts]);

  const topAgencyGroups = agencyGroups.slice(0, 12);
  const bestAgencyGroup = topAgencyGroups[0];
  const bestProduct = bestAgencyGroup?.bestProduct;
  const concreteCount = products.filter((product) => product.dataStatus !== "unavailable").length;
  const withinBudgetCount = filteredProducts.filter(
    (product) => product.priceTwd !== null && product.priceTwd <= budget,
  ).length;
  const sourceUpdatedCount = sources.filter((source) => source.status === "updated").length;

  return (
    <main>
      <section className="hero">
        <div className="heroOverlay" />
        <div className="heroContent">
          <p className="eyebrow">Aurora Tour Recommendation System</p>
          <h1>極光旅行團靜態資料推薦系統</h1>
          <p className="lead">
            旅行社資料由後台查核後轉成靜態 JSON。公開網頁只讀取整理後的資料並在前端篩選，
            不讓訪客觸發即時爬取，降低失敗率與資源消耗。
          </p>
          <div className="statusBar" aria-label="資料狀態">
            <span>
              <strong>{payload?.checkedAt ?? "讀取中"}</strong>
              查核基準日
            </span>
            <span>
              <strong>{products.length}</strong>
              匯入資料列
            </span>
            <span>
              <strong>{concreteCount}</strong>
              具體商品列
            </span>
            <span>
              <strong>{sourceUpdatedCount}/{sources.length || 8}</strong>
              已取得來源
            </span>
          </div>
        </div>
      </section>

      <section className="pageSection simulator">
        <div className="sectionHeader">
          <p className="eyebrow">Decision Filters</p>
          <h2>決策選項列表</h2>
          <p>這裡不會即時連線旅行社。所有篩選都使用最後一次查核後產生的靜態資料。</p>
        </div>

        <div className="simulatorGrid">
          <aside className="controlPanel">
            <label className="controlGroup">
              <span>預算上限</span>
              <strong>{formatCurrency(budget)}</strong>
              <input
                max={400000}
                min={100000}
                onChange={(event) => setBudget(Number(event.target.value))}
                step={10000}
                type="range"
                value={budget}
              />
            </label>

            <label className="controlGroup">
              <span>目的地</span>
              <select onChange={(event) => setDestination(event.target.value)} value={destination}>
                {destinations.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="controlGroup">
              <span>旅行社</span>
              <select onChange={(event) => setAgency(event.target.value)} value={agency}>
                {agencies.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="controlGroup">
              <span>出發月份</span>
              <select onChange={(event) => setMonth(Number(event.target.value))} value={month}>
                {monthOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="controlGroup">
              <span>最低極光夜數</span>
              <select
                onChange={(event) => setMinimumNights(Number(event.target.value))}
                value={minimumNights}
              >
                <option value={0}>不限夜數</option>
                <option value={3}>至少 3 晚/次</option>
              </select>
            </label>

            <label className="toggleRow">
              <input
                checked={onlyConcrete}
                onChange={(event) => setOnlyConcrete(event.target.checked)}
                type="checkbox"
              />
              只顯示已取得具體商品的來源
            </label>
          </aside>

          <div className="resultPanel">
            {error ? (
              <div className="emptyState">{error}</div>
            ) : !payload ? (
              <div className="emptyState">正在讀取靜態資料...</div>
            ) : (
              <>
                <div className="recommendation">
                  <span>目前最適合</span>
                  <strong>{bestProduct?.productName ?? "沒有符合條件的商品"}</strong>
                  <p>
                    符合條件 {filteredProducts.length} 筆，整理成 {agencyGroups.length} 家旅行社方案卡，
                    其中 {withinBudgetCount} 筆低於目前預算上限。
                  </p>
                  {bestProduct ? (
                    <a href={bestProduct.sourceUrl} rel="noreferrer" target="_blank">
                      前往訂購/來源頁
                    </a>
                  ) : null}
                </div>

                <p className="agencyUnitNote">
                  一張卡只代表一家旅行社；卡片內才展開該旅行社符合條件的旅行團。
                </p>

                <div className="productGrid">
                  {topAgencyGroups.map((group) => {
                    const product = group.bestProduct;
                    const overBudget = product.priceTwd !== null && product.priceTwd > budget;
                    return (
                      <article className="productCard agencyOptionCard" key={group.agency}>
                        <div className="productHead">
                          <span>{group.agency}</span>
                          <span className={product.dataStatus}>
                            {dataStatusLabel[product.dataStatus]}
                          </span>
                        </div>
                        <h3>{group.agency}方案</h3>
                        <div className="metaGrid">
                          <span>{group.destinations.slice(0, 4).join("、")}</span>
                          <span>{group.products.length} 筆符合條件商品</span>
                          <span className={overBudget ? "overBudget" : ""}>{group.priceRange}</span>
                          <span>{group.bookableCount} 筆可報名/可售</span>
                        </div>
                        <div className="agencyBestProduct">
                          <strong>代表商品</strong>
                          <span>{product.productName}</span>
                          <small>{product.selectableDates}</small>
                          <small>{product.priceLabel || "未揭露價格"}</small>
                        </div>
                        <details>
                          <summary>展開 {group.agency} 商品與航班資訊</summary>
                          <dl>
                            <div>
                              <dt>航班</dt>
                              <dd className={isMissing(product.flightSummary) ? "muted" : ""}>
                                {product.flightSummary}
                              </dd>
                            </div>
                            <div>
                              <dt>行程</dt>
                              <dd>{product.itinerarySummary}</dd>
                            </div>
                            <div>
                              <dt>報名</dt>
                              <dd>{product.bookingStatus}</dd>
                            </div>
                          </dl>
                          <div className="agencyProductList">
                            {group.products.slice(0, 8).map((agencyProduct) => (
                              <a
                                href={agencyProduct.sourceUrl}
                                key={agencyProduct.id}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <strong>{agencyProduct.productName}</strong>
                                <small>{agencyProduct.selectableDates}</small>
                                <small>{agencyProduct.priceLabel || "未揭露價格"}</small>
                              </a>
                            ))}
                          </div>
                        </details>
                        <a href={product.sourceUrl} rel="noreferrer" target="_blank">
                          前往此旅行社代表商品
                        </a>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="pageSection sourceSection">
        <details className="sourceDisclosure">
          <summary>
            <span className="eyebrow">Source Freshness</span>
            <strong>資料來源與老化狀態</strong>
            <small>點選展開來源查核狀態</small>
          </summary>
          <div className="sourceGrid">
            {sources.map((source) => (
              <article className="sourceCard" key={source.agency}>
                <span className={source.status}>{source.status === "updated" ? "已更新" : "待補資料"}</span>
                <strong>{source.agency}</strong>
                <p>
                  {source.concreteRows} 筆具體商品 / {source.totalRows} 筆資料列
                </p>
                <small>查核日：{source.checkedAt}</small>
                <small>{source.nextStep}</small>
              </article>
            ))}
          </div>
        </details>
      </section>
    </main>
  );
}

