"use client";

// 데스크 홈 (21 문서 D1~D4, 시안 S_desk). 숫자 → 행동: 모든 타일은 그 숫자를 만든 목록으로 간다.
// 데이터가 없는 지표(null)는 숫자 대신 "준비 중". 평균 점수·후보 순위표·학력/나이 통계는 두지 않는다.
import Link from "next/link";
import { useCallback, useState } from "react";
import { ProductShell } from "@/components/product/ProductShell";
import { DeskTabs } from "@/components/desk/DeskTabs";
import { CaseBar, FunnelChart, ReasonsChart, SupplyDemandChart } from "@/components/desk/DeskCharts";
import { useDeskOffers, useDeskSummary } from "@/lib/deskData";
import { deskApi, ratioText, relTime, type DeskFeedItem, type DeskFeedKind, type DeskOffer, type DeskSummary } from "@/lib/deskApi";
import { LoadError, SkeletonList } from "@/components/state/StateView";

const FEED_FILTERS: { key: "all" | DeskFeedKind; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "agent", label: "에이전트" },
  { key: "response", label: "후보 응답" },
  { key: "team", label: "팀" },
  { key: "alert", label: "주의" },
];
const FEED_ICON: Record<DeskFeedKind, string> = { agent: "AI", response: "↩", team: "팀", alert: "!" };

function today(): string {
  return new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });
}

// 데이터가 아직 쌓이지 않은 지표. 내부 작업 번호 대신 사람이 읽는 말로만 안내한다.
function Wip({ need }: { need: string }) {
  return <p className="dk-wip">{need}</p>;
}

export default function DeskHomePage() {
  const [range, setRange] = useState<7 | 30>(7);
  const [filter, setFilter] = useState<"all" | DeskFeedKind>("all");
  // 캐시를 먼저 그리고 뒤에서 갱신 (처음 한 번만 로딩 화면)
  const sum = useDeskSummary(range);
  const off = useDeskOffers();
  const summary = sum.data ?? null;
  const error = sum.error;
  const reload = useCallback(async () => {
    await Promise.all([sum.reload(), off.reload()]);
  }, [sum, off]);

  return (
    <ProductShell crumble="데스크 · 홈">
      <div className="dk">
        <DeskTabs pending={summary?.pending.count} />
        {error ? (
          <LoadError what="데스크" error={error} level={1} />
        ) : !summary ? (
          <SkeletonList rows={4} label="데스크를 불러오는 중" />
        ) : (
          <Home summary={summary} range={range} setRange={setRange} feed={summary.feed ?? []} filter={filter} setFilter={setFilter} offers={off.data ? off.data.offers : undefined} reload={reload} />
        )}
      </div>
    </ProductShell>
  );
}

