"use client";

// 데스크 홈 (21 문서 D1~D4). 숫자 → 행동: 모든 지표는 그 숫자를 만든 목록으로 간다.
// 데이터가 없는 지표(null)는 숫자 대신 사람이 읽는 안내. 평균 점수·후보 순위표·학력/나이 통계는 두지 않는다.
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useDeskOffers, useDeskSummary } from "@/lib/deskData";
import { deskApi, ratioText, relTime, type DeskFeedKind, type DeskOffer, type DeskSummary } from "@/lib/deskApi";
import { DLoadError, DSkeleton } from "@/components/desk/console/ui";

const FEED_FILTERS: { key: "all" | DeskFeedKind; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "agent", label: "에이전트" },
  { key: "response", label: "후보 응답" },
  { key: "team", label: "팀" },
  { key: "alert", label: "주의" },
];

const today = () => new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });

export default function DeskHomePage() {
  const [range, setRange] = useState<7 | 30>(7);
  // 캐시를 먼저 그리고 뒤에서 갱신 (처음 한 번만 로딩 화면)
  const sum = useDeskSummary(range);
  const off = useDeskOffers();
  const summary = sum.data ?? null;
  const reload = useCallback(async () => {
    await Promise.all([sum.reload(), off.reload()]);
  }, [sum, off]);

  if (sum.error) return <DLoadError what="데스크" error={sum.error} level={1} />;
  if (!summary) return <><h1 className="lc-sr">홈</h1><DSkeleton rows={4} label="데스크를 불러오는 중" /></>;
  return <Home s={summary} range={range} setRange={setRange} offers={off.data ? off.data.offers : undefined} reload={reload} />;
}

