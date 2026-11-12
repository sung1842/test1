"use client";

// 20 문서 C1 — 후보 검토 작업대: 분석된 모든 후보를 보고 승인 / 보류 / 거절한다.
// 거절 = 이 건에서 그 후보와 더 할 일이 없다 → 서버가 분석 결과를 지운다 (사유는 지표용으로만 남는다).
// 점수는 보조. 기본 정렬은 근거 우선(충족 요건 수 → 인용 카드 수 → 점수).
// 카드의 신뢰 등급(확인·첨부)은 검증되지 않아 쓰지 않는다. 모든 카드는 자기 신고, 진위는 면접에서 확인 (2026-11-11).
import Link from "next/link";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { deskApi } from "@/lib/deskApi";
import { getPublicEvidenceCards, type PublicEvidenceCard } from "@/lib/getCandidate";
import { evidenceCardHref } from "@/lib/briefReport";
import { lifeFetch, sourceLabel } from "@/lib/lifeApi";
import { postingHeadline } from "@/lib/postingFormat";
import { KEY, isUnprocessed, refreshDesk, useFitReports, type FitReportsPayload } from "@/lib/deskData";
import { mutateCache } from "@/lib/useCached";
import { displaySummary, type AgentResult, type FitReport, type FitReportRecord } from "@/types/fitReport";
import { DLoadError, DSkeleton, DState } from "@/components/desk/console/ui";
import "./review.css";

const REVIEWABLE = new Set(["completed", "pending_review"]);

/**
 * 거절 사유 — "AI 판단과 다르게 본 이유"를 고른다. 같은 문구가 orchestrator REJECT_REASON_CODES 에 코드로 매핑되어
 * 데스크 홈의 거절 사유 분포 · 매칭 품질(AI와 다른 판단) 지표로 쓰인다.
 */
const REJECT_REASONS: { label: string; hint: string }[] = [
  { label: "필수 역량 근거 부족", hint: "AI는 충족으로 봤지만 근거가 약하거나 과장됨" },
  { label: "경력 수준 불일치", hint: "연차·리딩 경험이 포지션 수준과 맞지 않음" },
  { label: "도메인·업종 경험 부족", hint: "기술은 맞지만 산업·서비스 도메인이 다름" },
  { label: "관련 경험이 오래됨", hint: "핵심 경험이 최근이 아니거나 지금은 다른 직무" },
  { label: "근무 조건 불일치", hint: "지역·고용형태·연봉 기대 등 조건이 맞지 않음" },
  { label: "이미 접촉한 후보", hint: "다른 경로로 이미 연락했거나 진행 중" },
  { label: "고객사 요청으로 제외", hint: "고객사 이력·경쟁사 등 의뢰 조건상 제외" },
];

const AGENT_LABEL: Record<AgentResult["agent"], string> = { tech_stack: "기술", experience: "경험", culture_fit: "컬처핏" };

type Phase = "todo" | "hold" | "approved" | "expired";
function phaseOf(r: FitReportRecord): Phase {
  if (r.status === "approved") return "approved";
  if (r.status === "expired") return "expired";
  return r.report?.hold ? "hold" : "todo";
}
const PHASE_LABEL: Record<Phase, string> = { todo: "미처리", hold: "보류", approved: "승인", expired: "만료" };

function agentsOf(r: FitReport | null): AgentResult[] {
  return r ? [r.techStack, r.experience, r.cultureFit].filter((a): a is AgentResult => Boolean(a)) : [];
}
function citedIds(r: FitReport | null): Set<string> {
  return new Set(agentsOf(r).flatMap((a) => a.citedCardIds ?? a.citedCards?.map((c) => c.id) ?? []));
}
const unique = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
const matchedOf = (r: FitReport | null) => unique(agentsOf(r).flatMap((a) => a.matched_items));

// 근거 없는 요건 → 유도하지 않는 열린 질문(상황·역할·행동·결과)
/** 핵심 질문만: 기술 → 경험 순, 소통·태도 같은 일반 요건은 뒤로. 최대 QUESTION_MAX 개 */
const QUESTION_MAX = 4;
const SOFT = /소통|커뮤니케이션|책임감|꼼꼼|적극|능동|자기주도|배우|성실|협업|유연|태도|관심/;
function keyQuestions(r: FitReport | null): { top: string[]; rest: string[] } {
  const ordered = unique([...(r?.techStack.missing_items ?? []), ...(r?.experience.missing_items ?? []), ...(r?.cultureFit?.missing_items ?? [])]);
  const hard = ordered.filter((m) => !SOFT.test(m));
  const soft = ordered.filter((m) => SOFT.test(m));
  const all = [...hard, ...soft];
  return { top: all.slice(0, QUESTION_MAX), rest: all.slice(QUESTION_MAX) };
}

