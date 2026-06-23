"use client";

import type { FitReport } from "@/types/fitReport";

interface FitScoreBadgeProps {
  report: FitReport;
  compact?: boolean;
}

const VERDICT_CONFIG = {
  strong_fit: {
    label: "Strong Fit",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.4)",
    glow: "rgba(34,197,94,0.25)",
  },
  possible_fit: {
    label: "Possible",
    color: "#ffae2e",
    bg: "rgba(255,174,46,0.15)",
    border: "rgba(255,174,46,0.4)",
    glow: "rgba(255,174,46,0.2)",
  },
  weak_fit: {
    label: "Weak Fit",
    color: "#f6042e",
    bg: "rgba(246,4,46,0.15)",
    border: "rgba(246,4,46,0.4)",
    glow: "rgba(246,4,46,0.2)",
  },
} as const;

export default function FitScoreBadge({ report, compact = false }: FitScoreBadgeProps) {
  const cfg = VERDICT_CONFIG[report.verdict];
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg"
      style={{
        padding: compact ? "2px 8px" : "4px 10px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 0 10px ${cfg.glow}`,
        backdropFilter: "blur(8px)",
      }}
      title={`${report.ceoSummary}`}
    >
      <span
        className="font-bold tabular-nums leading-none"
        style={{
          color: cfg.color,
          fontSize: compact ? 11 : 13,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {report.overallScore}
      </span>
      <span
        className="font-semibold leading-none"
        style={{
          color: cfg.color,
          fontSize: compact ? 9 : 10,
          fontFamily: "DM Sans, sans-serif",
          opacity: 0.9,
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
}
