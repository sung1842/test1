"use client";

// 스카우트 건 현황 — 건별 매칭·분석·대기·승인·실패를 한 곳에서 관리한다.
// 데이터는 인재풀과 같은 캐시(KEY.cases)를 쓴다. 분석 중인 건이 있으면 10초마다 조용히 갱신.
import Link from "next/link";
import { useMemo, useState } from "react";
import { lifeFetch } from "@/lib/lifeApi";
import { useCached } from "@/lib/useCached";
import { KEY, refreshDesk } from "@/lib/deskData";
import { SourcingNav } from "@/components/desk/SourcingNav";
import { DLoadError, DSkeleton, DState } from "@/components/desk/console/ui";
import "../../review/review.css";

interface Counts { matched: number; analyzed: number; pending: number; approved: number; rejected?: number; running?: number; failed?: number }
interface CaseRow {
  id: string;
  jdHash: string;
  title: string;
  status: string;
  clientName: string | null;
  ownerName: string | null;
  deadline: string | null;
  createdAt: string;
  lastStart: { at?: string; searched?: number; matched?: number; queued?: number; filteredOut?: number } | null;
  requirements: { items: { label: string; required: boolean }[] } | null;
  counts: Counts;
  posted?: boolean;
}
interface StartResult { queued: number; matched: number; ahead?: number; retried?: number }

type Filter = "open" | "running" | "failed" | "closed" | "all";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "open", label: "진행 중인 건" },
  { key: "running", label: "분석 중" },
  { key: "failed", label: "실패 있음" },
  { key: "closed", label: "종료" },
  { key: "all", label: "전체" },
];

const dday = (d: string | null) => {
  if (!d) return null;
  const n = Math.ceil((Date.parse(d) - Date.now()) / 86_400_000);
  return n < 0 ? "마감" : n === 0 ? "D-day" : `D-${n}`;
};
const ymd = (iso?: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "-");

