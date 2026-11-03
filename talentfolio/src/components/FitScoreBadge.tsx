"use client";

import { displaySummary, type FitReport } from "@/types/fitReport";
import { TONE_STYLE, VERDICT_LABEL } from "@/lib/labels";

interface FitScoreBadgeProps {
  report: FitReport;
  compact?: boolean;
}

/** 적합도 배지: 글로우 없이 틴트 배경 + 기호 + 한글 라벨 (색맹 대응) */
export default function FitScoreBadge({ report, compact = false }: FitScoreBadgeProps) {
  const v = VERDICT_LABEL[report.verdict] ?? VERDICT_LABEL.weak_fit;
  const tone = TONE_STYLE[v.tone];
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full font-semibold"
      style={{
        padding: compact ? "3px 10px" : "5px 12px",
        background: tone.bg,
        color: tone.color,
        fontSize: compact ? 12 : 13,
      }}
      title={displaySummary(report.ceoSummary)}
    >
      <span aria-hidden="true">{v.mark}</span>
      <span>{v.label}</span>
      <span className="tabular-nums font-bold">{report.overallScore}</span>
    </div>
  );
}
