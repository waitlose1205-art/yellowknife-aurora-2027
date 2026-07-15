---
project: 黃刀鎮極光旅 / Aurora Intelligence Project - Yellowknife 2027
document_type: 8-task processing summary
language: zh-TW
generated_at: 2026-07-15
source: Yellowknife_Aurora_2027_CODEX_HANDOFF.md
status: completed_local_processing
---

# 8 項任務處理總覽

本檔依目前側邊任務分析方向，將專案下一階段拆成 8 個可追蹤處理項目。所有處理均遵守 M2 靜態基線：不改動 Repository、Gate、核心任務排序，不把 2027 尚未公開資料寫成既定事實。

## 處理狀態

| 編號 | 任務 | 狀態 | 產物 |
| --- | --- | --- | --- |
| T1 | 2026 已成團旅行團正規化 | 已完成 | `2026_GROUP_TOUR_NORMALIZED_TABLE.md` |
| T2 | 2027 年 1-3 月航班候選重查模板 | 已完成 | `2027_FLIGHT_RECHECK_TEMPLATE.md` |
| T3 | 團體旅遊 vs 自由行同口徑總成本比較 | 已完成 | `TRAVEL_MODE_COST_COMPARISON.md` |
| T4 | 2027 團體商品快速篩選規則 | 已完成 | `2027_PRODUCT_SCREENING_CHECKLIST.md` |
| T5 | PENDING_2027_RECHECK 待重查清單 | 已完成 | `PENDING_2027_RECHECK_REGISTER.md` |
| T6 | 風險與恢復方案整理 | 已完成 | `RISK_RECOVERY_PLAYBOOK.md` |
| T7 | 決策紀錄與資料來源索引 | 已完成 | `DECISION_LOG_AND_EVIDENCE_INDEX.md` |
| T8 | 網頁同步呈現 8 項任務 | 已完成 | `index.html`、`app/page.tsx` |

## 當前結論

1. 旅行團仍可作為低操作負擔方案，但 2026 樣本多屬 B 級極光夜數。
2. 必要費用後，只有 2026/03/19 樣本保有明顯預算餘額。
3. 2027 商品發布前，所有班號、飯店、YZF 抵離時間、價格與補看規則都必須留在 `PENDING_2027_RECHECK`。
4. 自由行舒適型雙人仍是重要基準，用來測試團體商品是否真的值得等待。
5. 下一個需要即時查核的階段是航班與商品公開資料重查；未重查前不可做最終下訂建議。

## 下一輪可執行動作

當使用者要求進入「即時重查」時，依序處理：

1. 查核 Air Canada TPE-YZF 一票到底可售票價與轉機時間。
2. 查核 China Airlines / EVA / Korean Air / Japan Airlines 至 YVR 長程段票價。
3. 查核 YVR-YZF / YZF-YVR 加拿大國內段時間與價格。
4. 將每組候選更新到 `2027_FLIGHT_RECHECK_TEMPLATE.md`。
5. 若 2027 團體商品已公開，填入 `2027_PRODUCT_SCREENING_CHECKLIST.md` 與 `PENDING_2027_RECHECK_REGISTER.md`。
