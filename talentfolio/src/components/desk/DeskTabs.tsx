"use client";

// 데스크 공통 탭 (21 문서 §3). 후보 검토를 두 번째에 두어 모바일 첫 화면에 보이게 한다.
// 탭 줄은 DeskFrame(루트 레이아웃)이 한 번만 그린다. 페이지 안의 <DeskTabs /> 는 틀 안에서는 그리지 않는다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePendingCount } from "@/lib/deskData";
import { useInDeskFrame } from "./deskFrameContext";
import "./desk.css";

const TABS = [
  { href: "/desk", label: "홈", match: ["/desk"] },
  { href: "/review", label: "승인함", match: ["/review", "/sourcing/review", "/brief"] },
  { href: "/sourcing", label: "스카우트 건", match: ["/sourcing"] },
  { href: "/desk/candidates", label: "인재풀", match: ["/desk/candidates", "/discover"] },
  { href: "/settings/integrations", label: "연동", match: ["/settings"] },
  { href: "/desk/profile", label: "기업 프로필", match: ["/desk/profile"] },
] as const;

function isOn(path: string, match: readonly string[]) {
  if (path === "/desk") return match[0] === "/desk";
  if (path.startsWith("/sourcing/review")) return match.includes("/sourcing/review");
  return match.some((m) => m !== "/desk" && (path === m || path.startsWith(m + "/")));
}

/** 페이지 호환용: 틀 밖에서만 그린다 */
export function DeskTabs({ pending }: { pending?: number | null }) {
  const inFrame = useInDeskFrame();
  if (inFrame) return null;
  return <TabList pending={pending ?? null} />;
}

/** DeskFrame 이 쓰는 고정 탭 줄. 미처리 수는 캐시된 분석 목록에서 센다 */
export function DeskTabsBar() {
  const pending = usePendingCount();
  return <TabList pending={pending} />;
}

function TabList({ pending }: { pending: number | null }) {
  const path = usePathname();
  return (
    <nav className="dk-tabs" aria-label="데스크 메뉴">
      {TABS.map((t) => (
        <Link key={t.label} href={t.href} aria-current={isOn(path ?? "", t.match) ? "page" : undefined}>
          {t.label}
          {t.href === "/review" && pending ? (
            <>
              <span className="dk-badge" aria-hidden="true">{pending > 99 ? "99+" : pending}</span>
              <span className="sr">(미처리 {pending}명)</span>
            </>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
