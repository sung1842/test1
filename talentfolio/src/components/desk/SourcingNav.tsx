"use client";

// 스카우트 건 하위 메뉴: 새 건 만들기 / 건 현황
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SourcingNav() {
  const path = usePathname() ?? "";
  const items = [
    { href: "/sourcing", label: "새 건 만들기", on: path === "/sourcing" },
    { href: "/sourcing/cases", label: "건 현황", on: path.startsWith("/sourcing/cases") },
  ];
  return (
    <nav className="lc-seg lc-subnav" aria-label="스카우트 건 메뉴">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.on ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
