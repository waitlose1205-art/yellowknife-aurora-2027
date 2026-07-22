# 通用旅行團資料契約

更新日：2026-07-21

## 公開資料原則

公開頁面只讀取通過品質閘門的靜態資料。來源頁身分核對、商品欄位完整度、來源收錄完整度與推薦資格是四個不同概念，不可合併成單一「已驗證」狀態。

網站只可宣稱「在已宣告範圍內收錄」。未完成旅行社分類、分頁和官方結果總數核對時，來源必須標示為 `partial`，不得使用「所有旅行團」或「完整收錄」。

## 通用商品欄位

每筆商品至少需保留：

- `agency`、`productName`、`travelScope`、`category`
- `destination`、`regions`、`countries`、`themes`
- `selectableDates`、`months`、`days`、`departureLocations`
- `transportModes` 及適用的交通摘要
- `priceLabel`、`priceTwd`、`currency`
- `bookingStatus`、`bookingStatusType`
- `sourceUrl`、`sourceTitle`
- `sourceVerificationStatus`、`sourceVerificationNote`
- `checkedAt`、`dataStatus`

`auroraNights` 等內容屬於主題專用屬性，可以不存在，不得成為其他旅遊分類的通用必要欄位。

## 狀態語意

### 來源頁身分

- `verified`：來源頁標題與商品名稱可對應。
- `unchecked`：有來源網址，但尚未取得足以比對的標題。
- `mismatch`：來源頁與商品列疑似不一致，不可發布或推薦。
- `unavailable`：沒有可查核來源網址。

`verified` 不代表價格、日期、交通或名額仍然有效。

### 商品欄位完整度

- `available`：該旅行類型的主要比較欄位沒有已知缺值。
- `partial`：仍可比較，但部分欄位需再次確認。
- `needs-check`：缺漏較多，僅供內部查核。
- `unavailable`：未取得具體商品。

### 來源收錄完整度

- `complete`：已核對宣告分類、所有分頁和官方結果總數。
- `partial`：只取得部分主題、分類、分頁或無法核對官方總數。
- `unavailable`：宣告範圍內沒有取得具體商品。

每個來源需另外保存 `declaredScope`、`paginationComplete`、`coverageNote` 與查核時間。

## 推薦資格

通用推薦至少需符合：

1. `sourceVerificationStatus === "verified"`
2. `dataStatus === "available"`
3. 價格有值且在使用者預算內
4. 具備該交通方式所需的必要資訊；只有航空行程需要完整航段與時間

極光、郵輪、國旅、親子或賞櫻等主題可增加自己的比較屬性，但不得改變其他分類的通用資格。

## 證據規則

證據等級只能是 `official`、`third-party` 或 `historical-estimate`。商品頁沒有公告時維持空值並顯示「尚未公布」或「尚未結構化」，不得以估算值冒充官方商品資料。

旅行業者官方名錄只用於確認業者身分，不代表該業者的旅行商品已被收錄。
