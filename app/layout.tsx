import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "黃刀鎮極光旅行團｜行程推薦與比較",
  description:
    "比較台灣旅行社黃刀鎮極光行程，依月份、預算、極光夜數與資料狀態快速篩選。",
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
