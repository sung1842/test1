"use client";

// 20 문서 C1 — 후보 검토 작업대: 리스트 · 브리프(인용 카드·배지·확인 질문) · 승인/거절을 한 화면에서.
// 점수는 보조. 기본 정렬은 근거 우선(충족 요건 수 → 최고 신뢰 등급 → 점수).
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductShell } from "@/components/product/ProductShell";
import { DeskTabs } from "@/components/desk/DeskTabs";
import { deskApi } from "@/lib/deskApi";
import { getPublicEvidenceCards, type PublicEvidenceCard } from "@/lib/getCandidate";
import { evidenceCardHref } from "@/lib/briefReport";
import { lifeFetch, sourceLabel, trustLabel } from "@/lib/lifeApi";
import type { AgentResult, FitReport, FitReportRecord } from "@/types/fitReport";
import { LoadError, SkeletonList, StateView } from "@/components/state/StateView";

const TRUST_RANK: Record<string, number> = { confirmed: 3, attached: 2, self: 1 };
const REVIEWABLE = new Set(["completed", "pending_review"]);
const REJECT_REASONS = ["필수 역량 근거 부족", "경력 범위 불일치", "이미 접촉한 후보", "포지션 조건 불일치"];
const AGENT_LABEL: Record<AgentResult["agent"], string> = {
  tech_stack: "기술",
  experience: "경험",
  culture_fit: "컬처핏",
};
const STATUS_LABEL: Record<string, string> = {
  completed: "검토 대기",
  pending_review: "검토 대기 · 신뢰도 낮음",
  approved: "승인",
  rejected: "거절",
  expired: "만료",
  queued: "분석 대기",
  processing: "분석 중",
};

function agentsOf(r: FitReport | null): AgentResult[] {
  return r ? [r.techStack, r.experience, r.cultureFit].filter((a): a is AgentResult => Boolean(a)) : [];
}

function citedIds(r: FitReport | null): Set<string> {
  return new Set(agentsOf(r).flatMap((a) => a.citedCardIds ?? a.citedCards?.map((c) => c.id) ?? []));
}

function bestTrust(r: FitReport | null): number {
  return Math.max(0, ...agentsOf(r).flatMap((a) => a.citedCards ?? []).map((c) => TRUST_RANK[c.trust] ?? 0));
}

const unique = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
const matchedOf = (r: FitReport | null) => unique(agentsOf(r).flatMap((a) => a.matched_items));
const missingOf = (r: FitReport | null) => unique(agentsOf(r).flatMap((a) => a.missing_items));

function jdHeadline(jd: string): string {
  const line = jd.split("\n").map((l) => l.trim()).find(Boolean) ?? "제목 없는 공고";
  return line.length > 48 ? `${line.slice(0, 48)}…` : line;
}

// 근거 없는 요건 → 유도하지 않는 열린 질문(6칸: 상황·역할·행동·결과)
function followUpQuestion(item: string): string {
  // 항목 끝 글자에 따라 조사가 달라지므로 조사 없이 콜론으로 잇는다
  return `${item}: 이 요건과 관련해 겪은 상황이 있다면, 그때 맡은 역할과 직접 한 행동, 결과를 들려주세요.`;
}

