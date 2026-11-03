// jd-fit-analyzer shared/types.ts의 talentfolio용 미러
// jd-fit-analyzer orchestrator가 http://localhost:3001 에서 실행 중이어야 함

export interface AgentResult {
  agent: "tech_stack" | "experience" | "culture_fit";
  score: number;
  summary: string;
  matched_items: string[];
  missing_items: string[];
  evidence: string[];
  flags?: string[];
  citedCardIds?: string[];
  citedCards?: { id: string; trust: string }[];
}

export interface FitReport {
  candidateId: string;
  candidateName: string;
  overallScore: number;
  verdict: "strong_fit" | "possible_fit" | "weak_fit";
  techStack: AgentResult;
  experience: AgentResult;
  cultureFit?: AgentResult;
  ceoSummary: string;
  generatedAt: string;
  review?: FitReview;
}

export interface FitReview {
  decision: "approved" | "rejected";
  reason: string | null;
  decidedBy: string | null;
  decidedAt: string;
}

export type FitReportStatus = "queued" | "processing" | "completed" | "pending_review" | "approved" | "rejected" | "expired" | "failed";

export interface FitReportRecord {
  id: string;
  jobId: string;
  jd: string;
  jdHash: string;
  candidateId: string;
  candidateName: string | null;
  userId: string;
  status: FitReportStatus;
  report: FitReport | null;
  createdAt: string;
  updatedAt: string;
}

// SSE progress stage labels (runFitAnalysis.ts 기준)
export const STAGE_LABELS: Record<string, string> = {
  portfolio_fetch: "포트폴리오 조회 중...",
  analyzing:       "기술·경험·컬처핏 분석 중...",
  reworking:       "재검토 중...",
  ceo_review:      "CEO 최종 판정 중...",
  low_confidence:  "신뢰도 낮음, 계속 진행...",
  retrying:        "재시도 중...",
  done:            "완료",
  queued:          "대기 중...",
};

import { getJdAnalyzerUrl, isJdAnalyzerConfigured } from "@/lib/features";

export { isJdAnalyzerConfigured };
export const JD_ANALYZER_URL = getJdAnalyzerUrl();

// 내부 테스트 모드(CEO_MOCK) 문구가 저장된 옛 리포트를 사용자에게 그대로 보이지 않게 바꾼다
export function displaySummary(summary: string | null | undefined): string {
  if (!summary) return "";
  return summary.startsWith("[CEO_MOCK]")
    ? "종합 의견 없이 기술·경험·컬처핏 점수를 가중 평균한 참고 점수입니다. 근거와 면접 확인 질문을 보고 판단하세요."
    : summary;
}