function Home({
  summary: s,
  range,
  setRange,
  feed,
  filter,
  setFilter,
  offers,
  reload,
}: {
  summary: DeskSummary;
  range: 7 | 30;
  setRange: (r: 7 | 30) => void;
  feed: DeskFeedItem[];
  filter: "all" | DeskFeedKind;
  setFilter: (f: "all" | DeskFeedKind) => void;
  offers: DeskOffer[] | null | undefined;
  reload: () => Promise<void>;
}) {
  const todoTotal = s.todo.approvals + (s.todo.responses ?? 0);
  const f = s.funnel;
  const stages: { label: string; n: number | null; prev: number | null; wip?: boolean }[] = [
    { label: "매칭", n: f.matched, prev: null },
    { label: "분석 완료", n: f.analyzed, prev: f.matched },
    { label: "승인", n: f.approved, prev: f.decided },
    { label: "제안", n: f.offered, prev: f.approved, wip: f.offered === null },
    { label: "응답", n: f.replied, prev: f.offered, wip: f.replied === null },
    { label: "면접", n: f.interviewed, prev: f.replied, wip: f.interviewed === null },
  ];
  const pct = (n: number | null, d: number | null) => (n === null || !d ? null : Math.round((n / d) * 100));
  const leakIdx = (() => {
    let worst = -1;
    let worstPct = 101;
    stages.forEach((st, i) => {
      const p = pct(st.n, st.prev);
      if (i > 0 && !st.wip && p !== null && p < worstPct) {
        worst = i;
        worstPct = p;
      }
    });
    return worst;
  })();
  const sd = s.supplyDemand;
  const level = (sup: number, dem: number) => (dem === 0 ? "—" : sup / dem < 0.5 ? "어려움" : sup / dem < 1 ? "보통" : "수월");
  const shownFeed = feed.filter((it) => filter === "all" || it.kind === filter);
  const respText = s.responses ? ratioText(s.responses) : null;

  return (
    <>
      <section className="dk-hello">
        <div>
          <p className="dk-eyebrow">데스크 · {today()}</p>
          <h1>오늘 판단할 일 <em>{todoTotal}건</em></h1>
          <p className="dk-sub">
            최근 {range}일 에이전트가 후보 {f.matched}명을 매칭해 {f.analyzed}명을 분석했습니다. 승인 대기 {s.todo.approvals}건
            {s.todo.responses !== null && `, 응답 확인 ${s.todo.responses}건`}이 남았습니다.
          </p>
          <div className="dk-acts">
            <Link className="dk-btn pri" href="/review">승인 대기 {s.todo.approvals}건 검토 시작 →</Link>
            {s.todo.responses !== null && <a className="dk-btn" href="#offers">응답 {s.todo.responses}건 확인</a>}
          </div>
        </div>
        <div className="dk-seg" role="group" aria-label="기간">
          {([7, 30] as const).map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r}일</button>
          ))}
        </div>
      </section>

      <section className="dk-kpis" aria-label={`핵심 지표 (최근 ${range}일)`}>
        <Link className={`dk-kpi${s.pending.count ? " alert" : ""}`} href="/review">
          <div className="k">승인 대기</div>
          <div className="v">{s.pending.count}<small>건</small></div>
          <div className="d">{s.pending.oldestWaitHours !== null ? <>가장 오래 기다림 <b className="dn">{s.pending.oldestWaitHours}시간</b></> : "대기 없음"}</div>
          <span className="go">검토하기 →</span>
        </Link>
        <Link className={`dk-kpi${s.deadlineSoon === null ? " wip" : ""}`} href="/sourcing">
          <div className="k">마감 임박 건</div>
          {s.deadlineSoon === null ? <Wip need="스카우트 건에 마감일을 넣으면 보여요" /> : <><div className="v">{s.deadlineSoon}<small>건</small></div><div className="d">D-7 이내</div></>}
          <span className="go">건 보기 →</span>
        </Link>
        <Link className={`dk-kpi${s.firstOfferDays === null ? " wip" : ""}`} href="/sourcing">
          <div className="k">첫 제안까지</div>
          {s.firstOfferDays === null ? <Wip need={offers === null ? "첫 제안을 보내면 보여요" : "아직 발송한 제안 없음"} /> : <><div className="v">{s.firstOfferDays}<small>일</small></div><div className="d">중앙값 · 건 생성 → 첫 발송</div></>}
          <span className="go">지연 건 →</span>
        </Link>
        <a className={`dk-kpi${!respText ? " wip" : ""}`} href="#offers">
          <div className="k">후보 응답률</div>
          {!respText ? <Wip need="후보 응답이 쌓이면 보여요" /> : <><div className="v">{respText.main}</div><div className="d">{respText.small}</div></>}
          <span className="go">미응답 후속 →</span>
        </a>
        <Link className="dk-kpi" href="/review">
          <div className="k" title="사람이 AI 판정과 다르게 결정한 수. 높다면 AI 기준을 점검할 때예요.">AI와 다르게 판단</div>
          <div className="v">{s.overrides.n}<small>/{s.overrides.d}건</small></div>
          <div className="d">적합 판정 거절 + 부적합 판정 승인</div>
          <span className="go">결정 보기 →</span>
        </Link>
      </section>

      <div className="dk-grid">
        <div className="dk-col">
          <section className="dk-panel" aria-labelledby="h-funnel">
            <div className="dk-ph"><h2 id="h-funnel">파이프라인 · 최근 {range}일 · 전체 건</h2><Link href="/review">단계별 후보 보기</Link></div>
            <FunnelChart stages={stages.map((st) => ({ label: st.label, n: st.n, pct: pct(st.n, st.prev), wip: st.wip }))} leakIdx={leakIdx} />
            <p className="dk-cap">% = 전 단계 대비. 승인 % = 승인 {f.approved} ÷ 결정 {f.decided} (대기 {s.pending.count} 별도).</p>
            {leakIdx > 0 && (
              <p className="dk-note"><b>가장 많이 빠지는 단계: {stages[leakIdx - 1].label} → {stages[leakIdx].label}</b>{s.pending.count > 0 && ` · 지금 승인 대기 ${s.pending.count}건이 남아 있습니다.`}</p>
            )}
          </section>

          <section className="dk-panel" aria-labelledby="h-cases">
            <div className="dk-ph"><h2 id="h-cases">스카우트 건 현황</h2><Link href="/sourcing">새 스카우트 건 +</Link></div>
            {s.cases.length === 0 ? (
              <p className="dk-empty">진행 중인 건이 없습니다. 스카우트 건에서 JD 분석을 시작하세요.</p>
            ) : (
              <div className="dk-cases">
                {s.cases.map((c) => {
                  return (
                    <Link key={c.jdHash} className="dk-case" href={`/review?jd=${encodeURIComponent(c.jdHash)}`}>
                      <div>
                        <div className="t">
                          {c.title}
                          {c.daysLeft !== null && <span className={`dk-dday${c.daysLeft <= 7 ? " hot" : ""}`}>D-{Math.max(0, c.daysLeft)}</span>}
                        </div>
                        <div className="m">{c.client || c.owner ? [c.client, c.owner && `담당 ${c.owner}`].filter(Boolean).join(" · ") : "고객사·담당·마감 정보 없음"}</div>
                      </div>
                      <div>
                        <CaseBar matched={c.matched} analyzed={c.analyzed} approved={c.approved} />
                        <div className="dk-mini-l">매칭 {c.matched} · 분석 {c.analyzed} · 승인 {c.approved}{c.replied !== null && ` · 응답 ${c.replied}`}</div>
                      </div>
                      {c.pending > 0 ? <span className="dk-pill wait">승인 대기 {c.pending}</span> : c.analyzed + (c.failed ?? 0) < c.matched ? <span className="dk-pill ok">분석 진행 중</span> : c.failed ? <span className="dk-pill wait">분석 실패 {c.failed}</span> : <span className="dk-pill ok">검토 완료</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="dk-panel" aria-labelledby="h-q">
            <div className="dk-ph"><h2 id="h-q">검토 품질</h2><Link href="/review">결정 기록</Link></div>
            <div className="dk-q">
              <div className="dk-qi"><div className="k">승인률</div><div className="val">{ratioText(s.approval, "건").main}</div><div className="d">승인 {s.approval.n} ÷ 결정 {s.approval.d}</div></div>
              <div className="dk-qi"><div className="k">AI와 다르게 판단</div><div className="val">{ratioText(s.overrides, "건").main}</div><div className="d">사람이 AI 판정과 다르게 결정한 비율</div></div>
              <div className={`dk-qi${s.quality.viewedBeforeApproval ? "" : " wip"}`}>
                <div className="k">근거 카드 열람 후 승인</div>
                {s.quality.viewedBeforeApproval ? <><div className="val">{ratioText(s.quality.viewedBeforeApproval, "건").main}</div><div className="d">검토 시간 중앙값 {s.quality.medianReviewSec !== null ? `${Math.round(s.quality.medianReviewSec / 60)}분` : "—"}</div></> : <Wip need="검토 기록이 쌓이면 보여요" />}
              </div>
              <div className={`dk-qi${s.quality.explanations ? "" : " wip"}`}>
                <div className="k">설명 요구 처리</div>
                {s.quality.explanations ? <><div className="val">{s.quality.explanations.open}건</div><div className="d">{s.quality.explanations.nearestDueDays !== null ? `가장 가까운 기한 D-${s.quality.explanations.nearestDueDays}` : "미처리 없음"} · 30일 이내 답변</div></> : <Wip need="설명 요청이 들어오면 보여요" />}
              </div>
            </div>
            {s.rejectReasons.length > 0 && (
              <div className="dk-reasons">
                <ReasonsChart reasons={s.rejectReasons} />
              </div>
            )}
            {s.quality.approvedWithoutEvidence ? (
              <p className="dk-warn">근거 카드를 열지 않고 승인한 건이 {s.quality.approvedWithoutEvidence}건 있습니다. 승인은 사람이 실제로 판단해야 자동화된 결정으로 보지 않습니다 (개인정보보호법 37조의2).</p>
            ) : null}
          </section>
        </div>

        <div className="dk-col">
          <section className="dk-panel" aria-labelledby="h-feed">
            <div className="dk-ph"><h2 id="h-feed">소식</h2></div>
            <div className="dk-fl" role="group" aria-label="소식 필터">
              {FEED_FILTERS.map((x) => (
                <button key={x.key} type="button" className="dk-chip" aria-pressed={filter === x.key} onClick={() => setFilter(x.key)}>{x.label}</button>
              ))}
            </div>
            {shownFeed.length === 0 ? (
              <p className="dk-empty">새 소식이 없습니다.</p>
            ) : (
              <ul className="dk-feed">
                {shownFeed.map((it, i) => (
                  <li key={`${it.kind}-${i}`}>
                    <Link href={it.href}>
                      <span className={`dk-ic ${it.kind}`} aria-hidden="true">{FEED_ICON[it.kind]}</span>
                      <div><p>{it.text}</p><time>{relTime(it.at)}</time></div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Offers offers={offers} reload={reload} />

          <section className="dk-panel" aria-labelledby="h-sd">
            <div className="dk-ph"><h2 id="h-sd">인재풀 공급·수요</h2><Link href="/desk/candidates">후보 관리</Link></div>
            <SupplyDemandChart supply={sd.supply} demand={sd.demand} />
            <p className="dk-cap">채용 난이도: 개발 <b>{level(sd.supply.developer, sd.demand.developer)}</b> · 디자인 <b>{level(sd.supply.designer, sd.demand.designer)}</b></p>
            <p className="dk-cap">후보 {sd.supply.developer + sd.supply.designer}명 · 공고 {sd.demand.developer + sd.demand.designer}건. 백엔드·데이터 등 세분화는 스킬→직무 규칙이 생긴 뒤입니다.</p>
            {sd.skillGap.length > 0 && (
              <>
                <p className="dk-sub" style={{ fontSize: 12, marginTop: 10 }}>공고에서 많이 요구하지만 공개 근거 카드가 적은 역량</p>
                <div className="dk-tags">{sd.skillGap.map((g) => <span key={g.skill} title={`공고 ${g.demand} · 카드 ${g.cards}`}>{g.skill}</span>)}</div>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

// 제안 (D4): 승인 대기 → 발송 기록 → 응답 기록. 발송 채널(앱 알림·메일)은 C4.
function Offers({ offers, reload }: { offers: DeskOffer[] | null | undefined; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    setErr(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  const open = (offers ?? []).filter((o) => o.status === "pending" || (o.status === "executed" && !o.response));
  return (
    <section className="dk-panel" id="offers" aria-labelledby="h-offers">
      <div className="dk-ph"><h2 id="h-offers">제안</h2><Link href="/review">승인한 후보에서 제안 만들기</Link></div>
      {offers === undefined ? (
        <SkeletonList rows={2} />
      ) : offers === null ? (
        <Wip need="후보 제안 기록(SQL 017) 적용 후 사용" />
      ) : open.length === 0 ? (
        <p className="dk-empty">처리할 제안이 없습니다.</p>
      ) : (
        <ul className="dk-offers">
          {open.map((o) => (
            <li key={o.id}>
              <span><b>{o.payload?.candidateName ?? "후보"}</b> · {o.status === "pending" ? "발송 승인 대기" : `발송 ${relTime(o.sent_at)} · 응답 기다림`}</span>
              {o.status === "pending" && (
                // 발송 승인 전에 후보에게 갈 본문을 보고 판단한다 (HIL: 실제로 읽고 승인)
                <blockquote className="dk-offer-msg" style={{ margin: "6px 0", padding: "8px 10px", borderLeft: "3px solid var(--border-color, #ddd)", whiteSpace: "pre-wrap", fontSize: 13 }}>
                  {o.payload?.message?.trim() || "(본문 없음 — 근거 카드만 공유됩니다)"}
                </blockquote>
              )}
              <div className="row">
                {o.status === "pending" ? (
                  <>
                    <button type="button" disabled={busy === o.id} onClick={() => act(o.id, () => deskApi.decideOffer(o.id, "approve"))}>발송 승인</button>
                    <button type="button" disabled={busy === o.id} onClick={() => { if (window.confirm(`${o.payload?.candidateName ?? "후보"}님에게 보낼 제안을 반려할까요? 되돌릴 수 없습니다.`)) act(o.id, () => deskApi.decideOffer(o.id, "reject")); }}>반려</button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={busy === o.id} onClick={() => act(o.id, () => deskApi.respondOffer(o.id, "interested"))}>관심 있음</button>
                    <button type="button" disabled={busy === o.id} onClick={() => act(o.id, () => deskApi.respondOffer(o.id, "interested", true))}>면접 잡음</button>
                    <button type="button" disabled={busy === o.id} onClick={() => act(o.id, () => deskApi.respondOffer(o.id, "declined"))}>거절함</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {err && <p className="dk-warn">{err}</p>}
    </section>
  );
}
