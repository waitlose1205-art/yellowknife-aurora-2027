"use client";

import { useEffect, useMemo, useState } from "react";
import { DecisionFilters } from "./components/DecisionFilters";
import { RecommendationResults } from "./components/RecommendationResults";
import { SourceStatusSection } from "./components/SourceStatusSection";
import { DEFAULT_FILTERS } from "./lib/tourConstants";
import {
  filterProducts,
  filtersAreChanged,
  getAgencyOptions,
  getDestinationOptions,
  groupProductsByAgency,
} from "./lib/tourLogic";
import type { FilterState, ProductPayload, SourcePayload, SourceStatus } from "./lib/tourTypes";

export default function Home() {
  const [payload, setPayload] = useState<ProductPayload | null>(null);
  const [sources, setSources] = useState<SourceStatus[]>([]);
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

  const products = useMemo(() => payload?.products ?? [], [payload?.products]);
  const destinations = useMemo(() => getDestinationOptions(products), [products]);
  const agencies = useMemo(() => getAgencyOptions(products), [products]);
  const filtersChanged = filtersAreChanged(draftFilters, appliedFilters);
  const filteredProducts = useMemo(
    () => filterProducts(products, appliedFilters),
    [appliedFilters, products],
  );
  const agencyGroups = useMemo(
    () => groupProductsByAgency(filteredProducts, appliedFilters.budget),
    [appliedFilters.budget, filteredProducts],
  );

  const topAgencyGroups = agencyGroups.slice(0, 12);
  const bestAgencyGroup = topAgencyGroups.find((group) => group.score >= 0);
  const bestProduct = bestAgencyGroup?.bestProduct;
  const concreteCount = products.filter((product) => product.dataStatus !== "unavailable").length;
  const withinBudgetCount = filteredProducts.filter(
    (product) => product.priceTwd !== null && product.priceTwd <= appliedFilters.budget,
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
              <strong>
                {products.length} / {concreteCount}
              </strong>
              匯入資料列 / 具體商品列
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
          <DecisionFilters
            agencies={agencies}
            agencyGroups={agencyGroups}
            destinations={destinations}
            draftFilters={draftFilters}
            filteredCount={filteredProducts.length}
            filtersChanged={filtersChanged}
            setAppliedFilters={setAppliedFilters}
            setDraftFilters={setDraftFilters}
            withinBudgetCount={withinBudgetCount}
          />
          <RecommendationResults
            bestAgencyGroup={bestAgencyGroup}
            bestProduct={bestProduct}
            error={error}
            payloadLoaded={Boolean(payload)}
            topAgencyGroups={topAgencyGroups}
          />
        </div>
      </section>

      <SourceStatusSection sources={sources} />
    </main>
  );
}
