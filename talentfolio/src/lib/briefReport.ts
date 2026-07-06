import type { FitReport } from "@/types/fitReport";
import { JD_ANALYZER_URL, isJdAnalyzerConfigured } from "@/types/fitReport";

export interface BriefReportResponse {
  candidateId: string;
  jdHash: string | null;
  jdHeadline: string | null;
  report: FitReport | null;
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
