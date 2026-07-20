"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { DEFAULT_FILTERS, monthOptions } from "./lib/tourConstants";
import {
  filterProducts,
  formatCurrency,
  getAgencyOptions,
  getDestinationOptions,
  groupProductsByAgency,
} from "./lib/tourLogic";
import type { FilterState, Product, ProductPayload, SourcePayload } from "./lib/tourTypes";

const formatTwd = (value: number | null) =>
  value === null ? "待確認" : formatCurrency(value);

const formatCheckedTime = (value: string | undefined) =>
  value
    ? new Intl.DateTimeFormat("zh-TW", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Taipei",
      }).format(new Date(value))
    : "未標示";

const comparisonRows: Array<[string, (product: Product) => string]> = [
  ["代表行程", (product) => product.productName || "待確認"],
  ["總價", (product) => product.priceLabel || formatTwd(product.priceTwd)],
  ["可選日期", (product) => product.selectableDates || "待確認"],
  ["極光夜數", (product) => (product.auroraNights ? `${product.auroraNights} 晚` : "待確認")],
  ["預計航班", (product) => product.flightSummary || "待確認"],
  ["報名狀態", (product) => product.bookingStatus || "待確認"],
  [
    "資料驗證",
    (product) => product.sourceVerificationNote || (product.sourceUrl ? "已附官方來源" : "待補來源"),
  ],
];