export default function CandidateReviewPage() {
  const [records, setRecords] = useState<FitReportRecord[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  // 데스크 홈 건 카드에서 ?jd= 로 들어오면 그 건을 연다
  const [jdHash, setJdHash] = useState<string | null>(null);
  // 서버·클라이언트 첫 렌더를 같게 두고, 마운트 후 URL 의 jd 를 반영한다
  useEffect(() => {
    const t = setTimeout(() => setJdHash(new URLSearchParams(window.location.search).get("jd")), 0);
    return () => clearTimeout(t);
  }, []);
  const [sort, setSort] = useState<"evidence" | "score">("evidence");
  const [showDone, setShowDone] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await lifeFetch<{ reports: FitReportRecord[] }>("/api/fit-reports");
      setRecords(res.reports.filter((r) => r.report));
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const jds = useMemo(() => {
    const map = new Map<string, { hash: string; title: string; pending: number; total: number }>();
    for (const r of records) {
      const e = map.get(r.jdHash) ?? { hash: r.jdHash, title: jdHeadline(r.jd), pending: 0, total: 0 };
      e.total += 1;
      if (REVIEWABLE.has(r.status)) e.pending += 1;
      map.set(r.jdHash, e);
    }
    return [...map.values()];
  }, [records]);

  const activeJd = (jdHash && jds.some((j) => j.hash === jdHash) ? jdHash : null) ?? jds[0]?.hash ?? null;

  const list = useMemo(() => {
    const rows = records.filter((r) => r.jdHash === activeJd && (showDone || REVIEWABLE.has(r.status)));
    const score = (r: FitReportRecord) => r.report?.overallScore ?? 0;
    return rows.sort((a, b) =>
      sort === "score"
        ? score(b) - score(a)
        : matchedOf(b.report).length - matchedOf(a.report).length ||
          bestTrust(b.report) - bestTrust(a.report) ||
          score(b) - score(a),
    );
  }, [records, activeJd, showDone, sort]);

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

  // 결정 후 같은 자리의 다음 후보로 넘어간다 (목록에서 빠지므로 인덱스 유지)
  const onDecided = useCallback(
    async (id: string) => {
      const i = list.findIndex((r) => r.id === id);
      const next = list[i + 1] ?? list[i - 1];
      setSelectedId(showDone ? id : next?.id ?? null);
      await load();
    },
    [list, load, showDone],
  );

  return (
    <ProductShell crumble="데스크 · 후보 검토">
      <div className="product-page" style={{ maxWidth: 1180 }}>
        <div className="dk" style={{ padding: 0 }}><DeskTabs pending={records.filter((r) => REVIEWABLE.has(r.status)).length} /></div>
        <p className="product-eyebrow">후보 검토</p>
        <h1 className="product-title" style={{ fontSize: 28 }}>근거를 보고 판단하세요</h1>
        <p className="product-muted" style={{ marginTop: 6 }}>
          공개 근거 카드만 보입니다. 근거가 없는 요건은 탈락 사유가 아니라 면접 확인 질문입니다.
          <span style={{ marginLeft: 8 }}>단축키 J/K 이동 · A 승인 · R 거절</span>
        </p>

        {state === "loading" ? (
          <div style={{ marginTop: 24 }}><SkeletonList rows={4} label="승인함을 불러오는 중" /></div>
        ) : state === "error" ? (
          <LoadError what="승인함" error={error} />
        ) : jds.length === 0 ? (
          <StateView
            art="search"
            title="아직 승인할 후보가 없어요"
            note="스카우트 건을 만들면 여기로 모여요"
            body="JD로 스카우트 건을 만들면 AI가 찾은 후보가 근거와 함께 이곳에 쌓여요."
            action={{ href: "/sourcing", label: "스카우트 건 만들기" }}
          />
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "20px 0 14px" }}>
              <select
                className="product-field"
                aria-label="스카우트 건(JD)"
                value={activeJd ?? ""}
                onChange={(e) => {
                  setJdHash(e.target.value);
                  setSelectedId(null);
                }}
                style={{ maxWidth: 420, margin: 0 }}
              >
                {jds.map((j) => (
                  <option key={j.hash} value={j.hash}>
                    {j.title} · 대기 {j.pending}/{j.total}
                  </option>
                ))}
              </select>
              <button type="button" className="product-chip" aria-pressed={sort === "evidence"} onClick={() => setSort("evidence")}>
                근거 우선
              </button>
              <button type="button" className="product-chip" aria-pressed={sort === "score"} onClick={() => setSort("score")}>
                점수순
              </button>
              <label className="product-muted" style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
                처리한 후보도 보기
              </label>
            </div>

            <div className="review-grid">
              <ul className="review-list" aria-label="후보 목록">
                {list.length === 0 && <li className="product-muted" style={{ padding: 12 }}>검토 대기 후보가 없습니다.</li>}
                {list.map((r) => {
                  const cited = citedIds(r.report).size;
                  const trust = bestTrust(r.report);
                  const active = selected?.id === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="review-row"
                        aria-current={active ? "true" : undefined}
                        onClick={() => setSelectedId(r.id)}
                      >
                        <strong>{r.report?.candidateName ?? r.candidateName ?? "이름 없음"}</strong>
                        <span>
                          충족 {matchedOf(r.report).length} · 근거 카드 {cited}
                          {trust > 0 && ` · ${trustLabel(Object.keys(TRUST_RANK).find((k) => TRUST_RANK[k] === trust))}`}
                        </span>
                        <span className="product-muted">
                          {STATUS_LABEL[r.status] ?? r.status} · {r.report?.overallScore ?? "-"}점
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {selected?.report ? (
                <Brief key={selected.id} record={selected} report={selected.report} onMove={move} onDecided={onDecided} />
              ) : (
                <div className="product-empty"><strong>후보를 선택하세요</strong></div>
              )}
            </div>
          </>
        )}
      </div>
      <style>{`
        .review-grid { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: start; }
        .review-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; max-height: 72vh; overflow: auto; }
        .review-row { width: 100%; text-align: left; display: grid; gap: 2px; padding: 10px 12px; border-radius: 10px;
          border: 1px solid var(--product-line, #e5e7eb); background: transparent; color: inherit; font: inherit; font-size: 13px; cursor: pointer; }
        .review-row[aria-current="true"] { border-color: currentColor; box-shadow: inset 3px 0 0 currentColor; }
        .review-req { display: grid; gap: 6px; padding: 10px 0; border-top: 1px solid var(--product-line, #e5e7eb); }
        .review-card { display: block; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--product-line, #e5e7eb);
          font-size: 13px; color: inherit; text-decoration: none; }
        .product-chip[aria-pressed="true"] { font-weight: 700; text-decoration: underline; }
        @media (max-width: 820px) {
          .review-grid { grid-template-columns: 1fr; }
          .review-list { max-height: 34vh; }
        }
      `}</style>
    </ProductShell>
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
  onDecided: (id: string) => Promise<void>;
}) {
  const [cards, setCards] = useState<PublicEvidenceCard[] | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reviewable = REVIEWABLE.has(record.status);

  // 열람 기록 (근거 열람 후 승인·검토 시간 지표, 017 전에는 서버가 기록 없이 202)
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
  const missing = missingOf(report);

  const decide = useCallback(
    async (action: "approve" | "reject", reason?: string) => {
      setBusy(true);
      setError(null);
      try {
        await lifeFetch(`/api/fit-reports/${encodeURIComponent(record.id)}/review`, {
          method: "POST",
          body: JSON.stringify({ action, reason }),
        });
        setRejecting(false);
        await onDecided(record.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [record.id, onDecided],
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
      else if (k === "r" && reviewable) setRejecting(true);
      else if (k === "escape") setRejecting(false);
      else if (rejecting && !busy && /^[1-4]$/.test(k)) void decide("reject", REJECT_REASONS[Number(k) - 1]);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMove, decide, reviewable, rejecting, busy]);

  return (
    <section className="product-panel" aria-label="후보 브리프">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>{report.candidateName}</h2>
          <p className="product-muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
            {STATUS_LABEL[record.status] ?? record.status} · 참고 점수 {report.overallScore}
            {" · "}
            <Link href={`/brief/${encodeURIComponent(record.candidateId)}?jd=${encodeURIComponent(record.jdHash)}`} style={{ textDecoration: "underline" }}>
              전체 브리프
            </Link>
          </p>
        </div>
      </div>

      <p style={{ fontSize: 14, lineHeight: 1.6, margin: "12px 0" }}>{report.ceoSummary}</p>

      <h3 className="studio-label" style={{ fontSize: 13, margin: "16px 0 4px" }}>근거가 확인된 요건</h3>
      {agentsOf(report).every((a) => a.matched_items.length === 0) && <p className="product-muted" style={{ fontSize: 13 }}>없음</p>}
      {agentsOf(report)
        .filter((a) => a.matched_items.length > 0)
        .map((a) => {
          const ids = a.citedCardIds ?? a.citedCards?.map((c) => c.id) ?? [];
          return (
            <div key={a.agent} className="review-req">
              <div style={{ fontSize: 13 }}>
                <strong>{AGENT_LABEL[a.agent]}</strong> · {a.matched_items.join(", ")}
              </div>
              {ids.length === 0 ? (
                <span className="product-muted" style={{ fontSize: 12 }}>인용한 공개 카드 없음 — 포트폴리오 본문 기반</span>
              ) : (
                ids.map((id) => {
                  const c = byId.get(id);
                  return c ? (
                    <a key={id} className="review-card" href={evidenceCardHref(record.candidateId, id)} target="_blank" rel="noopener noreferrer" onClick={() => void deskApi.recordView(record.id, id)}>
                      {c.claim}
                      <span className="product-muted" style={{ display: "block", marginTop: 4, fontSize: 12 }}>
                        신뢰 등급: {trustLabel(c.trust_level)} · {sourceLabel(c.source)}
                        {c.recorded_at && ` · ${c.recorded_at.slice(0, 10)}`}
                        {c.ai_edited && " · AI 교정"}
                      </span>
                    </a>
                  ) : (
                    <span key={id} className="product-muted" style={{ fontSize: 12 }}>
                      {cards === null ? "카드 불러오는 중" : "후보가 공개를 철회한 카드"}
                    </span>
                  );
                })
              )}
            </div>
          );
        })}

      <h3 className="studio-label" style={{ fontSize: 13, margin: "16px 0 4px" }}>면접 확인 질문 (근거 없음 {missing.length})</h3>
      {missing.length === 0 ? (
        <p className="product-muted" style={{ fontSize: 13 }}>근거가 없는 요건이 없습니다.</p>
      ) : (
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
          {missing.map((m) => (
            <li key={m}>{followUpQuestion(m)}</li>
          ))}
        </ol>
      )}

      {report.review && (
        <p className="product-muted" style={{ fontSize: 12, marginTop: 14 }}>
          {report.review.decision === "approved" ? "승인" : "거절"}
          {report.review.reason && ` · 사유: ${report.review.reason}`}
          {report.review.decidedBy && ` · ${report.review.decidedBy}`} · {report.review.decidedAt.slice(0, 16).replace("T", " ")}
        </p>
      )}

      {reviewable && (
        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          {!rejecting ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="product-cta" disabled={busy} onClick={() => void decide("approve")}>
                {busy ? "처리 중" : "승인 (A)"}
              </button>
              <button type="button" className="product-chip" disabled={busy} onClick={() => setRejecting(true)}>
                거절 (R)
              </button>
              <button type="button" className="product-chip" onClick={() => onMove(1)}>
                보류 · 다음 (J)
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13 }}>거절 사유를 고르세요 (숫자 키 1~4, Esc 취소)</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {REJECT_REASONS.map((r, i) => (
                  <button key={r} type="button" className="product-chip" disabled={busy} onClick={() => void decide("reject", r)}>
                    {i + 1}. {r}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="product-field"
                  value={note}
                  maxLength={200}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="직접 입력"
                  aria-label="거절 사유 직접 입력"
                  style={{ margin: 0 }}
                />
                <button type="button" className="product-chip" disabled={busy || !note.trim()} onClick={() => void decide("reject", note.trim())}>
                  거절
                </button>
                <button type="button" className="product-chip" onClick={() => setRejecting(false)}>
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {record.status === "approved" && <OfferMaker fitReportId={record.id} />}
      {error && <p style={{ color: "#b91c1c", fontSize: 13 }}>{error}</p>}
    </section>
  );
}

// 승인한 후보에게 보낼 제안 초안 → 데스크 홈 "제안"에서 발송 승인 (HIL)
function OfferMaker({ fitReportId }: { fitReportId: string }) {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const create = async () => {
    setState("busy");
    setError(null);
    try {
      await deskApi.createOffer(fitReportId, message.trim());
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("idle");
    }
  };
  if (state === "done") {
    return (
      <p className="product-muted" style={{ fontSize: 13, marginTop: 14 }}>
        제안 초안을 만들었습니다. <Link href="/desk#offers" style={{ textDecoration: "underline" }}>데스크 홈</Link>에서 발송을 승인하세요.
      </p>
    );
  }
  return (
    <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>제안 만들기</span>
      <textarea
        className="product-field"
        value={message}
        maxLength={2000}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="후보에게 보낼 제안 메시지. 인용된 공개 근거 카드가 함께 공유됩니다."
        aria-label="제안 메시지"
        style={{ minHeight: 64, margin: 0 }}
      />
      <div>
        <button type="button" className="product-chip" disabled={state === "busy" || !message.trim()} onClick={() => void create()}>
          {state === "busy" ? "만드는 중" : "제안 초안 만들기"}
        </button>
      </div>
      {error && <p style={{ color: "#b91c1c", fontSize: 13 }}>{error}</p>}
    </div>
  );
}
