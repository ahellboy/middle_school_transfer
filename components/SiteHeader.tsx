"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const home = usePathname() === "/";
  return (
    <header className={home ? "topbar topbar-room" : "topbar"}>
      <Link href="/" className="brand">转轨评估</Link>
      <span className="brand-sub">上海初三 / 高一 · 国际高中</span>
      <nav className="topnav">
        <Link href="/">评估</Link>
        <Link href="/admin">算法后台</Link>
      </nav>
    </header>
  );
}
