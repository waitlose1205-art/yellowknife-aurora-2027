import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "黃刀鎮極光旅 2027 決策儀表板",
  description: "整理黃刀鎮極光旅 2027 的決策狀態、下一步、A/B 極光夜數、團體樣本、待重查項目與決策門檻。",
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
