"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { BrandLogo } from "@/components/brand/BrandLogo";
import "./site-header.css";

const PRETENDARD = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";
const WANTED_SANS = "https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css";

type NavLink = { href: string; label: string };

// Landing sections live on "/", so the same hrefs work from every page.
const LANDING_LINKS: NavLink[] = [
  { href: "/#roles", label: "역할" },
  { href: "/#demo", label: "작동 방식" },
  { href: "/#works", label: "작업물" },
];

// 역할별 메뉴. 데스크톱 바와 모바일 메뉴가 같은 데이터를 쓴다.
const STUDIO_LINKS: NavLink[] = [
  { href: "/studio", label: "스튜디오" },
  { href: "/studio/log", label: "기록하기" },
  { href: "/studio/cards", label: "내 카드" },
  { href: "/studio/matches", label: "받은 추천" },
  { href: "/studio/offers", label: "받은 제안" },
];
const DESK_LINKS: NavLink[] = [
  { href: "/desk", label: "데스크" },
  { href: "/review", label: "승인함" },
  { href: "/desk/offers", label: "제안" },
  { href: "/desk/candidates", label: "인재풀" },
  { href: "/sourcing", label: "스카우트 건" },
  { href: "/settings/integrations", label: "연동" },
];

type Zone = "landing" | "studio" | "desk";
const DESK_PREFIXES = ["/desk", "/review", "/sourcing", "/settings", "/discover", "/brief"];

function zoneOf(path: string): Zone | null {
  if (path.startsWith("/studio")) return "studio";
  if (DESK_PREFIXES.some((p) => path.startsWith(p))) return "desk";
  if (path === "/" || path === "/login" || path === "/signup") return "landing";
  return null; // /talent 등 공용 화면은 저장된 역할을 따른다
}


function isCurrent(path: string, href: string) {
  if (href.startsWith("/#")) return false;
  if (href === "/studio" || href === "/desk") return path === href;
  return path === href || path.startsWith(href + "/");
}

/**
 * One header for every page (draft H2 "minimal bar").
 * - overlay: fixed + transparent until scrolled (landing hero). Otherwise sticky and solid.
 * - crumb / actions: optional page-specific extras on the right.
 */
export function SiteHeader({ overlay = false, crumb, actions }: { overlay?: boolean; crumb?: string; actions?: ReactNode }) {
  const { user, accountType, signOut } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("");
  const path = usePathname() ?? "/";
  // 공용 화면(/talent 등)의 메뉴는 계정 유형을 따른다. 비로그인은 랜딩 메뉴.
  const storedRole = accountType === "company" ? "hunter" : accountType === "seeker" ? "talent" : null;
  const zone: Zone = zoneOf(path) ?? (storedRole === "hunter" ? "desk" : storedRole === "talent" ? "studio" : "landing");
  const LINKS = zone === "studio" ? STUDIO_LINKS : zone === "desk" ? DESK_LINKS : LANDING_LINKS;
  // 데스크는 본문 위 DeskTabs(대기 건수 배지 포함)가 같은 메뉴라, 데스크톱 바에서는 겹치지 않게 비운다.
  const BAR_LINKS = zone === "desk" ? [] : LINKS;
  const home = zone === "desk" || storedRole === "hunter" ? { href: "/desk", label: "데스크로" } : { href: "/studio", label: "내 스튜디오" };
  const cta = user ? home : { href: "/signup", label: "시작하기" };

  // Scroll state + progress line.
  useEffect(() => {
    const root = rootRef.current!;
    let ticking = false;
    const draw = () => {
      ticking = false;
      root.classList.toggle("solid", scrollY > 24);
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.min(1, scrollY / max)})`;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(draw); } };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    draw();
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); };
  }, []);

  // Active link + dark-section tint, only where the landing sections exist.
  useEffect(() => {
    if (location.pathname !== "/") return;
    const ids = LANDING_LINKS.filter((l) => l.href.startsWith("/#")).map((l) => l.href.slice(2));
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) setActive(ids.includes(e.target.id) ? e.target.id : "");
    }), { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("section[id]").forEach((s) => io.observe(s));
    const cta = document.getElementById("cta");
    const darkIO = new IntersectionObserver(([e]) => rootRef.current?.classList.toggle("on-dark", e.isIntersecting), { rootMargin: "0px 0px -92% 0px" });
    if (cta) darkIO.observe(cta);
    return () => { io.disconnect(); darkIO.disconnect(); };
  }, []);

  // Mobile menu: scroll lock, inert page, Esc, focus trap.
  useEffect(() => {
    if (!menuOpen) return;
    const siblings = [...document.querySelectorAll<HTMLElement>("body > *")].filter((el) => !el.contains(rootRef.current));
    document.documentElement.classList.add("site-menu-open");
    const pageBlocks = [...(rootRef.current?.parentElement?.children ?? [])].filter((el) => el !== rootRef.current) as HTMLElement[];
    [...siblings, ...pageBlocks].forEach((el) => (el.inert = true));
    menuRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenuOpen(false); burgerRef.current?.focus(); return; }
      if (e.key !== "Tab" || !menuRef.current) return;
      const f = [burgerRef.current!, ...menuRef.current.querySelectorAll<HTMLElement>("a,button")];
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    };
    addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("site-menu-open");
      [...siblings, ...pageBlocks].forEach((el) => (el.inert = false));
      removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);
  const auth = user
    ? <button className="login" type="button" onClick={() => { close(); signOut(); }}>로그아웃</button>
    : <Link className="login" href="/login" onClick={close}>로그인</Link>;

  return (
    <div ref={rootRef} className={`site-hdr${overlay ? " overlay" : ""}`}>
      <link rel="stylesheet" href={PRETENDARD} precedence="default" />
      <link rel="stylesheet" href={WANTED_SANS} precedence="default" />
      <nav className="bar-wrap" aria-label="주요 메뉴">
        <Link className="logo" href="/" aria-label="talentfolio 홈"><BrandLogo size={24.2} /></Link>
        <ul className="links">
          {BAR_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={isCurrent(path, l.href) ? "page" : active && l.href === `/#${active}` ? "location" : undefined}>{l.label}</Link>
            </li>
          ))}
        </ul>
        <div className="right">
          {crumb ? <span className="crumb">{crumb}</span> : null}
          {actions}
          {auth}
          <Link className="cta" href={cta.href}>{cta.label} <i aria-hidden="true">→</i></Link>
          <button ref={burgerRef} className="burger" type="button" aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={menuOpen} aria-controls="site-mmenu" onClick={() => setMenuOpen((o) => !o)}>
            <span /><span />
          </button>
        </div>
        <span className="rail" aria-hidden="true" />
        <span className="progress" ref={progressRef} aria-hidden="true" />
      </nav>
      {menuOpen && (
        <div className="mmenu" id="site-mmenu" ref={menuRef}>
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close} aria-current={isCurrent(path, l.href) ? "page" : undefined}>{l.label}</Link>
              </li>
            ))}
            {actions ? <li className="mm-actions" onClick={close}>{actions}</li> : null}
            <li>{auth}</li>
          </ul>
          <Link className="cta" href={cta.href} onClick={close}>{cta.label} →</Link>
        </div>
      )}
    </div>
  );
}
