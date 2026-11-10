"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SkeletonList, StateView } from "@/components/state/StateView";
import { useCallback, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ScoreGauge } from "@/components/charts/ScoreCharts";
import { useAuth } from "@/context/AuthContext";
import { lifeApi, trustLabel, type LifeActivity, type LifeCard, type LifeMatchReport } from "@/lib/lifeApi";
import { CardPiece, StudioCards } from "./StudioCards";
import { StudioJobs } from "./StudioJobs";
import { StudioLetters } from "./StudioLetters";
import { StudioProfile } from "./StudioProfile";
import { StudioWorks } from "./StudioWorks";
import { loadLetters, loadPins, loadResume, sortCards, type ResumeBasics } from "./studioData";
import "./studio.css";

const PRETENDARD = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

export type StudioView = "overview" | "profile" | "works" | "pieces" | "letters" | "jobs";
const NAV: { v: StudioView; label: string }[] = [
  { v: "overview", label: "개요" },
  { v: "profile", label: "프로필" },
  { v: "works", label: "작업물" },
  { v: "pieces", label: "나를 보여주기" },
  { v: "letters", label: "자기소개서" },
  { v: "jobs", label: "공고" },
];

export interface StudioState {
  cards: LifeCard[];
  activities: LifeActivity[];
  reports: LifeMatchReport[];
  basics: ResumeBasics | null;
  letters: number;
  pins: number;
  completeness: number;
  profileGaps: number;
  savedAt: Date | null;
}

const EMPTY: StudioState = { cards: [], activities: [], reports: [], basics: null, letters: 0, pins: 0, completeness: 0, profileGaps: 0, savedAt: null };

/**
 * 지원자 스튜디오 (디자인: docs/design/talentfolio-main/drafts/S_studio 목업, studio.css).
 * 계정별 데이터: 근거 카드(SQL 015·017) · 이력서·자기소개서·공고 핀(016). "기업에게 보이는 화면" 은 공개 항목만 남긴 미리보기.
 */
