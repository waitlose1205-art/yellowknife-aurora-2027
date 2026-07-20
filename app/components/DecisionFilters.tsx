import type { Dispatch, SetStateAction } from "react";
import { monthOptions } from "../lib/tourConstants";
import { formatCurrency } from "../lib/tourLogic";
import type { AgencyGroup, FilterState } from "../lib/tourTypes";

type DecisionFiltersProps = {
  agencies: string[];
  agencyGroups: AgencyGroup[];
  destinations: string[];
  draftFilters: FilterState;
  filteredCount: number;
  filtersChanged: boolean;
  setAppliedFilters: Dispatch<SetStateAction<FilterState>>;
  setDraftFilters: Dispatch<SetStateAction<FilterState>>;
  withinBudgetCount: number;
};

export function DecisionFilters({
  agencies,
  agencyGroups,
  destinations,
  draftFilters,
  filteredCount,
  filtersChanged,
  setAppliedFilters,
  setDraftFilters,
  withinBudgetCount,
}: DecisionFiltersProps) {
  return (
    <aside className="controlPanel">
      <label className="controlGroup">
        <span>預算上限</span>
        <strong>{formatCurrency(draftFilters.budget)}</strong>
        <input
          max={400000}
          min={100000}
          onChange={(event) =>
            setDraftFilters((current) => ({
              ...current,
              budget: Number(event.target.value),
            }))
          }
          step={10000}
          type="range"
          value={draftFilters.budget}
        />
      </label>

      <label className="controlGroup">
        <span>目的地</span>
        <select
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, destination: event.target.value }))
          }
          value={draftFilters.destination}
        >
          {destinations.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>

      <label className="controlGroup">
        <span>旅行社</span>
        <select
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, agency: event.target.value }))
          }
          value={draftFilters.agency}
        >
          {agencies.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>

      <label className="controlGroup">
        <span>出發月份</span>
        <select
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, month: Number(event.target.value) }))
          }
          value={draftFilters.month}
        >
          {monthOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="controlGroup">
        <span>最低極光夜數</span>
        <select
          onChange={(event) =>
            setDraftFilters((current) => ({
              ...current,
              minimumNights: Number(event.target.value),
            }))
          }
          value={draftFilters.minimumNights}
        >
          <option value={0}>不限夜數</option>
          <option value={1}>至少 1 晚/次</option>
          <option value={2}>至少 2 晚/次</option>
          <option value={3}>至少 3 晚/次</option>
          <option value={4}>至少 4 晚/次</option>
          <option value={5}>至少 5 晚/次</option>
        </select>
      </label>

      <label className="toggleRow">
        <input
          checked={draftFilters.onlyConcrete}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, onlyConcrete: event.target.checked }))
          }
          type="checkbox"
        />
        只顯示已取得商品名稱、價格與來源的商品
      </label>

      <button
        className="applyFiltersButton"
        onClick={() => setAppliedFilters(draftFilters)}
        type="button"
      >
        確認篩選
      </button>
      <p className="filterApplyNote">
        {filtersChanged
          ? "條件已變更，按下確認後才更新旅行社卡片。"
          : `目前結果依 ${formatCurrency(draftFilters.budget)} 預算上限顯示。`}
      </p>

      <div className="filterSummaryCard">
        <span>篩選結果摘要</span>
        <strong>{filteredCount} 筆商品</strong>
        <small>{agencyGroups.length} 家旅行社方案卡</small>
        <small>{withinBudgetCount} 筆已有價格且低於目前預算上限</small>
      </div>
    </aside>
  );
}