function Home({ s, range, setRange, offers, reload }: {
  s: DeskSummary;
  range: 7 | 30;
  setRange: (r: 7 | 30) => void;
  offers: DeskOffer[] | null | undefined;
  reload: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<"all" | DeskFeedKind>("all");
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
  let leakIdx = -1;
  let worstPct = 101;
  stages.forEach((st, i) => {
    const p = pct(st.n, st.prev);
    if (i > 0 && !st.wip && p !== null && p < worstPct) { leakIdx = i; worstPct = p; }
  });
  const sd = s.supplyDemand;
  const level = (sup: number, dem: number) => (dem === 0 ? "—" : sup / dem < 0.5 ? "어려움" : sup / dem < 1 ? "보통" : "수월");
  const feedDlg = useRef<HTMLDialogElement>(null);
  const feed = (s.feed ?? []).filter((it) => filter === "all" || it.kind === filter);
  const resp = s.responses ? ratioText(s.responses) : null;
  const maxReason = Math.max(1, ...s.rejectReasons.map((r) => r.count));
  const maxHolders = Math.max(1, ...sd.skillGap.map((g) => g.holders ?? 0));

  return (
    <>
      <header className="lc-top" data-in>
        <h1>홈</h1>
        <span className="lc-sub lc-hide-m">{today()} · 오늘 판단할 일 {todoTotal}건</span>
        <div className="lc-actions">
          <div className="lc-seg" role="group" aria-label="기간">
            {([7, 30] as const).map((r) => (
              <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{r}일</button>
            ))}
          </div>
          {s.todo.responses !== null && <a className="lc-btn is-ghost lc-only-d" href="#offers">응답 {s.todo.responses}건 확인</a>}
          <Link className="lc-btn is-primary" href="/review">승인 대기 {s.todo.approvals}건 검토 <span className="lc-kbd">G R</span></Link>
        </div>
      </header>

      <section className="lc-today is-5" aria-label={`핵심 지표 (최근 ${range}일)`} data-in>
        <Link className="lc-lead" href="/review">
          <div className="lc-kpi-l">승인 대기</div>
          <div className="lc-kpi-v">{s.pending.count}<small>건</small></div>
          <div className="lc-kpi-n">
            {s.pending.oldestWaitHours !== null ? `가장 오래 기다린 후보 ${s.pending.oldestWaitHours}시간째` : "대기 없음"}
            {` · 최근 ${range}일 매칭 ${f.matched}명, 분석 ${f.analyzed}명`}
          </div>
          <span className="lc-go">검토하기</span>
        </Link>
        <Link href="/sourcing">
          <div className="lc-kpi-l">마감 임박 건</div>
          {s.deadlineSoon === null
            ? <p className="lc-wip">스카우트 건에 마감일을 넣으면 보여요</p>
            : <><div className="lc-kpi-v">{s.deadlineSoon}<small>건</small></div><div className="lc-kpi-n">D-7 이내</div></>}
          <span className="lc-go">건 보기</span>
        </Link>
        <Link href="/sourcing">
          <div className="lc-kpi-l">첫 제안까지</div>
          {s.firstOfferDays === null
            ? <p className="lc-wip">{offers === null ? "첫 제안을 보내면 보여요" : "아직 발송한 제안 없음"}</p>
            : <><div className="lc-kpi-v">{s.firstOfferDays}<small>일</small></div><div className="lc-kpi-n">중앙값 · 건 생성부터 첫 발송까지</div></>}
          <span className="lc-go">지연 건</span>
        </Link>
        <a href="#offers">
          <div className="lc-kpi-l">후보 응답률</div>
          {!resp ? <p className="lc-wip">후보 응답이 쌓이면 보여요</p> : <><div className="lc-kpi-v">{resp.main}</div><div className="lc-kpi-n">{resp.small}</div></>}
          <span className="lc-go">미응답 후속</span>
        </a>
        <Link href="/review">
          <div className="lc-kpi-l" title="사람이 AI 판정과 다르게 결정한 수. 높다면 AI 기준을 점검할 때예요.">AI와 다르게 판단</div>
          <div className="lc-kpi-v">{s.overrides.n}<small>/{s.overrides.d}건</small></div>
          <div className="lc-kpi-n">적합 판정 거절 + 부적합 판정 승인</div>
          <span className="lc-go">결정 보기</span>
        </Link>
      </section>

      <div className="lc-grid">
        <div className="lc-col">
          <section className="lc-panel" aria-labelledby="h-cases" data-in>
            <div className="lc-ph">
              <h2 id="h-cases">스카우트 건</h2>
              <span className="lc-note">진행 중 {s.cases.length}건</span>
              <Link className="lc-link" href="/sourcing">새 스카우트 건</Link>
            </div>
            {s.cases.length === 0 ? (
              <p className="lc-empty">진행 중인 건이 없습니다. 스카우트 건에서 JD 분석을 시작하세요.</p>
            ) : (
              <div className="lc-pb" style={{ padding: "8px 0 4px" }}>
                <table className="lc-table">
                  <thead><tr>
                    <th>건</th><th className="lc-hide-m">진행</th><th className="num">상태</th><th className="num">마감</th>
                  </tr></thead>
                  <tbody>
                    {s.cases.map((c) => {
                      const href = `/review?jd=${encodeURIComponent(c.jdHash)}`;
                      const meta = c.client || c.owner ? [c.client, c.owner && `담당 ${c.owner}`].filter(Boolean).join(" · ") : "고객사·담당·마감 정보 없음";
                      return (
                        <tr key={c.jdHash}>
                          <td>
                            <Link className="t-main" href={href}>{c.title}</Link>
                            <div className="t-sub">{meta} · 매칭 {c.matched} · 분석 {c.analyzed} · 승인 {c.approved}{c.replied !== null ? ` · 응답 ${c.replied}` : ""}</div>
                          </td>
                          <td className="lc-hide-m" style={{ width: 150 }}>
                            <div className="lc-prog" role="img" aria-label={`매칭 ${c.matched}명 중 분석 ${c.analyzed}명, 승인 ${c.approved}명`}>
                              <i className="p-ap" data-grow style={{ width: `${c.matched ? (c.approved / c.matched) * 100 : 0}%`, transformOrigin: "left" }} />
                              <i className="p-an" data-grow style={{ width: `${c.matched ? (Math.max(0, c.analyzed - c.approved) / c.matched) * 100 : 0}%`, transformOrigin: "left" }} />
                            </div>
                          </td>
                          <td className="num">
                            {c.pending > 0 ? <span className="lc-pill is-strong">승인 대기 {c.pending}</span>
                              : c.analyzed + (c.failed ?? 0) < c.matched ? <span className="t-sub">분석 진행 중</span>
                              : c.failed ? <span className="lc-pill is-warn">분석 실패 {c.failed}</span>
                              : <span className="t-sub">검토 완료</span>}
                          </td>
                          <td className="num">
                            {c.daysLeft === null ? <span className="t-sub">—</span>
                              : c.daysLeft <= 7 ? <span className="lc-pill is-warn">D-{Math.max(0, c.daysLeft)}</span>
                              : <span className="t-sub">D-{c.daysLeft}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="lc-panel" aria-labelledby="h-funnel" data-in>
            <div className="lc-ph"><h2 id="h-funnel">파이프라인</h2><span className="lc-note">최근 {range}일 · 전체 건</span><Link className="lc-link" href="/review">단계별 후보 보기</Link></div>
            <div className="lc-pb">
              <div className="lc-funnel">
                {stages.map((st, i) => {
                  const p = pct(st.n, st.prev);
                  return (
                    <div key={st.label} className={`lc-fr${i === leakIdx ? " is-drop" : ""}`}>
                      <span className="fl">{st.label}</span>
                      {st.wip ? (
                        <span className="fb" style={{ background: "transparent", boxShadow: "inset 0 0 0 1px var(--line-2)" }} />
                      ) : (
                        <span className="fb"><i data-grow style={{ width: `${f.matched ? Math.max(2, ((st.n ?? 0) / f.matched) * 100) : 2}%` }} /></span>
                      )}
                      <span className="fn">{st.wip ? <span className="t-sub" style={{ color: "var(--mute)", fontSize: 12 }}>준비 중</span> : st.n}</span>
                      <span className="fd">{i > 0 && p !== null ? `${p}%` : ""}</span>
                    </div>
                  );
                })}
              </div>
              <p className="lc-cap">% = 전 단계 대비. 승인 % = 승인 {f.approved} ÷ 결정 {f.decided} (대기 {s.pending.count} 별도). 비어 있는 단계는 제안·응답 기록이 쌓이면 채워집니다.</p>
              {leakIdx > 0 && (
                <p className="lc-callout"><b>{stages[leakIdx - 1].label} → {stages[leakIdx].label}</b>에서 가장 많이 빠집니다.{s.pending.count > 0 && ` 지금 승인 대기 ${s.pending.count}건이 남아 있습니다.`}</p>
              )}
            </div>
          </section>

          <section className="lc-panel" aria-labelledby="h-q" data-in>
            <div className="lc-ph"><h2 id="h-q">검토 품질</h2><Link className="lc-link" href="/review">결정 기록</Link></div>
            <div className="lc-pb">
              <div className="lc-q">
                <div><div className="k">승인률</div><b>{ratioText(s.approval, "건").main}</b><div className="d">승인 {s.approval.n} ÷ 결정 {s.approval.d}</div></div>
                <div><div className="k">AI와 다르게 판단</div><b>{ratioText(s.overrides, "건").main}</b><div className="d">AI 판정과 다르게 결정한 비율</div></div>
                <div>
                  <div className="k">근거 카드 열람 후 승인</div>
                  {s.quality.viewedBeforeApproval
                    ? <><b>{ratioText(s.quality.viewedBeforeApproval, "건").main}</b><div className="d">검토 시간 중앙값 {s.quality.medianReviewSec !== null ? `${Math.round(s.quality.medianReviewSec / 60)}분` : "—"}</div></>
                    : <p className="lc-wip">검토 기록이 쌓이면 보여요</p>}
                </div>
                <div>
                  <div className="k">설명 요구 처리</div>
                  {s.quality.explanations
                    ? <><b>{s.quality.explanations.open}건</b><div className="d">{s.quality.explanations.nearestDueDays !== null ? `가장 가까운 기한 D-${s.quality.explanations.nearestDueDays}` : "미처리 없음"} · 30일 이내 답변</div></>
                    : <p className="lc-wip">설명 요청이 들어오면 보여요</p>}
                </div>
              </div>
              {s.rejectReasons.length > 0 && (
                <>
                  <h3 style={{ fontSize: 13, fontWeight: 600, margin: "16px 0 10px" }}>거절 사유 <span style={{ color: "var(--mute)", fontWeight: 400 }}>{s.rejectReasons.reduce((a, r) => a + r.count, 0)}건</span></h3>
                  <div className="lc-bars">
                    {s.rejectReasons.map((r, i) => (
                      <div key={r.label} className={`lc-bar${i === 0 ? " is-top" : ""}`}>
                        <span className="bl">{r.label}</span><span className="bn">{r.count}</span>
                        <span className="bt"><i data-grow style={{ width: `${(r.count / maxReason) * 100}%` }} /></span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {s.quality.approvedWithoutEvidence ? (
                <p className="lc-warn">근거 카드를 열지 않고 승인한 건이 {s.quality.approvedWithoutEvidence}건 있습니다. 승인은 사람이 실제로 판단해야 자동화된 결정으로 보지 않습니다 (개인정보보호법 37조의2).</p>
              ) : null}
            </div>
          </section>
        </div>

        <div className="lc-col">
          <section className="lc-panel" aria-labelledby="h-feed" data-in>
            <div className="lc-ph"><h2 id="h-feed">소식</h2></div>
            <div className="lc-tabs" role="group" aria-label="소식 필터">
              {FEED_FILTERS.map((x) => <button key={x.key} type="button" aria-pressed={filter === x.key} onClick={() => setFilter(x.key)}>{x.label}</button>)}
            </div>
            {feed.length === 0 ? (
              <p className="lc-empty">새 소식이 없습니다.</p>
            ) : (
              <>
                <FeedList items={feed.slice(0, FEED_TOP)} />
                {feed.length > FEED_TOP && (
                  <button type="button" className="lc-more-btn" onClick={() => feedDlg.current?.showModal()}>소식 {feed.length}건 모두 보기</button>
                )}
              </>
            )}
            <dialog ref={feedDlg} className="lc-dlg" aria-labelledby="h-feed-all" onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
              <div className="lc-ph"><h2 id="h-feed-all">소식 전체</h2><button type="button" className="lc-link" onClick={() => feedDlg.current?.close()}>닫기</button></div>
              <div className="lc-dlg-body"><FeedList items={feed} /></div>
            </dialog>
          </section>

          <Offers offers={offers} reload={reload} />

          <section className="lc-panel" aria-labelledby="h-sd" data-in>
            <div className="lc-ph"><h2 id="h-sd">인재풀 공급·수요</h2><Link className="lc-link" href="/desk/candidates">인재풀</Link></div>
            <div className="lc-pb">
              <div className="lc-sd">
                <div><b>{sd.supply.developer}</b><span>개발자 · 공고 {sd.demand.developer}건 · {level(sd.supply.developer, sd.demand.developer)}</span></div>
                <div><b>{sd.supply.designer}</b><span>디자이너 · 공고 {sd.demand.designer}건 · {level(sd.supply.designer, sd.demand.designer)}</span></div>
              </div>
              <p className="lc-cap" style={{ marginTop: 0 }}>후보 {sd.supply.developer + sd.supply.designer}명 · 공고 {sd.demand.developer + sd.demand.designer}건. 채용 난이도는 후보 수 ÷ 공고 수입니다. 백엔드·데이터 등 세분화는 스킬→직무 규칙이 생긴 뒤입니다.</p>
              {sd.skillGap.length > 0 && (
                <>
                  <h3 style={{ fontSize: 13, fontWeight: 600, margin: "14px 0 10px" }}>공고에 자주 나오는데 보유 후보가 적은 스킬 · 오른쪽은 보유 후보 수</h3>
                  <div className="lc-bars">
                    {sd.skillGap.map((g) => (
                      <div key={g.skill} className="lc-bar">
                        <span className="bl">{g.skill} <span style={{ color: "var(--mute)" }}>· 공고 {g.demand}건</span></span>
                        <span className="bn" title="이 스킬을 프로필에 적은 공개 후보 수">{g.holders ?? 0}명</span>
                        <span className="bt"><i data-grow style={{ width: `${((g.holders ?? 0) / maxHolders) * 100}%` }} /></span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

// 제안 (D4): 발송 승인 대기 → 발송 기록 → 응답 기록. 발송 승인 전에 후보에게 갈 본문을 보고 판단한다 (HIL).
const FEED_TOP = 5;

function FeedList({ items }: { items: DeskSummary["feed"] }) {
  return (
    <ul className="lc-feed">
      {(items ?? []).map((it, i) => (
        <li key={`${it.kind}-${i}`}>
          <Link href={it.href}>
            <span className={`f-ic k-${it.kind}`} aria-hidden="true" />
            <span>{it.text}</span>
            <time dateTime={it.at ?? undefined}>{relTime(it.at)}</time>
          </Link>
        </li>
      ))}
    </ul>
  );
}

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
    <section className="lc-panel" id="offers" aria-labelledby="h-offers" data-in>
      <div className="lc-ph"><h2 id="h-offers">제안</h2>{open.length > 0 && <span className="lc-note">처리할 것 {open.length}건</span>}<Link className="lc-link" href="/desk/offers">서신함 전체 보기</Link></div>
      {offers === undefined ? (
        <DSkeleton rows={2} />
      ) : offers === null ? (
        <p className="lc-empty">아직 보낸 제안이 없습니다.</p>
      ) : open.length === 0 ? (
        <p className="lc-empty">처리할 제안이 없습니다.</p>
      ) : (
        <ul className="lc-offer-list" style={{ marginTop: 8 }}>
          {open.map((o) => {
            const name = o.payload?.candidateName ?? "후보";
            return (
              <li key={o.id}>
                <span><Link href={`/desk/offers?id=${o.id}`}><b>{name}</b></Link> · {o.status === "pending" ? "발송 승인 대기" : `발송 ${relTime(o.sent_at)} · 응답 기다림`}</span>
                {o.status === "pending" && <blockquote className="lc-quote">{o.payload?.message?.trim() || "본문 없이 근거 카드만 보냅니다."}</blockquote>}
                <div className="lc-row-acts">
                  {o.status === "pending" ? (
                    <>
                      <button type="button" className="lc-btn is-sm is-primary" disabled={busy === o.id} onClick={() => act(o.id, () => deskApi.decideOffer(o.id, "approve"))}>발송 승인</button>
                      <button type="button" className="lc-btn is-sm is-ghost" disabled={busy === o.id} onClick={() => { if (window.confirm(`${name}님에게 보낼 제안을 반려할까요? 되돌릴 수 없습니다.`)) void act(o.id, () => deskApi.decideOffer(o.id, "reject")); }}>반려</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="lc-btn is-sm" disabled={busy === o.id} onClick={() => act(o.id, () => deskApi.respondOffer(o.id, "interested"))}>관심 있음</button>
                      <button type="button" className="lc-btn is-sm" disabled={busy === o.id} onClick={() => act(o.id, () => deskApi.respondOffer(o.id, "interested", true))}>면접 잡음</button>
                      <button type="button" className="lc-btn is-sm is-ghost" disabled={busy === o.id} onClick={() => act(o.id, () => deskApi.respondOffer(o.id, "declined"))}>거절함</button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {err && <p className="lc-warn" style={{ margin: "0 16px 16px" }}>{err}</p>}
    </section>
  );
}
