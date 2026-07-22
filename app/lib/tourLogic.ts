import {
  ALL_AGENCIES,
  ALL_DESTINATIONS,
  ALL_SCOPES,
  ALL_THEMES,
} from "./tourConstants";
import type {
  AgencyGroup,
  FilterState,
  FlightCompleteness,
  Product,
  SourceVerificationStatus,
} from "./tourTypes";

export function formatCurrency(value: number) {
  return `NT$${value.toLocaleString("zh-TW")}`;
}

export function getScore(product: Product, budget: number) {
  if (product.priceTwd === null || product.priceTwd > budget) return -1;
  if (product.sourceVerificationStatus !== "verified") return -1;
  if (product.dataStatus !== "available") return -1;
  if (
    product.transportModes?.includes("flight") &&
    getFlightCompleteness(product.flightSummary) !== "complete"
  ) return -1;

  let score = 0;
  score += 40;
  if (product.bookingStatusType === "bookable") score += 30;
  if (product.bookingStatusType === "limited") score += 8;
  if (product.days) score += 5;
  if (product.months.length) score += 5;

  const savingsRate = Math.max((budget - product.priceTwd) / budget, 0);
  score += Math.round(savingsRate * 20);

  return score;
}

export function getDestinationOptions(products: Product[]) {
  const destinations = Array.from(new Set(products.map((product) => product.destination))).sort();
  return [ALL_DESTINATIONS, ...destinations];
}

export function getAgencyOptions(products: Product[]) {
  return [ALL_AGENCIES, ...Array.from(new Set(products.map((product) => product.agency))).sort()];
}

export function getThemeOptions(products: Product[]) {
  const themes = Array.from(new Set(products.flatMap((product) => product.themes ?? []))).sort();
  return [ALL_THEMES, ...themes];
}

export function getTravelScopeOptions(products: Product[]) {
  const scopes = Array.from(new Set(products.map((product) => product.travelScope))).sort();
  return [ALL_SCOPES, ...scopes];
}

export function getSourceVerificationStatus(product: Product): SourceVerificationStatus {
  return product.sourceVerificationStatus ?? "unchecked";
}

export function isMissing(value: string) {
  return /未取得|未揭露|需進商品頁確認|來源列表未揭露/.test(value);
}

export function getFlightCompleteness(value: string): FlightCompleteness {
  if (/官方商品頁目前未公開完整航班|官方頁目前未公開完整航班/.test(value)) {
    return "official-not-disclosed";
  }
  if (!value || /未取得|來源列表未揭露|需進商品頁確認|動態載入/.test(value)) {
    return "unavailable";
  }
  if (/\d{1,2}:\d{2}/.test(value) && /→|->|至|到/.test(value)) return "complete";
  return "partial";
}

export function filtersAreChanged(draftFilters: FilterState, appliedFilters: FilterState) {
  return (
    draftFilters.query !== appliedFilters.query ||
    draftFilters.budget !== appliedFilters.budget ||
    draftFilters.destination !== appliedFilters.destination ||
    draftFilters.agency !== appliedFilters.agency ||
    draftFilters.travelScope !== appliedFilters.travelScope ||
    draftFilters.theme !== appliedFilters.theme ||
    draftFilters.month !== appliedFilters.month ||
    draftFilters.maximumDays !== appliedFilters.maximumDays ||
    draftFilters.onlyConcrete !== appliedFilters.onlyConcrete
  );
}

