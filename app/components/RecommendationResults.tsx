import {
  dataStatusLabel,
  flightCompletenessLabel,
  sourceVerificationLabel,
} from "../lib/tourConstants";
import {
  getFlightCompleteness,
  getRecommendationReasons,
  getSourceVerificationStatus,
  isMissing,
} from "../lib/tourLogic";
import type { AgencyGroup, Product } from "../lib/tourTypes";

type RecommendationResultsProps = {
  bestAgencyGroup: AgencyGroup | undefined;
  bestProduct: Product | undefined;
  error: string;
  payloadLoaded: boolean;
  topAgencyGroups: AgencyGroup[];
  budget: number;
};

export function RecommendationResults({
  bestAgencyGroup,
  bestProduct,
  error,
  payloadLoaded,
  topAgencyGroups,
  budget,
}: RecommendationResultsProps) {
  return (
    <div className="resultPanel">
      {error ? (
        <div className="emptyState">{error}</div>
      ) : !payloadLoaded ? (
        <div className="emptyState">正在讀取靜態資料...</div>
      ) : (
        <>
          <div className="recommendation">
            <span>目前綜合排序第一</span>
            <strong>
              {bestAgencyGroup ? `${bestAgencyGroup.agency}方案` : "沒有符合條件的旅行社方案"}
            </strong>
            {bestProduct ? (
              <p className="recommendationProduct">代表商品：{bestProduct.productName}</p>
            ) : null}
            {bestProduct ? (
              <ul className="recommendationReasons">
                {getRecommendationReasons(bestProduct, budget).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
            {bestProduct ? (
              <a href={bestProduct.sourceUrl} rel="noreferrer" target="_blank">
                前往代表商品來源頁
              </a>
            ) : null}
          </div>

          <p className="agencyUnitNote">
            排序只會推薦來源頁身分已核對、主要欄位完整且在預算內的商品；其他資料仍可展開查閱。
          </p>

          {topAgencyGroups.length === 0 ? (
            <div className="emptyState">
              目前條件下沒有符合預算與篩選條件的商品；請調高預算或放寬其他條件後重新確認篩選。
            </div>
          ) : (
            <div className="productGrid">
              {topAgencyGroups.map((group) => (
                <AgencyOptionCard group={group} key={group.agency} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AgencyOptionCard({ group }: { group: AgencyGroup }) {
  const product = group.bestProduct;
  const sourceStatus = getSourceVerificationStatus(product);

  return (
    <article className="productCard agencyOptionCard">
      <div className="productHead">
        <span>{group.agency}</span>
        <div className="productBadges">
          <span className={product.dataStatus}>{dataStatusLabel[product.dataStatus]}</span>
          <span className={`sourceBadge ${sourceStatus}`}>
            {sourceVerificationLabel[sourceStatus]}
          </span>
        </div>
      </div>
      <h3>{group.agency}方案</h3>
      <div className="metaGrid">
        <span>{group.destinations.slice(0, 4).join("、")}</span>
        <span>{group.products.length} 筆符合條件商品</span>
        <span>{group.priceRange}</span>
        <span>{group.bookableCount} 筆可報名/可售</span>
      </div>
      <details>
        <summary>展開 {group.agency} 商品與航班資訊</summary>
        <div className="agencyProductList">
          {group.products.map((agencyProduct) => {
            const agencySourceStatus = getSourceVerificationStatus(agencyProduct);
            const isRecommended = group.score >= 0 && agencyProduct.id === product.id;

            return (
              <article
                className={`agencyProductCard${isRecommended ? " recommended" : ""}${
                  agencySourceStatus === "mismatch" ? " sourceMismatchCard" : ""
                }`}
                key={agencyProduct.id}
              >
                {isRecommended ? <span className="recommendBadge">綜合排序第一</span> : null}
                {agencySourceStatus === "mismatch" ? (
                  <span className="recommendBadge warningBadge">來源待修正</span>
                ) : null}
                <ProductDisclosure product={agencyProduct} sourceStatus={agencySourceStatus} />
              </article>
            );
          })}
        </div>
      </details>
    </article>
  );
}

function ProductDisclosure({
  product,
  sourceStatus,
}: {
  product: Product;
  sourceStatus: ReturnType<typeof getSourceVerificationStatus>;
}) {
  const flightCompleteness = getFlightCompleteness(product.flightSummary);

  return (
    <details>
      <summary>
        <strong>{product.productName}</strong>
        <small>{product.priceLabel || "未揭露價格"}</small>
        <small>{product.selectableDates}</small>
      </summary>
      <dl>
        <div>
          <dt>可選擇日期</dt>
          <dd>{product.selectableDates}</dd>
        </div>
        <div>
          <dt>金額</dt>
          <dd>{product.priceLabel || "未揭露價格"}</dd>
        </div>
        <div>
          <dt>極光夜數</dt>
          <dd>{product.auroraNights ? `${product.auroraNights} 晚/次` : "未標示"}</dd>
        </div>
        <div>
          <dt>預計航班</dt>
          <dd className={isMissing(product.flightSummary) ? "muted" : ""}>
            {product.flightSummary}
          </dd>
        </div>
        <div>
          <dt>航班完整度</dt>
          <dd>{flightCompletenessLabel[flightCompleteness]}</dd>
        </div>
        <div>
          <dt>住宿資料</dt>
          <dd className={product.hotelOptions?.length ? "" : "muted"}>
            {product.hotelOptions?.length
              ? product.hotelOptions
                  .map((hotel) => `${hotel.city}｜${hotel.hotelName}${hotel.nights ? `｜${hotel.nights} 晚` : ""}`)
                  .join("；")
              : "官方商品尚未形成可跨旅行社比較的結構化住宿欄位"}
          </dd>
        </div>
        <div>
          <dt>行程計畫表</dt>
          <dd>{product.itinerarySummary}</dd>
        </div>
        <div>
          <dt>報名狀態</dt>
          <dd>{product.bookingStatus}</dd>
        </div>
        <div>
          <dt>來源頁身分</dt>
          <dd className={sourceStatus === "mismatch" ? "sourceMismatchText" : ""}>
            {sourceVerificationLabel[sourceStatus]}
            {product.sourceVerificationNote ? `；${product.sourceVerificationNote}` : ""}
          </dd>
        </div>
        <div>
          <dt>欄位完整度</dt>
          <dd>{dataStatusLabel[product.dataStatus]}</dd>
        </div>
        <div>
          <dt>商品查核日</dt>
          <dd>{product.checkedAt}</dd>
        </div>
        <div>
          <dt>官方頁標題</dt>
          <dd className={product.sourceTitle ? "" : "muted"}>
            {product.sourceTitle || "尚未取得可比對標題"}
          </dd>
        </div>
      </dl>
      <a href={product.sourceUrl} rel="noreferrer" target="_blank">
        {sourceStatus === "mismatch" ? "前往來源頁重新確認" : "前往訂購/來源頁"}
      </a>
    </details>
  );
}
