import { classifyFlight } from "./flight-quality.mjs";

export function summarizeDataset(dataset) {
  const products = dataset?.products ?? [];
  return {
    totalProducts: products.length,
    availableProducts: products.filter((product) => product.dataStatus === "available").length,
    recommendableProducts: products.filter(
      (product) =>
        product.dataStatus === "available" &&
        product.sourceVerificationStatus === "verified" &&
        product.priceTwd !== null &&
        (!product.transportModes?.includes("flight") ||
          classifyFlight(product.flightSummary) === "has-flight-times"),
    ).length,
  };
}

function dropRate(previous, current) {
  if (previous <= 0) return 0;
  return (previous - current) / previous;
}

export function compareDatasetQuality(previousDataset, nextDataset, maximumDropRate = 0.05) {
  const previous = summarizeDataset(previousDataset);
  const next = summarizeDataset(nextDataset);
  const regressions = [];

  for (const metric of ["totalProducts", "availableProducts", "recommendableProducts"]) {
    const rate = dropRate(previous[metric], next[metric]);
    if (rate > maximumDropRate) {
      regressions.push({ metric, previous: previous[metric], next: next[metric], dropRate: rate });
    }
  }

  return { maximumDropRate, next, previous, regressions };
}
