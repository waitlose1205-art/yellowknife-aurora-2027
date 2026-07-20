import type { SourceStatus } from "../lib/tourTypes";

export function SourceStatusSection({ sources }: { sources: SourceStatus[] }) {
  return (
    <section className="pageSection sourceSection">
      <details className="sourceDisclosure">
        <summary>
          <span className="eyebrow">Source Freshness</span>
          <strong>資料來源、完整度與更新時間</strong>
          <small>「已更新」只代表本次資料流程有產出，不等於每筆欄位都完整。</small>
        </summary>
        <div className="sourceGrid">
          {sources.map((source) => (
            <article className="sourceCard" key={source.agency}>
              <span className={source.status}>
                {source.status !== "updated"
                  ? "待補資料"
                  : source.availableRows > 0
                    ? "已更新"
                    : "已更新，欄位待補"}
              </span>
              <strong>{source.agency}</strong>
              <p>
                {source.concreteRows} 筆具體商品 / {source.totalRows} 筆資料列；
                {source.availableRows} 筆主要欄位完整
              </p>
              <small>查核日：{source.checkedAt}</small>
              <small>{source.nextStep}</small>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
