"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Lora, Nanum_Pen_Script } from "next/font/google";
import { initSkyLanding } from "./skyLandingMotion";
import "./sky-landing.css";
import { SiteHeader } from "@/components/site/SiteHeader";

// English italic details (wordmark, numerals, background word).
const lora = Lora({ weight: ["400", "500", "600", "700"], style: ["normal", "italic"], subsets: ["latin"], display: "swap", variable: "--font-sky-lora" });
// Handwritten notes.
const pen = Nanum_Pen_Script({ weight: "400", subsets: ["latin"], preload: false, display: "swap", variable: "--font-sky-hand" });

const PRETENDARD = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";
// Titles: neo-grotesque (Neue Montreal / Aeonik lineage).
const WANTED_SANS = "https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css";
// Accent words: editorial serif (Editorial New / Instrument Serif lineage).
const MARU_BURI = "https://hangeul.pstatic.net/hangeul_static/css/maru-buri.css";
const ACCENT_FONT = "'MaruBuriSemiBold', 'MaruBuri', serif";

const CANDIDATES = [
  { av: "하", name: "하*린", note: "디자인 시스템 12건 · TS", score: 92 },
  { av: "윤", name: "윤*호", note: "성능 개선 사례 7건", score: 84 },
  { av: "서", name: "서*아", note: "React · 컴포넌트 라이브러리", score: 77 },
];

