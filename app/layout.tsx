import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "極光旅行團靜態推薦系統",
  description:
    "以後台查詢與靜態 JSON 顯示旅行社極光商品，支援目的地、月份、預算與資料狀態篩選。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
