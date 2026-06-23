"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { Candidate } from "@/types/candidate";
import type { FitReport } from "@/types/fitReport";
import { JD_ANALYZER_URL, STAGE_LABELS } from "@/types/fitReport";
import FitScoreBadge from "./FitScoreBadge";

interface JdMatchModalProps {
  candidates: Candidate[];        // 현재 필터된 후보자 목록
  userId: string | null;          // Supabase user ID (null이면 게스트)
  onClose: () => void;
  onResults: (results: Map<string, FitReport>) => void;
}

type CandidateStatus =
  | { state: "idle" }
  | { state: "queued" }
  | { state: "analyzing"; stage: string }
  | { state: "done"; report: FitReport }
  | { state: "failed"; error: string };

const MAX_CANDIDATES = 10;

function StatusDot({ status }: { status: CandidateStatus }) {
  if (status.state === "idle")     return <span className="w-2 h-2 rounded-full bg-gray-600 shrink-0" />;
  if (status.state === "queued")   return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />;
  if (status.state === "analyzing")return <Loader2 size={8} className="shrink-0 animate-spin" style={{ color: "#ffae2e" }} />;
  if (status.state === "done")     return <CheckCircle size={10} className="shrink-0" style={{ color: "#22c55e" }} />;
  if (status.state === "failed")   return <XCircle size={10} className="shrink-0" style={{ color: "#f6042e" }} />;
}

