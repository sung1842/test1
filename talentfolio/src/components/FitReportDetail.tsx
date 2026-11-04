"use client";

import { useState } from "react";
import { Check, Minus, Quote, ChevronDown, Sparkles } from "lucide-react";
import { displaySummary, type AgentResult, type FitReport } from "@/types/fitReport";
import { ScoreBars, ScoreGauge } from "@/components/charts/ScoreCharts";

const VERDICT = {
  strong_fit:   { label: "● 잘 맞음",   ko: "잘 맞음",   color: "var(--ok)",   bg: "var(--ok-bg)",   border: "transparent" },
  possible_fit: { label: "◐ 부분 일치", ko: "부분 일치", color: "var(--warn)", bg: "var(--warn-bg)", border: "transparent" },
  weak_fit:     { label: "○ 덜 맞음",   ko: "덜 맞음",   color: "var(--text-secondary)", bg: "#E8EDF5", border: "transparent" },
} as const;

const AGENT_LABEL: Record<AgentResult["agent"], string> = {
  tech_stack: "기술 스택",
  experience: "경험",
  culture_fit: "컬처핏",
};

function scoreColor(score: number): string {
  if (score >= 75) return "var(--ok)";
  if (score >= 50) return "var(--des-color)";
  return "var(--dev-color)";
}

function AgentSection({ result }: { result: AgentResult }) {
  const [open, setOpen] = useState(true);
  const color = scoreColor(result.score);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-color)", background: "var(--surface)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-3"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)", fontFamily: "Pretendard Variable, sans-serif" }}>
            {AGENT_LABEL[result.agent]}
          </span>
          <span className="text-sm font-bold tabular-nums" style={{ color }}>{result.score}</span>
        </div>
        <ChevronDown
          size={15}
          style={{ color: "var(--text-secondary)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>

      {open && (
        <div className="px-3.5 py-3 space-y-3">
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {result.summary}
          </p>

          {result.matched_items.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ok)" }}>
                적합한 부분
              </span>
              {result.matched_items.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check size={13} className="mt-0.5 shrink-0" style={{ color: "var(--ok)" }} />
                  <span className="text-[12px] leading-snug" style={{ color: "var(--text-primary)" }}>{item}</span>
                </div>
              ))}
            </div>
          )}

          {result.missing_items.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                보완할 부분
              </span>
              {result.missing_items.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Minus size={13} className="mt-0.5 shrink-0" style={{ color: "var(--text-secondary)" }} />
                  <span className="text-[12px] leading-snug" style={{ color: "var(--text-secondary)" }}>{item}</span>
                </div>
              ))}
            </div>
          )}

          {result.evidence.length > 0 && (
            <div className="space-y-1.5">
              {result.evidence.map((ev, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg px-2.5 py-2"
                  style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}
                >
                  <Quote size={12} className="mt-0.5 shrink-0" style={{ color: "var(--text-secondary)", opacity: 0.6 }} />
                  <span className="text-xs italic leading-snug" style={{ color: "var(--text-secondary)" }}>{ev}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FitReportDetail({ report }: { report: FitReport }) {
  const v = VERDICT[report.verdict];
  const agents: AgentResult[] = [report.techStack, report.experience, ...(report.cultureFit ? [report.cultureFit] : [])];

  return (
    <div
      className="mb-6 pb-6"
      style={{ borderBottom: "1px solid var(--border-color)" }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles size={13} style={{ color: v.color }} />
        <h3
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ fontFamily: "Pretendard Variable, sans-serif", color: "var(--text-secondary)" }}
        >
          JD 적합도 분석
        </h3>
      </div>

      {/* Overall score + verdict */}
      <div
        className="rounded-xl px-4 py-3.5 mb-3"
        style={{ background: v.bg, border: `1px solid ${v.border}` }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="w-[170px] -my-2">
            <ScoreGauge value={report.overallScore} label="/ 100" height={150} />
          </div>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: v.color, color: "var(--surface)" }}
          >
            {v.ko}
          </span>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
          {displaySummary(report.ceoSummary)}
        </p>
      </div>

      {/* 항목별 점수 비교 (75점 = 잘 맞음 기준선) */}
      {agents.length > 0 && (
        <div className="rounded-xl px-2 pt-1 mb-3" style={{ background: "var(--surface)" }}>
          <ScoreBars items={agents.map((a) => ({ label: AGENT_LABEL[a.agent], score: a.score }))} />
        </div>
      )}

      {/* Per-agent breakdown */}
      <div className="space-y-2.5">
        {agents.map((a) => (
          <AgentSection key={a.agent} result={a} />
        ))}
      </div>
    </div>
  );
}
