# 黃刀鎮極光旅行團比較

這個網站整理台灣旅行社的極光旅行團資料，預設聚焦黃刀鎮，並保留芬蘭、冰島、阿拉斯加與紐西蘭南極光等替代目的地供使用者切換。

## 推薦原則

只有同時符合以下條件的商品會進入綜合推薦排序：

- 來源頁身分已核對；
- 主要比較欄位完整；
- 已取得可辨識的航段與時間；
- 有明確價格且在使用者預算內。

排序會考慮可報名狀態、極光夜數與相對預算節省額。來源核對只代表商品列與官方頁可對應，不代表價格、航班、日期及名額永遠有效；使用者在訂購前仍需回到來源頁確認。

## 資料流程

公開頁面只讀取 `public/data/` 內的靜態資料，不會讓訪客直接觸發旅行社網站查詢。

1. 原始旅行社資料與補充查核資料進入資料產生流程。
2. 每筆商品經過來源頁身分比對及欄位完整度分類。
3. 品質稽核輸出到 `exports/`。
4. 受保護的更新流程確認高風險筆數、預期旅行社覆蓋及資料新鮮度。
5. 通過後才保留新的公開資料；失敗會回復上一版。

預期旅行社與解析方式記錄於 `scripts/pipeline/source-manifest.mjs`。完整後續資料欄位規劃記錄於 `docs/optimization-workstreams.md`。

## 本機使用

需求：Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

## 驗證

```bash
npm test
npm run lint
node scripts/audit-tour-data-readiness.mjs
```

## 更新資料

```bash
npm run data:build
npm run data:daily
npm run data:update:guarded
```

`data:build` 只會產生 `work/data-preview/` 預覽資料。`data:daily` 與 `data:update:guarded` 都會執行受保護的正式更新流程；若來源缺失、資料過期、高風險筆數超標，或可用商品明顯減少，會回復上一版公開資料。

## 發布

專案已設定 Sites，但修改不會自動發布。發布前必須完成建置、測試、資料品質稽核，並由專案負責人明確確認。
