"use client";

import { useState } from "react";
import { Check, Minus, Quote, ChevronDown, Sparkles } from "lucide-react";
import type { AgentResult, FitReport } from "@/types/fitReport";

const VERDICT = {
  strong_fit:   { label: "Strong Fit", ko: "강력 적합", color: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.4)" },
  possible_fit: { label: "Possible",   ko: "검토 권장", color: "#ffae2e", bg: "rgba(255,174,46,0.12)", border: "rgba(255,174,46,0.4)" },
  weak_fit:     { label: "Weak Fit",   ko: "적합도 낮음", color: "#f6042e", bg: "rgba(246,4,46,0.12)",   border: "rgba(246,4,46,0.4)" },
} as const;

const AGENT_LABEL: Record<AgentResult["agent"], string> = {
  tech_stack: "기술 스택",
  experience: "경험",
  culture_fit: "컬처핏",
};

function scoreColor(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#ffae2e";
  return "#f6042e";
}

function AgentSection({ result }: { result: AgentResult }) {
  const [open, setOpen] = useState(true);
  const color = scoreColor(result.score);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-color)", background: "#0b0812" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-3"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif" }}>
            {AGENT_LABEL[result.agent]}
          </span>
          <span className="text-sm font-bold tabular-nums" style={{ color }}>{result.score}</span>
        </div>
        <ChevronDown
          size={15}
          style={{ color: "var(--text-secondary)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>

      {/* score bar */}
      <div className="px-3.5">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-elevated)" }}>
          <div className="h-full rounded-full" style={{ width: `${result.score}%`, background: color, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {open && (
        <div className="px-3.5 py-3 space-y-3">
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {result.summary}
          </p>

          {result.matched_items.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#22c55e" }}>
                적합한 부분
              </span>
              {result.matched_items.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check size={13} className="mt-0.5 shrink-0" style={{ color: "#22c55e" }} />
                  <span className="text-[12px] leading-snug" style={{ color: "var(--text-primary)" }}>{item}</span>
                </div>
              ))}
            </div>
          )}

          {result.missing_items.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
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
                  <span className="text-[11px] italic leading-snug" style={{ color: "var(--text-secondary)" }}>{ev}</span>
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
          style={{ fontFamily: "DM Sans, sans-serif", color: "var(--text-secondary)" }}
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
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: v.color, fontFamily: "DM Sans, sans-serif" }}>
              {report.overallScore}
            </span>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>/ 100</span>
          </div>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: v.color, color: "#0b0812" }}
          >
            {v.ko}
          </span>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
          {report.ceoSummary}
        </p>
      </div>

      {/* Per-agent breakdown */}
      <div className="space-y-2.5">
        {agents.map((a) => (
          <AgentSection key={a.agent} result={a} />
        ))}
      </div>
    </div>
  );
}