export function filterProducts(products: Product[], filters: FilterState) {
  const query = filters.query.trim().toLocaleLowerCase("zh-Hant");
  return products
    .filter((product) => {
      if (!query) return true;
      return [
        product.productName,
        product.agency,
        product.destination,
        product.category,
        ...(product.themes ?? []),
        ...(product.countries ?? []),
      ].join(" ").toLocaleLowerCase("zh-Hant").includes(query);
    })
    .filter((product) =>
      filters.destination === ALL_DESTINATIONS ? true : product.destination === filters.destination,
    )
    .filter((product) => (filters.agency === ALL_AGENCIES ? true : product.agency === filters.agency))
    .filter((product) =>
      filters.travelScope === ALL_SCOPES ? true : product.travelScope === filters.travelScope,
    )
    .filter((product) =>
      filters.theme === ALL_THEMES ? true : (product.themes ?? []).includes(filters.theme),
    )
    .filter((product) => (filters.month === 0 ? true : product.months.includes(filters.month)))
    .filter((product) =>
      filters.maximumDays === 0 ? true : product.days !== null && product.days <= filters.maximumDays,
    )
    .filter((product) =>
      filters.onlyConcrete
        ? product.dataStatus !== "unavailable" &&
          Boolean(product.productName && product.sourceUrl && product.priceTwd !== null)
        : true,
    )
    .filter((product) => product.priceTwd === null || product.priceTwd <= filters.budget)
    .sort((first, second) => sortByRecommendation(first, second, filters.budget));
}

export function getRecommendationReasons(product: Product, budget: number) {
  const reasons: string[] = [];
  if (product.sourceVerificationStatus === "verified") reasons.push("來源頁身分已核對");
  if (product.dataStatus === "available") reasons.push("主要比較欄位完整");
  if (!product.transportModes?.includes("flight") || getFlightCompleteness(product.flightSummary) === "complete") {
    reasons.push("已取得適用的交通資訊");
  }
  if (product.bookingStatusType === "bookable") reasons.push("目前標示可報名或可售");
  if (product.priceTwd !== null) {
    reasons.push(
      budget - product.priceTwd >= 10000
        ? `較預算上限節省 ${formatCurrency(budget - product.priceTwd)}`
        : "價格在預算範圍內",
    );
  }
  return reasons;
}

export function groupProductsByAgency(products: Product[], budget: number): AgencyGroup[] {
  const groups = new Map<string, Product[]>();

  for (const product of products) {
    const current = groups.get(product.agency) ?? [];
    current.push(product);
    groups.set(product.agency, current);
  }

  return Array.from(groups.entries())
    .map(([agencyName, agencyProducts]) => buildAgencyGroup(agencyName, agencyProducts, budget))
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score;
      return first.agency.localeCompare(second.agency, "zh-Hant");
    });
}

function buildAgencyGroup(agencyName: string, agencyProducts: Product[], budget: number): AgencyGroup {
  const sortedProducts = agencyProducts
    .slice()
    .sort((first, second) => sortByRecommendation(first, second, budget));
  const recommendableProducts = sortedProducts.filter((product) => getScore(product, budget) >= 0);
  const bestProduct = recommendableProducts[0] ?? sortedProducts[0];
  const prices = sortedProducts
    .map((product) => product.priceTwd)
    .filter((price): price is number => price !== null)
    .sort((first, second) => first - second);

  return {
    agency: agencyName,
    products: sortedProducts,
    bestProduct,
    score: recommendableProducts[0] ? getScore(recommendableProducts[0], budget) : -1,
    destinations: Array.from(new Set(sortedProducts.map((product) => product.destination))),
    priceRange: getPriceRange(prices),
    completeCount: sortedProducts.filter((product) => product.dataStatus === "available").length,
    partialCount: sortedProducts.filter((product) => product.dataStatus === "partial").length,
    bookableCount: sortedProducts.filter((product) => product.bookingStatusType === "bookable").length,
  };
}

function getPriceRange(prices: number[]) {
  if (prices.length === 0) return "價格需確認";
  if (prices.length === 1) return formatCurrency(prices[0]);
  return `${formatCurrency(prices[0])} - ${formatCurrency(prices[prices.length - 1])}`;
}

function sortByRecommendation(first: Product, second: Product, budget: number) {
  const secondScore = getScore(second, budget);
  const firstScore = getScore(first, budget);
  if (secondScore !== firstScore) return secondScore - firstScore;

  const firstPrice = first.priceTwd ?? Number.MAX_SAFE_INTEGER;
  const secondPrice = second.priceTwd ?? Number.MAX_SAFE_INTEGER;
  return firstPrice - secondPrice;
}