function followUpQuestion(item: string): string {
  return `${item}: 이 요건과 관련해 겪은 상황이 있다면, 그때 맡은 역할과 직접 한 행동, 결과를 들려주세요.`;
}

const talentHref = (jdHash: string) => `/desk/candidates?jd=${encodeURIComponent(jdHash)}`;

export default function CandidateReviewPage() {
  const { data, error, loading } = useFitReports();
  const records = useMemo(() => data?.reports ?? [], [data]);
  const caseInfo = useMemo(() => data?.cases ?? {}, [data]);
  // 데스크 홈 건 카드에서 ?jd= 로 들어오면 그 건을 연다 (마운트 후 URL 반영 — 서버/클라이언트 첫 렌더 일치)
  const [jdHash, setJdHash] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setJdHash(new URLSearchParams(window.location.search).get("jd")), 0);
    return () => clearTimeout(t);
  }, []);
  const [sort, setSort] = useState<"evidence" | "score">("evidence");
  const [onlyTodo, setOnlyTodo] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: "approved" | "rejected" | "hold"; name: string; jdHash: string; id: string } | null>(null);

  const jds = useMemo(() => {
    const map = new Map<string, { hash: string; title: string; todo: number; total: number; running: number; failed: number; approved: number }>();
    for (const r of records) {
      const info = caseInfo[r.jdHash];
      const title = info?.title ? `${info.clientName ? `${info.clientName} · ` : ""}${info.title}${info.closed ? " (종료)" : ""}` : postingHeadline(r.jd);
      const e = map.get(r.jdHash) ?? { hash: r.jdHash, title, todo: 0, total: 0, running: 0, failed: 0, approved: 0 };
      if (r.report) e.total += 1;
      if (isUnprocessed(r)) e.todo += 1;
      if (r.status === "approved") e.approved += 1;
      if (!r.report && r.status === "failed") e.failed += 1;
      else if (!r.report) e.running += 1;
      map.set(r.jdHash, e);
    }
    return [...map.values()];
  }, [records, caseInfo]);

  const activeJd = (jdHash && jds.some((j) => j.hash === jdHash) ? jdHash : null) ?? jds[0]?.hash ?? null;
  const activeCase = jds.find((j) => j.hash === activeJd) ?? null;

  const list = useMemo(() => {
    const rows = records.filter((r) => r.report && r.jdHash === activeJd && (onlyTodo ? isUnprocessed(r) : true));
    const score = (r: FitReportRecord) => r.report?.overallScore ?? 0;
    const phaseRank: Record<Phase, number> = { todo: 0, hold: 1, approved: 2, expired: 3 };
    return rows.sort(
      (a, b) =>
        phaseRank[phaseOf(a)] - phaseRank[phaseOf(b)] ||
        (sort === "score"
          ? score(b) - score(a)
          : matchedOf(b.report).length - matchedOf(a.report).length || citedIds(b.report).size - citedIds(a.report).size || score(b) - score(a)),
    );
  }, [records, activeJd, onlyTodo, sort]);

  const selected = list.find((r) => r.id === selectedId) ?? list[0] ?? null;

  const move = useCallback(
    (step: number) => {
      if (!selected) return;
      const i = list.findIndex((r) => r.id === selected.id);
      const next = list[Math.min(list.length - 1, Math.max(0, i + step))];
      if (next) setSelectedId(next.id);
    },
    [list, selected],
  );

  // 결정 후: 캐시를 먼저 고쳐 바로 반영하고(거절은 목록에서 제거), 다음 미처리 후보로 넘어간다
  const onDecided = useCallback(
    (rec: FitReportRecord, kind: "approved" | "rejected" | "hold" | "unhold") => {
      const nextTodo = list.find((r) => r.id !== rec.id && isUnprocessed(r));
      mutateCache<FitReportsPayload>(KEY.reports, (cur) => {
        if (!cur) return cur as unknown as FitReportsPayload;
        const reports =
          kind === "rejected"
            ? cur.reports.filter((r) => r.id !== rec.id)
            : cur.reports.map((r) => {
                if (r.id !== rec.id || !r.report) return r;
                if (kind === "approved") return { ...r, status: "approved" as const, report: { ...r.report, hold: undefined } };
                if (kind === "hold") return { ...r, report: { ...r.report, hold: { at: new Date().toISOString(), by: null } } };
                return { ...r, report: { ...r.report, hold: undefined } };
              });
        return { ...cur, reports };
      });
      const name = rec.report?.candidateName ?? rec.candidateName ?? "후보";
      if (kind !== "unhold") setFlash({ kind, name, jdHash: rec.jdHash, id: rec.id });
      if (kind === "approved") setSelectedId(rec.id);
      else if (kind !== "unhold") setSelectedId(nextTodo?.id ?? null);
      refreshDesk();
    },
    [list],
  );

  // 보류 되돌리기 (단축키 H 오입력 대비)
  const undoHold = useCallback(
    async (id: string) => {
      const rec = list.find((r) => r.id === id);
      if (!rec) return;
      try {
        await lifeFetch(`/api/fit-reports/${encodeURIComponent(id)}/review`, { method: "POST", body: JSON.stringify({ action: "unhold" }) });
        onDecided(rec, "unhold");
        setFlash(null);
        setSelectedId(id);
      } catch {
        /* 실패 시 알림을 그대로 둔다 */
      }
    },
    [list, onDecided],
  );

  const counts = useMemo(() => {
    const rows = records.filter((r) => r.report && r.jdHash === activeJd);
    return { all: rows.length, todo: rows.filter(isUnprocessed).length };
  }, [records, activeJd]);

  return (
    <div className="rv">
        <header className="lc-top" data-in>
          <h1>승인함</h1>
          <span className="lc-sub lc-hide-m">공개 근거 카드만 보입니다. 근거가 없는 요건은 탈락 사유가 아니라 면접 확인 질문입니다.</span>
          <p className="lc-hint lc-hide-m" aria-label="단축키" style={{ margin: "0 0 0 auto" }}>
            <span><kbd className="lc-kbd">J</kbd><kbd className="lc-kbd">K</kbd> 이동</span>
            <span><kbd className="lc-kbd">A</kbd> 승인</span>
            <span><kbd className="lc-kbd">H</kbd> 보류</span>
            <span><kbd className="lc-kbd">R</kbd> 거절</span>
          </p>
        </header>

        {loading ? (
          <section className="lc-panel"><DSkeleton rows={4} label="승인함을 불러오는 중" /></section>
        ) : error ? (
          <section className="lc-panel"><DLoadError what="승인함" error={error} /></section>
        ) : jds.length === 0 ? (
          <section className="lc-panel">
            <DState
              title="아직 승인할 후보가 없어요"
              body="JD로 스카우트 건을 만들면 AI가 찾은 후보가 근거와 함께 이곳에 쌓여요."
              action={{ href: "/sourcing", label: "스카우트 건 만들기" }}
            />
          </section>
        ) : (
          <>
            <div className="rv-bar">
              <label className="rv-case">
                <span className="sr">스카우트 건</span>
                <select
                  value={activeJd ?? ""}
                  onChange={(e) => {
                    setJdHash(e.target.value);
                    setSelectedId(null);
                    setFlash(null);
                  }}
                >
                  {jds.map((j) => (
                    <option key={j.hash} value={j.hash}>
                      {j.title} · 미처리 {j.todo}/{j.total}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rv-seg" role="group" aria-label="보기">
                <button type="button" aria-pressed={!onlyTodo} onClick={() => setOnlyTodo(false)}>
                  전체 후보 <b>{counts.all}</b>
                </button>
                <button type="button" aria-pressed={onlyTodo} onClick={() => setOnlyTodo(true)}>
                  미처리만 <b>{counts.todo}</b>
                </button>
              </div>
              <div className="rv-seg" role="group" aria-label="정렬">
                <button type="button" aria-pressed={sort === "evidence"} onClick={() => setSort("evidence")}>근거 우선</button>
                <button type="button" aria-pressed={sort === "score"} onClick={() => setSort("score")}>점수순</button>
              </div>
              {activeJd && (
                <Link className="rv-link" href={talentHref(activeJd)}>
                  인재풀에서 이 건 보기
                </Link>
              )}
            </div>

            {activeCase && (activeCase.running > 0 || activeCase.failed > 0) && (
              <p className="rv-note">
                {activeCase.running > 0 && <>분석 중 {activeCase.running}명. 끝나는 대로 이 목록에 자동으로 나타납니다. </>}
                {activeCase.failed > 0 && <>후보 {activeCase.failed}명을 분석하는 중 오류가 발생했습니다. <Link href="/sourcing/cases">건 현황</Link>에서 다시 시도해 주세요.</>}
              </p>
            )}

            {flash && (
              <div className={`rv-flash ${flash.kind}`} role="status">
                {flash.kind === "approved" ? (
                  <>
                    <span><b>{flash.name}</b> 님을 승인했어요. 다음 단계는 제안입니다.</span>
                    <span className="rv-flash-acts">
                      <Link href={talentHref(flash.jdHash)}>인재풀의 이 건에서 이어가기</Link>
                    </span>
                  </>
                ) : flash.kind === "hold" ? (
                  <>
                    <span><b>{flash.name}</b> 님을 보류했어요. “미처리만” 보기에서는 빠지고 전체 후보에 남아요.</span>
                    <span className="rv-flash-acts">
                      <button type="button" className="rv-linkbtn" onClick={() => void undoHold(flash.id)}>되돌리기</button>
                    </span>
                  </>
                ) : (
                  <span><b>{flash.name}</b> 님을 거절해 이 건에서 지웠어요. 사유는 지표에만 남아요.</span>
                )}
                <button type="button" className="rv-x" aria-label="알림 닫기" onClick={() => setFlash(null)}><X size={14} aria-hidden="true" /></button>
              </div>
            )}

            <div className="rv-grid">
              <ul className="rv-list" aria-label="후보 목록">
                {list.length === 0 && (
                  <li className="rv-empty">
                    {onlyTodo && counts.all > 0 ? (
                      <>미처리 후보가 없어요. <button type="button" onClick={() => setOnlyTodo(false)}>전체 후보 보기</button></>
                    ) : activeCase && activeCase.running > 0 ? (
                      `후보 ${activeCase.running}명 분석 중입니다. 끝나면 여기에 나타납니다.`
                    ) : (
                      "이 건에 분석된 후보가 없어요."
                    )}
                  </li>
                )}
                {list.map((r) => {
                  const cited = citedIds(r.report).size;
                  const phase = phaseOf(r);
                  return (
                    <li key={r.id}>
                      <button type="button" className="rv-row" aria-current={selected?.id === r.id ? "true" : undefined} onClick={() => setSelectedId(r.id)}>
                        <span className="rv-row-top">
                          <strong>{r.report?.candidateName ?? r.candidateName ?? "이름 없음"}</strong>
                          <span className={`rv-pill ${phase}`}>{PHASE_LABEL[phase]}</span>
                        </span>
                        <span className="rv-row-meta">
                          충족 {matchedOf(r.report).length} · 근거 {cited}
                        </span>
                        <span className="rv-score" aria-label={`참고 점수 ${r.report?.overallScore ?? "-"}`}>
                          <i style={{ width: `${Math.max(4, Math.min(100, r.report?.overallScore ?? 0))}%` }} />
                          <em>{r.report?.overallScore ?? "-"}</em>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {selected?.report ? (
                <Brief key={selected.id} record={selected} report={selected.report} onMove={move} onDecided={onDecided} />
              ) : (
                <div className="rv-panel rv-pick">
                  <strong>{list.length ? "후보를 선택하세요" : "검토할 후보가 없어요"}</strong>
                </div>
              )}
            </div>
          </>
        )}
    </div>
  );
}

function Brief({
  record,
  report,
  onMove,
  onDecided,
}: {
  record: FitReportRecord;
  report: FitReport;
  onMove: (step: number) => void;
  onDecided: (rec: FitReportRecord, kind: "approved" | "rejected" | "hold" | "unhold") => void;
}) {
  const [cards, setCards] = useState<PublicEvidenceCard[] | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reviewable = REVIEWABLE.has(record.status);
  const phase = phaseOf(record);

  // 열람 기록 (근거 열람 후 승인·검토 시간 지표)
  useEffect(() => {
    void deskApi.recordView(record.id);
  }, [record.id]);

  useEffect(() => {
    let alive = true;
    void getPublicEvidenceCards(record.candidateId).then((c) => alive && setCards(c));
    return () => {
      alive = false;
    };
  }, [record.candidateId]);

  const byId = useMemo(() => new Map((cards ?? []).map((c) => [c.id, c])), [cards]);
  const questions = keyQuestions(report);

  const decide = useCallback(
    async (action: "approve" | "reject" | "hold" | "unhold", reason?: string) => {
      if (action === "reject" && !window.confirm(`${report.candidateName} 님을 거절할까요?\n사유: ${reason}\n\n이 건의 분석 결과가 삭제되어 되돌릴 수 없어요.`)) return;
      setBusy(true);
      setError(null);
      try {
        await lifeFetch(`/api/fit-reports/${encodeURIComponent(record.id)}/review`, {
          method: "POST",
          body: JSON.stringify({ action, reason }),
        });
        setRejecting(false);
        onDecided(record, action === "approve" ? "approved" : action === "reject" ? "rejected" : action);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [record, report.candidateName, onDecided],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "j") onMove(1);
      else if (k === "k") onMove(-1);
      else if (k === "a" && reviewable && !busy) void decide("approve");
      else if (k === "h" && reviewable && !busy) void decide(phase === "hold" ? "unhold" : "hold");
      else if (k === "r" && reviewable) setRejecting(true);
      else if (k === "escape") setRejecting(false);
      else if (rejecting && !busy && /^[1-7]$/.test(k)) void decide("reject", REJECT_REASONS[Number(k) - 1].label);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMove, decide, reviewable, rejecting, busy, phase]);


  return (
    <section className="rv-panel rv-brief" aria-label="후보 브리프">
      <div className="rv-brief-head">
        <div className="rv-avatar" aria-hidden="true">{(report.candidateName ?? "?").slice(0, 1)}</div>
        <div className="rv-brief-id">
          <h2>{report.candidateName}</h2>
          <p>
            <span className={`rv-pill ${phase}`}>{PHASE_LABEL[phase]}</span>
            {record.status === "pending_review" && <span className="rv-pill low">신뢰도 낮음</span>}
            <span>참고 점수 <b>{report.overallScore}</b></span>
            <Link href={`/talent/${encodeURIComponent(record.candidateId)}`} target="_blank" rel="noopener noreferrer">프로필 보기</Link>
          </p>
        </div>
      </div>

      <p className="rv-summary">{displaySummary(report.ceoSummary)}</p>
      {report.calibration && report.calibration.reasons.length > 0 && (
        <p className="rv-calib">
          <b>점수 보정</b> {report.calibration.rawScore}점 → {report.overallScore}점 · {report.calibration.reasons.join(" · ")}
        </p>
      )}

      <h3 className="rv-h3">영역별 분석</h3>
      {agentsOf(report).map((a) => {
        const ids = a.citedCardIds ?? a.citedCards?.map((c) => c.id) ?? [];
        return (
          <div key={a.agent} className="rv-req rv-area">
            <div className="rv-req-title">
              <span className="rv-tag">{AGENT_LABEL[a.agent]}</span>
              <b className="rv-area-score">{a.score}점</b>
              <span className="rv-muted">충족 {a.matched_items.length} · 확인 필요 {a.missing_items.length}</span>
            </div>
            {a.summary && <p className="rv-area-sum">{a.summary}</p>}
            {a.evidence.length > 0 && (
              <ul className="rv-evid">
                {a.evidence.map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}
            {a.matched_items.length > 0 && (
              <p className="rv-area-row"><span className="rv-area-k">충족</span><span className="rv-chips">{a.matched_items.map((m) => <span key={m}>{m}</span>)}</span></p>
            )}
            {a.missing_items.length > 0 && (
              <p className="rv-area-row"><span className="rv-area-k">근거 없음</span><span className="rv-chips miss">{a.missing_items.map((m) => <span key={m}>{m}</span>)}</span></p>
            )}
            {ids.map((id) => {
              const c = byId.get(id);
              return c ? (
                <a key={id} className="rv-card" href={evidenceCardHref(record.candidateId, id)} target="_blank" rel="noopener noreferrer" onClick={() => void deskApi.recordView(record.id, id)}>
                  {c.claim}
                  <span>
                    자기 신고 · 면접에서 확인 · {sourceLabel(c.source)}
                    {c.recorded_at && ` · ${c.recorded_at.slice(0, 10)}`}
                    {c.ai_edited && " · AI 교정"}
                  </span>
                </a>
              ) : (
                <span key={id} className="rv-muted">{cards === null ? "카드 불러오는 중" : "후보가 공개를 철회한 카드"}</span>
              );
            })}
          </div>
        );
      })}

      <h3 className="rv-h3">면접에서 먼저 확인할 것 <small>핵심 {questions.top.length}개</small></h3>
      {questions.top.length === 0 ? (
        <p className="rv-muted">근거가 없는 요건이 없습니다.</p>
      ) : (
        <>
          <ol className="rv-qs">
            {questions.top.map((m) => <li key={m}>{followUpQuestion(m)}</li>)}
          </ol>
          {questions.rest.length > 0 && <p className="rv-muted">그 밖에 근거가 없는 요건 {questions.rest.length}개는 위 영역별 분석의 “근거 없음”에 있어요.</p>}
        </>
      )}

      {report.review && <p className="rv-muted rv-log">승인{report.review.decidedBy && ` · ${report.review.decidedBy}`} · {report.review.decidedAt.slice(0, 16).replace("T", " ")}</p>}

      {reviewable && (
        <div className="rv-decide">
          {!rejecting ? (
            <div className="rv-acts">
              <button type="button" className="rv-btn pri" disabled={busy} onClick={() => void decide("approve")}>{busy ? "처리 중" : "승인"} <kbd className="lc-kbd">A</kbd></button>
              <button type="button" className="rv-btn" disabled={busy} onClick={() => void decide(phase === "hold" ? "unhold" : "hold")}>
                {phase === "hold" ? "보류 해제" : "보류"} <kbd className="lc-kbd">H</kbd>
              </button>
              <button type="button" className="rv-btn danger" disabled={busy} onClick={() => setRejecting(true)}>거절 <kbd className="lc-kbd">R</kbd></button>
              <button type="button" className="rv-btn ghost" onClick={() => onMove(1)}>다음 <kbd className="lc-kbd">J</kbd></button>
            </div>
          ) : (
            <div className="rv-reject">
              <p><b>AI와 다르게 본 이유</b>를 고르세요 <span className="rv-muted">(숫자 1~7, Esc 취소)</span></p>
              <div className="rv-reasons">
                {REJECT_REASONS.map((r, i) => (
                  <button key={r.label} type="button" disabled={busy} onClick={() => void decide("reject", r.label)}>
                    <b>{i + 1}. {r.label}</b>
                    <span>{r.hint}</span>
                  </button>
                ))}
              </div>
              <div className="rv-reject-own">
                <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="기타 사유 직접 입력" aria-label="거절 사유 직접 입력" />
                <button type="button" className="rv-btn danger" disabled={busy || !note.trim()} onClick={() => void decide("reject", note.trim())}>거절</button>
                <button type="button" className="rv-btn ghost" onClick={() => setRejecting(false)}>취소</button>
              </div>
            </div>
          )}
        </div>
      )}
      {record.status === "approved" && <OfferMaker fitReportId={record.id} jdHash={record.jdHash} />}
      {error && <p className="rv-err">{error}</p>}
    </section>
  );
}

// 승인한 후보에게 보낼 제안 초안 → 데스크 홈 "제안"에서 발송 승인 (HIL)
function OfferMaker({ fitReportId, jdHash }: { fitReportId: string; jdHash: string }) {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const create = async () => {
    setState("busy");
    setError(null);
    try {
      await deskApi.createOffer(fitReportId, message.trim());
      setState("done");
      refreshDesk();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("idle");
    }
  };
  if (state === "done") {
    return (
      <p className="rv-flash approved" style={{ marginTop: 16 }}>
        제안 초안을 만들었어요. <Link href="/desk/offers">제안 서신함</Link>에서 내용을 확인하고 발송을 승인하세요.
      </p>
    );
  }
  return (
    <div className="rv-offer">
      <div className="rv-offer-head">
        <b>다음 단계 · 제안 만들기</b>
        <Link href={talentHref(jdHash)}>인재풀의 이 건에서 보기</Link>
      </div>
      <textarea
        value={message}
        maxLength={2000}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="후보에게 보낼 제안 메시지. 인용된 공개 근거 카드가 함께 공유됩니다."
        aria-label="제안 메시지"
      />
      <div>
        <button type="button" className="rv-btn pri" disabled={state === "busy" || !message.trim()} onClick={() => void create()}>
          {state === "busy" ? "만드는 중" : "제안 초안 만들기"}
        </button>
      </div>
      {error && <p className="rv-err">{error}</p>}
    </div>
  );
}