export default function Home() {
  const [payload, setPayload] = useState<ProductPayload | null>(null);
  const [sourcePayload, setSourcePayload] = useState<SourcePayload | null>(null);
  const [error, setError] = useState("");
  const [draftFilters, setDraftFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    async function loadData() {
      try {
        const [productResponse, sourceResponse] = await Promise.all([
          fetch("/data/tour-products.latest.json", { cache: "no-store" }),
          fetch("/data/source-status.json", { cache: "no-store" }),
        ]);
        if (!productResponse.ok || !sourceResponse.ok) throw new Error("資料檔讀取失敗");
        setPayload((await productResponse.json()) as ProductPayload);
        setSourcePayload((await sourceResponse.json()) as SourcePayload);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "資料讀取失敗");
      }
    }
    loadData();
  }, []);

  const products = useMemo(() => payload?.products ?? [], [payload]);
  const destinations = useMemo(() => getDestinationOptions(products), [products]);
  const agencies = useMemo(() => getAgencyOptions(products), [products]);
  const matchingProducts = useMemo(
    () => filterProducts(products, appliedFilters),
    [appliedFilters, products],
  );
  const groups = useMemo(
    () => groupProductsByAgency(matchingProducts, appliedFilters.budget),
    [appliedFilters.budget, matchingProducts],
  );
  const options = groups.slice(0, 3);
  const bestAgency = options.find((group) => group.score >= 0)?.agency;
  const lowestPrice = Math.min(...matchingProducts.map((product) => product.priceTwd ?? Infinity));

  return (
    <main className="workbench" id="top">
      <header className="workbenchNav">
        <a className="workbenchBrand" href="#top">YK <span>|</span> AURORA</a>
        <nav aria-label="主要導覽" className="workbenchNavLinks">
          <a href="#filters">條件設定</a>
          <a aria-current="page" href="#compare">方案比較</a>
          <a href="#sources">資料狀態</a>
        </nav>
      </header>

      <div className="workbenchLayout">
        <aside className="workbenchFilters" id="filters">
          <p className="workbenchKicker">Trip parameters</p>
          <p className="workbenchIntro">設定條件後，系統只重新排序已匯入資料，不會即時連線旅行社網站。</p>

          <label className="workbenchField">
            <span>預算上限</span>
            <input
              max={400000}
              min={100000}
              onChange={(event) => setDraftFilters((current) => ({ ...current, budget: Number(event.target.value) }))}
              step={10000}
              type="range"
              value={draftFilters.budget}
            />
            <div
              className="workbenchBudgetScale"
              style={{ "--budget-position": `${((draftFilters.budget - 100000) / 300000) * 100}%` } as CSSProperties}
            >
              <strong>{formatTwd(draftFilters.budget)}</strong>
              <span>NT$100,000</span><span>NT$400,000</span>
            </div>
          </label>

          <label className="workbenchField">
            <span>目的地</span>
            <select onChange={(event) => setDraftFilters((current) => ({ ...current, destination: event.target.value }))} value={draftFilters.destination}>
              {destinations.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label className="workbenchField">
            <span>旅行社</span>
            <select onChange={(event) => setDraftFilters((current) => ({ ...current, agency: event.target.value }))} value={draftFilters.agency}>
              {agencies.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label className="workbenchField">
            <span>出發月份</span>
            <select onChange={(event) => setDraftFilters((current) => ({ ...current, month: Number(event.target.value) }))} value={draftFilters.month}>
              {monthOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <label className="workbenchField">
            <span>最低極光夜數</span>
            <select onChange={(event) => setDraftFilters((current) => ({ ...current, minimumNights: Number(event.target.value) }))} value={draftFilters.minimumNights}>
              <option value={0}>不限夜數</option>
              {[1, 2, 3, 4, 5].map((nights) => <option key={nights} value={nights}>至少 {nights} 晚</option>)}
            </select>
          </label>

          <label className="workbenchCheck">
            <input checked={draftFilters.onlyConcrete} onChange={(event) => setDraftFilters((current) => ({ ...current, onlyConcrete: event.target.checked }))} type="checkbox" />
            只顯示已取得商品名稱與價格的商品
          </label>

          <button className="workbenchApply" onClick={() => setAppliedFilters(draftFilters)} type="button">更新比較</button>
        </aside>

        <section className="workbenchContent" id="compare">
          <header className="comparisonHeader">
            <div>
              <h1>方案行程比較</h1>
              <p>以相同條件檢視旅行社方案的價格、日期、極光夜數、航班與資料驗證。</p>
            </div>
            <p className="comparisonNote">只有來源已驗證、資料可用且航班完整的方案，才會標示為最佳方案。</p>
          </header>

          {error ? <p className="workbenchMessage">{error}</p> : null}
          {!payload && !error ? <p className="workbenchMessage">正在讀取已匯入的旅行團資料。</p> : null}

          {payload && options.length ? (
            <>
              <div className="comparisonTableWrap">
                <table className="comparisonTable">
                  <thead><tr><th scope="col">比較項目</th>{options.map((group, index) => {
                    const recommended = group.agency === bestAgency;
                    return <th className={recommended ? "bestOptionHeader" : undefined} key={group.agency} scope="col">
                      {recommended ? <b className="bestOptionBadge">最佳方案</b> : null}
                      <span>方案 {index + 1}</span><strong>{group.agency}</strong>
                    </th>;
                  })}</tr></thead>
                  <tbody>
                    {comparisonRows.map(([label, getValue]) => <tr key={label}><th scope="row">{label}</th>{options.map((group) => <td className={label === "總價" ? "priceCell" : label === "資料驗證" ? "verificationCell" : ""} key={group.agency}>{getValue(group.bestProduct)}</td>)}</tr>)}
                    <tr><th scope="row">查看方案</th>{options.map((group) => <td key={group.agency}>{group.bestProduct.sourceUrl ? <a className="workbenchLink" href={group.bestProduct.sourceUrl} rel="noreferrer" target="_blank">查看來源</a> : "待補來源"}</td>)}</tr>
                  </tbody>
                </table>
              </div>

              <div className="comparisonMobileList">
                {options.map((group, index) => {
                  const recommended = group.agency === bestAgency;
                  return <article className={`comparisonMobileCard${recommended ? " bestOptionCard" : ""}`} key={group.agency}>
                    {recommended ? <b className="bestOptionBadge">最佳方案</b> : null}
                    <span>方案 {index + 1}</span><h2>{group.agency}</h2>
                    <dl>{comparisonRows.map(([label, getValue]) => <div key={label}><dt>{label}</dt><dd>{getValue(group.bestProduct)}</dd></div>)}</dl>
                    {group.bestProduct.sourceUrl ? <a className="workbenchLink" href={group.bestProduct.sourceUrl} rel="noreferrer" target="_blank">查看來源</a> : null}
                  </article>;
                })}
              </div>
            </>
          ) : null}

          {payload && !options.length ? <p className="workbenchMessage">目前條件下沒有符合的商品，請調整篩選條件。</p> : null}

          <section className="workbenchSources" id="sources">
            <p>資料狀態</p>
            <span>{sourcePayload?.sources.filter((source) => source.status === "updated").length ?? 0} 個來源已更新</span>
            <span>{matchingProducts.length} 筆符合條件商品</span>
            <span>{Number.isFinite(lowestPrice) ? `最低 ${formatTwd(lowestPrice)}` : "價格待確認"}</span>
            <span>本次核對 {formatCheckedTime(payload?.generatedAt ?? sourcePayload?.generatedAt)}</span>
            <span>原始彙整日期 {payload?.checkedAt ?? sourcePayload?.checkedAt ?? "未標示"}</span>
          </section>
        </section>
      </div>
    </main>
  );
}