export function StudioApp() {
  const { user, profile, loading, signOut } = useAuth();
  // 탭을 주소(?tab=)에 남겨 새로고침·공유·뒤로가기가 되게 한다.
  const [view, setViewState] = useState<StudioView>(() => {
    if (typeof window === "undefined") return "overview";
    const t = new URLSearchParams(location.search).get("tab");
    return NAV.some((n) => n.v === t) ? (t as StudioView) : "overview";
  });
  const setView = useCallback((v: StudioView) => {
    setViewState(v);
    const url = new URL(location.href);
    if (v === "overview") url.searchParams.delete("tab"); else url.searchParams.set("tab", v);
    history.pushState(null, "", url);
  }, []);
  useEffect(() => {
    const onPop = () => {
      const t = new URLSearchParams(location.search).get("tab");
      setViewState(NAV.some((n) => n.v === t) ? (t as StudioView) : "overview");
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);
  const [preview, setPreview] = useState(false);
  const [st, setSt] = useState<StudioState>(EMPTY);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [resume, letters, pins, life, matches] = await Promise.all([
      loadResume(user.id),
      loadLetters(user.id),
      loadPins(),
      lifeApi.drafts().catch(() => ({ cards: [] as LifeCard[], activities: [] as LifeActivity[] })), // 분석 서버 미연결이어도 나머지는 보여 준다
      lifeApi.matches().catch(() => ({ reports: [] as LifeMatchReport[] })),
    ]);
    const b = resume.basics;
    const checks = [
      !!b?.headline, !!b?.region_sido, (b?.desired_categories.length ?? 0) > 0, (b?.desired_regions.length ?? 0) > 0,
      resume.experiences.length > 0, resume.educations.length > 0, resume.certifications.length > 0,
      life.cards.length > 0, life.cards.some((c) => c.visibility === "public"),
    ];
    setSt({
      cards: life.cards,
      activities: life.activities,
      reports: matches.reports,
      basics: b,
      letters: letters.length,
      pins: pins.length,
      completeness: Math.round((checks.filter(Boolean).length / checks.length) * 100),
      profileGaps: checks.slice(0, 7).filter((x) => !x).length,
      savedAt: new Date(),
    });
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  if (loading) return <div className="studio-app"><main style={{ padding: 40, maxWidth: 720, margin: "0 auto" }}><SkeletonList rows={3} label="스튜디오를 불러오는 중" /></main></div>;
  if (!user) {
    return (
      <div className="studio-app">
        <SiteHeader crumb="스튜디오" />
        <main id="main" style={{ padding: "96px 20px 64px", maxWidth: 560, margin: "0 auto" }}>
          <StateView
            level={1}
            art="door"
            title="로그인하면 내 스튜디오가 열려요"
            note="공개하기 전엔 아무도 못 봐요"
            body="오늘 한 일을 한 줄씩 적으면 AI가 근거 카드로 정리해요. 무엇을 기업에 보여줄지는 내가 정해요."
            action={{ href: "/login", label: "로그인" }}
            secondary={{ href: "/", label: "메인으로" }}
          />
        </main>
      </div>
    );
  }

  const name = profile?.name ?? user.email?.split("@")[0] ?? "나";
  const sub = [profile?.title, st.basics?.region_sido].filter(Boolean).join(" · ");
  const navBtn = (n: { v: StudioView; label: string }) => (
    <button key={n.v} aria-current={view === n.v} onClick={() => setView(n.v)}>
      {n.label}
      {n.v === "profile" && st.profileGaps > 0 && <span className="dot" title="빈 항목 있음" />}
      {n.v === "pieces" && <em>{st.cards.length}</em>}
      {n.v === "letters" && <em>{st.letters}</em>}
      {n.v === "jobs" && <em>{st.pins}</em>}
    </button>
  );

  return (
    <div className={`studio-app${preview ? " preview" : ""}`}>
      <link rel="stylesheet" href={PRETENDARD} precedence="default" />
      <header className="top">
        <Link href="/" aria-label="talentfolio 홈"><BrandLogo size={22} /></Link>
        <div className="top-r">
          <button className="preview-tg" aria-pressed={preview} onClick={() => setPreview((p) => !p)}>
            <span className="sw" /><span className="lb">기업에게 보이는 화면</span>
          </button>
          <span className="nm">{name}</span><span className="av">{name.slice(0, 1)}</span>
          <button className="btn logout" onClick={() => void signOut()}>로그아웃</button>
        </div>
      </header>
      <nav className="mtabs" aria-label="스튜디오 메뉴">{NAV.map(navBtn)}</nav>
      <div className="app">
        <aside className="side">
          <div className="me">
            <strong>{name}</strong><span>{sub}</span>
            <div className="meter">
              <ScoreGauge value={st.completeness} label="프로필 완성도" suffix="%" height={150} />
            </div>
          </div>
          <nav className="nav" aria-label="스튜디오 메뉴">{NAV.map(navBtn)}</nav>
          <div className="side-foot">마지막 불러오기 · {st.savedAt ? st.savedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
        </aside>

        <main id="main">
          <div className="pv">
            <div className="pv-bar">
              <span>지금 보이는 화면은 <b>기업 채용 담당자</b>가 보는 모습이에요. 연락처·생년은 숨겨져 있어요.</span>
              <button className="btn" style={{ height: 28 }} onClick={() => setPreview(false)}>편집으로 돌아가기</button>
            </div>
          </div>

          {view === "overview" && <Overview name={name} st={st} go={setView} />}
          {view === "profile" && <StudioProfile userId={user.id} name={name} preview={preview} onChange={refresh} />}
          {view === "works" && <StudioWorks userId={user.id} preview={preview} />}
          {view === "pieces" && <StudioCards userId={user.id} preview={preview} onChange={refresh} />}
          {view === "letters" && <StudioLetters userId={user.id} cards={st.cards} activities={st.activities} preview={preview} onChange={refresh} />}
          {view === "jobs" && <StudioJobs userId={user.id} onChange={refresh} />}

          <section className="pv" style={{ marginTop: 28 }}>
            <p className="sec-t" style={{ marginTop: 0 }}>기업 검색 결과에 뜨는 카드 <span>공개 카드만 · 배지 그대로</span></p>
            <div className="card scout">
              <div className="scout-h">
                <span className="av">{name.slice(0, 1)}</span>
                <div><strong>{name}{profile?.title ? ` · ${profile.title}` : ""}</strong><span>{st.basics?.headline ?? ""}</span></div>
              </div>
              {sortCards(st.cards.filter((c) => c.visibility === "public")).slice(0, 3).map((c) => (
                <CardPiece key={c.id} card={c} title={st.activities.find((a) => a.id === c.activity_id)?.title} readOnly />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Overview({ name, st, go }: { name: string; st: StudioState; go: (v: StudioView) => void }) {
  const pub = st.cards.filter((c) => c.visibility === "public");
  const priv = st.cards.length - pub.length;
  const noLink = st.cards.filter((c) => c.links.length === 0).length;
  const title = (cardId: string, claim: string) =>
    st.activities.find((a) => a.id === st.cards.find((c) => c.id === cardId)?.activity_id)?.title ?? claim.slice(0, 40);
  const used = new Map<string, { claim: string; title: string; trust: string; n: number; heads: string[] }>();
  for (const r of st.reports) {
    for (const c of r.evidenceCards) {
      const u = used.get(c.id) ?? { claim: c.claim, title: c.claim.slice(0, 40), trust: c.trust_level, n: 0, heads: [] as string[] };
      u.n += 1;
      if (r.jdHeadline && u.heads.length < 2) u.heads.push(r.jdHeadline);
      used.set(c.id, u);
    }
  }
  for (const [id, u] of used) u.title = title(id, u.claim);
  const last = st.cards[0]?.recorded_at;
  return (
    <section className="view on">
      <div className="head"><div>
        <p className="eyebrow">개요</p>
        <h1>안녕하세요, {name} 님</h1>
        <p className="lede">공개한 근거 카드·이력서 항목·기본 자기소개서만 기업 검색과 공고 분석에 쓰여요.</p>
      </div></div>
      <div className="ov">
        <div className="card stat"><span>공고 분석에 쓰인 횟수</span><b>{st.reports.length}</b><small>공개 카드 기준</small></div>
        <div className="card stat"><span>담아 둔 공고</span><b>{st.pins}</b><small>관심·지원·보류</small></div>
        <div className="card stat"><span>공개한 근거 카드</span><b>{pub.length}</b><small style={{ color: "var(--mute)" }}>비공개 {priv}장</small></div>
      </div>
      <div className="two" style={{ marginTop: 14 }}>
        <div>
          <p className="sec-t">최근 분석</p>
          <ul className="card feed">
            {st.reports.slice(0, 4).map((r) => (
              <li key={r.id}>
                <span><b>{r.jdHeadline ?? "공고"}</b> 분석에 내 프로필이 쓰였어요{r.overallScore != null ? ` · 적합도 ${r.overallScore}` : ""}</span>
                <time>{new Date(r.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</time>
              </li>
            ))}
            {st.reports.length === 0 && <li><span>아직 분석에 쓰인 적이 없어요. 카드를 공개하면 공고 분석에 쓰여요.</span></li>}
          </ul>
        </div>
        <div>
          <p className="sec-t">분석·추천 근거로 쓰인 카드</p>
          <ul className="card used">
            {[...used.values()].slice(0, 3).map((u) => (
              <li key={u.claim}><span>“{u.title}”</span><small>{u.heads.join(", ")} · 근거 {u.n}회 · {trustLabel(u.trust)}</small></li>
            ))}
            {used.size === 0 && pub.slice(0, 3).map((c) => (
              <li key={c.id}><span>“{title(c.id, c.claim)}”</span><small>공개 중 · 근거로는 아직 안 쓰였어요</small></li>
            ))}
            {used.size === 0 && pub.length === 0 && <li><span>공개한 카드가 없어요.</span></li>}
          </ul>
        </div>
      </div>
      <p className="sec-t">기록 이어가기 <span>매일 쓰지 않아도 괜찮아요</span></p>
      <ul className="card todo">
        <li className={st.cards.length ? "done" : ""}><span className="ck" /><span>카드 {st.cards.length}장 저장{last ? ` · 마지막 기록 ${new Date(last).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}` : ""}</span>{!st.cards.length && <button className="link" onClick={() => go("pieces")}>만들기</button>}</li>
        <li className={st.profileGaps === 0 ? "done" : ""}><span className="ck" /><span>프로필 빈 항목 {st.profileGaps}개</span>{st.profileGaps > 0 && <button className="link" onClick={() => go("profile")}>채우기</button>}</li>
        <li className={priv === 0 ? "done" : ""}><span className="ck" /><span>비공개 카드 {priv}장 · 공개할지 정하기</span>{priv > 0 && <button className="link" onClick={() => go("pieces")}>보기</button>}</li>
        <li className={noLink === 0 ? "done" : ""}><span className="ck" /><span>근거 없는 카드 {noLink}장 · 링크 붙이기</span>{noLink > 0 && <button className="link" onClick={() => go("pieces")}>보기</button>}</li>
      </ul>
    </section>
  );
}
