import type { FitReport } from "@/types/fitReport";
import { JD_ANALYZER_URL, isJdAnalyzerConfigured } from "@/types/fitReport";

export interface BriefReportResponse {
  candidateId: string;
  jdHash: string | null;
  jdHeadline: string | null;
  /** 분석을 돌린 기업 본인만 받는다 (공개 조회에는 null) */
  report: FitReport | null;
  /** 공개 요약 카드 (Slack unfurl·OG) */
  card?: { overallScore: number; verdict: string; techScore: number; experienceScore: number; matchedSkills: string[]; ceoSummary: string } | null;
}

/** jd-fit-analyzer orchestrator에서 FitReport 조회 (Brief 페이지·OG용) */
export async function fetchBriefReport(
  candidateId: string,
  jdHash?: string
): Promise<BriefReportResponse | null> {
  if (!isJdAnalyzerConfigured() || !JD_ANALYZER_URL) return null;
  const params = new URLSearchParams({ candidateId });
  if (jdHash) params.set("jdHash", jdHash);

  try {
    const res = await fetch(`${JD_ANALYZER_URL}/api/brief?${params.toString()}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as BriefReportResponse;
  } catch {
    return null;
  }
}

/** 공개 포트폴리오의 근거 카드 앵커 링크 (/talent/[id] 의 card-<id>) */
export function evidenceCardHref(candidateId: string, cardId: string): string {
  return `/talent/${encodeURIComponent(candidateId)}#card-${encodeURIComponent(cardId)}`;
}
