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

export const JD_ANALYZER_URL =
  process.env.NEXT_PUBLIC_JD_ANALYZER_URL ?? "http://localhost:3001";