export default function ScoutCasesPage() {
  const [filter, setFilter] = useState<Filter>("open");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const q = useCached<{ cases: CaseRow[] }>(KEY.cases, () => lifeFetch<{ cases: CaseRow[] }>("/api/scout-cases"), { refreshMs: 10_000 });
  const cases = useMemo(() => q.data?.cases ?? [], [q.data]);

  const totals = useMemo(() => {
    const open = cases.filter((c) => c.status !== "closed");
    const sum = (k: keyof Counts) => open.reduce((a, c) => a + (c.counts[k] ?? 0), 0);
    return { open: open.length, running: sum("running"), pending: sum("pending"), approved: sum("approved"), failed: sum("failed") };
  }, [cases]);

  const shown = cases.filter((c) => {
    if (filter === "all") return true;
    if (filter === "closed") return c.status === "closed";
    if (c.status === "closed") return false;
    if (filter === "running") return (c.counts.running ?? 0) > 0;
    if (filter === "failed") return (c.counts.failed ?? 0) > 0;
    return true;
  });

  async function run(c: CaseRow) {
    const running = c.counts.running ?? 0;
    if (running > 0 && !window.confirm(`「${c.title}」 건은 지금 ${running}명을 분석하는 중이에요.\n더 찾은 후보는 지금 분석이 끝난 뒤 이어서 분석돼요. 추가할까요?`)) return;
    setBusyId(c.id);
    try {
      const s = await lifeFetch<StartResult>(`/api/scout-cases/${encodeURIComponent(c.id)}/start`, { method: "POST", body: JSON.stringify({}) });
      const retry = s.retried ? ` (실패 재시도 ${s.retried}명 포함)` : "";
      setNote((n) => ({
        ...n,
        [c.id]: s.queued === 0 ? "새로 분석할 후보가 없어요" : s.ahead ? `앞선 ${s.ahead}명 뒤에 ${s.queued}명을 이어서 분석해요${retry}` : `${s.queued}명 분석을 시작했어요${retry}`,
      }));
      refreshDesk();
    } catch (err) {
      setNote((n) => ({ ...n, [c.id]: err instanceof Error ? err.message : "시작 실패" }));
    } finally {
      setBusyId(null);
    }
  }

  async function togglePost(c: CaseRow) {
    const on = !c.posted;
    setBusyId(c.id);
    try {
      await lifeFetch(`/api/scout-cases/${encodeURIComponent(c.id)}/post`, { method: "POST", body: JSON.stringify({ post: on }) });
      refreshDesk();
    } catch (err) {
      setNote((n) => ({ ...n, [c.id]: err instanceof Error ? err.message : "공고 상태 변경 실패" }));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleClose(c: CaseRow) {
    const reopen = c.status === "closed";
    if (!reopen && !window.confirm(`「${c.title}」 건을 종료할까요? 공고로 올려 둔 건이면 구직자 공고 목록에서도 내려갑니다. 나중에 다시 열 수 있어요.`)) return;
    setBusyId(c.id);
    try {
      await lifeFetch(`/api/scout-cases/${encodeURIComponent(c.id)}/close`, { method: "POST", body: JSON.stringify({ reopen }) });
      refreshDesk();
    } catch (err) {
      setNote((n) => ({ ...n, [c.id]: err instanceof Error ? err.message : "상태 변경 실패" }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rv sc">
      <header className="lc-top" data-in>
        <h1>스카우트 건</h1>
        <SourcingNav />
        <span className="lc-sub lc-hide-m">건마다 찾은 수, 분석 진행, 막힌 곳</span>
        <div className="lc-actions"><Link className="lc-btn is-primary" href="/sourcing">새 건 만들기</Link></div>
      </header>

      <div className="sc-kpis">
        <div><span>진행 중인 건</span><b>{totals.open}</b></div>
        <div className={totals.running ? "live" : ""}><span>분석 중</span><b>{totals.running}</b></div>
        <div><span>승인 대기</span><b>{totals.pending}</b></div>
        <div><span>승인</span><b>{totals.approved}</b></div>
        <div className={totals.failed ? "bad" : ""}><span>분석 실패</span><b>{totals.failed}</b></div>
      </div>

      <div className="rv-bar">
        <div className="rv-seg" role="group" aria-label="건 필터">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
      </div>

      {q.loading ? (
        <section className="lc-panel"><DSkeleton rows={4} label="건 현황을 불러오는 중" /></section>
      ) : q.error ? (
        <section className="lc-panel"><DLoadError what="건 현황" error={q.error} /></section>
      ) : cases.length === 0 ? (
        <section className="lc-panel"><DState title="아직 만든 건이 없어요" body="JD로 스카우트 건을 만들면 여기서 진행 상황을 관리해요." action={{ href: "/sourcing", label: "새 건 만들기" }} /></section>
      ) : shown.length === 0 ? (
        <p className="rv-note">이 조건에 맞는 건이 없어요.</p>
      ) : (
        <ul className="sc-list">
          {shown.map((c) => {
            const k = c.counts;
            const running = k.running ?? 0;
            const failed = k.failed ?? 0;
            const total = Math.max(1, k.matched);
            const seg = (n: number) => `${(n / total) * 100}%`;
            const dd = dday(c.deadline);
            const closed = c.status === "closed";
            const must = (c.requirements?.items ?? []).filter((i) => i.required).map((i) => i.label);
            return (
              <li key={c.id} className={`rv-panel sc-case${closed ? " closed" : ""}`}>
                <div className="sc-top">
                  <div className="sc-title">
                    <strong>{c.title}</strong>
                    <span>
                      {c.clientName ?? "고객사 미지정"}
                      {c.ownerName && ` · 담당 ${c.ownerName}`} · 등록 {c.createdAt.slice(0, 10)}
                      {dd && <em className={dd === "마감" || dd === "D-day" ? "hot" : ""}>{dd}</em>}
                      {c.posted && !closed && <em>공고 게시 중</em>}
                    </span>
                  </div>
                  <span className={`rv-pill ${closed ? "expired" : running ? "todo" : c.status === "draft" ? "hold" : "approved"}`}>
                    {closed ? "종료" : running ? `매칭 중 ${running}명` : c.status === "draft" ? "공고만 등록" : "대기 없음"}
                  </span>
                </div>

                <div className="sc-bar" aria-label={`매칭 ${k.matched}명 중 승인 ${k.approved}, 승인 대기 ${k.pending}, 분석 중 ${running}, 실패 ${failed}`}>
                  <i className="ok" style={{ width: seg(k.approved) }} />
                  <i className="wait" style={{ width: seg(k.pending) }} />
                  <i className="run" style={{ width: seg(running) }} />
                  <i className="bad" style={{ width: seg(failed) }} />
                </div>
                <dl className="sc-nums">
                  <div><dt>매칭</dt><dd>{k.matched}</dd></div>
                  <div><dt>분석 완료</dt><dd>{k.analyzed}</dd></div>
                  <div><dt><i className="wait" />승인 대기</dt><dd>{k.pending}</dd></div>
                  <div><dt><i className="ok" />승인</dt><dd>{k.approved}</dd></div>
                  <div><dt><i className="run" />분석 중</dt><dd>{running}</dd></div>
                  <div className={failed ? "bad" : ""}><dt><i className="bad" />실패</dt><dd>{failed}</dd></div>
                </dl>

                {(must.length > 0 || c.lastStart) && (
                  <div className="sc-meta">
                    {must.length > 0 && <span>필수 역량 · {must.slice(0, 5).join(", ")}{must.length > 5 ? ` 외 ${must.length - 5}` : ""}</span>}
                    {c.lastStart && (
                      <span>
                        최근 탐색 {ymd(c.lastStart.at)} · 후보 {c.lastStart.searched ?? "-"}명 중 조건 통과 {c.lastStart.matched ?? "-"}명 → {c.lastStart.queued ?? 0}명 투입
                      </span>
                    )}
                  </div>
                )}
                {failed > 0 && !closed && (
                  <p className="sc-warn">후보 {failed}명을 분석하는 중 오류가 발생했습니다. 다시 시도해 주세요.</p>
                )}
                {note[c.id] && <p className="sc-ok">{note[c.id]}</p>}

                <div className="sc-acts">
                  {!closed && (
                    <button type="button" className="rv-btn pri" disabled={busyId !== null} onClick={() => void run(c)}>
                      {busyId === c.id ? "시작 중…" : c.status === "draft" ? "후보 찾기" : running > 0 ? "대기열에 더 추가" : failed > 0 ? "다시 분석·더 찾기" : "더 찾기"}
                    </button>
                  )}
                  {k.matched > 0 && <Link className="rv-btn" href={`/review?jd=${encodeURIComponent(c.jdHash)}`}>승인함</Link>}
                  {k.matched > 0 && <Link className="rv-btn ghost" href={`/desk/candidates?jd=${encodeURIComponent(c.jdHash)}`}>인재풀</Link>}
                  {!closed && (
                    <button type="button" className="rv-btn ghost" aria-pressed={!!c.posted} disabled={busyId !== null} onClick={() => void togglePost(c)}>
                      {c.posted ? "공고 내리기" : "공고로 올리기"}
                    </button>
                  )}
                  <button type="button" className="rv-btn ghost sc-close" disabled={busyId !== null} onClick={() => void toggleClose(c)}>
                    {closed ? "다시 열기" : "건 종료"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
