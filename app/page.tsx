"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ALL_SCOPES,
  DEFAULT_FILTERS,
  monthOptions,
  travelScopeLabels,
} from "./lib/tourConstants";
import {
  filterProducts,
  formatCurrency,
  getAgencyOptions,
  getDestinationOptions,
  getThemeOptions,
  getTravelScopeOptions,
} from "./lib/tourLogic";
import type { FilterState, Product, ProductPayload, SourcePayload } from "./lib/tourTypes";

const PAGE_SIZE = 24;

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

const scopeLabel = (scope: Product["travelScope"] | string) =>
  scope === ALL_SCOPES
    ? scope
    : travelScopeLabels[scope as keyof typeof travelScopeLabels] ?? scope;

const comparisonRows: Array<[string, (product: Product) => string]> = [
  ["旅行社", (product) => product.agency],
  ["行程", (product) => product.productName || "待確認"],
  ["旅遊範圍", (product) => scopeLabel(product.travelScope)],
  ["目的地", (product) => product.destination || "待確認"],
  ["主題", (product) => product.themes?.join("、") || "一般行程"],
  ["天數", (product) => (product.days ? `${product.days} 天` : "待確認")],
  ["價格", (product) => product.priceLabel || formatTwd(product.priceTwd)],
  ["可選日期", (product) => product.selectableDates || "待確認"],
  ["交通資訊", (product) => product.flightSummary || "待確認"],
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
  const themes = useMemo(() => getThemeOptions(products), [products]);
  const travelScopes = useMemo(() => getTravelScopeOptions(products), [products]);
  const matchingProducts = useMemo(
    () => filterProducts(products, appliedFilters),
    [appliedFilters, products],
  );
  const selectedProducts = useMemo(
    () => selectedIds.map((id) => products.find((product) => product.id === id)).filter(Boolean) as Product[],
    [products, selectedIds],
  );
  const lowestPrice = Math.min(...matchingProducts.map((product) => product.priceTwd ?? Infinity));
  const partialSources = sourcePayload?.sources.filter((source) => source.coverageStatus !== "complete").length ?? 0;

  function applyFilters() {
    setAppliedFilters(draftFilters);
    setVisibleCount(PAGE_SIZE);
  }

  function toggleSelection(productId: string) {
    setSelectedIds((current) => {
      if (current.includes(productId)) return current.filter((id) => id !== productId);
      if (current.length >= 4) return current;
      return [...current, productId];
    });
  }

  return (
    <main className="workbench" id="top">
      <header className="workbenchNav">
        <a className="workbenchBrand" href="#top">TAIWAN <span>|</span> TOURS</a>
        <nav aria-label="主要導覽" className="workbenchNavLinks">
          <a href="#filters">搜尋條件</a>
          <a aria-current="page" href="#results">旅行團</a>
          <a href="#compare">比較清單</a>
          <a href="#sources">收錄範圍</a>
        </nav>
      </header>

      <div className="workbenchLayout">
        <aside className="workbenchFilters" id="filters">
          <p className="workbenchKicker">尋找旅行團</p>
          <p className="workbenchIntro">搜尋已匯入的公開旅行團。結果不會即時連線旅行社，訂購前請回官方來源確認。</p>

          <label className="workbenchField">
            <span>關鍵字</span>
            <input
              onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="目的地、行程或旅行社"
              type="search"
              value={draftFilters.query}
            />
          </label>

          <label className="workbenchField">
            <span>旅遊範圍</span>
            <select onChange={(event) => setDraftFilters((current) => ({ ...current, travelScope: event.target.value }))} value={draftFilters.travelScope}>
              {travelScopes.map((item) => <option key={item} value={item}>{scopeLabel(item)}</option>)}
            </select>
          </label>

          <label className="workbenchField">
            <span>目的地</span>
            <select onChange={(event) => setDraftFilters((current) => ({ ...current, destination: event.target.value }))} value={draftFilters.destination}>
              {destinations.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label className="workbenchField">
            <span>旅遊主題</span>
            <select onChange={(event) => setDraftFilters((current) => ({ ...current, theme: event.target.value }))} value={draftFilters.theme}>
              {themes.map((item) => <option key={item}>{item}</option>)}
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
            <span>最長天數</span>
            <select onChange={(event) => setDraftFilters((current) => ({ ...current, maximumDays: Number(event.target.value) }))} value={draftFilters.maximumDays}>
              <option value={0}>不限天數</option>
              {[3, 5, 7, 10, 14, 21].map((days) => <option key={days} value={days}>{days} 天以內</option>)}
            </select>
          </label>

          <label className="workbenchField">
            <span>預算上限</span>
            <input
              max={500000}
              min={0}
              onChange={(event) => setDraftFilters((current) => ({ ...current, budget: Number(event.target.value) }))}
              step={10000}
              type="range"
              value={draftFilters.budget}
            />
            <small><strong>{formatTwd(draftFilters.budget)}</strong><span>最高 NT$500,000</span></small>
          </label>

          <label className="workbenchCheck">
            <input checked={draftFilters.onlyConcrete} onChange={(event) => setDraftFilters((current) => ({ ...current, onlyConcrete: event.target.checked }))} type="checkbox" />
            只顯示已有商品名稱、價格與官方來源的行程
          </label>

          <button className="workbenchApply" onClick={applyFilters} type="button">搜尋旅行團</button>
        </aside>

        <section className="workbenchContent">
          <header className="comparisonHeader" id="results">
            <div>
              <h1>台灣旅行團搜尋與比較</h1>
              <p>目前資料以已接入旅行社的極光主題商品為主，架構已支援其他旅遊範圍與主題。</p>
            </div>
            <p className="comparisonNote">未收錄不代表市場沒有商品；實際價格、日期與名額以旅行社官方頁為準。</p>
          </header>

          <section className="coverageNotice" id="sources" aria-label="資料收錄範圍">
            <strong>部分收錄</strong>
            <p>目前接入 {sourcePayload?.sources.length ?? 0} 家旅行社、{products.length} 筆商品；{partialSources} 個來源仍屬主題或分頁部分覆蓋。本站不宣稱收錄台灣所有旅行團。</p>
            <small>原始資料日期：{payload?.checkedAt ?? sourcePayload?.checkedAt ?? "未標示"}；本機產生時間：{formatCheckedTime(payload?.generatedAt ?? sourcePayload?.generatedAt)}</small>
          </section>

          {error ? <p className="workbenchMessage">{error}</p> : null}
          {!payload && !error ? <p className="workbenchMessage">正在讀取已匯入的旅行團資料。</p> : null}

          {payload ? (
            <div className="resultSummary">
              <strong>{matchingProducts.length} 筆符合條件</strong>
              <span>{Number.isFinite(lowestPrice) ? `最低 ${formatTwd(lowestPrice)}` : "價格待確認"}</span>
              <span>已選 {selectedIds.length}/4 筆比較</span>
            </div>
          ) : null}

          <div className="tourResultGrid">
            {matchingProducts.slice(0, visibleCount).map((product) => {
              const selected = selectedIds.includes(product.id);
              const disabled = !selected && selectedIds.length >= 4;
              return (
                <article className={`tourResultCard${selected ? " selected" : ""}`} key={product.id}>
                  <div className="tourResultMeta">
                    <span>{scopeLabel(product.travelScope)}</span>
                    <span>{product.destination}</span>
                    <span>{product.dataStatus === "available" ? "資料完整" : "部分資料"}</span>
                  </div>
                  <h2>{product.productName}</h2>
                  <p>{product.agency} · {product.days ? `${product.days} 天` : "天數待確認"}</p>
                  <div className="tourResultPrice">{product.priceLabel || formatTwd(product.priceTwd)}</div>
                  <p>{product.selectableDates || "出發日期待確認"}</p>
                  <div className="tourResultActions">
                    <label>
                      <input checked={selected} disabled={disabled} onChange={() => toggleSelection(product.id)} type="checkbox" />
                      加入比較
                    </label>
                    <a className="workbenchLink" href={product.sourceUrl} rel="noreferrer" target="_blank">官方來源</a>
                  </div>
                </article>
              );
            })}
          </div>

          {payload && !matchingProducts.length ? <p className="workbenchMessage">目前條件下沒有已匯入商品；這不代表市場沒有行程。</p> : null}
          {visibleCount < matchingProducts.length ? <button className="loadMoreButton" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} type="button">顯示更多行程</button> : null}

          <section className="comparisonArea" id="compare">
            <header>
              <div><span>自選比較</span><h2>比較具體旅行團</h2></div>
              {selectedIds.length ? <button onClick={() => setSelectedIds([])} type="button">清除全部</button> : null}
            </header>
            {selectedProducts.length ? (
              <div className="comparisonTableWrap">
                <table className="comparisonTable">
                  <thead><tr><th scope="col">比較項目</th>{selectedProducts.map((product, index) => <th key={product.id} scope="col"><span>行程 {index + 1}</span><strong>{product.agency}</strong></th>)}</tr></thead>
                  <tbody>
                    {comparisonRows.map(([label, getValue]) => <tr key={label}><th scope="row">{label}</th>{selectedProducts.map((product) => <td className={label === "價格" ? "priceCell" : label === "資料驗證" ? "verificationCell" : ""} key={product.id}>{getValue(product)}</td>)}</tr>)}
                    <tr><th scope="row">官方來源</th>{selectedProducts.map((product) => <td key={product.id}><a className="workbenchLink" href={product.sourceUrl} rel="noreferrer" target="_blank">查看來源</a></td>)}</tr>
                  </tbody>
                </table>
              </div>
            ) : <p className="workbenchMessage">從搜尋結果勾選最多 4 筆具體行程後，可在此逐項比較。</p>}
          </section>
        </section>
      </div>
    </main>
  );
}
