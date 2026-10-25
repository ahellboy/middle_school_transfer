import type { Metadata } from "next";
import { SiteHeader } from "../components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "转轨评估",
  description: "上海初三与高一学生，是否适合转入国际高中，以及 IB、AP、A-Level 哪条更贴。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
