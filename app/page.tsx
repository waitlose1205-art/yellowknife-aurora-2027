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
  getFlightCompleteness,
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

        if (!productResponse.ok || !sourceResponse.ok) throw new Error("資料檔讀取失敗");

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
  const yellowknifeCount = products.filter((product) => product.destination === "黃刀鎮").length;
  const highConfidenceCount = products.filter(
    (product) =>
      product.dataStatus === "available" &&
      product.sourceVerificationStatus === "verified" &&
      product.priceTwd !== null &&
      getFlightCompleteness(product.flightSummary) === "complete",
  ).length;
  const withinBudgetCount = filteredProducts.filter(
    (product) => product.priceTwd !== null && product.priceTwd <= appliedFilters.budget,
  ).length;
  const sourceUpdatedCount = sources.filter((source) => source.status === "updated").length;

  return (
    <main>
      <section className="hero">
        <div className="heroOverlay" />
        <div className="heroContent">
          <p className="eyebrow">Yellowknife Aurora Decision Guide</p>
          <h1>黃刀鎮極光旅行團比較</h1>
          <p className="lead">
            預設聚焦黃刀鎮，依來源頁身分、欄位完整度、可報名狀態、極光安排與預算排序。
            其他極光目的地仍可從篩選條件切換比較。
          </p>
          <div className="statusBar" aria-label="資料狀態">
            <span>
              <strong>{payload?.checkedAt ?? "讀取中"}</strong>
              資料基準日
            </span>
            <span>
              <strong>{yellowknifeCount} / {products.length}</strong>
              黃刀鎮商品 / 全部極光商品
            </span>
            <span>
              <strong>{highConfidenceCount}</strong>
              具綜合推薦資格
            </span>
            <span>
              <strong>{sourceUpdatedCount}/{sources.length || 8}</strong>
              已更新來源
            </span>
          </div>
        </div>
      </section>

      <section className="pageSection simulator">
        <div className="sectionHeader">
          <p className="eyebrow">Decision Filters</p>
          <h2>依需求比較旅行團</h2>
          <p>
            公開頁面只讀取最後一次查核後的資料，不會即時連線旅行社。綜合排序不是保證，請在訂購前回到來源頁確認售價與名額。
          </p>
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
            budget={appliedFilters.budget}
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
