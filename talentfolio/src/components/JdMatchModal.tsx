"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, CheckCircle, XCircle, Loader2, Code2, Palette, Send, CheckSquare, Square } from "lucide-react";
import type { FitReport } from "@/types/fitReport";
import { JD_ANALYZER_URL, STAGE_LABELS, isJdAnalyzerConfigured } from "@/types/fitReport";
import { BACKEND_UNAVAILABLE_MSG } from "@/lib/features";
import FitScoreBadge from "./FitScoreBadge";
import { authFetch, withAccessToken } from "@/lib/lifeApi";
import { composePostingText, toItems } from "@/lib/postingFormat";

export interface JdFormState {
  role: "developer" | "designer";
  headcount: number;
  requiredSkills: string;
  preferred: string;
  responsibilities: string;
  culture: string;
}

export const EMPTY_JD_FORM: JdFormState = {
  role: "developer",
  headcount: 1,
  requiredSkills: "",
  preferred: "",
  responsibilities: "",
  culture: "",
};

interface JdMatchModalProps {
  userId: string | null;
  form: JdFormState;                          // 부모(page.tsx) 메모리에 보관 — 모달 닫아도 유지, 새로고침 시 초기화
  onFormChange: (form: JdFormState) => void;
  onClose: () => void;
  onResults: (results: Map<string, FitReport>) => void;
  onViewResults: () => void;                  // 결과 확인하기 — 모달 닫고 메인 목록을 적합도순으로 노출/스크롤
}

interface RankedCandidate {
  candidateId: string;
  name: string;
  title: string | null;
  matchCount: number;
  matchedKeywords: string[];
}

interface JdPlan {
  role: "developer" | "designer";
  roleConfidence: number;
  keywords: string[];
  totalInRole: number;
  matchedCount: number;
  ranked: RankedCandidate[];
}

type CandidateStatus =
  | { state: "idle" }
  | { state: "queued" }
  | { state: "analyzing"; stage: string }
  | { state: "done"; report: FitReport }
  | { state: "failed"; error: string };

const BATCH_SIZE = 5;

function StatusDot({ status }: { status: CandidateStatus }) {
  if (status.state === "queued")    return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />;
  if (status.state === "analyzing") return <Loader2 size={10} className="shrink-0 animate-spin" style={{ color: "var(--des-color)" }} />;
  if (status.state === "done")      return <CheckCircle size={11} className="shrink-0" style={{ color: "var(--ok)" }} />;
  if (status.state === "failed")    return <XCircle size={11} className="shrink-0" style={{ color: "var(--dev-color)" }} />;
  return <span className="w-2 h-2 rounded-full bg-gray-600 shrink-0" />;
}

// 구조화 폼 입력값 → 표준 공고 양식(크롤 공고·스카우트 건과 같은 [주요업무]/[자격요건]/[우대사항]) 텍스트
function buildJdText(form: JdFormState): string {
  const roleLabel = form.role === "developer" ? "개발자" : "디자이너";
  // 첫 줄은 데스크·승인함의 건 제목(jdHeadline)으로 쓰인다 — 직군과 핵심 기술로
  const skills = parseKeywords(form.requiredSkills);
  const top = skills.slice(0, 3);
  const headline = top.length ? `${roleLabel} 채용 · ${top.join(", ")}` : `${roleLabel} 채용`;
  const summary = [`${headline} (${form.headcount}명)`, form.culture.trim() && `조직문화: ${form.culture.trim().replace(/\s+/g, " ")}`]
    .filter(Boolean)
    .join("\n");
  return composePostingText({
    summary,
    key_duties: toItems(form.responsibilities),
    must_have: skills,
    nice_to_have: toItems(form.preferred),
  });
}

