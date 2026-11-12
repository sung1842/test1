"use client";

// 기업 데스크 셸 (Calm Dark Console): 좌측 컴팩트 사이드바 + 본문. 폰 폭에서는 하단 탭 줄.
// G 다음 글자로 화면 이동 (Linear 식 2타). /desk·/review·/sourcing·/settings 의 layout 이 이 셸로 감싼다.
import "./shell.css";
import "./pages.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Home, Inbox, Send, Briefcase, Users, Plug, Building2, LogOut, MoreHorizontal, type LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { usePendingCount } from "@/lib/deskData";

type Nav = { href: string; label: string; key: string; icon: LucideIcon; match: string[] };
const NAV: Nav[] = [
  { href: "/desk", label: "홈", key: "H", icon: Home, match: [] },
  { href: "/review", label: "승인함", key: "R", icon: Inbox, match: ["/review"] },
  { href: "/desk/offers", label: "제안", key: "O", icon: Send, match: ["/desk/offers"] },
  { href: "/sourcing", label: "스카우트 건", key: "S", icon: Briefcase, match: ["/sourcing"] },
  { href: "/desk/candidates", label: "인재풀", key: "C", icon: Users, match: ["/desk/candidates"] },
  { href: "/settings/integrations", label: "연동", key: "I", icon: Plug, match: ["/settings"] },
  { href: "/desk/profile", label: "기업 프로필", key: "P", icon: Building2, match: ["/desk/profile"] },
];

const str = (v: unknown) => (typeof v === "string" ? v : "");

export function DeskShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "";
  const router = useRouter();
  const { user, signOut } = useAuth();
  const pending = usePendingCount();
  const main = useRef<HTMLElement>(null);

  // 사이드바는 로그인한 계정 이름. 기업 프로필의 채용 담당자(contactName)는 후보 연락용 별도 항목이라 쓰지 않는다
  const person = str(user?.user_metadata?.name) || user?.email || "";

  useEffect(() => {
    let g = 0;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      const k = e.key.toUpperCase();
      if (k === "G") { g = Date.now(); return; }
      if (Date.now() - g < 900) {
        const hit = NAV.find((n) => n.key === k);
        if (hit) { e.preventDefault(); router.push(hit.href); }
        g = 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="lc">
      <aside className="lc-side" aria-label="데스크 메뉴">
        {/* 맨 위는 서비스 로고 → 메인 페이지로. 좁은 화면(아이콘 줄)에서는 머리글자 표시로 줄인다 */}
        <Link href="/" className="lc-home" aria-label="talentfolio 메인 페이지로">
          <BrandLogo tone="dark" size={24} className="lc-home-full" />
          <span className="lc-mark lc-home-mark" aria-hidden="true">t</span>
        </Link>
        <nav className="lc-nav">
          {NAV.map((n) => {
            const on = n.href === "/desk" ? path === "/desk" : n.match.some((m) => path === m || path.startsWith(m + "/"));
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined} aria-keyshortcuts={`g ${n.key.toLowerCase()}`}>
                <Icon aria-hidden="true" />
                <span>{n.label}</span>
                {n.href === "/review" && pending ? <span className="lc-badge" aria-label={`미처리 ${pending}명`}>{pending > 99 ? "99+" : pending}</span> : null}
                <span className="lc-kbd" aria-hidden="true">G {n.key}</span>
              </Link>
            );
          })}
        </nav>
        <details className="lc-more-m">
          <summary aria-label="메뉴 더보기"><MoreHorizontal aria-hidden="true" /><span>더보기</span></summary>
          <div className="lc-more-menu">
            {NAV.slice(5).map((n) => {
              const Icon = n.icon;
              return <Link key={n.href} href={n.href} onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}><Icon aria-hidden="true" />{n.label}</Link>;
            })}
            <button type="button" onClick={() => void signOut()}><LogOut aria-hidden="true" />로그아웃</button>
          </div>
        </details>
        <button type="button" className="lc-out" onClick={() => void signOut()} aria-label="로그아웃"><LogOut aria-hidden="true" /><span>로그아웃</span></button>
        <div className="lc-side-foot">
          <div><span className="lc-kbd">G</span> 다음 글자로 화면 이동</div>
          <div className="lc-user">
            <span className="lc-ava" style={{ background: "#2a3b34", color: "#b6ead2" }} aria-hidden="true">{(person || "?").slice(0, 1)}</span>
            <span className="lc-uname">{person}</span>
            <button type="button" className="lc-logout" onClick={() => void signOut()}>로그아웃</button>
          </div>
        </div>
      </aside>
      <main id="main" className="lc-main" ref={main}>{children}</main>
    </div>
  );
}
