"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { DEFAULT_FILTERS, monthOptions } from "./lib/tourConstants";
import {
  filterProducts,
  getAgencyOptions,
  getDestinationOptions,
  groupProductsByAgency,
} from "./lib/tourLogic";
import type { FilterState, Product, ProductPayload, SourcePayload } from "./lib/tourTypes";

const formatTwd = (value: number | null) =>
  value === null
    ? "待確認"
    : new Intl.NumberFormat("zh-TW", {
        style: "currency",
        currency: "TWD",
        maximumFractionDigits: 0,
      }).format(value);

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
  const groups = useMemo(
    () => groupProductsByAgency(filterProducts(products, appliedFilters), appliedFilters.budget),
    [appliedFilters, products],
  );
  const options = groups.slice(0, 3);
  const matchingProducts = useMemo(
    () => filterProducts(products, appliedFilters),
    [appliedFilters, products],
  );
  const lowestPrice = Math.min(
    ...matchingProducts.map((product) => product.priceTwd ?? Infinity),
  );
  const best = options[0]?.bestProduct;

  return (
    <main className="workbench" id="top">
      <header className="workbenchNav">
        <a className="workbenchBrand" href="#top">
          YK <span>|</span> AURORA
        </a>
        <nav aria-label="主要導覽" className="workbenchNavLinks">
          <a href="#filters">條件設定</a>
          <a aria-current="page" href="#compare">方案比較</a>
          <a href="#sources">資料來源</a>
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
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, budget: Number(event.target.value) }))
              }
              step={10000}
              type="range"
              value={draftFilters.budget}
            />
            <div
              className="workbenchBudgetScale"
              style={{
                "--budget-position": `${((draftFilters.budget - 100000) / 300000) * 100}%`,
              } as CSSProperties}
            >
              <strong>{formatTwd(draftFilters.budget)}</strong>
              <span>NT$100,000</span>
              <span>NT$400,000</span>
            </div>
          </label>

          <label className="workbenchField">
            <span>目的地</span>
            <select
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, destination: event.target.value }))
              }
              value={draftFilters.destination}
            >
              {destinations.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label className="workbenchField">
            <span>旅行社</span>
            <select
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, agency: event.target.value }))
              }
              value={draftFilters.agency}
            >
              {agencies.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label className="workbenchField">
            <span>出發月份</span>
            <select
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, month: Number(event.target.value) }))
              }
              value={draftFilters.month}
            >
              {monthOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <label className="workbenchField">
            <span>最低極光夜數</span>
            <select
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, minimumNights: Number(event.target.value) }))
              }
              value={draftFilters.minimumNights}
            >
              <option value={0}>不限夜數</option>
              <option value={1}>至少 1 晚</option>
              <option value={2}>至少 2 晚</option>
              <option value={3}>至少 3 晚</option>
              <option value={4}>至少 4 晚</option>
              <option value={5}>至少 5 晚</option>
            </select>
          </label>

          <label className="workbenchCheck">
            <input
              checked={draftFilters.onlyConcrete}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, onlyConcrete: event.target.checked }))
              }
              type="checkbox"
            />
            只顯示已取得商品名稱與價格的商品
          </label>

          <button className="workbenchApply" onClick={() => setAppliedFilters(draftFilters)} type="button">
            更新比較
          </button>
        </aside>

        <section className="workbenchContent" id="compare">
          <header className="comparisonHeader">
            <div>
              <h1>方案行程比較</h1>
              <p>以相同條件檢視旅行社方案的價格、日期、極光夜數、航班與資料驗證。</p>
            </div>
            <p className="comparisonNote">排序依價格、極光夜數、資料完整度、可報名狀態與來源連結計算。</p>
          </header>

          {error ? <p className="workbenchMessage">{error}</p> : null}
          {!payload && !error ? <p className="workbenchMessage">正在讀取已匯入的旅行團資料。</p> : null}

          {payload && options.length ? (
            <>
              <div className="comparisonTableWrap">
                <table className="comparisonTable">
                  <thead>
                    <tr>
                      <th scope="col">比較項目</th>
                      {options.map((group, index) => (
                        <th key={group.agency} scope="col">
                          <span>方案 {index + 1}</span>
                          <strong>{group.agency}</strong>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map(([label, getValue]) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        {options.map((group) => {
                          const product = group.bestProduct;
                          const value = getValue(product);
                          return (
                            <td className={label === "總價" ? "priceCell" : label === "資料驗證" ? "verificationCell" : ""} key={group.agency}>
                              {value}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr>
                      <th scope="row">查看方案</th>
                      {options.map((group) => (
                        <td key={group.agency}>
                          <a className="workbenchLink" href={group.bestProduct.sourceUrl} rel="noreferrer" target="_blank">查看來源</a>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="comparisonMobileList">
                {options.map((group, index) => (
                  <article className="comparisonMobileCard" key={group.agency}>
                    <span>方案 {index + 1}</span>
                    <h2>{group.agency}</h2>
                    <dl>
                      {comparisonRows.map(([label, getValue]) => (
                        <div key={label}><dt>{label}</dt><dd>{getValue(group.bestProduct)}</dd></div>
                      ))}
                    </dl>
                    <a className="workbenchLink" href={group.bestProduct.sourceUrl} rel="noreferrer" target="_blank">查看來源</a>
                  </article>
                ))}
              </div>

              <section className="recommendationStrip">
                <img alt="黃刀鎮極光" src="/aurora-hero.png" />
                <div>
                  <p>Recommendation</p>
                  <h2>{options[0].agency}</h2>
                  <span>{best?.productName}</span>
                  {best?.sourceUrl ? (
                    <a className="workbenchLink recommendationLink" href={best.sourceUrl} rel="noreferrer" target="_blank">
                      查看來源
                    </a>
                  ) : null}
                </div>
                <div className="recommendationPrice">
                  <small>目前最適合</small>
                  <strong>{formatTwd(best?.priceTwd ?? null)}</strong>
                </div>
              </section>
            </>
          ) : null}

          {payload && !options.length ? <p className="workbenchMessage">目前條件下沒有符合的商品，請調整篩選條件。</p> : null}

          <section className="workbenchSources" id="sources">
            <p>資料狀態</p>
            <span>{sourcePayload?.sources.filter((source) => source.status === "updated").length ?? 0} 個來源已更新</span>
            <span>{matchingProducts.length} 筆符合條件商品</span>
            <span>{Number.isFinite(lowestPrice) ? `最低 ${formatTwd(lowestPrice)}` : "價格待確認"}</span>
          </section>
        </section>
      </div>
    </main>
  );
}