export default function JdMatchModal({ candidates, userId, onClose, onResults }: JdMatchModalProps) {
  const [jdText, setJdText] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [statuses, setStatuses] = useState<Map<string, CandidateStatus>>(new Map());
  const [showDetails, setShowDetails] = useState(false);
  const esRefs = useRef<EventSource[]>([]);
  const resultsRef = useRef<Map<string, FitReport>>(new Map());

  // 실제 등록 프로필(UUID)만 분석 가능
  const analyzable = candidates
    .filter((c) => c.source === "profile" && c.supabaseId)
    .slice(0, MAX_CANDIDATES);

  const dummyCount = candidates.filter((c) => c.source !== "profile").length;

  useEffect(() => {
    return () => {
      esRefs.current.forEach((es) => es.close());
    };
  }, []);

  const handleStart = async () => {
    if (!jdText.trim() || analyzable.length === 0 || isRunning) return;
    setIsRunning(true);
    setIsDone(false);
    resultsRef.current = new Map();

    const uid = userId || `guest-${Date.now()}`;
    const pending = new Set(analyzable.map((c) => c.supabaseId!));

    const updateStatus = (id: string, status: CandidateStatus) => {
      setStatuses((prev) => new Map(prev).set(id, status));
    };

    const checkDone = () => {
      if (pending.size === 0) {
        setIsDone(true);
        setIsRunning(false);
        onResults(new Map(resultsRef.current));
      }
    };

    await Promise.all(
      analyzable.map(async (candidate) => {
        const cid = candidate.supabaseId!;
        updateStatus(cid, { state: "queued" });
        try {
          const res = await fetch(`${JD_ANALYZER_URL}/api/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jd: jdText.trim(), candidateId: cid, userId: uid, tier: "free" }),
          });
          const data = await res.json();

          if (data.cached && data.report) {
            updateStatus(cid, { state: "done", report: data.report });
            resultsRef.current.set(cid, data.report);
            pending.delete(cid);
            checkDone();
            return;
          }

          if (!data.jobId) throw new Error("jobId를 받지 못했습니다.");

          updateStatus(cid, { state: "analyzing", stage: "queued" });

          const es = new EventSource(`${JD_ANALYZER_URL}/api/jobs/${data.jobId}/stream?tier=free`);
          esRefs.current.push(es);

          es.addEventListener("progress", (e) => {
            const { stage } = JSON.parse(e.data) as { stage: string };
            updateStatus(cid, { state: "analyzing", stage: STAGE_LABELS[stage] ?? stage });
          });

          es.addEventListener("completed", (e) => {
            const report = JSON.parse(e.data) as FitReport;
            updateStatus(cid, { state: "done", report });
            resultsRef.current.set(cid, report);
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
          const msg = err instanceof Error ? err.message : "알 수 없는 오류";
          updateStatus(cid, { state: "failed", error: msg });
          pending.delete(cid);
          checkDone();
        }
      })
    );
  };

  const doneCount  = [...statuses.values()].filter((s) => s.state === "done").length;
  const failCount  = [...statuses.values()].filter((s) => s.state === "failed").length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(2,0,5,0.85)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "#0d0918",
          border: "1px solid #271c32",
          boxShadow: "0 0 60px rgba(246,4,46,0.15), 0 24px 64px rgba(0,0,0,0.6)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid #271c32" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(246,4,46,0.15)", border: "1px solid rgba(246,4,46,0.35)" }}
            >
              <Zap size={14} style={{ color: "#f6042e" }} />
            </div>
            <div>
              <h2
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif" }}
              >
                JD 매칭 분석
              </h2>
              <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                AI가 채용공고와 후보자 포트폴리오의 적합도를 분석합니다
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: "var(--text-secondary)", background: "var(--surface-elevated)" }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-5">
            {/* JD textarea */}
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}
              >
                채용공고 (JD) 붙여넣기
              </label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                disabled={isRunning}
                placeholder={"[채용공고]\n직무: 풀스택 개발자\n필수 기술: React, TypeScript, Node.js\n우대: Docker, AWS 경험자\n...\n\n위와 같이 채용공고 전문을 붙여넣으세요."}
                rows={7}
                className="w-full rounded-xl resize-none text-sm outline-none transition-all"
                style={{
                  background: "#0b0812",
                  border: "1px solid #271c32",
                  color: "var(--text-primary)",
                  fontFamily: "DM Sans, sans-serif",
                  padding: "12px 14px",
                  lineHeight: 1.6,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(246,4,46,0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#271c32"; }}
              />
            </div>

            {/* 분석 대상 정보 */}
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: "rgba(246,4,46,0.05)", border: "1px solid rgba(246,4,46,0.15)" }}
            >
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  분석 대상:{" "}
                  <span style={{ color: "#f6042e" }}>{analyzable.length}명</span>
                  {analyzable.length === MAX_CANDIDATES && candidates.filter(c => c.source === "profile").length > MAX_CANDIDATES && (
                    <span style={{ color: "var(--text-secondary)" }}> (상위 {MAX_CANDIDATES}명)</span>
                  )}
                </p>
                {dummyCount > 0 && (
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    더미 후보자 {dummyCount}명은 Supabase 미등록으로 제외됩니다
                  </p>
                )}
                {analyzable.length === 0 && (
                  <p className="text-[10px] mt-0.5" style={{ color: "#ffae2e" }}>
                    실제 등록된 후보자가 없습니다. 프로필을 등록해주세요.
                  </p>
                )}
              </div>
              <span
                className="text-xs px-2 py-1 rounded-lg"
                style={{
                  background: "rgba(255,174,46,0.1)",
                  border: "1px solid rgba(255,174,46,0.25)",
                  color: "#ffae2e",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Free Tier
              </span>
            </div>

            {/* 진행 상황 — 분석 시작 후 표시 */}
            <AnimatePresence>
              {statuses.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid #271c32" }}
                >
                  {/* 요약 헤더 */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 transition-all"
                    style={{ background: "var(--surface)" }}
                    onClick={() => setShowDetails((v) => !v)}
                  >
                    <div className="flex items-center gap-3">
                      {isRunning && <Loader2 size={12} className="animate-spin" style={{ color: "#ffae2e" }} />}
                      {isDone && <CheckCircle size={12} style={{ color: "#22c55e" }} />}
                      <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                        {isDone
                          ? `분석 완료 — ${doneCount}명 성공${failCount > 0 ? `, ${failCount}명 실패` : ""}`
                          : `분석 중... (${doneCount + failCount}/${analyzable.length})`}
                      </span>
                    </div>
                    {showDetails ? <ChevronUp size={12} style={{ color: "var(--text-secondary)" }} /> : <ChevronDown size={12} style={{ color: "var(--text-secondary)" }} />}
                  </button>

                  {/* 상세 목록 */}
                  <AnimatePresence>
                    {showDetails && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div
                          className="px-4 py-2 space-y-2"
                          style={{ borderTop: "1px solid #271c32", background: "#0b0812" }}
                        >
                          {analyzable.map((c) => {
                            const id = c.supabaseId!;
                            const st = statuses.get(id) ?? { state: "idle" };
                            return (
                              <div key={id} className="flex items-center justify-between gap-3 py-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <StatusDot status={st} />
                                  <span
                                    className="text-xs truncate"
                                    style={{ color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif" }}
                                  >
                                    {c.name}
                                  </span>
                                </div>
                                <div className="shrink-0">
                                  {st.state === "analyzing" && (
                                    <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                                      {st.stage}
                                    </span>
                                  )}
                                  {st.state === "done" && (
                                    <FitScoreBadge report={st.report} compact />
                                  )}
                                  {st.state === "failed" && (
                                    <span className="text-[10px]" style={{ color: "#f6042e" }}>
                                      오류
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center gap-3 shrink-0"
          style={{ borderTop: "1px solid #271c32" }}
        >
          {isDone ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, #f6042e, #c0001e)",
                  color: "white",
                  fontFamily: "DM Sans, sans-serif",
                  boxShadow: "0 4px 14px rgba(246,4,46,0.35)",
                }}
              >
                결과 확인하기
              </button>
              <button
                onClick={() => {
                  setStatuses(new Map());
                  setIsDone(false);
                  setIsRunning(false);
                  setShowDetails(false);
                }}
                className="px-4 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-secondary)",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                다시 분석
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleStart}
                disabled={!jdText.trim() || analyzable.length === 0 || isRunning}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: isRunning ? "var(--surface-elevated)" : "linear-gradient(135deg, #f6042e, #c0001e)",
                  color: isRunning ? "var(--text-secondary)" : "white",
                  fontFamily: "DM Sans, sans-serif",
                  boxShadow: isRunning ? "none" : "0 4px 14px rgba(246,4,46,0.35)",
                }}
              >
                {isRunning ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    분석 시작
                  </>
                )}
              </button>
              {isRunning && (
                <button
                  onClick={() => {
                    esRefs.current.forEach((es) => es.close());
                    esRefs.current = [];
                    setIsRunning(false);
                    setStatuses(new Map());
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-secondary)",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  취소
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
