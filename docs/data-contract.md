# 極光旅行資料契約

更新日：2026-07-20

## 公開資料原則

公開頁面只讀取通過品質閘門的靜態資料。來源頁身分核對、欄位完整度與推薦資格是三個不同概念，不可合併成單一「已驗證」狀態。

## 商品欄位

每筆商品至少需保留：

- `agency`、`productName`、`destination`
- `selectableDates` 與可篩選的 `months`
- `priceLabel`、`priceTwd`、`currency`
- `bookingStatus`、`bookingStatusType`
- `flightSummary`、`itinerarySummary`、`auroraNights`
- `sourceUrl`、`sourceTitle`
- `sourceVerificationStatus`、`sourceVerificationNote`
- `checkedAt`、`dataStatus`

## 狀態語意

### 來源頁身分

- `verified`：來源頁標題與商品名稱可對應。
- `unchecked`：有來源網址，但尚未取得足以比對的標題。
- `mismatch`：來源頁與商品列疑似不一致，不可發布或推薦。
- `unavailable`：沒有可查核來源網址。

`verified` 不代表價格、日期、航班或名額全部有效。

### 欄位完整度

- `available`：主要比較欄位沒有已知缺值標記。
- `partial`：仍可比較，但至少一部分欄位需再次確認。
- `needs-check`：缺漏較多，僅供內部查核。
- `unavailable`：未取得具體商品。

### 推薦資格

商品必須同時符合下列條件才能進入綜合推薦排序：

1. `sourceVerificationStatus === "verified"`
2. `dataStatus === "available"`
3. `priceTwd` 有值且不超過預算
4. 航班摘要已包含可辨識的航段與時間

## 航班與住宿擴充欄位

`flightSegments` 每個航段包含航空公司、班號、起訖機場、起降時間及證據等級。`hotelOptions` 包含飯店、城市、夜數、月份、價格及證據等級。

證據等級只能是：

- `official`：旅行社或供應商官方頁直接揭露。
- `third-party`：第三方即時查價或可核對資料。
- `historical-estimate`：歷史樣本估算，不能顯示成官方價格。

商品頁沒有公告時，欄位維持空值並顯示「尚未公布」或「尚未結構化」，不得以自由行估算代替團體商品資料。

## 自由行估算啟用條件

自由行估算資料必須逐項提供機票、住宿、活動、保險雜費、匯率與風險緩衝，並為每一項標示證據等級、查核日與來源。任一必要分項沒有可追溯來源時，不產生總價，也不在公開頁啟用比較。