// 필수 기술 텍스트를 키워드 배열로 파싱 (쉼표/줄바꿈/중점/슬래시 등 자유 입력 허용)
function parseKeywords(text: string): string[] {
  return text
    .split(/[,\n·/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const inputBase: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border-color)",
  color: "var(--text-primary)",
  fontFamily: "Pretendard Variable, sans-serif",
  padding: "10px 12px",
  lineHeight: 1.5,
};

export default function JdMatchModal({ userId, form, onFormChange, onClose, onResults, onViewResults }: JdMatchModalProps) {
  const jdAvailable = isJdAnalyzerConfigured() && Boolean(JD_ANALYZER_URL);
  // ── 폼 상태는 부모(page.tsx) 메모리에서 관리 — 모달을 닫아도 유지됨 ──
  const { role, headcount, requiredSkills, preferred, responsibilities, culture } = form;
  const patchForm = (patch: Partial<JdFormState>) => onFormChange({ ...form, ...patch });

  // ── 진행 상태 (모달 내부 — 닫으면 초기화) ──
  const [phase, setPhase] = useState<"input" | "planning" | "analyzing">("input");
  const [planError, setPlanError] = useState<string | null>(null);
  const [plan, setPlan] = useState<JdPlan | null>(null);
  const [jdText, setJdText] = useState("");
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [batchRunning, setBatchRunning] = useState(false);
  const [statuses, setStatuses] = useState<Map<string, CandidateStatus>>(new Map());
  const esRefs = useRef<EventSource[]>([]);
  const sessionResultsRef = useRef<Map<string, FitReport>>(new Map());
  const [slackNotice, setSlackNotice] = useState<string | null>(null);
  const [slackSending, setSlackSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    return () => { esRefs.current.forEach((es) => es.close()); };
  }, []);

  // 모달이 열려 있는 동안 배경(메인 페이지) 스크롤 잠금 — 모달 내부만 스크롤
  // (globals.css에서 html/body 모두 overflow-x:hidden 이라 실제 스크롤 요소가 html일 수 있어 둘 다 잠금)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  const updateStatus = (id: string, status: CandidateStatus) => {
    setStatuses((prev) => new Map(prev).set(id, status));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllDone = () => {
    const doneIds = [...statuses.entries()]
      .filter(([, st]) => st.state === "done")
      .map(([id]) => id);
    setSelectedIds(new Set(doneIds));
  };

  const getSelectedReports = (): FitReport[] =>
    [...selectedIds]
      .map((id) => sessionResultsRef.current.get(id))
      .filter((r): r is FitReport => Boolean(r));

  const sendManualSlackApproval = async () => {
    if (!userId || slackSending) return;
    const reports = getSelectedReports();
    if (reports.length === 0) {
      setSlackNotice("Slack으로 보낼 후보를 선택해주세요.");
      return;
    }

    setSlackSending(true);
    setSlackNotice(null);
    try {
      const res = await authFetch(`${JD_ANALYZER_URL}/api/sourcing/auto-from-jd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd: jdText, userId, reports, manualSelection: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `서버 오류 (${res.status})`);

      if (data.created) {
        setSlackNotice(`선택 ${reports.length}명 — Slack 승인 요청을 보냈습니다. /sourcing/review 에서 확인할 수 있습니다.`);
        setSelectedIds(new Set());
      } else if (data.reason === "no_selection") {
        setSlackNotice("선택된 후보가 없습니다.");
      } else if (data.reason === "already_pending") {
        setSlackNotice("이 JD에 대한 승인 요청이 이미 대기 중입니다.");
      }
    } catch (err) {
      setSlackNotice(err instanceof Error ? err.message : "Slack 승인 요청 실패");
    } finally {
      setSlackSending(false);
    }
  };

  const formValid =
    headcount >= 1 &&
    responsibilities.trim().length > 0 &&
    culture.trim().length > 0;

  // ── 1) 폼 제출 → JD 조합 → plan ──
  const handlePlan = async () => {
    if (!jdAvailable) return;
    if (!formValid || phase === "planning") return;
    setPhase("planning");
    setPlanError(null);

    const jd = buildJdText({ role, headcount, requiredSkills, preferred, responsibilities, culture });
    setJdText(jd);
    const keywords = parseKeywords(requiredSkills);

    try {
      const res = await authFetch(`${JD_ANALYZER_URL}/api/jd/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd, role, keywords }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `서버 오류 (${res.status})`);
      }
      const data = (await res.json()) as JdPlan;
      setPlan(data);
      setPhase("analyzing");
      void analyzeBatch(data, jd, 0);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "분석 계획 수립 실패");
      setPhase("input");
    }
  };

  // ── 2) 상위 N명 배치 분석 (SSE) ──
  const analyzeBatch = async (activePlan: JdPlan, jd: string, startIndex: number) => {
    const batch = activePlan.ranked.slice(startIndex, startIndex + BATCH_SIZE);
    if (batch.length === 0) return;

    setBatchRunning(true);
    const uid = userId || `guest-${Date.now()}`;
    const pending = new Set(batch.map((c) => c.candidateId));
    const batchResults = new Map<string, FitReport>();

    const checkDone = () => {
      if (pending.size === 0) {
        setBatchRunning(false);
        const nextCount = startIndex + batch.length;
        setAnalyzedCount(nextCount);
        batchResults.forEach((r, id) => sessionResultsRef.current.set(id, r));
        if (batchResults.size > 0) onResults(new Map(batchResults));
      }
    };

    await Promise.all(
      batch.map(async (candidate) => {
        const cid = candidate.candidateId;
        updateStatus(cid, { state: "queued" });
        try {
          const res = await authFetch(`${JD_ANALYZER_URL}/api/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jd, candidateId: cid, userId: uid, tier: "free" }),
          });
          const data = await res.json();

          if (data.cached && data.report) {
            updateStatus(cid, { state: "done", report: data.report });
            batchResults.set(cid, data.report);
            pending.delete(cid);
            checkDone();
            return;
          }
          if (!data.jobId) throw new Error("jobId를 받지 못했습니다.");

          updateStatus(cid, { state: "analyzing", stage: STAGE_LABELS.queued });

          const es = new EventSource(await withAccessToken(`${JD_ANALYZER_URL}/api/jobs/${data.jobId}/stream?tier=free`));
          esRefs.current.push(es);

          es.addEventListener("progress", (e) => {
            const { stage, attempt, maxAttempts } = JSON.parse(e.data) as { stage: string; attempt?: number; maxAttempts?: number };
            // 일시 오류(한도 초과 등) 재시도는 몇 번째인지 보여 준다 — 끝없이 "분석 중"으로 보이지 않게
            const label = stage === "retrying" && attempt ? `일시 오류로 재시도 중 (${attempt}/${maxAttempts ?? 3})` : STAGE_LABELS[stage] ?? stage;
            updateStatus(cid, { state: "analyzing", stage: label });
          });
          es.addEventListener("completed", (e) => {
            const report = JSON.parse(e.data) as FitReport;
            updateStatus(cid, { state: "done", report });
            batchResults.set(cid, report);
            pending.delete(cid);
            checkDone();
            es.close();
          });
          es.addEventListener("failed", (e) => {
            const { reason } = JSON.parse(e.data) as { reason: string };
            updateStatus(cid, { state: "failed", error: reason ?? "분석 실패" });
            pending.delete(cid);
            checkDone();
            es.close();
          });
          es.onerror = () => {
            updateStatus(cid, { state: "failed", error: "연결 오류" });
            pending.delete(cid);
            checkDone();
            es.close();
          };
        } catch (err) {
          updateStatus(cid, { state: "failed", error: err instanceof Error ? err.message : "오류" });
          pending.delete(cid);
          checkDone();
        }
      })
    );
  };

  const doneCount = [...statuses.values()].filter((s) => s.state === "done").length;
  const failCount = [...statuses.values()].filter((s) => s.state === "failed").length;
  const remaining = plan ? Math.max(0, plan.ranked.length - analyzedCount) : 0;
  const visibleCandidates = plan ? plan.ranked.slice(0, analyzedCount + (batchRunning ? BATCH_SIZE : 0)) : [];

  const roleLabel = (plan?.role ?? role) === "designer" ? "디자이너" : "개발자";
  const RoleIcon = (plan?.role ?? role) === "designer" ? Palette : Code2;
  const roleColor = (plan?.role ?? role) === "designer" ? "var(--des-color)" : "var(--dev-color)";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(2,0,5,0.85)",
        backdropFilter: "blur(6px)",
        paddingTop: "5.5rem",   // 고정 헤더(z-100)에 가려지지 않도록 상단 여백 확보
        paddingBottom: "1.5rem",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 0 60px rgba(var(--accent-rgb), 0.15), 0 24px 64px rgba(0,0,0,0.6)",
          maxHeight: "calc(100vh - 7rem)",   // 상/하 여백을 뺀 높이로 축소
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(var(--accent-rgb), 0.15)", border: "1px solid rgba(var(--accent-rgb), 0.35)" }}>
              <Zap size={14} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)", fontFamily: "Pretendard Variable, sans-serif" }}>
                JD 매칭 분석
              </h2>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                채용 정보를 입력하면 적합한 후보부터 정밀 분석합니다
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-all"
            style={{ color: "var(--text-secondary)", background: "var(--surface-elevated)" }}>
            <X size={14} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain flex-1">
          <div className="px-6 py-5 space-y-4">
            {!jdAvailable ? (
              <p className="text-sm text-center py-8 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {BACKEND_UNAVAILABLE_MSG}
              </p>
            ) : (
            <>
            {/* ── 입력 폼 (input 단계에서만) ── */}
            {phase === "input" && (
              <>
                {/* 1. 직군 선택 */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                    모집 직군 <span style={{ color: "var(--accent)" }}>*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "developer", label: "개발자", Icon: Code2, color: "var(--dev-color)" },
                      { value: "designer",  label: "디자이너", Icon: Palette, color: "var(--des-color)" },
                    ] as const).map(({ value, label, Icon, color }) => {
                      const active = role === value;
                      return (
                        <button
                          key={value}
                          onClick={() => patchForm({ role: value })}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                          style={{
                            background: active ? `${color}1f` : "var(--surface)",
                            border: `1px solid ${active ? color : "var(--border-color)"}`,
                            color: active ? color : "var(--text-secondary)",
                            fontFamily: "Pretendard Variable, sans-serif",
                          }}
                        >
                          <Icon size={15} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. 모집 인원 */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                    모집 인원 <span style={{ color: "var(--accent)" }}>*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={headcount}
                    onChange={(e) => patchForm({ headcount: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-28 rounded-xl text-sm outline-none transition-all"
                    style={inputBase}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(var(--accent-rgb), 0.5)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; }}
                  />
                  <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }}>명</span>
                </div>

                {/* 3. 필수 기술 (선택) */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                    자격요건 · 필수 기술 <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(선택)</span>
                  </label>
                  <textarea
                    value={requiredSkills}
                    onChange={(e) => patchForm({ requiredSkills: e.target.value })}
                    placeholder={role === "developer"
                      ? "한 줄에 하나씩 자유롭게 입력하세요\nReact\nTypeScript\nNext.js"
                      : "한 줄에 하나씩 자유롭게 입력하세요\nFigma\nPrototyping\nDesign System"}
                    rows={4}
                    className="w-full rounded-xl resize-y text-sm outline-none transition-all"
                    style={inputBase}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(var(--accent-rgb), 0.5)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; }}
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    입력한 기술을 가진 후보를 우선 분석합니다 (비우면 직군 전체 대상)
                  </p>
                </div>

                {/* 4. 우대 사항 (선택) */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                    우대사항 <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(선택)</span>
                  </label>
                  <textarea
                    value={preferred}
                    onChange={(e) => patchForm({ preferred: e.target.value })}
                    placeholder="자유롭게 여러 줄로 입력하세요&#10;예) Docker · AWS 경험자&#10;오픈소스 기여 경험"
                    rows={4}
                    className="w-full rounded-xl resize-y text-sm outline-none transition-all"
                    style={inputBase}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(var(--accent-rgb), 0.5)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; }}
                  />
                </div>

                {/* 5. 담당 업무 */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                    주요업무 <span style={{ color: "var(--accent)" }}>*</span>
                  </label>
                  <textarea
                    value={responsibilities}
                    onChange={(e) => patchForm({ responsibilities: e.target.value })}
                    placeholder="사용자 대면 프론트엔드 기능 설계 및 구현, 코드 리뷰 주도 등"
                    rows={3}
                    className="w-full rounded-xl resize-none text-sm outline-none transition-all"
                    style={inputBase}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(var(--accent-rgb), 0.5)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; }}
                  />
                </div>

                {/* 6. 조직 문화 */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                    조직문화 <span style={{ color: "var(--accent)" }}>*</span>
                  </label>
                  <textarea
                    value={culture}
                    onChange={(e) => patchForm({ culture: e.target.value })}
                    placeholder="수평적 의사결정, 2주 스프린트, 자율 출퇴근, 학습 지원 문화 등"
                    rows={3}
                    className="w-full rounded-xl resize-none text-sm outline-none transition-all"
                    style={inputBase}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(var(--accent-rgb), 0.5)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; }}
                  />
                </div>

                {planError && <p className="text-xs" style={{ color: "var(--dev-color)" }}>{planError}</p>}
              </>
            )}

            {/* ── 분석 단계 요약 + 진행 ── */}
            {phase !== "input" && (
              <>
                {plan && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl px-4 py-3.5 space-y-3"
                    style={{ background: "rgba(var(--accent-rgb), 0.05)", border: "1px solid rgba(var(--accent-rgb), 0.15)" }}
                  >
                    <div className="flex items-center gap-2">
                      <RoleIcon size={14} style={{ color: roleColor }} />
                      <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{roleLabel} 모집</span>
                    </div>
                    {plan.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {plan.keywords.map((kw) => (
                          <span key={kw} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(var(--des-color-rgb), 0.1)", border: "1px solid rgba(var(--des-color-rgb), 0.25)", color: "var(--des-color)" }}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {roleLabel} {plan.totalInRole}명 중 키워드 매칭{" "}
                      <span style={{ color: "var(--accent)", fontWeight: 600 }}>{plan.matchedCount}명</span>
                      {" "}· 적합도 높은 순 {BATCH_SIZE}명씩 분석
                    </p>
                  </motion.div>
                )}

                {slackNotice && (
                  <p className="text-xs px-1" style={{ color: slackNotice.includes("실패") || slackNotice.includes("선택") ? "var(--dev-color)" : "var(--ok)" }}>
                    {slackNotice}
                  </p>
                )}

                {visibleCandidates.length > 0 && (
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
                    <div className="px-4 py-2.5 flex items-center justify-between gap-2" style={{ background: "var(--surface)" }}>
                      <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                        분석 결과 {doneCount}명 완료{failCount > 0 ? ` · ${failCount}명 실패` : ""}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {doneCount > 0 && !batchRunning && (
                          <button
                            type="button"
                            onClick={selectAllDone}
                            className="text-xs font-semibold px-2 py-0.5 rounded-md transition-opacity hover:opacity-80"
                            style={{ color: "var(--accent)", fontFamily: "Pretendard Variable, sans-serif" }}
                          >
                            완료 전체 선택
                          </button>
                        )}
                        {batchRunning && <Loader2 size={12} className="animate-spin" style={{ color: "var(--des-color)" }} />}
                      </div>
                    </div>
                    <div className="px-4 py-2 space-y-2" style={{ borderTop: "1px solid var(--border-color)", background: "var(--surface)" }}>
                      {visibleCandidates.map((c, idx) => {
                        const st = statuses.get(c.candidateId) ?? { state: "idle" as const };
                        const isDone = st.state === "done";
                        const isSelected = selectedIds.has(c.candidateId);
                        return (
                          <div key={c.candidateId} className="flex items-center justify-between gap-3 py-1">
                            <div className="flex items-center gap-2 min-w-0">
                              {isDone ? (
                                <button
                                  type="button"
                                  onClick={() => toggleSelect(c.candidateId)}
                                  className="shrink-0 p-0.5 rounded transition-opacity hover:opacity-80"
                                  style={{ color: isSelected ? "var(--accent)" : "var(--text-secondary)" }}
                                  aria-label={isSelected ? "선택 해제" : "선택"}
                                >
                                  {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                </button>
                              ) : (
                                <span className="w-[18px] shrink-0" />
                              )}
                              <span className="text-xs tabular-nums w-4 shrink-0" style={{ color: "var(--text-secondary)" }}>{idx + 1}</span>
                              <StatusDot status={st} />
                              <span className="text-xs truncate" style={{ color: "var(--text-primary)", fontFamily: "Pretendard Variable, sans-serif" }}>{c.name}</span>
                              <span className="text-xs px-1 py-0.5 rounded shrink-0"
                                style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}>{c.matchCount}개 일치</span>
                            </div>
                            <div className="shrink-0">
                              {st.state === "analyzing" && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{st.stage}</span>}
                              {st.state === "done" && <FitScoreBadge report={st.report} compact />}
                              {st.state === "failed" && <span className="text-xs" style={{ color: "var(--dev-color)" }}>오류</span>}
                              {st.state === "queued" && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>대기</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {doneCount > 0 && selectedIds.size > 0 && (
                      <p className="text-xs px-4 py-2" style={{ borderTop: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                        {selectedIds.size}명 선택됨 — 결과를 검토한 뒤 Slack 승인 요청을 보내세요.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
            </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center gap-3 shrink-0" style={{ borderTop: "1px solid var(--border-color)" }}>
          {!jdAvailable ? (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-color)", color: "var(--text-secondary)", fontFamily: "Pretendard Variable, sans-serif" }}
            >
              닫기
            </button>
          ) : (
          <>
          {phase === "input" && (
            <button
              onClick={handlePlan}
              disabled={!formValid}
              className="btn-brand btn-brand--shadow-btn flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                color: "white",
                fontFamily: "Pretendard Variable, sans-serif",
              }}
            >
              <Zap size={14} />
              분석 시작
            </button>
          )}

          {phase === "planning" && (
            <button disabled className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)", fontFamily: "Pretendard Variable, sans-serif" }}>
              <Loader2 size={14} className="animate-spin" />
              후보 선별 중...
            </button>
          )}

          {phase === "analyzing" && (
            <>
              {remaining > 0 && (
                <button
                  onClick={() => plan && analyzeBatch(plan, jdText, analyzedCount)}
                  disabled={batchRunning}
                  className={batchRunning
                    ? "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    : "btn-brand btn-brand--shadow-btn flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"}
                  style={{
                    background: batchRunning ? "var(--surface-elevated)" : undefined,
                    color: batchRunning ? "var(--text-secondary)" : "white",
                    fontFamily: "Pretendard Variable, sans-serif",
                    boxShadow: batchRunning ? "none" : undefined,
                  }}
                >
                  {batchRunning ? (
                    <><Loader2 size={14} className="animate-spin" />분석 중...</>
                  ) : (
                    <>다음 {Math.min(BATCH_SIZE, remaining)}명 더 분석 (남은 {remaining}명)</>
                  )}
                </button>
              )}
              {doneCount > 0 && userId && (
                <button
                  onClick={() => void sendManualSlackApproval()}
                  disabled={slackSending || selectedIds.size === 0}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    flex: remaining > 0 ? "0 0 auto" : 1,
                    paddingLeft: 16,
                    paddingRight: 16,
                    background: "rgba(var(--des-color-rgb), 0.12)",
                    border: "1px solid rgba(var(--des-color-rgb), 0.35)",
                    color: "var(--des-color)",
                    fontFamily: "Pretendard Variable, sans-serif",
                  }}
                >
                  {slackSending ? (
                    <><Loader2 size={14} className="animate-spin" />전송 중...</>
                  ) : (
                    <><Send size={14} />Slack 승인 ({selectedIds.size || 0})</>
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  if (remaining === 0) onViewResults();
                  else onClose();
                }}
                disabled={doneCount === 0 && remaining === 0}
                className={remaining > 0
                  ? "py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  : "btn-brand btn-brand--shadow-btn py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"}
                style={{
                  flex: remaining > 0 ? "0 0 auto" : 1,
                  paddingLeft: 16, paddingRight: 16,
                  background: remaining > 0 ? "var(--surface-elevated)" : undefined,
                  border: remaining > 0 ? "1px solid var(--border-color)" : "none",
                  color: remaining > 0 ? "var(--text-secondary)" : "white",
                  fontFamily: "Pretendard Variable, sans-serif",
                  boxShadow: remaining > 0 ? "none" : undefined,
                }}
              >
                {remaining > 0 ? "닫기" : `결과 확인하기 (${doneCount}명)`}
              </button>
            </>
          )}
          </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
