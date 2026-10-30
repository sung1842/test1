"use client";

// 데스크 공통 탭 (21 문서 §3). 후보 검토를 두 번째에 두어 모바일 첫 화면에 보이게 한다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./desk.css";

// 준비 중인 탭은 완성될 때까지 숨긴다. 기업 화면은 모두 이 탭 하나로 이동한다.
const TABS = [
  { href: "/desk", label: "홈", match: ["/desk"] },
  { href: "/review", label: "승인함", match: ["/review", "/sourcing/review", "/brief"] },
  { href: "/sourcing", label: "스카우트 건", match: ["/sourcing"] },
  { href: "/desk/candidates", label: "인재풀", match: ["/desk/candidates", "/discover"] },
  { href: "/settings/integrations", label: "연동", match: ["/settings"] },
] as const;

function isOn(path: string, match: readonly string[]) {
  if (path === "/desk") return match[0] === "/desk";
  if (path.startsWith("/sourcing/review")) return match.includes("/sourcing/review");
  return match.some((m) => m !== "/desk" && (path === m || path.startsWith(m + "/")));
}

export function DeskTabs({ pending }: { pending?: number | null }) {
  const path = usePathname();
  return (
    <nav className="dk-tabs" aria-label="데스크 메뉴">
      {TABS.map((t) => (
          <Link key={t.label} href={t.href} aria-current={isOn(path ?? "", t.match) ? "page" : undefined}>
            {t.label}
            {t.href === "/review" && pending ? (
              <>
                <span className="dk-badge" aria-hidden="true">{pending}</span>
                <span className="sr">(대기 {pending}건)</span>
              </>
            ) : null}
          </Link>
      ))}
    </nav>
  );
}
