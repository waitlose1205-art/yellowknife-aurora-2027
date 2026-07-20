import type { SourceStatus } from "../lib/tourTypes";

export function SourceStatusSection({ sources }: { sources: SourceStatus[] }) {
  return (
    <section className="pageSection sourceSection">
      <details className="sourceDisclosure">
        <summary>
          <span className="eyebrow">Source Freshness</span>
          <strong>資料來源與更新時間</strong>
          <small>點選展開來源與更新時間</small>
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
  );
}