export function SkyLanding() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    return initSkyLanding(rootRef.current, ACCENT_FONT);
  }, []);

  return (
    <div ref={rootRef} className={`sky-landing ${lora.variable} ${pen.variable}`}>
      <link rel="stylesheet" href={PRETENDARD} precedence="default" />
      <link rel="stylesheet" href={WANTED_SANS} precedence="default" />
      <link rel="stylesheet" href={MARU_BURI} precedence="default" />

      <SiteHeader overlay />

      {/* 1. HERO */}
      <section id="hero" aria-label="메인 배너">
        <div className="hero-pin" id="heroPin">
          <div className="sun" id="sun" />
          <div className="back-word" id="backWord" aria-hidden="true">good morning</div>
          <div className="ground" />
          <canvas id="crowd" aria-hidden="true" />
          <div className="hero-copy" id="heroCopy">
            <span className="label" id="heroLabel">Talentfolio · 작업물로 만나는 채용</span>
            <h1 className="h-title" id="hTitle" aria-label="오늘 아침, 재능과 기회가 연결됐어요">
              <span className="line" data-split>오늘 아침,</span>
              <span className="line mask-row">
                <span data-split>재능과 기회가</span>
                <span className="mask-wrap" aria-hidden="true">
                  <span className="mask-fallback">연결</span>
                  <canvas id="maskWord" />
                </span>
                <span className="hand hand-note" id="handNote">됐어요 ↗</span>
              </span>
            </h1>
            <p className="hero-sub" id="heroSub">
              <span className="copy-plate">
                구직자는 포트폴리오로 나의 재능을 마음껏 보여 주고, 기업은 JD 한 장으로 AI가 먼저 찾아 둔 후보를 만나 보세요.
              </span>
            </p>
            <div className="hero-cta" id="heroCta">
              <Link className="btn fill" href="/studio">포트폴리오 올리기</Link>
              <Link className="btn" href="/desk/candidates" style={{ background: "#fff" }}>JD로 인재 찾기 →</Link>
            </div>
          </div>
          <div className="front-strip" />
          <div className="scroll-hint">SCROLL</div>
          <a className="skip" href="#roles">SKIP INTRO ↓</a>
        </div>
      </section>

      {/* 2. ROLES */}
      <section id="roles" className="sec-pad">
        <div className="wrap">
          <span className="label">두 갈래, 하나의 만남</span>
          <h2 className="sec-head" id="rolesHead">지금 찾는 건 <em>기회인가요, 인재인가요?</em></h2>
          <div className="roles">
            <article className="role a" id="roleA">
              <span className="hand doodle">나의 포트폴리오 ✎</span>
              <div>
                <div className="big">구직자<small>for job seekers</small></div>
                <p>작업물·이력서를 올리고 관리하면 기업에 자동으로 노출되고, 기업이 JD와 함께 먼저 연락해 옵니다. 다양한 공고를 직접 둘러보며 관리·지원·준비도 할 수 있어요.</p>
              </div>
              <div className="links">
                <Link className="btn fill" href="/studio">스튜디오 열기</Link>
                <Link className="btn" href="/start">둘러보기</Link>
              </div>
            </article>
            <article className="role b" id="roleB">
              <span className="hand doodle">AI가 대신 찾아요 ☀</span>
              <div>
                <div className="big">기업<small>for companies</small></div>
                <p>JD를 입력하면 AI가 후보를 탐색해 공고별 후보 리포트를 핏 %와 함께 주기적으로 보내 드립니다. 포트폴리오를 직접 보며 관심 목록에 담고 후보끼리 비교할 수도 있어요.</p>
              </div>
              <div className="links">
                <Link className="btn fill" href="/desk">데스크 열기</Link>
                <Link className="btn" href="/start">둘러보기</Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 3. DEMO */}
      <section id="demo" aria-label="제품 미니 데모">
        <div className="demo-pin">
          <div className="wrap demo-grid">
            <div>
              <span className="label">How it works</span>
              <h2 className="sec-head" style={{ margin: "10px 0 24px" }}>JD 한 장이<br /><em>후보 리포트</em>가 되기까지</h2>
              <ol className="steps-txt" id="stepsTxt">
                <li data-i="0"><span>01</span>JD를 입력하면</li>
                <li data-i="1"><span>02</span>AI가 포트폴리오를 탐색하고</li>
                <li data-i="2"><span>03</span>후보별 핏을 %로 산출해</li>
                <li data-i="3"><span>04</span>정기 리포트로 보고</li>
              </ol>
            </div>
            <div className="board" id="board">
              <div className="jd" id="jd"><b>프론트엔드 엔지니어 (React · TypeScript)</b>디자인 시스템 운영 경험 · 성능 최적화 · 3년 이상</div>
              <div id="cands" style={{ marginTop: 12 }}>
                {CANDIDATES.map((c) => (
                  <div className="cand" key={c.name}>
                    <div className="av">{c.av}</div>
                    <div className="nm">{c.name}<small>{c.note}</small><div className="bar"><i data-w={c.score} /></div></div>
                    <div className="score" data-v={c.score}>0</div>
                  </div>
                ))}
              </div>
              <div className="stamp" id="stamp">리포트 ✓</div>
              <p className="ex" style={{ position: "absolute", left: 22, bottom: 26 }}>예시 데이터</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LOOP */}
      <section id="loop" className="sec-pad">
        <div className="wrap">
          <span className="label">The loop</span>
          <h2 className="sec-head">네 걸음, <em>한 바퀴.</em></h2>
          <div className="loop-wrap">
            <svg className="loop-svg" viewBox="0 0 1000 120" aria-hidden="true">
              <path id="loopPath" d="M20 70 C 140 10, 230 10, 250 60 S 380 120, 500 60 S 640 0, 750 60 S 900 120, 980 50" fill="none" stroke="#1F4FD6" strokeWidth="2.5" strokeLinecap="round" />
              <g id="loopDots" fill="#fff" stroke="#1F4FD6" strokeWidth="2.5">
                <circle cx="125" cy="33" r="9" /><circle cx="375" cy="88" r="9" /><circle cx="625" cy="33" r="9" /><circle cx="875" cy="88" r="9" />
              </g>
            </svg>
            <div className="loop-items" id="loopItems">
              <div className="loop-item"><div className="no">i.</div><h3>JD 입력</h3><p>기업이 공고 조건을 넣습니다.</p></div>
              <div className="loop-item"><div className="no">ii.</div><h3>탐색·분석</h3><p>AI가 포트폴리오를 읽고 핏을 %로 계산합니다.</p></div>
              <div className="loop-item"><div className="no">iii.</div><h3>정기 리포트</h3><p>공고별 후보 목록을 주기적으로 보고합니다.</p></div>
              <div className="loop-item hil"><div className="no">iv.</div><h3>컨택</h3><p>기업이 JD와 함께 구직자에게 먼저 연락합니다.</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. STATEMENT */}
      {/* The reverse-hiring idea: makers publish, companies reach out first. */}
      <section id="statement" aria-label="채용을 거꾸로">
        <div className="stmt-pin" id="stmtPin">
          <div className="f-sun" id="fSun" />
          <svg className="reverse-arrow" viewBox="0 0 1100 420" aria-hidden="true">
            <path id="revPath" d="M930 120 C 760 -20, 340 -20, 170 140" fill="none" stroke="#4AA3F2" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 10" />
            <path id="revHead" d="M188 112 L 166 146 L 206 150" fill="none" stroke="#4AA3F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="float f-folio" data-from="left">
            <div className="thumb" />
            <small>Portfolio · 예시</small>
            <b>디자인 시스템 v3</b>
          </div>
          <div className="float f-contact" data-from="top">
            <small>Contact · 예시</small>
            <span className="dot" /><b>A사 채용팀</b>이 JD와 함께 먼저 연락했어요
          </div>
          <div className="float f-scan" data-from="bottom">
            <i aria-hidden="true" />
            <span><small>AI headhunter</small>JD별 정기 탐색 · 리포트 발송 중</span>
          </div>
          <div className="float f-jobs" data-from="right">
            <small>New postings · 예시</small>
            <ul>
              <li>프론트엔드 <em>지원 가능</em></li>
              <li>프로덕트 디자이너 <em>지원 가능</em></li>
              <li>데이터 엔지니어 <em>지원 가능</em></li>
            </ul>
          </div>
          <div className="stmt-core">
            <span className="stmt-kicker" id="stmtKicker">지원서는 이제 그만 쓰세요</span>
            <p className="stmt" id="stmt" data-words="작업물을|올려|두면,|/|*기업이|*먼저|찾아옵니다." aria-label="작업물을 올려 두면, 기업이 먼저 찾아옵니다." />
            <p className="stmt-sub" id="stmtSub">
              구직자는 포트폴리오를 올려 두기만 하면 기업에 노출되고, 공고를 직접 찾아 관리·지원할 수도 있습니다.
              기업은 JD를 입력하면 <b>AI가 주기적으로 후보를 탐색</b>해 핏 %가 담긴 리포트로 보고하고, 마음에 드는 후보에게 먼저 컨택합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 6. WORKS: pinned horizontal slide (cards are injected by the motion module) */}
      <section id="works" aria-label="실물 포트폴리오">
        <div className="works-pin">
          <div className="wrap works-head">
            <div>
              <span className="label">Real works</span>
              <h2 className="sec-head">오늘도 쌓이는 <em>작업물들</em></h2>
            </div>
            <div className="works-count" aria-hidden="true"><b id="worksNo">01</b><span> / 08</span></div>
          </div>
          <div className="works-scroller">
            <div className="works-track" id="worksTrack" />
          </div>
          <div className="wrap"><div className="works-progress"><i id="worksBar" /></div></div>
        </div>
      </section>

      {/* 7. NUMBERS */}
      <section id="numbers" className="sec-pad">
        <div className="wrap">
          <span className="label">By the numbers <span className="ex">예시</span></span>
          <h2 className="sec-head">제안이 닿기까지의 <em>숫자들</em></h2>
          <div className="nums">
            <div className="num"><div className="odo" data-n="7" data-suf="일" aria-label="7일" /><p>AI 헤드헌터의 정기 탐색 주기 (예시)</p></div>
            <div className="num"><div className="odo" data-n="92" data-suf="%" aria-label="92%" /><p>작업물로 계산한 JD 핏 (예시)</p></div>
            <div className="num"><div className="odo" data-n="4" data-suf="걸음" aria-label="4걸음" /><p>업로드부터 기업 컨택까지 (예시)</p></div>
          </div>
        </div>
      </section>

      {/* 8. CTA */}
      <section id="cta">
        <canvas id="crowd2" aria-hidden="true" />
        <div className="cta-in">
          <h2>내일 아침엔 제안이 와요<br /><em>인재 리포트도 함께요</em></h2>
          <p className="hand">작업물은 올려 두고, JD는 넣어 두세요</p>
          <div className="row">
            <Link className="btn fill" href="/start">포트폴리오 입력하기</Link>
            <Link className="btn" href="/desk/candidates">JD 입력하기</Link>
          </div>
        </div>
        <footer className="cta-foot">
          <span>© Talentfolio</span>
          <span>Illustrations by openpeeps.com</span>
        </footer>
      </section>
    </div>
  );
}
